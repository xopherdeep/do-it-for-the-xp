import { reactive } from "vue";
import type { VictoryCardState } from "@/app/Console/BattleField/battle/battleView";

/**
 * The app-wide loot card: any screen calls `showRewards(card)` and the one XpRewardsOverlay in App.vue counts it up
 * over everything (a closing modal included). The promise settles when the hero taps past it.
 */
export const rewardsOverlay = reactive<{ card: VictoryCardState | null }>({ card: null });

let settle: (() => void) | null = null;

export const showRewards = (card: VictoryCardState): Promise<void> => {
  settle?.();
  rewardsOverlay.card = card;
  return new Promise((resolve) => {
    settle = resolve;
  });
};

export const closeRewards = (): void => {
  rewardsOverlay.card = null;
  const done = settle;
  settle = null;
  done?.();
};
