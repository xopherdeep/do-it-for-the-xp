/**
 * The random-encounter clock. Pure, no Vue and no Pinia: the battle store keeps the step counter, this
 * module only turns time into steps and steps back into a moment.
 *
 * Steps come from the wall clock, not from ticks: browsers throttle a hidden tab's timers to about one a
 * minute and a paused app runs none, so a hero who walks while the game sits in the background still
 * covers the ground. One step is one second of walking on plains. Nothing here throws.
 */

/** How much of the hero's walk each terrain gets; the battle store keeps one weight at 1 and the rest at 0. */
export type TerrainWeights = {
  plains: number;
  swamp: number;
  forest: number;
  mountain: number;
  island: number;
};

/** Steps a hero walks per second: plains 1, every other terrain 2, so danger zones come around twice as fast. */
export const stepsPerSecond = (t: TerrainWeights): number =>
  t.plains + (t.swamp + t.forest + t.mountain + t.island) * 2;

/** Steps walked in `elapsedMs` at `perSecond` (fractions kept). Negative, NaN or non-finite time walks nothing. */
export const stepsWalked = (elapsedMs: number, perSecond: number): number => {
  const hasNoTimePassed = !Number.isFinite(elapsedMs) || elapsedMs <= 0;
  if (hasNoTimePassed) return 0;
  const hasNoWalkingPace = !Number.isFinite(perSecond) || perSecond <= 0;
  if (hasNoWalkingPace) return 0;
  return (elapsedMs / 1000) * perSecond;
};

/**
 * When the step counter reaches zero if the hero keeps walking from `now`. Walking only resumes once a Quiet Day
 * (the Power; old saves: X's Invisibility) runs out, so the walk starts at the later of `now` and `invisibleUntil`.
 * Nothing left to walk is due the moment the walk starts; a hero who covers no ground never arrives (null).
 */
export const nextEncounterAt = (
  stepsLeft: number,
  perSecond: number,
  now: Date,
  invisibleUntil?: Date | null
): Date | null => {
  if (Number.isNaN(now.getTime())) return null;

  const resumes = invisibleUntil && invisibleUntil.getTime() > now.getTime() ? invisibleUntil : now;
  if (stepsLeft <= 0) return new Date(resumes.getTime());
  const isEncounterUnreachable = !Number.isFinite(stepsLeft) || !Number.isFinite(perSecond) || perSecond <= 0;
  if (isEncounterUnreachable) return null;

  return new Date(resumes.getTime() + Math.round((stepsLeft / perSecond) * 1000));
};
