/**
 * The PIN pad's lockout: a few free tries, then a wait that doubles with every further wrong PIN.
 * Kept per profile on the device (localStorage), so closing and reopening the pad does not reset it.
 * The rules are pure; the small store at the bottom is the only part that touches storage.
 */

/** Wrong PINs allowed before the first wait */
export const FREE_TRIES = 5;
/** The first wait, doubled for each wrong PIN after that */
export const FIRST_LOCK_MS = 30_000;
/** The longest wait */
export const MAX_LOCK_MS = 15 * 60_000;

export interface LockoutState {
  /** Wrong tries in a row */
  fails: number;
  /** Epoch ms until which the pad refuses tries (0: not locked) */
  lockedUntil: number;
}

export const NO_LOCKOUT: LockoutState = { fails: 0, lockedUntil: 0 };

/** How long the pad waits after the `fails`-th wrong try in a row */
export const lockMsAfter = (fails: number): number => {
  const isFree = fails < FREE_TRIES;
  if (isFree) return 0;
  return Math.min(FIRST_LOCK_MS * 2 ** (fails - FREE_TRIES), MAX_LOCK_MS);
};

/** The state after one more wrong try */
export const recordWrongTry = (state: LockoutState, now: number): LockoutState => {
  const fails = state.fails + 1;
  const wait = lockMsAfter(fails);
  return { fails, lockedUntil: wait ? now + wait : 0 };
};

/** Milliseconds left on the wait, 0 when the pad takes tries */
export const msLeft = (state: LockoutState, now: number): number => Math.max(0, state.lockedUntil - now);

/** "0:27" or "4:05" for the wait left */
export const formatWait = (ms: number): string => {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

// --- Storage ---

const STORAGE_KEY = "xp_pin_lockout";

type LockoutMap = Record<string, LockoutState>;

const readAll = (): LockoutMap => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeAll = (map: LockoutMap): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // chemx-allow: best-effort storage blocked (private mode): the lockout only lasts while the pad is open
  }
};

const isLockoutState = (value: unknown): value is LockoutState =>
  Boolean(value) && Number.isFinite((value as LockoutState).fails) && Number.isFinite((value as LockoutState).lockedUntil);

/** The saved lockout for a profile */
export const readLockout = (profileId: string): LockoutState => {
  const saved = readAll()[profileId];
  return isLockoutState(saved) ? saved : NO_LOCKOUT;
};

/** Saves the lockout for a profile; a clean state removes the entry */
export const saveLockout = (profileId: string, state: LockoutState): void => {
  const map = readAll();
  const isClean = state.fails === 0;
  if (isClean) delete map[profileId];
  else map[profileId] = state;
  writeAll(map);
};
