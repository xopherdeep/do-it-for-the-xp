/**
 * The per-floor early-finish bonus. A floor cleared on its due day pays x1; clearing it earlier climbs to x2 once it is
 * half the floor's window early. The bonus above x1 is one pool of the floor's XP and GP, split evenly among the heroes
 * who worked the floor. Pure math.
 */
import { daysBetween } from "./projectSchedule";
import type { PhaseWindow } from "./projectSchedule";

export interface FloorBonus {
  xp: number;
  gp: number;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

const clamp = (value: number, low: number, high: number): number => Math.min(Math.max(value, low), high);

/** Floor, after shaving off the float error a multiplier carries ((1.2 - 1) * 100 is 19.999999999999996) */
const floorSettled = (value: number): number => Math.floor(Number(value.toFixed(6)));

/**
 * What a floor's rewards are multiplied by when it is cleared on `clearedOn`: 1 on its due day (or later), 2 when half
 * its window early (or earlier), in steps of a tenth between.
 */
export const floorMultiplier = (window: PhaseWindow, clearedOn: string): number => {
  const phaseDays = daysBetween(window.opensOn, window.dueOn) + 1;
  const daysEarly = daysBetween(clearedOn, window.dueOn);
  return round1(1 + clamp(daysEarly / (Math.max(phaseDays, 1) / 2), 0, 1));
};

/** The bonus pool of a floor's quests at `multiplier`: the part above x1 of their XP and of their GP, each floored */
export const floorBonusPool = (quests: readonly FloorBonus[], multiplier: number): FloorBonus => {
  const extra = Math.max(multiplier - 1, 0);
  const sumXp = quests.reduce((total, quest) => total + quest.xp, 0);
  const sumGp = quests.reduce((total, quest) => total + quest.gp, 0);
  return { xp: floorSettled(extra * sumXp), gp: floorSettled(extra * sumGp) };
};

/**
 * The pool split evenly among the workers; what does not divide goes to `lastWorkerId` (the hero who cleared the
 * floor), or to the first worker when that hero is not among them. No workers, no bonus.
 */
export const splitFloorBonus = (pool: FloorBonus, workerIds: readonly string[], lastWorkerId: string): Record<string, FloorBonus> => {
  const workers = [...new Set(workerIds)];
  if (workers.length === 0) return {};
  const each = { xp: Math.floor(pool.xp / workers.length), gp: Math.floor(pool.gp / workers.length) };
  const remainder = { xp: pool.xp - each.xp * workers.length, gp: pool.gp - each.gp * workers.length };
  const receiver = workers.includes(lastWorkerId) ? lastWorkerId : workers[0];
  const split: Record<string, FloorBonus> = {};
  workers.forEach((id) => {
    split[id] = id === receiver ? { xp: each.xp + remainder.xp, gp: each.gp + remainder.gp } : { ...each };
  });
  return split;
};
