/**
 * The shared chore earn curve: what a point of effort pays. Pure and import-free on purpose. The quest packs
 * (packCommon), the pack seeds (packSeeds) and the Do and Don't points (dosDonts/doDontPoints) all read it, and
 * packCommon reaches packSeeds through the backup service, so the curve cannot live in either of those two files.
 */

/** The Fibonacci scale's rewards, as the quest form sets them: d x 100 XP, d x 15 GP, d AP */
export const rewardsFor = (difficulty: number) => ({ xp: difficulty * 100, gp: difficulty * 15, ap: difficulty });
