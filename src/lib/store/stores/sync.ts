import { Capacitor } from "@capacitor/core";
import { defineStore } from "pinia";
import { computed, onScopeDispose, ref, watch } from "vue";
import { emptySyncState, getSyncDb, type SyncState } from "@/lib/databases/SyncDb";
import { familyDeviceLabel } from "@/lib/services/multiplayer/deviceLink";
import type { ClaimSettled } from "@/lib/services/multiplayer/familyEvents";
import { familyProblem, retryAfterMs, type FamilyProblem } from "@/lib/services/multiplayer/familyServer";
import { multiplayerEnabled } from "@/lib/services/multiplayer/multiplayerFlag";
import type { HeroTurn } from "@/lib/services/sync/heroTurn";
import { readRawEntries } from "@/lib/services/sync/recordApply";
import { onRecordWritten, onStoreRestored, type RecordWrite, type StoreRestored } from "@/lib/services/sync/recordSignals";
import { heroIdOf, isSyncedStore, mayPhoneWrite } from "@/lib/services/sync/syncScopes";
import { queueAll, type QueueRef } from "@/lib/services/sync/syncQueue";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useProStore } from "@/lib/store/stores/pro";
import debug from "@/lib/utils/debug";
import { createRecordTransfer, everyRecord } from "./sync/recordTransfer";

/** A change is sent this long after the last one, so a burst of writes goes in one put */
const UPLOAD_DELAY_MS = 5_000;
/** The round (records up and down, and for a family device the family's events) runs every minute while the app is open */
const TICK_MS = 60_000;
/** A 429 that names no wait pauses the sync this long */
const RATE_LIMIT_PAUSE_MS = 60_000;

