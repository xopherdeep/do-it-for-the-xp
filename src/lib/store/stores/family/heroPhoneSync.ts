import { ref, type Ref } from "vue";
import { getHeroPhoneDb } from "@/lib/databases/HeroPhoneDb";
import type { HeroDevice } from "@/lib/databases/HeroDeviceDb";
import { enqueue, resetSending } from "@/lib/services/multiplayer/eventOutbox";
import { questClaimedEvent, type FamilyEvent } from "@/lib/services/multiplayer/familyEvents";
import { familyProblem, fetchEvents, type FamilyProblem, type ReceivedEvent } from "@/lib/services/multiplayer/familyServer";
import type { SheetQuest } from "@/lib/services/multiplayer/heroSheet";
import { addClaim, applyReceived, emptyPhoneState, refuseClaims, trimClaims, type HeroPhoneState } from "@/lib/services/multiplayer/phoneClaims";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";
import debug from "@/lib/utils/debug";
import { createFamilySender } from "./familySender";

/**
 * A linked hero phone's sync (two-phone play, FAMILY_EVENTS.md): the hero claims quests here with the phone's hero key,
 * and reads back the family device's answers and the hero's sheet. The phone keeps its claims in HeroPhoneDb, so a
 * claim made offline waits there, survives a restart, and goes when the connection is back.
 *
 * Bound to the family store the way the sender and the card queue are: the store hands over the device record and what
 * an unlinked phone means.
 */
export interface PhoneSyncContext {
  /** The phone's device record while it is linked (and not marked unlinked) */
  device(): HeroDevice | null;
  /** The site no longer takes the phone's key */
  revoked(): Promise<void>;
  /** The phone starts reading its events from their beginning (just linked): family sync marks the moment, before any read */
  fromStart(): Promise<void>;
  /** A page of events was read: a Pro phone in the full portal takes its hero's verdicts, rewards and re-sent claims (family sync) */
  received(events: ReceivedEvent[]): Promise<void>;
}

export interface HeroPhoneSync {
  /** What the phone keeps, for the screen (claims, sheet, the send queue) */
  state: Ref<HeroPhoneState>;
  /** The last thing that went wrong, until a sync goes well */
  problem: Ref<FamilyProblem | null>;
  /** Loads what the phone kept; once */
  load(): Promise<void>;
  /** The hero finished a quest from the sheet: the claim is kept and queued, and sent at once when it can be */
  claim(quest: SheetQuest): Promise<void>;
  /** Another event of the hero's own (a claim sent again after a takeover) goes out with the phone's key */
  queue(build: (deviceId: string) => FamilyEvent): Promise<void>;
  /** Sends what waits, then reads what the family device answered; a call while one runs joins it */
  sync(): Promise<void>;
  /** The phone starts fresh: its claims and sheet are dropped */
  clear(): Promise<void>;
  dispose(): void;
}

/** Pages read per sync, at most, so a phone that was offline for long catches up over a few syncs */
const MAX_PAGES = 5;
const PAGE = 100;

export const createHeroPhoneSync = (ctx: PhoneSyncContext): HeroPhoneSync => {
  const state = ref<HeroPhoneState>(emptyPhoneState());
  const problem = ref<FamilyProblem | null>(null);
  let loading: Promise<void> | null = null;
  let writing: Promise<void> = Promise.resolve();

  const load = (): Promise<void> => {
    if (!loading) {
      loading = (async () => {
        const stored = await getHeroPhoneDb().getState();
        // A claim still marked sending was out when the app closed; its answer was never read, so it goes again
        state.value = { ...stored, outbox: resetSending(stored.outbox) };
      })().catch((error) => {
        loading = null;
        throw error;
      });
    }
    return loading;
  };

  /** One save at a time, so a claim made during a sync is never lost to the sync's own save */
  const update = (change: (current: HeroPhoneState) => HeroPhoneState): Promise<void> => {
    const run = writing.then(async () => {
      await load();
      const next = change(state.value);
      await getHeroPhoneDb().saveState(next);
      state.value = next;
    });
    writing = run.catch(() => undefined);
    return run;
  };

  const heroAuth = (): TownHallAuth | null => {
    const device = ctx.device();
    return device && !device.unlinked ? { kind: "hero", key: device.key } : null;
  };

  const noteProblem = async (found: FamilyProblem): Promise<void> => {
    problem.value = found;
    const isRevoked = found === "key-revoked" || found === "unlinked";
    if (isRevoked) await ctx.revoked();
  };

  const sender = createFamilySender<HeroPhoneState>({
    maySend: () => heroAuth() !== null,
    auth: heroAuth,
    kept: async () => {
      await load();
      return state.value;
    },
    update,
    moved: async () => undefined,
    refused: noteProblem,
    rejected: (ids) => update((current) => refuseClaims(current, ids)),
  });

  let downloading: Promise<void> | null = null;

  const runDownload = async (): Promise<void> => {
    const device = ctx.device();
    const auth = heroAuth();
    const isLinked = device !== null && auth !== null;
    if (!isLinked) return;
    await load();
    const isFromStart = state.value.lastSeq === 0;
    if (isFromStart) await ctx.fromStart().catch((error) => debug.warn("hero phone: could not mark where its events start", error));
    for (let page = 0; page < MAX_PAGES; page++) {
      const since = state.value.lastSeq;
      const events = await fetchEvents(auth, since, PAGE);
      const hasEvents = events.length > 0;
      if (!hasEvents) break;
      await update((current) => trimClaims(applyReceived(current, events, device.heroId)));
      // What the full portal takes never stops the phone's own sync: it is logged, and the page counts as read
      await ctx.received(events).catch((error) => debug.warn("hero phone: could not take the family's events", error));
      const isLastPage = events.length < PAGE || state.value.lastSeq <= since;
      if (isLastPage) break;
    }
  };

  const download = (): Promise<void> => {
    if (!downloading) {
      downloading = runDownload().finally(() => {
        downloading = null;
      });
    }
    return downloading;
  };

  let syncing: Promise<void> | null = null;

  const runSync = async (): Promise<void> => {
    try {
      await sender.sendEverything();
      await download();
      problem.value = null;
    } catch (error) {
      const found = familyProblem(error);
      const isUnexplained = found === "server";
      if (isUnexplained) debug.warn("hero phone: the sync failed", error);
      await noteProblem(found);
    }
  };

  const sync = (): Promise<void> => {
    if (!syncing) {
      syncing = runSync().finally(() => {
        syncing = null;
      });
    }
    return syncing;
  };

  const claim = async (quest: SheetQuest): Promise<void> => {
    const device = ctx.device();
    if (!device) return;
    const e = questClaimedEvent(device.heroId, device.deviceId, {
      questId: quest.questId,
      difficulty: quest.difficulty,
      requiresApproval: quest.needsApproval,
    });
    await update((current) => {
      const withClaim = addClaim(current, e.id, quest, e.at);
      return { ...withClaim, outbox: enqueue(withClaim.outbox, e) };
    });
    sync().catch((error) => debug.warn("hero phone: could not send the claim", error));
  };

  const queue = async (build: (deviceId: string) => FamilyEvent): Promise<void> => {
    const device = ctx.device();
    if (!device) return;
    const e = build(device.deviceId);
    await update((current) => ({ ...current, outbox: enqueue(current.outbox, e) }));
    sync().catch((error) => debug.warn("hero phone: could not send an event", error));
  };

  const clear = async (): Promise<void> => {
    await writing;
    await getHeroPhoneDb().clearState();
    state.value = emptyPhoneState();
  };

  return { state, problem, load, claim, queue, sync, clear, dispose: sender.dispose };
};
