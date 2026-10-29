import { defineStore } from "pinia";
import { ref } from "vue";
import { v4 as uuidv4 } from "uuid";
import { getPartyDb } from "@/lib/databases/PartyDb";
import { HOME_PARTY_ID, defaultModeFor, type HeroPartyMode } from "@/lib/services/party/partyRules";
import { cleanPartyState, type PartyState } from "@/lib/services/party/partyState";
import {
  addStrike,
  raidMaxHp,
  raidState,
  rewardFor,
  type Raid,
  type RaidReward,
  type RaidWindow,
  type Strike,
} from "@/lib/services/party/raidRules";
import debug from "@/lib/utils/debug";
import { useUserStore } from "./user";

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
  const raidAlerts = ref(true);

  const snapshot = (): PartyState => ({
    heroModes: heroModes.value,
    approvedParties: approvedParties.value,
    raids: raids.value,
    paid: paid.value,
    defaultWindow: defaultWindow.value,
    raidAlerts: raidAlerts.value,
  });

  function save(): void {
    getPartyDb()
      .saveState(snapshot())
      .catch((error) => debug.error("party: could not save", error));
  }

  async function load(): Promise<void> {
    const saved = cleanPartyState(await getPartyDb().getState());
    heroModes.value = saved.heroModes;
    approvedParties.value = saved.approvedParties;
    raids.value = saved.raids;
    paid.value = saved.paid;
    defaultWindow.value = saved.defaultWindow;
    raidAlerts.value = saved.raidAlerts;
  }

  function modeOf(heroId: string): HeroPartyMode {
    const chosen = heroModes.value[heroId];
    const isAdult = Boolean(useUserStore().users[heroId]?.isAdult);
    return chosen ?? defaultModeFor(isAdult);
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
    save();
  }

  function setRaidAlerts(on: boolean): void {
    raidAlerts.value = on;
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
    const key = `raid:${raidId}:${heroId}`;
    const raid = raids.value.find((counted) => counted.id === raidId);
    const reward = raid ? rewardFor(raid, heroId) : null;
    const isPaid = paid.value.includes(key);
    const isOwed = reward !== null && !isPaid;
    if (!isOwed) return null;
    paid.value = [...paid.value, key];
    save();
    return reward;
  }

  return {
    heroModes,
    approvedParties,
    raids,
    paid,
    defaultWindow,
    raidAlerts,
    load,
    modeOf,
    setMode,
    isApproved,
    approveParty,
    setDefaultWindow,
    setRaidAlerts,
    raidsOf,
    activeRaidOf,
    activeRaidsFor,
    startHomeRaid,
    strike,
    claimReward,
  };
});
