/**
 * Ready-made real-life rewards for the Game Master's shops.
 *
 * Anything that costs the family real money is an item a hero buys with GP, never a Power: Powers are privileges
 * unlocked with AP (src/lib/services/abilities/AbilityPresets.ts). Prices climb the wallet ladder
 * (src/lib/services/gp/wallet.ts: 100 GP to start, 300 at level 3, 500 at level 5), so the big rewards mean
 * saving up and growing the wallet. Each is flagged requiresApproval, because a grown-up has to hand it over; the hero
 * shop does not hold purchases for the Game Master yet (only quests read requiresApproval today).
 */
import { Accessory, AccessoryType, Rarity } from "@/lib/databases/AccessoriesDb";

/** The fields a preset decides; the rest come from AccessoriesDb's defaults when it is saved */
export interface RewardPreset {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  rarity: Rarity;
  /** Font Awesome duotone icon name, without the fa- prefix */
  icon: string;
}

export const REAL_REWARD_PRESETS: readonly RewardPreset[] = [
  {
    id: "reward-frost-treat",
    name: "Frost Treat",
    description: "An ice cream or a sweet treat.",
    basePrice: 60,
    rarity: Rarity.Common,
    icon: "ice-cream",
  },
  {
    id: "reward-bookseller-tome",
    name: "Tome from the Bookseller",
    description: "A new book of the hero's choosing.",
    basePrice: 150,
    rarity: Rarity.Common,
    icon: "book-open",
  },
  {
    id: "reward-arcade-tokens",
    name: "Arcade Tokens",
    description: "A handful of tokens for the arcade.",
    basePrice: 200,
    rarity: Rarity.Uncommon,
    icon: "coins",
  },
  {
    id: "reward-merchant-trinket",
    name: "Merchant's Trinket",
    description: "A small toy or trinket, up to the price the Game Master sets.",
    basePrice: 250,
    rarity: Rarity.Uncommon,
    icon: "gift",
  },
  {
    id: "reward-picture-show",
    name: "Picture Show Ticket",
    description: "A trip to the movie theater.",
    basePrice: 300,
    rarity: Rarity.Uncommon,
    icon: "film",
  },
  {
    id: "reward-tavern-feast",
    name: "Tavern Feast",
    description: "Dinner out at a restaurant the hero picks.",
    basePrice: 500,
    rarity: Rarity.Rare,
    icon: "utensils",
  },
];

/** The item record a preset becomes in the catalogue: a real-life reward that waits for the Game Master's approval */
export const rewardFromPreset = (preset: RewardPreset): Accessory => ({
  id: preset.id,
  name: preset.name,
  description: preset.description,
  basePrice: preset.basePrice,
  rarity: preset.rarity,
  icon: preset.icon,
  url: "",
  rewardCount: 0,
  isLayaway: false,
  type: AccessoryType.RealLife,
  availableToMembers: [],
  requiresApproval: true,
  tags: ["real-life", "preset"],
});

/** Presets the catalogue does not hold yet (matched by id, so a renamed copy still counts as added) */
export const presetsNotIn = (items: readonly Pick<Accessory, "id">[]): RewardPreset[] => {
  const held = new Set(items.map((item) => item.id));
  return REAL_REWARD_PRESETS.filter((preset) => !held.has(preset.id));
};
