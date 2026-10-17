/**
 * The weekly family recap: "This week in the village". Per hero and for the whole family, what got done in a week of the
 * quest log, ready for a screen, a notification and the share sheet.
 *
 * - Only APPROVED entries count as done and pay XP/GP/AP (a held claim is shown apart as `pending`; it earns nothing yet).
 *   XP includes the hunt bonus of a won fight, as Hero Records read it.
 * - Days are the LOCAL calendar day (`dayKey`, else the local day of `completedAt`), never UTC, and are stepped with
 *   `shiftDayKey` (at local noon) so a daylight-saving week still has seven days.
 * - The week: "rolling" is the last seven days with today (as Hero Records), "calendar" starts on `weekStartsOn`
 *   (Monday unless told otherwise; the family has no setting for it yet) and runs to today, "previous" is the last
 *   whole calendar week before the one `now` is in.
 * - Nobody is shamed: there is no "worst hero" and no missed-chore count. A sent-back claim is counted but kept out of
 *   the copy. When heroes finish level, the week is a team win.
 *
 * Pure: no storage, no Vue, no stores. Copy and the share text live in weeklyRecapCopy.ts.
 */
import { dailyStreak, entryDayKey, KEEPING_STATUSES, shiftDayKey, toDayKey } from "@/lib/services/streaks/dailyStreak";
import type { StreakEntryLike } from "@/lib/services/streaks/dailyStreak";
import { recapLinesOf } from "./weeklyRecapCopy";

export { recapShareText } from "./weeklyRecapCopy";

export interface RecapEntry extends StreakEntryLike {
  questId?: string;
  questName?: string;
  rewards?: { xp?: number; gp?: number; ap?: number };
  huntBonusXp?: number;
}

export interface RecapHeroRef {
  id: string;
  name: string;
}

/** A level reached, as the hero's notification feed remembers it */
export interface RecapLevelUp {
  heroId: string;
  level: number;
  /** ISO time */
  at: string;
}

export type RecapSpan = "rolling" | "calendar" | "previous";

export interface RecapOptions {
  span?: RecapSpan;
  /** 0 Sunday .. 6 Saturday; Monday by default */
  weekStartsOn?: number;
  levelUps?: readonly RecapLevelUp[];
}

export interface RecapBeast {
  name: string;
  count: number;
}

export interface RecapBusiestDay {
  dayKey: string;
  /** 0 Sunday .. 6 Saturday */
  weekday: number;
  chores: number;
}

export interface HeroRecap {
  heroId: string;
  name: string;
  chores: number;
  /** Claims still waiting on the Game Master: not counted, not paid */
  pending: number;
  /** Claims the Game Master sent back (for the Game Master's eyes; never in the copy) */
  sentBack: number;
  xp: number;
  gp: number;
  ap: number;
  activeDays: number;
  /** The streak on the last day of the week */
  streak: number;
  /** The longest run of kept days inside the week */
  bestStreak: number;
  beasts: RecapBeast[];
  levelUps: number[];
  busiestDay: RecapBusiestDay | null;
}

export interface FamilyRecap {
  chores: number;
  pending: number;
  xp: number;
  gp: number;
  ap: number;
  levelUps: number;
  /** Heroes with at least one chore done */
  activeHeroes: number;
  busiestDay: RecapBusiestDay | null;
}

export interface WeeklyRecap {
  /** First and last day of the week, YYYY-MM-DD */
  from: string;
  to: string;
  heroes: HeroRecap[];
  family: FamilyRecap;
  /** The one who did the most (XP breaks a tie), or null */
  heroOfTheWeek: HeroRecap | null;
  /** Heroes level with each other at the top: the week is a team win */
  teamWin: boolean;
  /** True when nobody did a chore */
  isEmpty: boolean;
  /** Kind lines, most bragworthy first */
  lines: string[];
}

const amount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const xpOf = (entry: RecapEntry): number => amount(entry.rewards?.xp) + amount(entry.huntBonusXp);

const clampWeekday = (value: unknown): number => {
  const day = Math.floor(Number(value));
  const isWeekday = Number.isFinite(day) && day >= 0 && day <= 6;
  return isWeekday ? day : 1;
};

const weekdayOf = (dayKey: string): number => {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12).getDay();
};

/** The first and last day of the week `span` asks for on `now` */
export const weekRangeOf = (now: Date, span: RecapSpan = "rolling", weekStartsOn = 1): { from: string; to: string } => {
  const today = toDayKey(now);
  if (span === "rolling") return { from: shiftDayKey(today, -6), to: today };
  const sinceStart = (weekdayOf(today) - clampWeekday(weekStartsOn) + 7) % 7;
  const thisStart = shiftDayKey(today, -sinceStart);
  if (span === "calendar") return { from: thisStart, to: today };
  const from = shiftDayKey(thisStart, -7);
  return { from, to: shiftDayKey(from, 6) };
};

