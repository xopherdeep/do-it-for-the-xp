/**
 * Hero Records: the numbers behind a hero's play, read from the quest log and the profile, for the Records screen and
 * its weekly recap card.
 *
 * - Only APPROVED entries count as done (a held claim or a rejection is not a tamed beast yet).
 * - XP is what the quest paid, the hunt bonus of a won fight included; GP is the quest's own rate (no class bonus).
 * - "This week" is the last seven days, today included (as the Game Master's Compendium stats read it); "last week" is
 *   the seven days before that.
 * - Dodged beasts come from `questFlees` on the profile (one count per run from a quest's fight, kept forever), with the
 *   grudge marks a beast still holds as a tie-break.
 *
 * Pure: no storage, no Vue, no stores.
 */
import { dailyStreak, shiftDayKey, toDayKey, type DailyStreak, type StreakEntryLike } from "@/lib/services/streaks/dailyStreak";

export interface InsightEntry extends StreakEntryLike {
  questId?: string;
  questName?: string;
  rewards?: { xp?: number; gp?: number; ap?: number };
  huntBonusXp?: number;
  source?: string;
}

export interface WeekTotals {
  quests: number;
  xp: number;
  gp: number;
  /** Days in the week with at least one quest done */
  activeDays: number;
}

export interface NamedCount {
  questId: string;
  name: string;
  count: number;
}

export interface WeekBar {
  /** The first day of the 7-day block, YYYY-MM-DD */
  from: string;
  xp: number;
  quests: number;
}

export interface HeroInsights {
  streak: DailyStreak;
  thisWeek: WeekTotals;
  lastWeek: WeekTotals;
  allTime: { quests: number; xp: number; gp: number; beasts: number; fights: number };
  /** XP per 7-day block, oldest first, the last bar being this week */
  xpByWeek: WeekBar[];
  /** Quests done most, all time */
  topBeasts: NamedCount[];
  /** Quests done most this week */
  weekTopBeasts: NamedCount[];
  /** Beasts the hero ran from most */
  dodged: NamedCount[];
  /** Weekday (0 Sunday .. 6 Saturday) the hero finishes most quests, or null with none */
  busiestWeekday: number | null;
  /** When in the day the hero gets quests done most, or null with none */
  favoriteTime: TimeOfDay | null;
}

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKS_CHARTED = 8;

const amount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const xpOf = (entry: InsightEntry): number => amount(entry.rewards?.xp) + amount(entry.huntBonusXp);

const dayOf = (entry: InsightEntry): string => {
  const dayKey = entry.dayKey;
  if (dayKey) return dayKey;
  const date = new Date(String(entry.completedAt));
  return Number.isNaN(date.getTime()) ? "" : toDayKey(date);
};

/** Morning 5-12, afternoon 12-17, evening 17-21, night otherwise */
export const timeOfDay = (hour: number): TimeOfDay => {
  const isMorning = hour >= 5 && hour < 12;
  if (isMorning) return "morning";
  const isAfternoon = hour >= 12 && hour < 17;
  if (isAfternoon) return "afternoon";
  const isEvening = hour >= 17 && hour < 21;
  if (isEvening) return "evening";
  return "night";
};

