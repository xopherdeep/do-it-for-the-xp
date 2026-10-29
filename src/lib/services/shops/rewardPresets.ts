/**
 * Ready-made real-life rewards for the Game Master's shops.
 *
 * Anything that costs the family real money is an item a hero buys with GP, never a Power: Powers are privileges
 * unlocked with AP (src/lib/services/abilities/AbilityPresets.ts). Prices are dollars x GP_PER_DOLLAR (100 GP = $1,
 * so 1 GP = 1 cent, see gpForDollars). They climb the wallet ladder in src/lib/services/gp/wallet.ts (500 GP to
 * start, 1500 at level 3, 3000 at level 5, 6000 at level 10), so the big rewards mean saving up and growing the
 * wallet. Stocking and pricing an item is the Game Master's approval, so buying one never waits for another.
 */
import { Accessory, AccessoryType, Rarity } from "@/lib/databases/AccessoriesDb";
import { gpForDollars } from "@/lib/services/gp/exchangeRate";

/** The fields a preset decides; the rest come from AccessoriesDb's defaults when it is saved */
export interface RewardPreset {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  /** Real-money value in dollars; basePrice is gpForDollars(dollars) */
  dollars?: number;
  rarity: Rarity;
  /** Font Awesome duotone icon name, without the fa- prefix */
  icon: string;
}

export const REAL_REWARD_PRESETS: readonly RewardPreset[] = [
  {
    id: "reward-frost-treat",
    name: "Frost Treat",
    description: "An ice cream or a sweet treat.",
    basePrice: gpForDollars(4),
    dollars: 4,
    rarity: Rarity.Common,
    icon: "ice-cream",
  },
  {
    id: "reward-bookseller-tome",
    name: "Tome from the Bookseller",
    description: "A new book of the hero's choosing.",
    basePrice: gpForDollars(12),
    dollars: 12,
    rarity: Rarity.Common,
    icon: "book-open",
  },
  {
    id: "reward-arcade-tokens",
    name: "Arcade Tokens",
    description: "A handful of tokens for the arcade.",
    basePrice: gpForDollars(10),
    dollars: 10,
    rarity: Rarity.Uncommon,
    icon: "coins",
  },
  {
    id: "reward-merchant-trinket",
    name: "Merchant's Trinket",
    description: "A small toy or trinket, up to the price the Game Master sets.",
    basePrice: gpForDollars(10),
    dollars: 10,
    rarity: Rarity.Uncommon,
    icon: "gift",
  },
  {
    id: "reward-picture-show",
    name: "Picture Show Ticket",
    description: "A trip to the movie theater.",
    basePrice: gpForDollars(15),
    dollars: 15,
    rarity: Rarity.Uncommon,
    icon: "film",
  },
  {
    id: "reward-tavern-feast",
    name: "Tavern Feast",
    description: "Dinner out at a restaurant the hero picks.",
    basePrice: gpForDollars(60),
    dollars: 60,
    rarity: Rarity.Rare,
    icon: "utensils",
  },
  {
    id: "reward-boba-tea",
    name: "Boba Tea",
    description: "A refreshing boba tea treat.",
    basePrice: gpForDollars(6),
    dollars: 6,
    rarity: Rarity.Common,
    icon: "mug-hot",
  },
  {
    id: "reward-pizza-night",
    name: "Pizza Night Feast",
    description: "A family pizza night feast.",
    basePrice: gpForDollars(25),
    dollars: 25,
    rarity: Rarity.Uncommon,
    icon: "pizza-slice",
  },
  {
    id: "reward-taco-night",
    name: "Taco Night",
    description: "A festive taco night dinner.",
    basePrice: gpForDollars(15),
    dollars: 15,
    rarity: Rarity.Uncommon,
    icon: "taco",
  },
  {
    id: "reward-sushi-night",
    name: "Sushi / Ramen Night",
    description: "Dinner out for sushi or ramen.",
    basePrice: gpForDollars(40),
    dollars: 40,
    rarity: Rarity.Uncommon,
    icon: "fish",
  },
  {
    id: "reward-video-game-indie",
    name: "Indie Game / $30 Game",
    description: "A digital indie game of choice.",
    basePrice: gpForDollars(30),
    dollars: 30,
    rarity: Rarity.Rare,
    icon: "gamepad",
  },
  {
    id: "reward-video-game-major",
    name: "Major Game Release / $60 Game",
    description: "A major new video game release.",
    basePrice: gpForDollars(60),
    dollars: 60,
    rarity: Rarity.Rare,
    icon: "gamepad",
  },
  {
    id: "reward-shopping-spree",
    name: "Shopping Spree $25-$30",
    description: "A small shopping trip of choice.",
    basePrice: gpForDollars(30),
    dollars: 30,
    rarity: Rarity.Rare,
    icon: "shopping-bag",
  },
  {
    id: "reward-sleepover",
    name: "Sleepover Party",
    description: "Hosting friends for a sleepover party.",
    basePrice: gpForDollars(20),
    dollars: 20,
    rarity: Rarity.Uncommon,
    icon: "bed",
  },
  {
    id: "reward-salon-spa",
    name: "Spa & Salon Day / Manicure / Haircut",
    description: "A pampering spa or salon session.",
    basePrice: gpForDollars(40),
    dollars: 40,
    rarity: Rarity.Rare,
    icon: "spa",
  },
  {
    id: "reward-lego-set",
    name: "Lego Construction Set",
    description: "A new Lego building set.",
    basePrice: gpForDollars(40),
    dollars: 40,
    rarity: Rarity.Rare,
    icon: "cubes",
  },
  {
    id: "reward-new-bike",
    name: "Steed of the Realm / New Bike",
    description: "A brand new bicycle for travel.",
    basePrice: gpForDollars(150),
    dollars: 150,
    rarity: Rarity.Legendary,
    icon: "bicycle",
  },
  {
    id: "reward-sticker",
    name: "Sticker",
    description: "One shiny sticker.",
    basePrice: gpForDollars(0.75),
    dollars: 0.75,
    rarity: Rarity.Common,
    icon: "star",
  },
  {
    id: "reward-sticker-sheet",
    name: "Sticker Sheet",
    description: "A whole sheet of stickers.",
    basePrice: gpForDollars(1),
    dollars: 1,
    rarity: Rarity.Common,
    icon: "sticky-note",
  },
  {
    id: "reward-candy-pouch",
    name: "Candy Pouch",
    description: "A small bag of candy.",
    basePrice: gpForDollars(1.5),
    dollars: 1.5,
    rarity: Rarity.Common,
    icon: "candy-cane",
  },
  {
    id: "reward-trading-cards",
    name: "Trading Card Pack",
    description: "One booster pack of cards.",
    basePrice: gpForDollars(5),
    dollars: 5,
    rarity: Rarity.Uncommon,
    icon: "layer-group",
  },
];

