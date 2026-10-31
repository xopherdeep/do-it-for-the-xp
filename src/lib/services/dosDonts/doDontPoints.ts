import { rewardsFor } from "@/lib/services/core/packs/earnCurve";

/** What a Do pays and a Don't takes for a given effort: the shared chore curve (100 XP, 15 GP and 1 AP a point), every value negated for a Don't */
export const doDontPoints = (difficulty: number, type: "do" | "dont"): { xp: number; gp: number; ap: number } => {
  const sign = type === "do" ? 1 : -1;
  const { xp, gp, ap } = rewardsFor(difficulty);
  return { xp: xp * sign, gp: gp * sign, ap: ap * sign };
};

/** The points a saved Do or Don't keeps: the curve for each kind of points it awards, and 0 for the kinds it leaves off */
export const awardedDoDontPoints = (
  difficulty: number,
  type: "do" | "dont",
  awardPoints: { xp: boolean; gp: boolean; ap: boolean }
): { xp: number; gp: number; ap: number } => {
  const { xp, gp, ap } = doDontPoints(difficulty, type);
  return { xp: awardPoints.xp ? xp : 0, gp: awardPoints.gp ? gp : 0, ap: awardPoints.ap ? ap : 0 };
};
