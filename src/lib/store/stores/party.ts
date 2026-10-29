import { defineStore } from "pinia";
import { ref } from "vue";
import { v4 as uuidv4 } from "uuid";
import { getPartyDb } from "@/lib/databases/PartyDb";
import type { MyParties, PartyProblem } from "@/lib/services/party/partyClient";
import { HOME_PARTY_ID, defaultModeFor, toHeroCard, type HeroPartyMode, type PartyHeroCard } from "@/lib/services/party/partyRules";
import { cleanPartyState, foldSavedState, type PartyState, type QueuedStrike } from "@/lib/services/party/partyState";
import {
  addStrike,
  raidMaxHp,
  raidState,
  rewardFor,
  rewardKey,
  type Raid,
  type RaidReward,
  type RaidWindow,
  type Strike,
} from "@/lib/services/party/raidRules";
import { raidFromParty, type WireEvent, type WireParty, type WireRequest } from "@/lib/services/party/partyWire";
import debug from "@/lib/utils/debug";
import { useUserStore } from "./user";

/** How many events of one party the store keeps for the Activity tab */
const EVENTS_KEPT = 50;

export type HeroCardResult = { ok: true; card: PartyHeroCard } | { ok: false; problem: PartyProblem };

export interface HomeRaidArgs {
  beastId: string;
  window: RaidWindow;
  memberIds: string[];
}

/**
 * The parties of this device: how each hero may party, the parties a Game Master approved, the raids (the household's
 * own now, outside ones later) and which raid rewards were paid. Changes save at once; a failed save is logged, never thrown.
 */
