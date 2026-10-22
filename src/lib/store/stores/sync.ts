import { Capacitor } from "@capacitor/core";
import { defineStore } from "pinia";
import { computed, onScopeDispose, ref, watch } from "vue";
import { emptySyncState, getSyncDb, type SyncState } from "@/lib/databases/SyncDb";
import { familyDeviceLabel } from "@/lib/services/multiplayer/deviceLink";
import type { ClaimSettled } from "@/lib/services/multiplayer/familyEvents";
import { familyProblem, type FamilyProblem } from "@/lib/services/multiplayer/familyServer";
import { multiplayerEnabled } from "@/lib/services/multiplayer/multiplayerFlag";
import type { HeroTurn } from "@/lib/services/sync/heroTurn";
import { createLocalChanges } from "@/lib/services/sync/localChanges";
import { readRawEntries } from "@/lib/services/sync/recordApply";
import { onRecordWritten, onStoreRestored, type RecordWrite, type StoreRestored } from "@/lib/services/sync/recordSignals";
import { heroIdOf, isSyncedStore, mayPhoneWrite } from "@/lib/services/sync/syncScopes";
import { queueAll, type QueueRef } from "@/lib/services/sync/syncQueue";
import { createWorkLane, type Work } from "@/lib/services/sync/workLane";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useProStore } from "@/lib/store/stores/pro";
import debug from "@/lib/utils/debug";
import { createRecordTransfer } from "./sync/recordTransfer";
import { createSyncPauses } from "./sync/syncPauses";

/** A change is sent this long after the last one, so a burst of writes goes in one put */
const UPLOAD_DELAY_MS = 5_000;
/** The round (records up and down, and for a family device the family's events) runs every minute while the app is open */
const TICK_MS = 60_000;

/**
 * Family Sync on this device (section 4 of the family sync spec): every write to a synced store is queued and uploaded,
 * the family's records are downloaded and land in the raw stores, and a device that joins runs the first push (a family
 * device) or the first pull (a kid phone). It sends and reads only while `isOn`: the flag on, the family Pro, and this
 * device a bound parent device or a linked kid phone. A device that has synced keeps queueing its writes while Pro is
 * lapsed or refused, so they go when it is back; a device that never synced does nothing, and the game is as it was.
 *
 * Bound to the family store for the sign-in and the device, and to the Pro store for the licence. Every transfer goes
 * through one work lane (services/sync/workLane.ts), so no upload and download ever overlap and every round uploads
 * before it downloads; a download never lands a record changed here that the site has not settled.
 */
