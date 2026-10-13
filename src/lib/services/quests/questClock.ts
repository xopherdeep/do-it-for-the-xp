/**
 * The strike clock matches the chore (docs/Quest-Rooms-Spec.md section 5.5). Pure: no storage, no Vue.
 *
 * A quest carries how long it takes (`estimatedMinutes`, or a default from its difficulty). A fight that
 * carries a quest gives its beast `attackCooldown = minutes / checklist length`, and the battle engine's
 * clock (battleService/attackClock) is remaining chores x that cooldown: the first clock is the whole
 * estimate, each finished chore restarts it for the remaining share, and chores already ticked off earlier
 * shorten it pro rata without any extra step. Class minutes, the Fire and Ice wands and Chronos apply on top
 * in the engine, unchanged.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";

/**
 * Minutes a quest takes by difficulty, [difficulty, minutes] per slider step (tunable). A difficulty between
 * two steps takes the lower step's minutes; 55 and above all take 90.
 */
export const DEFAULT_MINUTES: ReadonlyArray<readonly [number, number]> = [
  [1, 3],
  [2, 5],
  [3, 8],
  [5, 12],
  [8, 20],
  [13, 30],
  [21, 45],
  [34, 60],
  [55, 90],
];

/** Minutes the quest takes when the parent has not said: its difficulty's step (the smallest step when unset). */
export function defaultMinutes(difficulty?: number): number {
  const value = Number(difficulty);
  let minutes = DEFAULT_MINUTES[0][1];
  for (const [step, stepMinutes] of DEFAULT_MINUTES) {
    const isReached = value >= step;
    if (isReached) minutes = stepMinutes;
  }
  return minutes;
}

/** Minutes the quest takes: the parent's estimate when it is a positive number, else the difficulty's default. */
export function questMinutes(quest: Pick<Achievement, "difficulty" | "estimatedMinutes">): number {
  const estimate = Number(quest.estimatedMinutes);
  const hasEstimate = Number.isFinite(estimate) && estimate > 0;
  return hasEstimate ? estimate : defaultMinutes(quest.difficulty);
}

/** The chores in the checklist, at least one: a quest with no checklist is one chore. */
const choresIn = (checklistLength?: number): number => {
  const count = Math.floor(Number(checklistLength));
  return Number.isFinite(count) && count > 1 ? count : 1;
};

/** The beast's `attackCooldown` (minutes per chore) that spreads `minutes` over the checklist. */
export function attackCooldownFor(minutes: number, checklistLength?: number): number {
  return minutes / choresIn(checklistLength);
}

/** The `attackCooldown` for a quest's beast: the quest's minutes spread over its checklist. */
export function questAttackCooldown(
  quest: Pick<Achievement, "difficulty" | "estimatedMinutes">,
  checklistLength?: number
): number {
  return attackCooldownFor(questMinutes(quest), checklistLength);
}

/**
 * Minutes on the clock when `doneChores` of the checklist are already ticked off: the estimate pro rata for
 * the chores left. One chore's share always stays, as one chore always stays open in the fight. This is what
 * the engine's clock (open chores x attackCooldown) comes to; it is here so the screens and specs can name it.
 */
export function remainingClockMinutes(minutes: number, checklistLength?: number, doneChores = 0): number {
  const chores = choresIn(checklistLength);
  const done = Number.isFinite(doneChores) ? Math.min(Math.max(0, Math.floor(doneChores)), chores - 1) : 0;
  return attackCooldownFor(minutes, chores) * (chores - done);
}
