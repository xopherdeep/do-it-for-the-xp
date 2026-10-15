import type { BattlePassive, Enemy } from "./types";

/** Minutes of clock a hero earns per remaining chore when the beast does not say otherwise. */
const DEFAULT_MINUTES_PER_CHORE = 3;
/** How often the clock re-reads Date.now(); the deadline, not the interval, decides when the beast strikes. */
export const CLOCK_TICK_MS = 100;
/** The beat between "braces!" / "Couldn't escape!" and the strike. */
export const STRIKE_DELAY_MS = 1000;

/**
 * Minutes per remaining chore: the beast's own attackCooldown, or 3, times the fight's cooldown scale,
 * plus the class's flat minute (Monk, Sage).
 */
export function minutesPerChore(enemy: Enemy | null, passive: BattlePassive, cooldownScale: number): number {
  const minutes = enemy?.attackCooldown;
  const base = typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_MINUTES_PER_CHORE;
  const bonus = Number.isFinite(passive.cooldownMinutesBonus) ? Math.max(0, passive.cooldownMinutesBonus) : 0;
  return base * cooldownScale + bonus;
}

/** How long a clock runs with `remainingChores` chores open (at least one) at `minutes` apiece, in ms. */
export function clockDuration(remainingChores: number, minutes: number): number {
  return Math.max(1, remainingChores) * minutes * 60_000;
}

/**
 * When `ms` of clock runs out if it starts counting at `now`. Under the ice (`frozenUntil`) it only
 * begins to run down when the ice melts, so a second freeze adds to the first.
 */
export function clockEndsAt(now: number, frozenUntil: number, ms: number): number {
  return Math.max(now, frozenUntil) + ms;
}

/**
 * Re-read the clock against its deadline: the ms left and the bar's fill (0 to 100). Frozen, the bar
 * stands where the ice caught it.
 */
export function clockReading(
  now: number,
  frozenUntil: number,
  deadline: number,
  attackDuration: number
): { remaining: number; percent: number } {
  const clockNow = Math.max(now, frozenUntil);
  const remaining = Math.max(0, deadline - clockNow);
  return { remaining, percent: attackDuration > 0 ? (remaining / attackDuration) * 100 : 0 };
}
