/**
 * Streak chests: a one-time reward when a run reaches 3, 7, 14 and 30 days, then every 30 days after that.
 *
 * Chests read the APPROVED days only (dailyStreak with ["approved"]), so a claim the Game Master later rejects never
 * opened one. Which chests a run already paid is kept on the profile as `streakChests` ({ runStart, paid }): a new run
 * (another runStart) starts the ladder over, so breaking a streak costs the chests still ahead of it.
 *
 * Pure: no storage, no Vue, no stores.
 */

export interface StreakChest {
  /** The streak day that opens it */
  day: number;
  xp: number;
  gp: number;
}

/** What the profile keeps: the run the paid chests belong to, and which days paid */
export interface StreakChestLedger {
  runStart: string;
  paid: number[];
}

export const STREAK_CHESTS: readonly StreakChest[] = [
  { day: 3, xp: 15, gp: 20 },
  { day: 7, xp: 40, gp: 50 },
  { day: 14, xp: 80, gp: 100 },
  { day: 30, xp: 150, gp: 200 },
];

/** After the last chest on the ladder, one more like it every this many days */
export const CHEST_REPEAT_EVERY = 30;

const lastChest = STREAK_CHESTS[STREAK_CHESTS.length - 1];

/** The chest a streak day opens, or null when that day opens none */
export const chestOn = (day: number): StreakChest | null => {
  const listed = STREAK_CHESTS.find((chest) => chest.day === day);
  if (listed) return listed;
  const isRepeat = day > lastChest.day && (day - lastChest.day) % CHEST_REPEAT_EVERY === 0;
  return isRepeat ? { ...lastChest, day } : null;
};

/** The next chest a run of `current` days is walking toward */
export const nextChest = (current: number): StreakChest => {
  const listed = STREAK_CHESTS.find((chest) => chest.day > current);
  if (listed) return listed;
  const repeats = Math.floor((current - lastChest.day) / CHEST_REPEAT_EVERY) + 1;
  return { ...lastChest, day: lastChest.day + repeats * CHEST_REPEAT_EVERY };
};

/** Every chest day from 1 to `current`, in order */
export const chestDaysUpTo = (current: number): number[] => {
  const days: number[] = [];
  for (const chest of STREAK_CHESTS) {
    const isReached = chest.day <= current;
    if (isReached) days.push(chest.day);
  }
  for (let day = lastChest.day + CHEST_REPEAT_EVERY; day <= current; day += CHEST_REPEAT_EVERY) days.push(day);
  return days;
};

/** A ledger as the profile holds it, or null when it holds nothing usable */
export const ledgerOf = (raw: unknown): StreakChestLedger | null => {
  const value = raw as Partial<StreakChestLedger> | null | undefined;
  const isUsable = Boolean(value && typeof value.runStart === "string" && Array.isArray(value.paid));
  if (!isUsable) return null;
  return { runStart: value!.runStart!, paid: value!.paid!.map(Number).filter(Number.isFinite) };
};

/**
 * The chests the run owes now, and the ledger once they are paid. Nothing is owed with no run. A ledger from another
 * run counts for nothing. Only chests reached in THIS run pay, each once.
 */
export const chestsOwed = (
  run: { current: number; runStart: string | null },
  ledger: StreakChestLedger | null
): { owed: StreakChest[]; ledger: StreakChestLedger | null } => {
  const { runStart } = run;
  const hasNoRun = !runStart || run.current <= 0;
  if (hasNoRun) return { owed: [], ledger };
  const paid = ledger && ledger.runStart === run.runStart ? ledger.paid : [];
  const owed = chestDaysUpTo(run.current)
    .filter((day) => !paid.includes(day))
    .map((day) => chestOn(day)!);
  const isNothingOwed = !owed.length;
  if (isNothingOwed) return { owed, ledger };
  return { owed, ledger: { runStart, paid: [...paid, ...owed.map((chest) => chest.day)] } };
};

/** The XP and GP of several chests together */
export const chestTotal = (chests: readonly StreakChest[]): { xp: number; gp: number } =>
  chests.reduce((sum, chest) => ({ xp: sum.xp + chest.xp, gp: sum.gp + chest.gp }), { xp: 0, gp: 0 });
