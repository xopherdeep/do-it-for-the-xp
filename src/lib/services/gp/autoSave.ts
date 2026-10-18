import type { GpPayload } from "@/lib/store/stores/user/types";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";

/**
 * Auto-save (Settings > Chores): the Game Master sends a share of every GP reward straight into the hero's savings at
 * the Gold Bank. Rewards are quests, won fights, streak chests and temple treasure; gifts, refunds and bonuses from a
 * Game Master land in the wallet as they always did. The share rounds down, so a 1 GP reward is never split.
 */

/** How much of `gp` goes to savings at `percent`, and what is left for the wallet */
export const splitReward = (gp: number, percent: number): { wallet: number; savings: number } => {
  const whole = Math.max(0, Math.round(Number(gp) || 0));
  const share = Math.min(100, Math.max(0, Number(percent) || 0));
  const savings = Math.floor((whole * share) / 100);
  return { wallet: whole - savings, savings };
};

/** The move for a GP reward with the family's auto-save share taken out (read from the rules as loaded) */
export const rewardGpPayload = (userId: string, gp: number, note?: string): GpPayload => {
  const { wallet, savings } = splitReward(gp, useGameRulesStore().autoSavePercent);
  return {
    userId,
    wallet,
    ...(savings > 0 ? { savings } : {}),
    kind: "earn",
    ...(note ? { note: savings > 0 ? `${note} (${savings} GP saved)` : note } : {}),
  };
};
