/**
 * The Game Master's shop item wizard (docs: compendium-wizards-design, W3): What is it? -> What does it cost? -> Who can
 * buy it? -> Gear stats (a virtual item only) -> Stock it. Pure: no Vue, no storage, no router. The form
 * (components/XpCreateUpdateAccessory.vue) holds an ItemDraft, paints one step at a time in XpWizardShell and, on the
 * summary's verb, saves `itemToRecord(draft, original)` once through AccessoriesDb.setAccessory.
 *
 * Two rules the old form got wrong live here: a name and a price are required (an item with no price is never put on
 * a shelf, see stockShelf), and "every hero" is an empty list, never [""] (PurchaseService reads empty as everyone).
 */
import { AccessoryType, Rarity } from "@/lib/databases/AccessoriesDb";
import type { Accessory } from "@/lib/databases/AccessoriesDb";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";

// ---------------------------------------------------------------------------------------------------------------------
// The draft
// ---------------------------------------------------------------------------------------------------------------------

export type GearStatKey = "hp" | "mp" | "attack" | "defense" | "speed";

export type GearStats = Record<GearStatKey, number>;

export interface ItemDraft {
  /** Set when an existing item is edited: saving writes over it. Left out for a new item (the database mints one). */
  id?: string;
  name: string;
  description: string;
  type: AccessoryType;
  imageUrl: string;
  url: string;
  rarity: Rarity;
  tags: string[];
  /** Whole gold pieces; 0 means no price yet */
  basePrice: number;
  isLayaway: boolean;
  requiresApproval: boolean;
  /** Hero ids that may buy it. Empty = every hero (never [""]). */
  availableToMembers: string[];
  bonusStats: GearStats;
}

export type ItemStepId = "what" | "cost" | "who" | "gear" | "stock";

/** The five stats a virtual item can grant: label for the screen, step for the +/- buttons */
export const GEAR_STATS: readonly { key: GearStatKey; label: string; icon: string; step: number }[] = [
  { key: "hp", label: "HP", icon: "heart", step: 5 },
  { key: "mp", label: "MP", icon: "sparkles", step: 5 },
  { key: "attack", label: "Attack", icon: "sword", step: 1 },
  { key: "defense", label: "Defense", icon: "shield", step: 1 },
  { key: "speed", label: "Speed", icon: "wind", step: 1 },
];

export const GEAR_STAT_LIMIT = 999;

export const TYPE_CHOICES: readonly { value: AccessoryType; label: string; hint: string; icon: string }[] = [
  { value: AccessoryType.RealLife, label: "Real Life", hint: "A treat or a privilege you hand over", icon: "gift" },
  { value: AccessoryType.Virtual, label: "Virtual", hint: "An item a hero uses in the game", icon: "treasure-chest" },
];

export const RARITY_CHOICES: readonly { value: Rarity; label: string }[] = [
  { value: Rarity.Common, label: "Common" },
  { value: Rarity.Uncommon, label: "Uncommon" },
  { value: Rarity.Rare, label: "Rare" },
  { value: Rarity.Epic, label: "Epic" },
  { value: Rarity.Legendary, label: "Legendary" },
];

/** Quick prices for the thumb: the price field stays for anything else */
export const PRICE_CHOICES: readonly number[] = [5, 10, 25, 50, 100, 250];

const blankStats = (): GearStats => ({ hp: 0, mp: 0, attack: 0, defense: 0, speed: 0 });

/** A new item: a virtual one for every hero, free of layaway and approval, with no price yet. */
export const blankItem = (): ItemDraft => ({
  name: "",
  description: "",
  type: AccessoryType.Virtual,
  imageUrl: "",
  url: "",
  rarity: Rarity.Common,
  tags: [],
  basePrice: 0,
  isLayaway: false,
  requiresApproval: false,
  availableToMembers: [],
  bonusStats: blankStats(),
});

// ---------------------------------------------------------------------------------------------------------------------
// Reading what a parent types, and what the list saved
// ---------------------------------------------------------------------------------------------------------------------

