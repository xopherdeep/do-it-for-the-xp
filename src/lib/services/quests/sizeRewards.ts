import { SEED_REWARDS } from "@/lib/services/core/packs/packSeeds";

export interface SizeRewards {
  xp: number;
  gp: number;
  ap: number;
}

/** The largest size the packs price (Medium, 3): the bigger sizes carry on at its rate per point of difficulty. */
const LARGEST_PACK_SIZE = 3;

/** Round to the nearest multiple, so a big reward reads as 370 XP and not 366.67. */
const roundedTo = (value: number, multiple: number): number => Math.round(value / multiple) * multiple;

/**
 * What a size pays: one table for the wizard and the packs. Sizes 1, 2 and 3 are the Quick Start pack's own rewards
 * (packSeeds.SEED_REWARDS: Tiny 60 XP / 15 GP, Small 120 / 30, Medium 220 / 45), so a quest made by hand pays the same
 * as a quest of that size from a pack. Bigger sizes carry on at Medium's rate per point of difficulty, which keeps
 * every size paying more than the one below it. A size that is no number, or under 1, pays as Tiny.
 */
export function suggestedRewards(difficulty: number): SizeRewards {
  const wanted = Number(difficulty);
  const size = Number.isFinite(wanted) ? Math.max(1, Math.round(wanted)) : 1;
  const isInPackTable = size <= LARGEST_PACK_SIZE;
  if (isInPackTable) return { ...SEED_REWARDS[size as keyof typeof SEED_REWARDS] };
  const perPoint = SEED_REWARDS[LARGEST_PACK_SIZE];
  return {
    xp: roundedTo((perPoint.xp / LARGEST_PACK_SIZE) * size, 10),
    gp: roundedTo((perPoint.gp / LARGEST_PACK_SIZE) * size, 5),
    ap: Math.round((perPoint.ap / LARGEST_PACK_SIZE) * size),
  };
}
