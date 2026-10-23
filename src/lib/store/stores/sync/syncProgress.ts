import { ref, watch, type Ref } from "vue";

/** A kid phone's first pull that has waited this long for its hero shows the hero's card (Play off) and keeps trying */
const PULL_STALL_MS = 5 * 60_000;

/**
 * What the clerk's progress lines read of the first sync (section 4 of the family sync spec): the records a kid phone's
 * first pull has landed so far, whether that pull has waited five minutes for its hero (spec section 7, "The first pull
 * is done only when the hero has arrived"), and the records a family device's first push has sent (null while none runs).
 */
export interface SyncProgress {
  firstPullProgress: Ref<number>;
  firstPullStalled: Ref<boolean>;
  firstPushProgress: Ref<number | null>;
  /** A page of the first pull landed this many records */
  pulled(count: number): void;
  /** The first push started (0), sent so many records in all, or ended (null) */
  pushing(total: number | null): void;
  /** Starts the five-minute clock whenever a first pull is owed; answers how to stop watching */
  watchStall(isPullOwed: () => boolean): () => void;
  reset(): void;
}

export const createSyncProgress = (): SyncProgress => {
  const firstPullProgress = ref(0);
  const firstPullStalled = ref(false);
  const firstPushProgress = ref<number | null>(null);
  let stallTimer: ReturnType<typeof setTimeout> | undefined;

  const watchStall = (isPullOwed: () => boolean): (() => void) => {
    const stopWatch = watch(
      isPullOwed,
      (isOwed) => {
        clearTimeout(stallTimer);
        firstPullStalled.value = false;
        if (!isOwed) return;
        stallTimer = setTimeout(() => {
          firstPullStalled.value = true;
        }, PULL_STALL_MS);
      },
      { immediate: true }
    );
    return () => {
      stopWatch();
      clearTimeout(stallTimer);
    };
  };

  const reset = (): void => {
    firstPullProgress.value = 0;
    firstPushProgress.value = null;
  };

  return {
    firstPullProgress,
    firstPullStalled,
    firstPushProgress,
    pulled: (count) => {
      firstPullProgress.value += count;
    },
    pushing: (total) => {
      firstPushProgress.value = total;
    },
    watchStall,
    reset,
  };
};