/** A typed or saved price as whole gold: "25" and 25.9 become 25; blank, text, negative and NaN become 0. */
export const parsePrice = (value: unknown): number => {
  const price = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(price) && price > 0 ? Math.floor(price) : 0;
};

/** The old form's [""] and any repeat or stray number become a clean list of hero ids. */
const cleanMembers = (members: unknown): string[] =>
  Array.isArray(members) ? [...new Set(members.map((id) => String(id ?? "").trim()).filter(Boolean))] : [];

const cleanTags = (tags: unknown): string[] =>
  Array.isArray(tags) ? tags.map((tag) => String(tag ?? "").trim()).filter(Boolean) : [];

const isRarity = (value: number): value is Rarity => RARITY_CHOICES.some((choice) => choice.value === value);

const statOf = (value: unknown): number => {
  const stat = Number(value);
  return Number.isFinite(stat) ? Math.max(-GEAR_STAT_LIMIT, Math.min(GEAR_STAT_LIMIT, Math.trunc(stat))) : 0;
};

/** The list calls a real-life item "real" in any case; anything else is a virtual one (the form's old default). */
const typeOf = (value: unknown): AccessoryType =>
  String(value ?? "").toLowerCase() === AccessoryType.RealLife ? AccessoryType.RealLife : AccessoryType.Virtual;

/** Opens a saved item as a draft, with every field present and a copy of every list. */
export const itemFromRecord = (record: Partial<Accessory>): ItemDraft => {
  const stats: Partial<GearStats> = record.bonusStats ?? {};
  const rarity = Number(record.rarity);
  return {
    id: record.id === undefined || record.id === null ? undefined : String(record.id),
    name: String(record.name ?? ""),
    description: String(record.description ?? ""),
    type: typeOf(record.type),
    imageUrl: String(record.imageUrl ?? ""),
    url: String(record.url ?? ""),
    rarity: isRarity(rarity) ? rarity : Rarity.Common,
    tags: cleanTags(record.tags),
    basePrice: parsePrice(record.basePrice),
    isLayaway: Boolean(record.isLayaway),
    requiresApproval: Boolean(record.requiresApproval),
    availableToMembers: cleanMembers(record.availableToMembers),
    bonusStats: {
      hp: statOf(stats.hp),
      mp: statOf(stats.mp),
      attack: statOf(stats.attack),
      defense: statOf(stats.defense),
      speed: statOf(stats.speed),
    },
  };
};

/**
 * The record to save. It starts from the item as it was stored, so what the wizard does not ask (stock counts, expiry,
 * purchase history, the icon a preset brought, the reward count) survives an edit. Gear is only written for a virtual
 * item, and only the stats that are not zero. With no `id` the database mints one.
 */
export const itemToRecord = (draft: ItemDraft, original?: Accessory | null): Accessory => {
  const isVirtual = draft.type === AccessoryType.Virtual;
  const bonusStats: Accessory["bonusStats"] = {};
  if (isVirtual) {
    for (const { key } of GEAR_STATS) {
      const bonus = draft.bonusStats[key];
      if (bonus) bonusStats[key] = bonus;
    }
  }
  return {
    rewardCount: 0,
    ...(original ?? {}),
    id: draft.id ?? original?.id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    type: draft.type,
    imageUrl: draft.imageUrl.trim(),
    url: draft.url.trim(),
    rarity: draft.rarity,
    tags: [...draft.tags],
    basePrice: parsePrice(draft.basePrice),
    isLayaway: draft.isLayaway,
    requiresApproval: draft.requiresApproval,
    availableToMembers: cleanMembers(draft.availableToMembers),
    bonusStats,
  };
};

// ---------------------------------------------------------------------------------------------------------------------
// Tags and gear
// ---------------------------------------------------------------------------------------------------------------------

/** Adds what was typed ("clothing, book") to the tags: trimmed, no blanks, no repeats in any case. */
export const addTags = (tags: readonly string[], typed: string): string[] => {
  const next = [...tags];
  for (const piece of typed.split(",")) {
    const tag = piece.trim();
    const isNewTag = Boolean(tag) && !next.some((held) => held.toLowerCase() === tag.toLowerCase());
    if (isNewTag) next.push(tag);
  }
  return next;
};