export const BASIC_CONSUMABLE_PRESETS: readonly RewardPreset[] = [
  {
    id: "item-health-potion",
    name: "Health Potion",
    description: "A refreshing red elixir that restores 50 HP.",
    basePrice: 50,
    rarity: Rarity.Common,
    icon: "flask-potion",
  },
  {
    id: "item-mana-potion",
    name: "Mana Potion",
    description: "A shimmering blue potion that restores 30 MP.",
    basePrice: 75,
    rarity: Rarity.Common,
    icon: "flask-potion",
  },
  {
    id: "item-ether",
    name: "Ether",
    description: "A concentrated magical essence that restores 50 MP.",
    basePrice: 100,
    rarity: Rarity.Uncommon,
    icon: "sparkles",
  },
  {
    id: "item-elixir",
    name: "Elixir",
    description: "A legendary golden brew that fully restores HP and MP.",
    basePrice: 200,
    rarity: Rarity.Rare,
    icon: "flask",
  },
];

export const ALL_REWARD_PRESETS: readonly RewardPreset[] = [
  ...BASIC_CONSUMABLE_PRESETS,
  ...REAL_REWARD_PRESETS,
];

/** The item record a consumable preset becomes: an in-game consumable a hero buys into their backpack */
export const consumableFromPreset = (preset: RewardPreset): Accessory => ({
  id: preset.id,
  name: preset.name,
  description: preset.description,
  basePrice: preset.basePrice,
  rarity: preset.rarity,
  icon: preset.icon,
  url: "",
  rewardCount: 0,
  isLayaway: false,
  type: AccessoryType.Virtual,
  availableToMembers: [],
  requiresApproval: false,
  tags: ["consumable", "preset"],
});

/** The item record a preset becomes in the catalogue: a real-life reward a hero may buy as soon as a shop stocks it */
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
  requiresApproval: false,
  tags: ["real-life", "preset"],
});

/** Presets the catalogue does not hold yet (matched by id, so a renamed copy still counts as added) */
export const presetsNotIn = (items: readonly Pick<Accessory, "id">[]): RewardPreset[] => {
  const held = new Set(items.map((item) => item.id));
  return ALL_REWARD_PRESETS.filter((preset) => !held.has(preset.id));
};
