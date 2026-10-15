/**
 * Daily streaks: how many days in a row a hero has finished at least one quest, read straight from the quest log.
 *
 * - A day counts when the hero has a quest log entry on it that was not rejected (a claim still waiting on the Game
 *   Master counts; a rejection takes the day back). Chests read the approved days only (see streakChests.ts).
 * - Today is never a miss: until midnight a streak not yet kept today is "at risk", not broken.
 * - Shields: every 7th day of a run earns a Streak Shield (two at most). A missed day spends one and the streak holds;
 *   a miss with no shield ends the run, and its shields go with it.
 *
 * Everything is derived from the log, so there is nothing new to save and a backup restores streaks for free.
 * Pure: no storage, no Vue, no stores.
 */

export interface StreakEntryLike {
  userId?: string;
  dayKey?: string;
  completedAt?: string;
  status?: string;
}

export interface LostStreak {
  /** How long the run was */
  days: number;
  /** The day it was missed */
  on: string;
}

export interface DailyStreak {
  /** Days in the current run (shielded days hold the count, they do not add to it) */
  current: number;
  /** The longest run this hero ever had */
  best: number;
  /** The hero already kept the streak today */
  doneToday: boolean;
  /** A run is going and today is not kept yet */
  atRisk: boolean;
  /** Shields ready to cover a missed day */
  shields: number;
  /** Shields the current run has already spent */
  shieldsUsed: number;
  /** The first day of the current run, or null with no run */
  runStart: string | null;
  /** The most recent run that ended, or null when none ever did */
  lastLost: LostStreak | null;
}

/** A shield every 7 days of a run */
export const SHIELD_EVERY = 7;
/** Shields a hero can hold at once */
export const MAX_SHIELDS = 2;
/** Statuses that keep a day: approved, and a claim still waiting on the Game Master */
export const KEEPING_STATUSES: readonly string[] = ["approved", "pending"];
/** The walk never looks further back than this, so a very old first entry costs nothing */
const MAX_DAYS_WALKED = 3 * 366;

export const EMPTY_STREAK: DailyStreak = Object.freeze({
  current: 0,
  best: 0,
  doneToday: false,
  atRisk: false,
  shields: 0,
  shieldsUsed: 0,
  runStart: null,
  lastLost: null,
}) as DailyStreak;

/** Local calendar day key: YYYY-MM-DD */
export const toDayKey = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** The day `offset` days after `dayKey` (negative goes back), stepped at local noon so DST never skips a day */
export const shiftDayKey = (dayKey: string, offset: number): string => {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() + offset);
  return toDayKey(date);
};

/** The day an entry counts for: its own dayKey, else the local day of completedAt */
export const entryDayKey = (entry: StreakEntryLike): string => {
  const dayKey = entry.dayKey;
  if (dayKey) return dayKey;
  const completedAt = entry.completedAt;
  if (!completedAt) return "";
  const date = new Date(completedAt);
  return Number.isNaN(date.getTime()) ? "" : toDayKey(date);
};

/** The days this hero kept, from entries whose status is one of `statuses` */
export const keptDays = (
  entries: ReadonlyArray<StreakEntryLike | null | undefined>,
  userId: string,
  statuses: readonly string[] = KEEPING_STATUSES
): Set<string> => {
  const days = new Set<string>();
  for (const entry of entries) {
    const isTheHeros = Boolean(entry && String(entry.userId) === String(userId));
    const isSkipped = !isTheHeros || !statuses.includes(String(entry!.status));
    if (isSkipped) continue;
    const key = entryDayKey(entry!);
    if (key) days.add(key);
  }
  return days;
};

/**
 * The hero's streak on `today`, walking every day from their first kept day: a kept day adds one (and every 7th earns a
 * shield), a missed day before today spends a shield or ends the run.
 */
export const dailyStreak = (
  entries: ReadonlyArray<StreakEntryLike | null | undefined>,
  userId: string,
  today: Date | string = new Date(),
  statuses: readonly string[] = KEEPING_STATUSES
): DailyStreak => {
  const todayKey = typeof today === "string" ? today : toDayKey(today);
  const days = keptDays(entries, userId, statuses);
  const past = [...days].filter((key) => key <= todayKey).sort();
  const hasNoPastDays = !past.length;
  if (hasNoPastDays) return { ...EMPTY_STREAK };

  const earliest = shiftDayKey(todayKey, -MAX_DAYS_WALKED);
  let day = past[0] < earliest ? earliest : past[0];
  let current = 0;
  let best = 0;
  let shields = 0;
  let shieldsUsed = 0;
  let runStart: string | null = null;
  let lastLost: LostStreak | null = null;

  while (day <= todayKey) {
    const kept = days.has(day);
    const isMissedRunDay = day !== todayKey && current > 0;
    if (kept) {
      const isRunStart = current === 0;
      if (isRunStart) runStart = day;
      current++;
      const isShieldDay = current % SHIELD_EVERY === 0;
      if (isShieldDay) shields = Math.min(MAX_SHIELDS, shields + 1);
      best = Math.max(best, current);
    } else if (isMissedRunDay) {
      const hasShield = shields > 0;
      if (hasShield) {
        shields--;
        shieldsUsed++;
      } else {
        lastLost = { days: current, on: day };
        current = 0;
        shieldsUsed = 0;
        runStart = null;
      }
    }
    day = shiftDayKey(day, 1);
  }

  const doneToday = days.has(todayKey);
  return {
    current,
    best,
    doneToday,
    atRisk: current > 0 && !doneToday,
    shields,
    shieldsUsed,
    runStart,
    lastLost,
  };
};

/** The streak ended yesterday (the run before today is gone): what the hero should hear about once */
export const lostYesterday = (streak: DailyStreak, today: Date | string = new Date()): boolean => {
  const todayKey = typeof today === "string" ? today : toDayKey(today);
  return Boolean(streak.lastLost && streak.lastLost.on === shiftDayKey(todayKey, -1) && streak.current <= 1);
};
