import { SHIELD_EVERY, MAX_SHIELDS, type DailyStreak } from "./dailyStreak";
import { chestDaysUpTo, nextChest } from "./streakChests";

/**
 * The streak card's view model: how hot the flame burns (tier), what the day is doing (status), the road to the next
 * chest and the shield slots. Pure, so a spec can read every case; the card (XpStreakCard.vue) only draws it.
 */

export type StreakTier = "ash" | "spark" | "flame" | "blaze" | "inferno" | "legend";
export type StreakStatus = "unlit" | "risk" | "kept";

/** First day of each tier, hottest last */
const TIER_FROM: ReadonlyArray<[StreakTier, number]> = [
  ["legend", 30],
  ["inferno", 14],
  ["blaze", 7],
  ["flame", 3],
  ["spark", 1],
];

export const TIER_TITLES: Record<StreakTier, string> = {
  ash: "Cold Embers",
  spark: "Spark",
  flame: "Flame",
  blaze: "Blaze",
  inferno: "Inferno",
  legend: "Legendary",
};

export interface StreakShieldSlot {
  filled: boolean;
}

export interface StreakCardModel {
  tier: StreakTier;
  title: string;
  status: StreakStatus;
  statusLabel: string;
  days: number;
  best: number;
  isRecord: boolean;
  /** 1 to 5 stars for the tier */
  stars: number;
  chest: { day: number; xp: number; gp: number; toGo: number; fromDay: number; percent: number };
  shields: StreakShieldSlot[];
  /** Days until the next shield, or null when the hero holds the most it can */
  shieldIn: number | null;
  lostNote: string | null;
}

export const tierOf = (days: number): StreakTier => TIER_FROM.find(([, from]) => days >= from)?.[0] ?? "ash";

const STARS: Record<StreakTier, number> = { ash: 0, spark: 1, flame: 2, blaze: 3, inferno: 4, legend: 5 };

const statusOf = (streak: DailyStreak): StreakStatus => {
  const isUnlit = streak.current <= 0;
  if (isUnlit) return "unlit";
  return streak.doneToday ? "kept" : "risk";
};

const STATUS_LABEL: Record<StreakStatus, string> = {
  unlit: "Unlit",
  risk: "Keep it alive!",
  kept: "Kept today",
};

export const streakCardModel = (streak: DailyStreak): StreakCardModel => {
  const days = streak.current;
  const tier = tierOf(days);
  const status = statusOf(streak);
  const chest = nextChest(days);
  const reached = chestDaysUpTo(days);
  const fromDay = reached.length ? reached[reached.length - 1] : 0;
  const span = Math.max(1, chest.day - fromDay);
  const percent = Math.round(Math.min(1, Math.max(0, (days - fromDay) / span)) * 100);
  const holdsMost = streak.shields >= MAX_SHIELDS;
  const best = Math.max(streak.best, days);
  const isRecord = days > 0 && days >= best;
  const lostRun = status === "unlit" ? streak.lastLost : null;
  return {
    tier,
    title: TIER_TITLES[tier],
    status,
    statusLabel: STATUS_LABEL[status],
    days,
    best,
    isRecord,
    stars: STARS[tier],
    chest: { day: chest.day, xp: chest.xp, gp: chest.gp, toGo: chest.day - days, fromDay, percent },
    shields: Array.from({ length: MAX_SHIELDS }, (_, i) => ({ filled: i < streak.shields })),
    shieldIn: holdsMost || days <= 0 ? null : SHIELD_EVERY - (days % SHIELD_EVERY),
    lostNote: lostRun ? `Your ${lostRun.days}-day streak ended. Light a new one today!` : null,
  };
};
