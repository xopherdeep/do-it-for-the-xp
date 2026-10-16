/**
 * The Quick start pack: the smallest game a family can play tonight. Three evening chores (the dishes, the bedroom,
 * homework) and three rewards a hero can afford after one or two of them, so nobody has to design anything first.
 * Like every built-in pack it also carries a few timed privileges (Powers) to unlock with AP later.
 * Onboarding loads it with the kids' names and assigns every quest to them (quickStart.ts); loaded from
 * Settings > Packs instead, its quests are open bounties like every other pack's.
 */
import { REAL_REWARD_PRESETS } from "@/lib/services/shops/rewardPresets";
import type { RewardPreset } from "@/lib/services/shops/rewardPresets";
import { definePack, reward } from "./definePack";

const preset = (id: string): RewardPreset => {
  const found = REAL_REWARD_PRESETS.find((entry) => entry.id === id);
  if (!found) throw new Error(`No reward preset "${id}"`);
  return found;
};

export const QUICK_START_PACK = definePack(
  {
    id: "quick-start",
    name: "Quick start",
    version: "1.0.0",
    audience: "Families trying the game tonight",
    description: "Three evening chores and three small rewards, ready to play before you design your own.",
    icon: "bolt",
    terms: { member: "Hero", members: "Heroes", gm: "Game Master" },
  },
  {
    categories: [{ id: "cat-quick-tonight", name: "Tonight's Quests" }],
    // Difficulty 2 pays 30 GP each: two chores buy a small treat, all three the movie
    quests: [
      { id: "quick-dishes", name: "Banish the Dish Goblin", categoryId: "cat-quick-tonight", beastId: "beast-dish-goblin", schedule: "daily", difficulty: 2, timesOfDay: ["evening"] },
      { id: "quick-room", name: "Corner the Clutter Chimera", categoryId: "cat-quick-tonight", beastId: "beast-clutter-chimera", schedule: "daily", difficulty: 2, timesOfDay: ["evening"] },
      { id: "quick-homework", name: "Behead the Homework Hydra", categoryId: "cat-quick-tonight", beastId: "beast-homework-hydra", schedule: "daily", difficulty: 2, timesOfDay: ["evening"] },
    ],
    // Every price fits the 100 GP a new hero's wallet holds
    rewards: [
      reward("quick-reward-dessert", "Pick Tonight's Dessert", "You choose what the family has for dessert.", 45, "ice-cream"),
      preset("reward-frost-treat"),
      reward("quick-reward-movie", "Pick the Family Movie", "You choose what everyone watches on movie night.", 90, "film"),
    ],
    // The cheapest timed privileges, there for when the family grows the game past tonight
    powers: ["irl-timed-videos", "irl-timed-lantern", "irl-timed-house-dj"],
  }
);