export const usePartyStore = defineStore("party", () => {
  const heroModes = ref<Record<string, HeroPartyMode>>({});
  const approvedParties = ref<Record<string, string[]>>({});
  const raids = ref<Raid[]>([]);
  const paid = ref<string[]>([]);
  const defaultWindow = ref<RaidWindow>("standard");
  const outbox = ref<QueuedStrike[]>([]);

  // Parties with other families are the site's to keep: held for the screens, never saved to the device
  const outside = ref<WireParty[]>([]);
  const incoming = ref<WireRequest[]>([]);
  const outgoing = ref<WireRequest[]>([]);
  const events = ref<Record<string, WireEvent[]>>({});

  const snapshot = (): PartyState => ({
    heroModes: heroModes.value,
    approvedParties: approvedParties.value,
    raids: raids.value,
    paid: paid.value,
    defaultWindow: defaultWindow.value,
    outbox: outbox.value,
  });

  /** Set once the saved record has been read: until then a save would put this empty state over it */
  let hasRead = false;
  /** Whether the usual raid length was chosen here before the record was read (the saved one must not replace it) */
  let hasChosenWindow = false;

  function persist(): void {
    getPartyDb()
      .saveState(snapshot())
      .catch((error) => debug.error("party: could not save", error));
  }

  /** Saves at once when the record has been read; before that it waits for the read, which folds this state under what was saved */
  function save(): void {
    if (hasRead) {
      persist();
      return;
    }
    load()
      .then(persist)
      .catch((error) => debug.error("party: not saved, the saved record could not be read", error));
  }

  async function read(): Promise<void> {
    const saved = cleanPartyState(await getPartyDb().getState());
    const folded = foldSavedState(saved, snapshot(), hasChosenWindow);
    heroModes.value = folded.heroModes;
    approvedParties.value = folded.approvedParties;
    raids.value = folded.raids;
    paid.value = folded.paid;
    defaultWindow.value = folded.defaultWindow;
    outbox.value = folded.outbox;
    hasRead = true;
  }

  /** Reads the saved record once however often it is asked (a read that failed is tried again); await it before showing raids or striking */
  let reading: Promise<void> | null = null;
  function load(): Promise<void> {
    if (!reading) {
      reading = read().catch((error) => {
        reading = null;
        throw error;
      });
    }
    return reading;
  }

  function modeOf(heroId: string): HeroPartyMode {
    const chosen = heroModes.value[heroId];
    const isAdult = Boolean(useUserStore().users[heroId]?.isAdult);
    return chosen ?? defaultModeFor(isAdult);
  }

  /** The public card of one of our heroes when it may leave the household; why not otherwise (unknown, or home only) */
  function heroCard(heroId: string): HeroCardResult {
    const hero = useUserStore().users[heroId];
    const isKnown = Boolean(hero);
    const staysHome = modeOf(heroId) === "home";
    if (!isKnown) return { ok: false, problem: "invalid" };
    if (staysHome) return { ok: false, problem: "forbidden" };
    return { ok: true, card: toHeroCard(hero) };
  }

  function setMode(heroId: string, mode: HeroPartyMode): void {
    heroModes.value = { ...heroModes.value, [heroId]: mode };
    save();
  }

  function isApproved(heroId: string, partyId: string): boolean {
    const approved = approvedParties.value[heroId] ?? [];
    return approved.includes(partyId);
  }

  function approveParty(heroId: string, partyId: string): void {
    const alreadyApproved = isApproved(heroId, partyId);
    if (alreadyApproved) return;
    const approved = approvedParties.value[heroId] ?? [];
    approvedParties.value = { ...approvedParties.value, [heroId]: [...approved, partyId] };
    save();
  }

  function setDefaultWindow(window: RaidWindow): void {
    defaultWindow.value = window;
    hasChosenWindow = true;
    save();
  }

  /** The raids of a party, newest first */
  function raidsOf(partyId: string): Raid[] {
    const ofParty = raids.value.filter((raid) => raid.partyId === partyId);
    return [...ofParty].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  }

  /** The party's raid that is still being fought at `now` */
  function activeRaidOf(partyId: string, now: Date = new Date()): Raid | undefined {
    return raidsOf(partyId).find((raid) => raidState(raid, now).status === "active");
  }

  /** Every raid being fought at `now` that this hero may strike */
  function activeRaidsFor(heroId: string, now: Date = new Date()): Raid[] {
    return raids.value.filter((raid) => {
      const isMember = raid.memberIds.includes(heroId);
      const isActive = raidState(raid, now).status === "active";
      return isMember && isActive;
    });
  }

  /** Starts the household's raid, or answers the one already being fought: a household has one beast at a time */
  function startHomeRaid(args: HomeRaidArgs): Raid {
    const running = activeRaidOf(HOME_PARTY_ID);
    if (running) return running;
    const memberIds = [...new Set(args.memberIds)];
    const raid: Raid = {
      id: uuidv4(),
      partyId: HOME_PARTY_ID,
      beastId: args.beastId,
      window: args.window,
      startedAt: new Date().toISOString(),
      maxHp: raidMaxHp(args.window, memberIds.length),
      memberIds,
      strikes: [],
    };
    raids.value = [...raids.value, raid];
    save();
    return raid;
  }

  /** Counts one strike on a raid; the raid after it, or null for a raid this device does not know */
  function strike(raidId: string, blow: Strike): Raid | null {
    const before = raids.value.find((raid) => raid.id === raidId);
    if (!before) return null;
    const after = addStrike(before, blow);
    const isChanged = after !== before;
    if (isChanged) {
      raids.value = raids.value.map((raid) => (raid.id === raidId ? after : raid));
      save();
    }
    return after;
  }

  /** What the hero is owed from a felled raid, once: the first claim gets it and marks it paid, any other gets nothing */
  function claimReward(raidId: string, heroId: string): RaidReward | null {
    const key = rewardKey(raidId, heroId);
    const raid = raids.value.find((counted) => counted.id === raidId);
    const reward = raid ? rewardFor(raid, heroId) : null;
    const isPaid = paid.value.includes(key);
    const isOwed = reward !== null && !isPaid;
    if (!isOwed) return null;
    paid.value = [...paid.value, key];
    save();
    return reward;
  }

  /** Takes what the site last said about the family's parties and join requests, replacing the last answer whole */
  function applyServer(answer: MyParties): void {
    outside.value = answer.parties;
    incoming.value = answer.incoming;
    outgoing.value = answer.outgoing;
    cacheRaids(answer.parties);
  }

  /**
   * Keeps a copy of each party's raid beside the household's own (so health, state and the reward rules read one way),
   * the site's copy winning. A raid the party has moved on from stays until the party itself is gone, so loot not yet
   * claimed can still be claimed. Saved to the device only when a copy changed.
   */
  function cacheRaids(parties: WireParty[]): void {
    const present = new Set(parties.map((party) => party.id));
    const fresh = parties.map(raidFromParty).filter((raid): raid is Raid => raid !== null);
    const freshIds = new Set(fresh.map((raid) => raid.id));
    const stays = (raid: Raid): boolean => (raid.partyId === HOME_PARTY_ID || present.has(raid.partyId)) && !freshIds.has(raid.id);
    const next = [...raids.value.filter(stays), ...fresh];
    const isChanged = JSON.stringify(next) !== JSON.stringify(raids.value);
    if (!isChanged) return;
    raids.value = next;
    save();
  }

  /** Waits to send a strike to the site: once for a raid and key, however often it is queued */
  function queueStrike(strike: QueuedStrike): void {
    const isQueued = outbox.value.some((queued) => queued.raidId === strike.raidId && queued.key === strike.key);
    if (isQueued) return;
    outbox.value = [...outbox.value, strike];
    save();
  }

  /** Takes the queue the sender leaves after a try */
  function setOutbox(left: QueuedStrike[]): void {
    outbox.value = left;
    save();
  }

  /** Forgets everything the site said (a family without XP Pro, or one that unlinked, sees no outside parties) */
  function clearServer(): void {
    outside.value = [];
    incoming.value = [];
    outgoing.value = [];
    events.value = {};
  }

  /** Swaps in a fresher copy of a party the store already holds (a party it never heard of is left to the next full answer) */
  function replaceOutside(fresh: WireParty): void {
    outside.value = outside.value.map((party) => (party.id === fresh.id ? fresh : party));
  }

  function outsideParty(partyId: string): WireParty | undefined {
    return outside.value.find((party) => party.id === partyId);
  }

  function eventsOf(partyId: string): WireEvent[] {
    return events.value[partyId] ?? [];
  }

  /** The number of the newest event held for a party, or 0 */
  function lastSeq(partyId: string): number {
    const held = eventsOf(partyId);
    const newest = held[held.length - 1];
    return newest ? newest.seq : 0;
  }

  /** Adds events to a party's feed: in order, each number once, and only the newest fifty kept */
  function appendEvents(partyId: string, fresh: WireEvent[]): void {
    const bySeq = new Map([...eventsOf(partyId), ...fresh].map((event) => [event.seq, event]));
    const merged = [...bySeq.values()].sort((a, b) => a.seq - b.seq).slice(-EVENTS_KEPT);
    events.value = { ...events.value, [partyId]: merged };
  }

  return {
    heroModes,
    approvedParties,
    raids,
    paid,
    defaultWindow,
    outbox,
    outside,
    incoming,
    outgoing,
    load,
    modeOf,
    heroCard,
    setMode,
    isApproved,
    approveParty,
    setDefaultWindow,
    raidsOf,
    activeRaidOf,
    activeRaidsFor,
    startHomeRaid,
    strike,
    claimReward,
    applyServer,
    queueStrike,
    setOutbox,
    clearServer,
    replaceOutside,
    outsideParty,
    eventsOf,
    lastSeq,
    appendEvents,
  };
});