/** The keys of `counts` sorted most first (ties by name), as named counts */
const ranked = (counts: Map<string, number>, names: Map<string, string>, limit: number): NamedCount[] =>
  [...counts.entries()]
    .map(([questId, count]) => ({ questId, name: names.get(questId) || "Unknown beast", count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);

const weekTotals = (entries: InsightEntry[], from: string, to: string): WeekTotals => {
  const inWeek = entries.filter((entry) => {
    const day = dayOf(entry);
    return day >= from && day <= to;
  });
  return {
    quests: inWeek.length,
    xp: inWeek.reduce((sum, entry) => sum + xpOf(entry), 0),
    gp: inWeek.reduce((sum, entry) => sum + amount(entry.rewards?.gp), 0),
    activeDays: new Set(inWeek.map(dayOf)).size,
  };
};

const mostOf = <T>(values: T[]): T | null => {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    const isNewBest = count > bestCount;
    if (isNewBest) {
      best = value;
      bestCount = count;
    }
  }
  return best;
};

export interface InsightProfile {
  questFlees?: Record<string, unknown> | null;
  questGrudges?: Record<string, { marks?: unknown } | unknown> | null;
}

/**
 * Everything the Records screen shows for one hero on `now`.
 * @param questNames Quest id to the name to show (the board's names); the log's own name is the fallback
 */
export const heroInsights = (
  entries: ReadonlyArray<InsightEntry | null | undefined>,
  heroId: string,
  profile: InsightProfile | null | undefined,
  now: Date = new Date(),
  questNames: ReadonlyMap<string, string> = new Map()
): HeroInsights => {
  const todayKey = toDayKey(now);
  const mine = entries.filter((entry): entry is InsightEntry => Boolean(entry && String(entry.userId) === String(heroId)));
  const done = mine.filter((entry) => entry.status === "approved" && dayOf(entry) && dayOf(entry) <= todayKey);

  const names = new Map<string, string>();
  for (const entry of done) {
    const questName = entry.questName || "";
    const isNamedQuest = Boolean(entry.questId) && questName !== "";
    if (isNamedQuest) names.set(String(entry.questId), questName);
  }
  for (const [id, name] of questNames) names.set(id, name);

  const weekStart = shiftDayKey(todayKey, -6);
  const thisWeek = weekTotals(done, weekStart, todayKey);
  const lastWeek = weekTotals(done, shiftDayKey(weekStart, -7), shiftDayKey(weekStart, -1));

  const xpByWeek: WeekBar[] = [];
  for (let week = WEEKS_CHARTED - 1; week >= 0; week--) {
    const from = shiftDayKey(weekStart, -7 * week);
    const totals = weekTotals(done, from, shiftDayKey(from, 6));
    xpByWeek.push({ from, xp: totals.xp, quests: totals.quests });
  }

  const allCounts = new Map<string, number>();
  const weekCounts = new Map<string, number>();
  for (const entry of done) {
    const id = String(entry.questId || "");
    if (!id) continue;
    allCounts.set(id, (allCounts.get(id) || 0) + 1);
    const isThisWeek = dayOf(entry) >= weekStart;
    if (isThisWeek) weekCounts.set(id, (weekCounts.get(id) || 0) + 1);
  }

  const flees = new Map<string, number>();
  for (const [questId, count] of Object.entries(profile?.questFlees || {})) {
    const value = Math.floor(amount(count));
    const hasFled = value > 0;
    if (hasFled) flees.set(questId, value);
  }
  const marksOf = (questId: string): number => {
    const grudge = (profile?.questGrudges || {})[questId] as { marks?: unknown } | undefined;
    return Math.floor(amount(grudge?.marks));
  };
  const dodged = ranked(flees, names, flees.size)
    .sort((a, b) => b.count - a.count || marksOf(b.questId) - marksOf(a.questId) || a.name.localeCompare(b.name))
    .slice(0, 3);

  const hours = done
    .map((entry) => new Date(String(entry.completedAt)))
    .filter((date) => !Number.isNaN(date.getTime()));

  return {
    streak: dailyStreak(mine, heroId, todayKey),
    thisWeek,
    lastWeek,
    allTime: {
      quests: done.length,
      xp: done.reduce((sum, entry) => sum + xpOf(entry), 0),
      gp: done.reduce((sum, entry) => sum + amount(entry.rewards?.gp), 0),
      beasts: allCounts.size,
      fights: done.filter((entry) => entry.source === "battle").length,
    },
    xpByWeek,
    topBeasts: ranked(allCounts, names, 3),
    weekTopBeasts: ranked(weekCounts, names, 3),
    dodged,
    busiestWeekday: mostOf(hours.map((date) => date.getDay())),
    favoriteTime: mostOf(hours.map((date) => timeOfDay(date.getHours()))),
  };
};

/** "+12" / "-3" / "same" against last week */
export const changeLabel = (now: number, before: number): string => {
  const change = now - before;
  const isUnchanged = change === 0;
  if (isUnchanged) return "same as last week";
  return `${change > 0 ? "+" : ""}${change} vs last week`;
};

/** The recap card's headline lines, the most bragworthy first. Plain sentences, ready to share. */
export const recapLines = (insights: HeroInsights): string[] => {
  const { thisWeek, streak, weekTopBeasts } = insights;
  const hasNoQuests = thisWeek.quests === 0;
  if (hasNoQuests) return ["No quests done this week yet. Today is a great day to start!"];
  const lines = [
    `Tamed ${thisWeek.quests} beast${thisWeek.quests === 1 ? "" : "s"} for ${thisWeek.xp} XP and ${thisWeek.gp} GP.`,
    `Played ${thisWeek.activeDays} of the last 7 days.`,
  ];
  const isOnStreak = streak.current > 1;
  if (isOnStreak) lines.push(`On a ${streak.current}-day streak (best ${Math.max(streak.best, streak.current)}).`);
  const hasFavoriteFoe = !!weekTopBeasts[0] && weekTopBeasts[0].count > 1;
  if (hasFavoriteFoe) {
    lines.push(`Favorite foe: ${weekTopBeasts[0].name}, beaten ${weekTopBeasts[0].count} times.`);
  }
  const isBetterThanLastWeek = insights.lastWeek.quests > 0 && thisWeek.quests > insights.lastWeek.quests;
  if (isBetterThanLastWeek) {
    lines.push(`${thisWeek.quests - insights.lastWeek.quests} more quests than last week!`);
  }
  return lines;
};

/** The recap as one block of text for the share sheet */
export const recapShareText = (nickname: string, insights: HeroInsights): string =>
  [`${nickname}'s week in Do It For The XP`, ...recapLines(insights).map((line) => `- ${line}`)].join("\n");
