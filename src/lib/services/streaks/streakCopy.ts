import type { DailyStreak } from "./dailyStreak";
import { nextChest } from "./streakChests";

/**
 * What the streak screens say. Pure, so a spec can read every line.
 */

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

/** The chip's one line: the count, or nothing to show */
export const streakChipLabel = (streak: DailyStreak): string => (streak.current > 0 ? String(streak.current) : "");

/** The words a screen reader hears on the chip */
export const streakAriaLabel = (streak: DailyStreak): string => {
  const days = plural(streak.current, "day");
  if (streak.doneToday) return `${days} streak, kept today. Tap for details.`;
  return `${days} streak, at risk: finish a quest today to keep it. Tap for details.`;
};

/** The lines of the streak box (the alert behind the chip), as plain sentences */
export const streakLines = (streak: DailyStreak): string[] => {
  const lines: string[] = [];
  if (streak.current === 0) {
    lines.push("Finish any quest today to light your streak.");
  } else if (streak.doneToday) {
    lines.push(`${plural(streak.current, "day")} in a row. Today is kept!`);
  } else {
    lines.push(`${plural(streak.current, "day")} in a row. Finish a quest before midnight to keep it.`);
  }
  const chest = nextChest(streak.current);
  const toGo = chest.day - streak.current;
  lines.push(`Next chest in ${plural(toGo, "day")} (day ${chest.day}): +${chest.xp} XP, +${chest.gp} GP.`);
  if (streak.shields > 0) {
    lines.push(`${plural(streak.shields, "Streak Shield")} ready: a missed day spends one and your streak holds.`);
  } else {
    lines.push("Every 7th day earns a Streak Shield that saves a missed day.");
  }
  lines.push(`Best streak: ${plural(Math.max(streak.best, streak.current), "day")}.`);
  if (streak.current === 0 && streak.lastLost) {
    lines.push(`Your ${streak.lastLost.days}-day streak ended. Start a new one today!`);
  }
  return lines;
};

/** The alert's header */
export const streakHeader = (streak: DailyStreak): string =>
  streak.current > 0 ? `${streak.current}-Day Streak` : "Daily Streak";
