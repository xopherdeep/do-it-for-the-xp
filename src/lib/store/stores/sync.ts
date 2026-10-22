import { Capacitor } from "@capacitor/core";
import { defineStore } from "pinia";
import { computed, onScopeDispose, ref, watch } from "vue";
import { emptySyncState, getSyncDb, type SyncState } from "@/lib/databases/SyncDb";
import { familyDeviceLabel } from "@/lib/services/multiplayer/deviceLink";
import { familyProblem, type FamilyProblem } from "@/lib/services/multiplayer/familyServer";
import { multiplayerEnabled } from "@/lib/services/multiplayer/multiplayerFlag";
import { storedTurnsOf, type HeroTurn, type TurnState } from "@/lib/services/sync/heroTurn";
import { onRecordWritten, onStoreRestored } from "@/lib/services/sync/recordSignals";
import { createWorkLane, type Work } from "@/lib/services/sync/workLane";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useProStore } from "@/lib/store/stores/pro";
import { useUserStore } from "@/lib/store/stores/user";
import { getSavedUserId } from "@/lib/store/stores/user/session";
import debug from "@/lib/utils/debug";
import { readRawRecord } from "@/lib/services/sync/recordApply";
import { createChangeCapture } from "./sync/changeCapture";
import { createHeroTurns } from "./sync/heroTurns";
import { createRecordTransfer } from "./sync/recordTransfer";
import { createSyncPauses } from "./sync/syncPauses";
import { createSyncProgress } from "./sync/syncProgress";
import { listenToDevice } from "./sync/syncSignals";
import { createVerdicts } from "./sync/verdicts";

/** A change is sent this long after the last one, so a burst of writes goes in one put */
const UPLOAD_DELAY_MS = 5_000;
/** The round (records up and down, and for a family device the family's events) runs every minute while the app is open */
const TICK_MS = 60_000;
const PROFILES = "__profiles";

/**
 * Family Sync on this device (section 4 of the family sync spec): every write to a synced store is queued and uploaded,
 * the family's records are downloaded and land in the raw stores, and a device that joins runs the first push (a family
 * device) or the first pull (a kid phone). It sends and reads only while `isOn`: the flag on, the family Pro, and this
 * device a bound parent device or a linked kid phone. A device that has synced keeps queueing its writes while Pro is
 * lapsed or refused, so they go when it is back; a device that never synced does nothing, and the game is as it was.
 *
 * Bound to the family store for the sign-in and the device, to the Pro store for the licence, and to the user store for
 * the hero signed in here. Every transfer goes through one work lane (services/sync/workLane.ts), so no upload and
 * download ever overlap and every round uploads before it downloads; a download never lands a record changed here that
 * the site has not settled, unless it is a hero's record from the device holding that hero's turn (sync/heroTurns.ts).
 */
