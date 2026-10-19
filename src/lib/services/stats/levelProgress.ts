/**
 * How far a hero is through their current level. The HUD's XP hairline and My Profile both show this, so they ask
 * here and cannot drift apart: the bar counts the XP earned inside the level (total XP minus the level's floor)
 * against the XP the level takes, never the running total against the next threshold.
 */
import { getXpForLevel } from "@/lib/services/stats/PlayerStatsService";

export interface LevelProgress {
  /** The level the numbers are for (at least 1) */
  level: number;
  /** XP earned since this level began; can pass `needed` for a moment before the level-up is paid out */
  inLevel: number;
  /** XP this whole level takes (at least 1, so a bar never divides by zero) */
  needed: number;
  /** inLevel over needed, from 0 to 1 */
  fraction: number;
  /** The fraction as a whole percent, 0 to 100 */
  percent: number;
}

/** `totalXp` is the running total (stats.xp.now), `level` the hero's current level */
export function levelProgress(level: number, totalXp: number): LevelProgress {
  const current = Math.max(1, Math.floor(Number(level)) || 1);
  const total = Math.max(0, Number(totalXp) || 0);
  const floor = getXpForLevel(current);
  const needed = Math.max(1, getXpForLevel(current + 1) - floor);
  const inLevel = Math.max(0, total - floor);
  const fraction = Math.min(1, inLevel / needed);
  return { level: current, inLevel, needed, fraction, percent: Math.round(fraction * 100) };
}
