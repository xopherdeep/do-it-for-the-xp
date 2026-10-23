import { backoffMs } from "@/lib/services/multiplayer/eventOutbox";
import { retryAfterMs, type FamilyProblem } from "@/lib/services/multiplayer/familyServer";

/**
 * When the sync store may call the site again after a failure (section 10 of the family sync spec), and the round that
 * runs when a pause ends:
 * - a failed call (offline, a 5xx, a refused key) waits the event sender's growing pause (5 s, 30 s, 2 min, 10 min,
 *   30 min), cut short when the browser is back online or the app comes back to the front;
 * - a 429 waits as long as its Retry-After (a minute when it names none);
 * - a 403 pro-required asks the licence again: lapsed, the store is off anyway (isOn follows isPro); still Pro (the site
 *   may be behind a renewal), it waits a minute, doubling each time up to 10 minutes. Neither of these is cut short.
 * A call that goes well starts the counts again.
 */
export interface PauseContext {
  /** Asks the licence again; resolves to whether it still says Pro */
  recheckPro(): Promise<boolean>;
  /** A pause ended: run a round */
  wake(): void;
}

export interface SyncPauses {
  isPaused(): boolean;
  /** A call failed for this reason */
  failed(found: FamilyProblem, error: unknown): Promise<void>;
  succeeded(): void;
  /** The connection may be back: a failed call's pause ends now */
  connectionBack(): void;
  /** Every pause and count goes, and no round waits (the device left the family, or the store is gone) */
  clear(): void;
}

/** A 429 that names no wait pauses this long */
const RATE_LIMIT_PAUSE_MS = 60_000;
const PRO_PAUSE_MS = 60_000;
const PRO_PAUSE_MAX_MS = 600_000;

export const createSyncPauses = (ctx: PauseContext): SyncPauses => {
  /** A failed call's pause: ends early when the connection may be back */
  let backoffUntil = 0;
  let failures = 0;
  /** A 429's or a Pro refusal's pause: never ends early */
  let holdUntil = 0;
  let proRefusals = 0;
  let wakeTimer: ReturnType<typeof setTimeout> | undefined;

  const wakeAt = (at: number): void => {
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(() => {
      wakeTimer = undefined;
      ctx.wake();
    }, Math.max(0, at - Date.now()));
  };

  const failed = async (found: FamilyProblem, error: unknown): Promise<void> => {
    const isNotPro = found === "pro-required";
    if (isNotPro) {
      proRefusals += 1;
      const isStillPro = await ctx.recheckPro();
      if (!isStillPro) return;
      holdUntil = Date.now() + Math.min(PRO_PAUSE_MS * 2 ** (proRefusals - 1), PRO_PAUSE_MAX_MS);
      wakeAt(holdUntil);
      return;
    }
    const isRateLimited = found === "rate-limited";
    if (isRateLimited) {
      holdUntil = Date.now() + (retryAfterMs(error) ?? RATE_LIMIT_PAUSE_MS);
      wakeAt(holdUntil);
      return;
    }
    failures += 1;
    backoffUntil = Date.now() + backoffMs(failures);
    wakeAt(backoffUntil);
  };

  const clear = (): void => {
    clearTimeout(wakeTimer);
    wakeTimer = undefined;
    backoffUntil = 0;
    holdUntil = 0;
    failures = 0;
    proRefusals = 0;
  };

  return {
    isPaused: () => {
      const now = Date.now();
      return now < backoffUntil || now < holdUntil;
    },
    failed,
    succeeded: () => {
      failures = 0;
      proRefusals = 0;
    },
    connectionBack: () => {
      backoffUntil = 0;
    },
    clear,
  };
};