/** The longest run of consecutive days in `days` that fall inside from..to */
const longestRun = (days: ReadonlySet<string>, from: string, to: string): number => {
  let best = 0;
  let run = 0;
  for (let day = from; day <= to; day = shiftDayKey(day, 1)) {
    run = days.has(day) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
};

const busiestOf = (perDay: ReadonlyMap<string, number>): RecapBusiestDay | null => {
  let best: RecapBusiestDay | null = null;
  for (const [dayKey, chores] of [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const isBusier = !best || chores > best.chores;
    if (isBusier) best = { dayKey, weekday: weekdayOf(dayKey), chores };
  }
  return best;
};

const heroRecapOf = (
  hero: RecapHeroRef,
  entries: readonly RecapEntry[],
  from: string,
  to: string,
  levelUps: readonly RecapLevelUp[]
): HeroRecap => {
  const mine = entries.filter((entry) => String(entry.userId) === String(hero.id));
  const inWeek = mine.filter((entry) => {
    const day = entryDayKey(entry);
    return day >= from && day <= to;
  });
  const done = inWeek.filter((entry) => entry.status === "approved");
  const perDay = new Map<string, number>();
  const beasts = new Map<string, number>();
  for (const entry of done) {
    const day = entryDayKey(entry);
    perDay.set(day, (perDay.get(day) || 0) + 1);
    const name = String(entry.questName || "").trim();
    if (name) beasts.set(name, (beasts.get(name) || 0) + 1);
  }
  const keptDays = new Set(inWeek.filter((entry) => KEEPING_STATUSES.includes(String(entry.status))).map(entryDayKey));
  const climbs = levelUps
    .filter((up) => String(up.heroId) === String(hero.id))
    .filter((up) => {
      const at = new Date(up.at);
      const day = Number.isNaN(at.getTime()) ? "" : toDayKey(at);
      return day >= from && day <= to;
    });
  return {
    heroId: String(hero.id),
    name: hero.name,
    chores: done.length,
    pending: inWeek.filter((entry) => entry.status === "pending").length,
    sentBack: inWeek.filter((entry) => entry.status === "rejected").length,
    xp: done.reduce((sum, entry) => sum + xpOf(entry), 0),
    gp: done.reduce((sum, entry) => sum + amount(entry.rewards?.gp), 0),
    ap: done.reduce((sum, entry) => sum + amount(entry.rewards?.ap), 0),
    activeDays: new Set(done.map(entryDayKey)).size,
    streak: dailyStreak(mine, hero.id, to).current,
    bestStreak: longestRun(keptDays, from, to),
    beasts: [...beasts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    levelUps: climbs.map((up) => up.level).sort((a, b) => a - b),
    busiestDay: busiestOf(perDay),
  };
};

/** Most chores, XP as the tie-break; heroes level on both share the crown, which makes it a team win */
const crownOf = (heroes: readonly HeroRecap[]): { hero: HeroRecap | null; teamWin: boolean } => {
  const doers = heroes.filter((hero) => hero.chores > 0);
  const hasNoDoers = doers.length === 0;
  if (hasNoDoers) return { hero: null, teamWin: false };
  const ranked = [...doers].sort((a, b) => b.chores - a.chores || b.xp - a.xp);
  const [first, second] = ranked;
  const isLevel = Boolean(second) && second.chores === first.chores && second.xp === first.xp;
  return isLevel ? { hero: null, teamWin: true } : { hero: first, teamWin: false };
};

/**
 * The recap of the week for `heroes` on `now`. Entries of people who are not in `heroes` are ignored, and so is anything
 * outside the week (later days too: a clock set back never counts the future).
 */
export const weeklyRecap = (
  entries: ReadonlyArray<RecapEntry | null | undefined>,
  heroes: readonly RecapHeroRef[],
  now: Date = new Date(),
  options: RecapOptions = {}
): WeeklyRecap => {
  const { from, to } = weekRangeOf(now, options.span, options.weekStartsOn);
  const clean = entries.filter((entry): entry is RecapEntry => Boolean(entry));
  const roster = heroes.filter((hero, index, all) => all.findIndex((other) => String(other.id) === String(hero.id)) === index);
  const list = roster.map((hero) => heroRecapOf(hero, clean, from, to, options.levelUps || []));

  const perDay = new Map<string, number>();
  for (const entry of clean) {
    const isFamily = roster.some((hero) => String(hero.id) === String(entry.userId));
    const day = entryDayKey(entry);
    const isDone = isFamily && entry.status === "approved" && day >= from && day <= to;
    if (isDone) perDay.set(day, (perDay.get(day) || 0) + 1);
  }
  const sum = (pick: (hero: HeroRecap) => number): number => list.reduce((total, hero) => total + pick(hero), 0);
  const family: FamilyRecap = {
    chores: sum((hero) => hero.chores),
    pending: sum((hero) => hero.pending),
    xp: sum((hero) => hero.xp),
    gp: sum((hero) => hero.gp),
    ap: sum((hero) => hero.ap),
    levelUps: sum((hero) => hero.levelUps.length),
    activeHeroes: list.filter((hero) => hero.chores > 0).length,
    busiestDay: busiestOf(perDay),
  };
  const crown = crownOf(list);
  const recap: WeeklyRecap = {
    from,
    to,
    heroes: list,
    family,
    heroOfTheWeek: crown.hero,
    teamWin: crown.teamWin,
    isEmpty: family.chores === 0,
    lines: [],
  };
  recap.lines = recapLinesOf(recap);
  return recap;
};