export const useSyncStore = defineStore("sync", () => {
  const family = useFamilyStore();
  const pro = useProStore();
  const user = useUserStore();

  const state = ref<SyncState>(emptySyncState());
  /** The last thing the site refused or could not do, until a call goes well */
  const problem = ref<FamilyProblem | null>(null);
  /** The first sync's progress lines: records pulled, a pull stalled on its hero, records pushed (sync/syncProgress.ts) */
  const progress = createSyncProgress();
  /** heroId -> the hero's turn on this device, changed only through heroTurn.ts's reducer (sync/heroTurns.ts) */
  const turns = ref<Record<string, HeroTurn>>({});
  /** The hero another device took over while this one played, until the portal has said so (it sets it back to null) */
  const tookOverNotice = ref<string | null>(null);

  /** A kid phone whose hero key the site has not refused */
  const isLinkedPhone = computed(() => family.isKidMode && family.device?.unlinked !== true);
  /** A Game Master's device with the Town Hall link that the site has answered */
  const isBoundParent = computed(() => !family.isKidMode && family.parentAuth !== null && family.home !== "unknown");
  const isJoined = computed(() => isBoundParent.value || isLinkedPhone.value);
  const isOn = computed(() => {
    const isLicensed = multiplayerEnabled() && pro.isPro;
    return isLicensed && isJoined.value;
  });
  /**
   * Writes are queued while the device syncs, and whenever it has ever synced: a lapse, a refusal or a lost link stops
   * the sending only (only leaving the family clears it), so a change made meanwhile is never overwritten after it
   */
  const isCapturing = computed(() => {
    const hasSynced = state.value.firstPushDone || state.value.firstPullDone;
    return multiplayerEnabled() && (isOn.value || hasSynced);
  });
  const isFamilyDevice = computed(() => isOn.value && isBoundParent.value);
  const isFullPortal = computed(() => isOn.value && isLinkedPhone.value && state.value.firstPullDone);
  /** What the site calls this device where a hero's turn is busy */
  const deviceLabel = computed(() => {
    const width = typeof window === "undefined" ? 0 : window.innerWidth;
    return family.device?.label ?? familyDeviceLabel(Capacitor.getPlatform(), width);
  });

  /** The kid phone's hero key, or the parent's Town Hall sign-in */
  const syncAuth = (): TownHallAuth | null => {
    const phone = family.device;
    if (!phone) return family.parentAuth;
    return phone.unlinked ? null : { kind: "hero", key: phone.key };
  };

  // --- What this device keeps (SyncDb), one save at a time ---

  let loading: Promise<void> | null = null;
  let writing: Promise<void> = Promise.resolve();
  /** Bumped by reset(): work that started before it saves nothing after it */
  let generation = 0;

  function load(): Promise<void> {
    if (!loading) {
      loading = getSyncDb()
        .getState()
        .then((stored) => {
          state.value = stored;
        })
        .catch((error) => {
          loading = null;
          throw error;
        });
    }
    return loading;
  }

  /**
   * Saves a change; `startedIn` is the generation the work began in, and a reset since then drops the change. A change
   * that answers the very state it was given saves nothing
   */
  function update(change: (current: SyncState) => SyncState, startedIn = generation): Promise<void> {
    const run = writing.then(async () => {
      const isStale = startedIn !== generation;
      if (isStale) return;
      await load();
      const next = change(state.value);
      const isUnchanged = next === state.value;
      if (isUnchanged) return;
      await getSyncDb().saveState(next);
      state.value = next;
    });
    writing = run.catch(() => undefined);
    return run;
  }

  // --- When the site says no (sync/syncPauses.ts) ---

  const pauses = createSyncPauses({
    recheckPro: async () => {
      await pro.recheck().catch((error: unknown) => debug.warn("sync: could not recheck the licence", error));
      return pro.isPro;
    },
    wake: () => {
      if (!disposed) requestNow("round");
    },
  });

  async function noteFailure(error: unknown): Promise<void> {
    const found = familyProblem(error);
    problem.value = found;
    const isUnexplained = found === "server";
    if (isUnexplained) debug.warn("sync: the site could not do that", error);
    await pauses.failed(found, error);
  }

  function succeeded(): void {
    problem.value = null;
    pauses.succeeded();
  }

  /** The sign-in for a call now, or null while the sync is off or a pause runs */
  const mayCall = (): TownHallAuth | null => {
    const mayGo = isOn.value && !pauses.isPaused();
    return mayGo ? syncAuth() : null;
  };

  // --- Change capture (sync/changeCapture.ts) ---

  const capture = createChangeCapture({
    isCapturing: () => isCapturing.value,
    phoneHero: () => family.device?.heroId ?? null,
    update: (change) => update(change),
    queued: () => uploadSoon(),
  });
  const { changes } = capture;

  // --- Sending and reading: one lane (sync/recordTransfer.ts does the work) ---

  /** The first sync this device still owes */
  const owes = (): "pull" | "push" | null => {
    const owesPull = isOn.value && isLinkedPhone.value && !state.value.firstPullDone;
    if (owesPull) return "pull";
    const owesPush = isFamilyDevice.value && !state.value.firstPushDone;
    return owesPush ? "push" : null;
  };

  const transfer = createRecordTransfer({
    kept: async () => {
      await load();
      return state.value;
    },
    update,
    generation: () => generation,
    auth: mayCall,
    changes,
    isLocal: (store, key) => changes.has(store, key) || state.value.outbox.some((item) => item.store === store && item.key === key),
    owes,
    succeeded,
    pulled: (count) => {
      const isFirstPull = owes() === "pull";
      if (isFirstPull) progress.pulled(count);
    },
    pushing: (total) => progress.pushing(total),
    hasArrived: async () => {
      const phoneHero = family.device?.heroId;
      return phoneHero ? (await readRawRecord(PROFILES, phoneHero)) !== null : true;
    },
    maySend: (heroId) => heroTurns.maySendNow(heroId),
    isPlayedHere: (heroId) => heroTurns.keepsLocal(heroId),
    confirmTurns: () => heroTurns.confirm(),
    turnLost: (heroIds) => heroTurns.lost(heroIds),
    refused: (records) => {
      verdicts.resendClaims(records).catch((error) => debug.warn("sync: could not send a claim again", error));
    },
  });

  /** Whether the last catch-up job reached the newest record (reset as the job starts, so one that throws answers false) */
  let caughtUp = false;
  const WORK: Record<Work, () => Promise<unknown>> = {
    upload: transfer.upload,
    download: transfer.download,
    round: transfer.round,
    catchUp: async () => {
      caughtUp = false;
      caughtUp = await transfer.catchUp();
    },
  };

  /** One job of the lane; what went wrong lands in `problem`, and the job never rejects */
  async function runWork(work: Work): Promise<void> {
    try {
      await WORK[work]();
    } catch (error) {
      await noteFailure(error);
    }
  }

  /** A lane of this generation: a job still waiting on it when a reset swaps the lane never starts */
  const laneOf = (born: number) => createWorkLane((work) => (born === generation ? runWork(work) : Promise.resolve()));
  let lane = laneOf(generation);

  /** Sends what waits */
  const upload = (): Promise<void> => lane.request("upload");
  /** Reads up to 5 pages of the family's records */
  const download = (): Promise<void> => lane.request("download");
  /** Uploads what waits, then downloads (the first push or pull while one is owed) */
  const flush = (): Promise<void> => lane.request("round");
  /** Sends what waits, then reads to the newest record; false when it could not get there (offline, a read held back, a failure) */
  const catchUp = async (): Promise<boolean> => {
    await writing;
    await lane.request("catchUp");
    return caughtUp;
  };

  /** After a round, outside the lane: the heroes whose records wait here go on borrowed turns, then the verdicts that wait are tried */
  const afterRound = (): Promise<void> => heroTurns.lendWaiting().then(() => verdicts.retry());

  /** Asks the lane for the work, and after a round what follows one */
  function requestNow(work: Work): void {
    const isRound = work === "round";
    lane
      .request(work)
      .then(() => (isRound ? afterRound() : undefined))
      .catch((error) => debug.warn(`sync: the ${work} failed`, error));
  }

  // --- The hero's turn (sync/heroTurns.ts) ---

  const heroTurns = createHeroTurns({
    turns,
    tookOverNotice,
    isOn: () => isOn.value,
    auth: () => (isOn.value ? syncAuth() : null),
    label: () => deviceLabel.value,
    // Waits for the writes just queued (a verdict's pay, the last move before Save & Quit), then sends
    upload: async () => {
      await writing;
      await upload();
    },
    catchUp,
    readHere: () => transfer.readToEnd(),
    flush,
    // The pending claims a takeover drops unsent go again, phone-style (sync/verdicts.ts)
    dropHero: async (heroId) => verdicts.resendDropped(await transfer.dropHero(heroId)),
    queueWhole: async (heroId) => {
      await writing;
      await transfer.queueHero(heroId);
    },
    // Saved for a restart only when what a restart needs changed (held or not), never for each ask; worked out as the save
    // runs, against what was saved before it, so a quick held, resting, held never leaves the middle one saved
    turnsChanged: () => {
      update((current) => {
        const kept = storedTurnsOf(turns.value);
        const isSame = JSON.stringify(kept) === JSON.stringify(current.turns);
        return isSame ? current : { ...current, turns: kept };
      }).catch((error) => debug.warn("sync: could not save the turns", error));
    },
    answered: () => {
      succeeded();
      pauses.connectionBack();
    },
    notPro: (error) => void noteFailure(error),
    waiting: () => waitingHeroes(),
    current: () => currentHero(),
    hasHero: (heroId) => Boolean(user.users?.[heroId]),
    mayLend: () => isOn.value && !pauses.isPaused(),
  });

  // --- Verdicts and claims under one writer (sync/verdicts.ts) ---

  const verdicts = createVerdicts({
    kept: async () => {
      await load();
      return state.value;
    },
    update,
    generation: () => generation,
    withTurn: (heroId, fn) => heroTurns.withTurn(heroId, fn),
    queueEvent: (heroId, build) => family.queueApprovalEvent(heroId, build),
    tellPhone: (heroId, settled) => family.tellPhone(heroId, settled),
    retakeEvents: (events) => family.retakeEvents(events),
  });

  /** The heroes whose records wait in the outbox, in queue order */
  const waitingHeroes = (): string[] => Array.from(new Set(state.value.outbox.flatMap((item) => (item.heroId === null ? [] : [item.heroId]))));

  /** The hero signed in on this device, if any; before the profiles load, the one the app will sign in again */
  const currentHero = (): string | null => {
    const id = user.currentUser?.id || getSavedUserId();
    return id ? String(id) : null;
  };

  // --- When it runs ---

  const stops: (() => void)[] = [];
  let uploadTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let initPromise: Promise<void> | null = null;

  /** Sends 5 s after the last change (and downloads after it) */
  function uploadSoon(): void {
    if (disposed) return;
    clearTimeout(uploadTimer);
    uploadTimer = setTimeout(() => {
      uploadTimer = undefined;
      requestNow("round");
    }, UPLOAD_DELAY_MS);
  }

  /** The minute round; on a family device the family store's event download rides on it (its own 2 minute round stands down) */
  function onTick(): void {
    if (!isOn.value) return;
    flush()
      .then(afterRound)
      .then(() => (isFamilyDevice.value ? family.downloadRound() : undefined))
      .catch((error) => debug.warn("sync: the minute round failed", error));
  }

  /** The connection may be back (online, the app in front): a failed call's pause ends now, a 429's or Pro's does not */
  function roundNow(): void {
    pauses.connectionBack();
    requestNow("round");
  }

  /** In front: a round, and the hero the background rested signs in again. Going away: the hero rests, or what waits is sent */
  function onVisibilityChange(isInFront: boolean): void {
    const hero = currentHero();
    if (isInFront) {
      roundNow();
      heroTurns.visible(hero);
      return;
    }
    const isResting = heroTurns.hidden(hero);
    if (!isResting) requestNow("upload");
  }

  function listen(): void {
    stops.push(onRecordWritten(capture.onWrite));
    stops.push(
      onStoreRestored((restored) => {
        capture.onRestored(restored).catch((error) => debug.warn("sync: could not queue a restore", error));
      })
    );
    // Turned on (a bind answered, a phone linked, Pro bought or back): the first push or pull, or a round; the hero signs in
    stops.push(
      watch(isOn, (isNowOn) => {
        if (!isNowOn) return;
        requestNow("round");
        heroTurns.switched(null, currentHero());
      })
    );
    // A profile switch, a sign-in or a sign-out: the hero who played rests, the next one signs in
    stops.push(watch(currentHero, (next, previous) => heroTurns.switched(previous ?? null, next)));
    // The connection back, the app to the front or the background, the minute round (sync/syncSignals.ts)
    stops.push(listenToDevice({ online: roundNow, visibility: onVisibilityChange, tick: onTick }, TICK_MS));
    // A kid phone's first pull waiting on its hero: after five minutes the card shows, and the rounds keep pulling
    stops.push(progress.watchStall(() => owes() === "pull"));
  }

  /**
   * Loads what this device kept and starts listening; the first round starts without being waited for, so a screen that
   * awaits init never waits for the site. Once; a second call is the same promise. With the flag off it does nothing.
   */
  function init(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        if (!multiplayerEnabled()) return;
        await load();
        // The heroes this device held when it stopped are held again, provisionally, until the site answers
        heroTurns.restore(Object.keys(state.value.turns).filter((heroId) => state.value.turns[heroId] === "held"));
        listen();
        if (!isOn.value) return;
        requestNow("round");
        heroTurns.switched(null, currentHero());
      })().catch((error) => {
        initPromise = null;
        throw error;
      });
    }
    return initPromise;
  }

  /** The device left the family, or a phone is linked anew: the queue, the numbers and the turns go, and nothing waits to be sent */
  async function reset(): Promise<void> {
    generation++;
    clearTimeout(uploadTimer);
    uploadTimer = undefined;
    pauses.clear();
    changes.clear();
    transfer.forget();
    // A request still out for the old link must not hold up the new one
    lane = laneOf(generation);
    heroTurns.forget();
    turns.value = {};
    problem.value = null;
    progress.reset();
    const cleared = writing.then(async () => {
      await getSyncDb().clearState();
      state.value = emptySyncState();
    });
    writing = cleared.catch(() => undefined);
    await cleared;
  }

  onScopeDispose(() => {
    disposed = true;
    stops.splice(0).forEach((stop) => stop());
    clearTimeout(uploadTimer);
    pauses.clear();
  });

  /**
   * What this device knows of a hero's turn, or null with none on record: the gate of the reminders and the encounter clock
   * reads it (sync/watchGate.ts). A hero whose busy turn the player declined reads busy: it is known to be played elsewhere
   */
  const stateOf = (heroId: string): TurnState | null => (heroTurns.isDeclined(heroId) ? "busy" : turns.value[heroId]?.state ?? null);

  return {
    state,
    problem,
    firstPullProgress: progress.firstPullProgress,
    firstPullStalled: progress.firstPullStalled,
    firstPushProgress: progress.firstPushProgress,
    turns,
    tookOverNotice,
    isOn,
    isCapturing,
    isFamilyDevice,
    isFullPortal,
    deviceLabel,
    init,
    flush,
    upload,
    download,
    reset,
    // The hero's turn (sync/heroTurns.ts): holds, signIn (granted, busy or offline), takeOver, rest, withTurn
    holds: heroTurns.holds,
    stateOf,
    signIn: heroTurns.signIn,
    takeOver: heroTurns.takeOver,
    rest: heroTurns.rest,
    withTurn: heroTurns.withTurn,
    borrow: heroTurns.borrow,
    // Verdicts sent and taken, claims and rewards kept for the next round, the start of the events read (sync/verdicts.ts)
    sendVerdict: verdicts.send,
    takeVerdicts: verdicts.take,
    keepEvents: verdicts.keepEvents,
    markHistory: verdicts.markHistory,
  };
});