export const removeTag = (tags: readonly string[], tag: string): string[] => tags.filter((held) => held !== tag);

/** One tap of a stat's plus or minus, kept inside the limit. */
export const adjustStat = (current: number, delta: number): number => statOf(current + delta);

const signed = (value: number): string => (value > 0 ? `+${value}` : `${value}`);

/** "+5 HP, +2 Attack", or "No bonus" when every stat is zero. */
export const gearLine = (stats: GearStats): string => {
  const parts = GEAR_STATS.filter(({ key }) => stats[key]).map(({ key, label }) => `${signed(stats[key])} ${label}`);
  return parts.length ? parts.join(", ") : "No bonus";
};

// ---------------------------------------------------------------------------------------------------------------------
// The steps
// ---------------------------------------------------------------------------------------------------------------------

/** A real-life item has nothing to wear, so Gear stats are never asked (a missing type counts as virtual). */
const isRealLife = (draft: ItemDraft): boolean => draft.type === AccessoryType.RealLife;

/**
 * The screens as steps of the shared wizard shell, the guide's line in the Game Master's voice. A name and a price are
 * the only required answers; Who can buy it has an answer from the start (every hero) and Gear stats are skipped for a
 * real-life item. The last step is the summary: its verb is "Stock it" and the shell opens an edit there.
 */
export const itemWizardSteps = (): WizardStep<ItemDraft>[] => [
  {
    id: "what",
    title: "What is it?",
    guide: "What are you putting on the shelf?",
    icon: "tag",
    isValid: (draft) => draft.name.trim().length > 0 || "Give it a name",
  },
  {
    id: "cost",
    title: "What does it cost?",
    guide: "What does a hero pay for it?",
    icon: "coins",
    isValid: (draft) => parsePrice(draft.basePrice) >= 1 || "Set a price",
  },
  {
    id: "who",
    title: "Who can buy it?",
    guide: "Which heroes may buy it?",
    icon: "users",
    isValid: () => true,
  },
  {
    id: "gear",
    title: "Gear stats",
    guide: "What does it add when a hero uses it?",
    icon: "shield",
    isValid: (draft) => Object.values(draft.bonusStats).every(Number.isFinite) || "Stats are numbers",
    isSkipped: isRealLife,
  },
  {
    id: "stock",
    title: "Stock it",
    guide: "Look it over. Ready to put it on the shelf?",
    icon: "store",
    isValid: () => true,
  },
];

// ---------------------------------------------------------------------------------------------------------------------
// The summary
// ---------------------------------------------------------------------------------------------------------------------

export interface SummaryRow {
  /** The step that owns this answer: a tap on the row jumps there */
  step: ItemStepId;
  label: string;
  value: string;
}

const rarityLabel = (rarity: Rarity): string => RARITY_CHOICES.find((choice) => choice.value === rarity)?.label ?? "Common";

/** The answers of the wizard in a parent's words, one row per step that was asked. */
export const itemSummary = (draft: ItemDraft, heroName: (id: string) => string): SummaryRow[] => {
  const typeLabel = TYPE_CHOICES.find((choice) => choice.value === draft.type)?.label ?? "Virtual";
  const price = parsePrice(draft.basePrice);
  const priceParts = [price ? `${price} GP` : "No price yet"];
  if (draft.isLayaway) priceParts.push("layaway");
  if (draft.requiresApproval) priceParts.push("you approve it");

  const rows: SummaryRow[] = [
    { step: "what", label: "It is", value: `${typeLabel}, ${rarityLabel(draft.rarity)}` },
    { step: "cost", label: "Costs", value: priceParts.join(", ") },
    {
      step: "who",
      label: "Who can buy it",
      value: draft.availableToMembers.length ? draft.availableToMembers.map(heroName).join(", ") : "Every hero",
    },
  ];
  if (!isRealLife(draft)) rows.push({ step: "gear", label: "Adds", value: gearLine(draft.bonusStats) });
  return rows;
};