/**
 * Family Sync on this device (section 4 of the family sync spec): every write to a synced store is queued and uploaded,
 * the family's records are downloaded and land in the raw stores, and a device that joins runs the first push (a family
 * device) or the first pull (a kid phone). It runs only while `isOn`: the flag on, the family Pro, and this device a bound
 * parent device or a linked kid phone. With any of them off it does nothing and the game is as it was.
 *
 * Bound to the family store for the sign-in and the device, and to the Pro store for the licence. One upload and one
 * download at a time; a call while one runs joins it. Every round uploads before it downloads, and a downloaded record
 * whose key still waits in the outbox does not land (the local change is newer).
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
  /** The site said the family is not Pro: off until the licence says Pro again */
  const proRefused = ref(false);

  /** A kid phone whose hero key the site has not refused */
  const isLinkedPhone = computed(() => family.isKidMode && family.device?.unlinked !== true);
  /** A Game Master's device with the Town Hall link that the site has answered */
  const isBoundParent = computed(() => !family.isKidMode && family.parentAuth !== null && family.home !== "unknown");
  const isOn = computed(() => {
    const isLicensed = multiplayerEnabled() && pro.isPro && !proRefused.value;
    const isJoined = isBoundParent.value || isLinkedPhone.value;
    return isLicensed && isJoined;
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

  // --- When the site says no ---

  /** A 429 asked to wait until then (ms since the epoch) */
  let pausedUntil = 0;

  async function noteFailure(error: unknown): Promise<void> {
    const found = familyProblem(error);
    problem.value = found;
    const isUnexplained = found === "server";
    if (isUnexplained) debug.warn("sync: the site could not do that", error);
    const isRateLimited = found === "rate-limited";
    if (isRateLimited) pausedUntil = Date.now() + (retryAfterMs(error) ?? RATE_LIMIT_PAUSE_MS);
    const isNotPro = found === "pro-required";
    if (!isNotPro) return;
    proRefused.value = true;
    await pro.recheck().catch((recheckError: unknown) => debug.warn("sync: could not recheck the licence", recheckError));
  }

  /** The sign-in for a call now, or null while the sync is off or a 429's pause runs */
  const mayCall = (): TownHallAuth | null => {
    const isPaused = Date.now() < pausedUntil;
    return isOn.value && !isPaused ? syncAuth() : null;
  };

  // --- Change capture ---

  function queue(refs: QueueRef[]): void {
    update((current) => ({ ...current, outbox: queueAll(current.outbox, refs, new Date()) }))
      .then(() => uploadSoon())
      .catch((error) => debug.warn("sync: could not queue a record", error));
  }

  /** A record was written here: a synced one goes in the outbox. An announced null is a removal, never a stored record */
  function onWrite(write: RecordWrite): void {
    const isCarried = isOn.value && isSyncedStore(write.store);
    if (!isCarried) return;
    const isRemoval = write.value === null || write.value === undefined;
    const heroId = heroIdOf(write.store, write.key, isRemoval ? write.previous : write.value);
    // A kid phone sends only what the site lets it write: its own hero's records and the chat
    const phone = family.device;
    const isRefusedOnPhone = phone !== null && !mayPhoneWrite(write.store, heroId, phone.heroId);
    if (isRefusedOnPhone) return;
    queue([{ store: write.store, key: write.key, heroId }]);
  }

  /** A restore rewrote a store without announcing its records: all it holds now goes again, and each key it removed as a tombstone */
  async function onRestored(restored: StoreRestored): Promise<void> {
    const isCarried = isOn.value && isSyncedStore(restored.store);
    if (!isCarried) return;
    const { store, removedKeys, previous } = restored;
    const held = await readRawEntries(store);
    queue([
      ...removedKeys.map((key) => ({ store, key, heroId: heroIdOf(store, key, previous?.get(key)) })),
      ...held.map(({ key, value }) => ({ store, key, heroId: heroIdOf(store, key, value) })),
    ]);
  }

  // --- Sending and reading (sync/recordTransfer.ts) ---

  const transfer = createRecordTransfer({
    kept: async () => {
      await load();
      return state.value;
    },
    update,
    generation: () => generation,
    auth: mayCall,
    succeeded: () => {
      problem.value = null;
    },
    failed: noteFailure,
    pulled: (count) => {
      const isFirstPull = isLinkedPhone.value && !state.value.firstPullDone;
      if (isFirstPull) firstPullProgress.value += count;
    },
  });
  const { upload, download, pullToEnd } = transfer;

  /** Uploads what waits, then downloads */
  async function flush(): Promise<void> {
    await upload();
    await download();
  }

  // --- The first sync and the rounds ---

  /** A kid phone's first open: the family's save from 0, then the portal may open */
  async function runFirstPull(): Promise<void> {
    const startedIn = generation;
    firstPullProgress.value = 0;
    await upload();
    const isCaughtUp = await pullToEnd();
    if (!isCaughtUp) return;
    await update((current) => ({ ...current, firstPullDone: true }), startedIn);
  }

  /**
   * A family device sends every record of every synced store once. A device that has read nothing yet reads the family's
   * save first, so its own copies of records the family already holds (the starter world) do not overwrite the family's.
   */
  async function runFirstPush(): Promise<void> {
    const startedIn = generation;
    await upload();
    const isJoining = state.value.lastSeq === 0;
    const isCaughtUp = isJoining ? await pullToEnd() : true;
    if (!isCaughtUp) return;
    const refs = await everyRecord();
    await update((current) => ({ ...current, outbox: queueAll(current.outbox, refs, new Date()), firstPushDone: true }), startedIn);
    await flush();
  }

  async function runRound(): Promise<void> {
    if (!isOn.value) return;
    await load();
    const owesFirstPull = isLinkedPhone.value && !state.value.firstPullDone;
    if (owesFirstPull) return runFirstPull();
    const owesFirstPush = isFamilyDevice.value && !state.value.firstPushDone;
    if (owesFirstPush) return runFirstPush();
    await flush();
  }

  let rounding: Promise<void> | null = null;

  /** The first push or pull while one is owed, otherwise upload then download; a call while a round runs joins it */
  function round(): Promise<void> {
    if (!rounding) {
      rounding = runRound()
        .catch(noteFailure)
        .finally(() => {
          rounding = null;
        });
    }
    return rounding;
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
      flush().catch((error) => debug.warn("sync: could not send", error));
    }, UPLOAD_DELAY_MS);
  }

  /** The minute round; on a family device the family store's event download rides on it (its own 2 minute round stands down) */
  function onTick(): void {
    if (!isOn.value) return;
    round()
      .then(() => (isFamilyDevice.value ? family.downloadRound() : undefined))
      .catch((error) => debug.warn("sync: the minute round failed", error));
  }

  function roundNow(): void {
    round().catch((error) => debug.warn("sync: the round failed", error));
  }

  /** In front: a round. Going to the background: what waits is sent while the app still can */
  function onVisibilityChange(): void {
    const isInFront = document.visibilityState === "visible";
    if (isInFront) roundNow();
    else upload().catch((error) => debug.warn("sync: could not send on the way out", error));
  }

  function listen(): void {
    stops.push(onRecordWritten(onWrite));
    stops.push(
      onStoreRestored((restored) => {
        onRestored(restored).catch((error) => debug.warn("sync: could not queue a restore", error));
      })
    );
    // Turned on (a bind answered, a phone linked, Pro bought): the first push or pull, or a round
    stops.push(
      watch(isOn, (isNowOn) => {
        if (isNowOn) roundNow();
      })
    );
    // A licence that says Pro again lifts the site's refusal
    stops.push(
      watch(
        () => pro.isPro,
        (isNowPro) => {
          if (isNowPro) proRefused.value = false;
        }
      )
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
        if (isOn.value) roundNow();
      })().catch((error) => {
        initPromise = null;
        throw error;
      });
    }
    return initPromise;
  }

  /** The device left the family (a kid phone unlinked): the queue, the numbers and the turns go, and nothing waits to be sent */
  async function reset(): Promise<void> {
    generation++;
    clearTimeout(uploadTimer);
    uploadTimer = undefined;
    pausedUntil = 0;
    turns.value = {};
    problem.value = null;
    proRefused.value = false;
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
