import type { Enemy } from "@/lib/services/battle/battleService/types";
import { findPotionRule } from "@/lib/services/battle/BattlePotions";

export const THIEF_BEAST_ID = "beast-thief";
export const THIEF_ENCOUNTER_RATE = 0.2;
export const THIEF_POTION_STEAL_RATE = 0.4;
export const THIEF_AVATAR = 189;

export interface TheftOutcome {
  stolenGp: number;
  stolenItemName?: string;
  hasEmptyPockets: boolean;
}

export interface HeroProfileLike {
  wallet?: number;
  inventory?: Array<{ id: string; name?: string; qty?: number; quantity?: number }>;
}

export interface UserStoreLike {
  users: Record<string, HeroProfileLike>;
  currentUser: HeroProfileLike & { id?: string | null };
  updateUserGP: (payload: { userId: string; wallet: number }) => Promise<void> | void;
  spendInventoryItem: (userId: string, entryId: string, qty?: number) => boolean;
}

/** Check whether a random roll qualifies as a thief encounter. */
export const isThiefRoll = (
  roll: number = Math.random(),
  rate: number = THIEF_ENCOUNTER_RATE
): boolean => roll < rate;

/** Factory for the special Thief Beast enemy. */
export const createThiefEnemy = (): Enemy => ({
  id: THIEF_BEAST_ID,
  name: "Thief Beast",
  type: "beast",
  isBoss: false,
  health: 80,
  maxHealth: 80,
  avatar: THIEF_AVATAR,
  emoji: "🦝",
  attack: 10,
  defense: 5,
  speed: 25,
  bg1: 260,
  bg2: 140,
  aspectRatio: 48,
  tasks: [],
});

/** Identify whether a bag item is a potion, ether, or standard restorative consumable. */
export const isPotionOrEther = (item: { name?: string } | undefined): boolean => {
  const name = item?.name?.trim();
  const hasNoName = !name;
  if (hasNoName) return false;

  const normalized = name.toLowerCase();
  const isPotionWord = normalized.includes("potion");
  const isEtherWord = normalized.includes("ether") || normalized.includes("elixir");
  const isRegisteredPotion = Boolean(findPotionRule(name));

  return isPotionWord || isEtherWord || isRegisteredPotion;
};

/** Calculate the GP amount to steal from the hero's wallet (10% to 25%, min 5, max 50). */
export const calculateStolenGp = (wallet: number, roll: number = Math.random()): number => {
  const isBroke = !wallet || wallet <= 0;
  if (isBroke) return 0;

  const percentage = 0.1 + roll * 0.15;
  const rawCut = Math.round(wallet * percentage);
  const minimumCut = Math.min(wallet, 5);
  const boundedCut = Math.min(50, Math.max(minimumCut, rawCut));

  return Math.min(wallet, boundedCut);
};

/**
 * Execute theft from hero's wallet and inventory.
 * Deducts GP and potentially 1 potion/ether from user store.
 */
export const stealFromHero = (
  userId: string,
  userStore: UserStoreLike,
  rollGp: number = Math.random(),
  rollItem: number = Math.random()
): TheftOutcome => {
  const user = userStore.users?.[userId] ?? userStore.currentUser;
  const wallet = user?.wallet ?? 0;
  const stolenGp = calculateStolenGp(wallet, rollGp);

  const hasGpToDeduct = stolenGp > 0;
  if (hasGpToDeduct) {
    void userStore.updateUserGP({ userId, wallet: -stolenGp });
  }

  const inventory = Array.isArray(user?.inventory) ? user.inventory : [];
  const candidateItems = inventory.filter(isPotionOrEther);
  const hasCandidateItems = candidateItems.length > 0;
  const shouldStealItem = hasCandidateItems && rollItem < THIEF_POTION_STEAL_RATE;

  let stolenItemName: string | undefined;
  if (shouldStealItem) {
    const pickedItem = candidateItems[0];
    const itemSpent = userStore.spendInventoryItem(userId, pickedItem.id, 1);
    if (itemSpent) {
      stolenItemName = pickedItem.name;
    }
  }

  const hasEmptyPockets = stolenGp === 0 && !stolenItemName;

  return {
    stolenGp,
    stolenItemName,
    hasEmptyPockets,
  };
};