export const useSyncStore = defineStore("sync", () => {
  const family = useFamilyStore();
  const pro = useProStore();

  const state = ref<SyncState>(emptySyncState());
  /** The last thing the site refused or could not do, until a call goes well */
  const problem = ref<FamilyProblem | null>(null);
  /** Records downloaded so far by a kid phone's first pull, for its clerk line */
  const firstPullProgress = ref(0);
  /** heroId -> the hero's turn on this device (Task 17 fills it) */
  const turns = ref<Record<string, HeroTurn>>({});

  /** A kid phone whose hero key the site has not refused */
  const isLinkedPhone = computed(() => family.isKidMode && family.device?.unlinked !== true);
  /** A Game Master's device with the Town Hall link that the site has answered */
  const isBoundParent = computed(() => !family.isKidMode && family.parentAuth !== null && family.home !== "unknown");
  const isJoined = computed(() => isBoundParent.value || isLinkedPhone.value);
  const isOn = computed(() => {
    const isLicensed = multiplayerEnabled() && pro.isPro;
    return isLicensed && isJoined.value;
  });
  /** Writes are queued while the device is in the family and syncs or has synced: a lapse or a refusal stops the sending only */
  const isCapturing = computed(() => {
    const hasSynced = state.value.firstPushDone || state.value.firstPullDone;
    const isWanted = isOn.value || hasSynced;
    return multiplayerEnabled() && isJoined.value && isWanted;
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

  /** Saves a change; `startedIn` is the generation the work began in, and a reset since then drops the change */
  function update(change: (current: SyncState) => SyncState, startedIn = generation): Promise<void> {
    const run = writing.then(async () => {
      const isStale = startedIn !== generation;
      if (isStale) return;
      await load();
      const next = change(state.value);
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

  // --- Change capture ---

  const changes = createLocalChanges();

  function queue(refs: QueueRef[]): void {
    update((current) => ({ ...current, outbox: queueAll(current.outbox, refs, new Date()) }))
      .then(() => uploadSoon())
      .catch((error) => debug.warn("sync: could not queue a record", error));
  }

  /** A kid phone sends only what the site lets it write: its own hero's records and the chat */
  const isRefusedOnPhone = (store: string, heroId: string | null): boolean => {
    const phone = family.device;
    return phone !== null && !mayPhoneWrite(store, heroId, phone.heroId);
  };

  /** A record was written here: a synced one goes in the outbox. An announced null is a removal, never a stored record */
  function onWrite(write: RecordWrite): void {
    const isCarried = isCapturing.value && isSyncedStore(write.store);
    if (!isCarried) return;
    const isRemoval = write.value === null || write.value === undefined;
    const heroId = heroIdOf(write.store, write.key, isRemoval ? write.previous : write.value);
    const isRefused = isRefusedOnPhone(write.store, heroId);
    if (isRefused) return;
    // Known at once, before anything awaits: a page landing meanwhile must not overwrite it
    changes.touch(write.store, write.key);
    queue([{ store: write.store, key: write.key, heroId }]);
  }

  /** A restore rewrote a store without announcing its records: all it holds now goes again, and each key it removed as a tombstone */
  async function onRestored(restored: StoreRestored): Promise<void> {
    const isCarried = isCapturing.value && isSyncedStore(restored.store);
    if (!isCarried) return;
    const { store, removedKeys, previous } = restored;
    const held = await readRawEntries(store);
    const refs = [
      ...removedKeys.map((key) => ({ store, key, heroId: heroIdOf(store, key, previous?.get(key)) })),
      ...held.map(({ key, value }) => ({ store, key, heroId: heroIdOf(store, key, value) })),
    ].filter((ref) => !isRefusedOnPhone(ref.store, ref.heroId));
    const hasNothing = refs.length === 0;
    if (hasNothing) return;
    refs.forEach((ref) => changes.touch(ref.store, ref.key));
    queue(refs);
  }

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
      if (isFirstPull) firstPullProgress.value += count;
    },
  });

  const WORK: Record<Work, () => Promise<unknown>> = { upload: transfer.upload, download: transfer.download, round: transfer.round };

  /** One job of the lane; what went wrong lands in `problem`, and the job never rejects */
  async function runWork(work: Work): Promise<void> {
    try {
      await WORK[work]();
    } catch (error) {
      await noteFailure(error);
    }
  }

  let lane = createWorkLane(runWork);

  /** Sends what waits */
  const upload = (): Promise<void> => lane.request("upload");
  /** Reads up to 5 pages of the family's records */
  const download = (): Promise<void> => lane.request("download");
  /** Uploads what waits, then downloads (the first push or pull while one is owed) */
  const flush = (): Promise<void> => lane.request("round");

  function requestNow(work: Work): void {
    lane.request(work).catch((error) => debug.warn(`sync: the ${work} failed`, error));
  }

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
      .then(() => (isFamilyDevice.value ? family.downloadRound() : undefined))
      .catch((error) => debug.warn("sync: the minute round failed", error));
  }

  /** The connection may be back (online, the app in front): a failed call's pause ends now, a 429's or Pro's does not */
  function roundNow(): void {
    pauses.connectionBack();
    requestNow("round");
  }

  /** In front: a round. Going to the background: what waits is sent while the app still can */
  function onVisibilityChange(): void {
    const isInFront = document.visibilityState === "visible";
    if (isInFront) roundNow();
    else requestNow("upload");
  }

  function listen(): void {
    stops.push(onRecordWritten(onWrite));
    stops.push(
      onStoreRestored((restored) => {
        onRestored(restored).catch((error) => debug.warn("sync: could not queue a restore", error));
      })
    );
    // Turned on (a bind answered, a phone linked, Pro bought or back): the first push or pull, or a round
    stops.push(
      watch(isOn, (isNowOn) => {
        if (isNowOn) requestNow("round");
      })
    );
    const hasWindow = typeof window !== "undefined";
    if (hasWindow) {
      window.addEventListener("online", roundNow);
      stops.push(() => window.removeEventListener("online", roundNow));
    }
    const hasDocument = typeof document !== "undefined";
    if (hasDocument) {
      document.addEventListener("visibilitychange", onVisibilityChange);
      stops.push(() => document.removeEventListener("visibilitychange", onVisibilityChange));
    }
    const interval = setInterval(onTick, TICK_MS);
    stops.push(() => clearInterval(interval));
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
        listen();
        if (isOn.value) requestNow("round");
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
    lane = createWorkLane(runWork);
    turns.value = {};
    problem.value = null;
    firstPullProgress.value = 0;
    const cleared = writing.then(async () => {
      await getSyncDb().clearState();
      state.value = emptySyncState();
    });
    writing = cleared.catch(() => undefined);
    await cleared;
  }

  // --- The hero's turn: declared now, filled by Task 17 (signIn, takeOver, rest, withTurn) and Task 18 (sendVerdict) ---

  const holds = (heroId: string): boolean => turns.value[heroId]?.state === "held";

  /** Asks the site for the hero's turn; until Task 17 every hero plays here as before */
  const signIn = async (_heroId: string): Promise<"granted" | "busy" | "offline"> => "granted";

  /** Takes the hero's turn from the device that holds it; nothing until Task 17 */
  const takeOver = async (_heroId: string): Promise<void> => undefined;

  /** Gives the hero's turn back; nothing until Task 17 */
  const rest = async (_heroId: string): Promise<void> => undefined;

  /** Runs `fn` with the hero's turn held; until Task 17 it simply runs it */
  const withTurn = async (_heroId: string, fn: () => Promise<void>): Promise<boolean> => {
    await fn();
    return true;
  };

  /** Sends a Game Master's verdict for a hero this device does not hold; nothing until Task 18 */
  const sendVerdict = async (_settled: ClaimSettled, _heroId: string): Promise<void> => undefined;

  onScopeDispose(() => {
    disposed = true;
    stops.splice(0).forEach((stop) => stop());
    clearTimeout(uploadTimer);
    pauses.clear();
  });

  return {
    state,
    problem,
    firstPullProgress,
    turns,
    isOn,
    isFamilyDevice,
    isFullPortal,
    deviceLabel,
    init,
    flush,
    upload,
    download,
    reset,
    holds,
    signIn,
    takeOver,
    rest,
    withTurn,
    sendVerdict,
  };
});
