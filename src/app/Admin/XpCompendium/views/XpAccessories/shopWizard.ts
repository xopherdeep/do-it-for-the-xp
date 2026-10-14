/**
 * The Game Master's shop wizard (docs: compendium-wizards-design, W5): Name the shop and clerk -> Dress the shop -> Open
 * hours -> Stock it -> Open. Pure: no Vue, no storage, no router. The form (components/XpCreateUpdateShop.vue) holds a
 * ShopDraft, paints one step at a time in XpWizardShell and, on the summary's verb, saves `shopToRecord(draft, original)`
 * once through shopsDb.setShop. The record already carries the hours and the items, so the detail tabs (Items, Hours,
 * Decorate, Clerk) keep reading and writing the very same shop afterwards.
 *
 * The lists the Decorate tab shows live here too (the worlds, the sign icons), so the wizard and the tab cannot drift.
 * Fixed on the way: the old create form offered mountain / desert / snow / volcano, but the art ids are mountains / ice /
 * swamps, so those shops fell back to the world map. `normalWorld` reads such an old name as the art it meant.
 */
import { ShopItemType, clerkDefaultFor, customClerkName, customGreeting } from "@/lib/databases/ShopsDb";
import type { ShopInterface, ShopItem } from "@/lib/databases/ShopsDb";
import { SHOP_METADATA } from "@/lib/engine/core/shopRegistry";
import { DEFAULT_SHOP_HOURS, clockToMinutes, formatClock, hoursSummary } from "@/lib/services/shops/shopHours";
import type { ShopHours } from "@/lib/services/shops/shopHours";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";
import { parsePrice } from "./itemWizard";

// ---------------------------------------------------------------------------------------------------------------------
// The worlds and the icons on offer (the Decorate tab shows the same ones)
// ---------------------------------------------------------------------------------------------------------------------

/** The world art a shop can wear (a shop's `world` is one of these ids), in the order the Decorate tab lists it. */
export const SHOP_WORLD_CHOICES: { id: string; label: string }[] = [
  { id: "hometown", label: "Hometown" },
  { id: "plains", label: "Plains" },
  { id: "forest", label: "Forest" },
  { id: "islands", label: "Islands" },
  { id: "mountains", label: "Mountains" },
  { id: "desert", label: "Desert" },
  { id: "swamps", label: "Swamps" },
  { id: "ice", label: "Tundra" },
  { id: "clouds", label: "Clouds" },
  { id: "moon", label: "Moon" },
  { id: "map", label: "World Map" },
];

/** Names the old create form's select used for art that has another id. */
const WORLD_ALIASES: Record<string, string> = { mountain: "mountains", snow: "ice", swamp: "swamps" };

/** A world id as the art knows it: trimmed, lower case, an old name read as the art it meant ("" for none). */
export const normalWorld = (world?: string | null): string => {
  const id = String(world ?? "").trim().toLowerCase();
  return WORLD_ALIASES[id] ?? id;
};

/** "Tundra" for `ice`; a world with no entry (an old free-text value) by its own id with a capital. */
export const worldLabel = (world: string): string => {
  const id = normalWorld(world);
  const choice = SHOP_WORLD_CHOICES.find((candidate) => candidate.id === id);
  return choice?.label ?? id.replace(/^./, (letter) => letter.toUpperCase());
};

/** Duotone Font Awesome names that suit a shop sign (all of them are in the bundled icon set). */
export const SHOP_ICON_NAMES: readonly string[] = [
  "store",
  "store-alt",
  "shopping-bag",
  "sack-dollar",
  "treasure-chest",
  "gem",
  "farm",
  "pegasus",
  "horse",
  "ship",
  "anchor",
  "campground",
  "caravan",
  "wagon-covered",
  "dungeon",
  "igloo",
  "snowflake",
  "island-tropical",
  "cactus",
  "cauldron",
  "hat-witch",
  "hat-wizard",
  "flask-potion",
  "book-spells",
  "scroll",
  "swords",
  "shield",
  "crown",
  "chess-rook",
  "moon",
  "cloud",
  "mountain",
  "tree",
  "house",
  "torii-gate",
  "skull",
];

/** The class a shop record keeps for its sign: `fad fa-store`. */
export const shopIconClass = (name: string): string => `fad fa-${name}`;

/** "fad fa-treasure-chest" -> "Treasure chest" */
export const shopIconLabel = (value: string): string =>
  value
    .replace(/^fa[dsrlb]? fa-/, "")
    .replace(/-/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());

/** The sign grid: the stock icons, with any icon the shop already wears (or defaults to) first when it is not one of them. */
export const shopIconChoices = (offered: readonly (string | null | undefined)[] = []): { value: string; label: string }[] => {
  const stock = SHOP_ICON_NAMES.map(shopIconClass);
  const extra = [...new Set(offered.filter((value): value is string => Boolean(value)))].filter((value) => !stock.includes(value));
  return [...extra, ...stock].map((value) => ({ value, label: shopIconLabel(value) }));
};

// ---------------------------------------------------------------------------------------------------------------------
// The draft
// ---------------------------------------------------------------------------------------------------------------------

export interface ShopDraft {
  /** Set when an existing shop is edited: saving writes over it. Left out for a new shop (the database mints one). */
  id?: string;
  name: string;
  description: string;
  /** The clerk the Game Master chose; empty = the portal's own clerk for this shop */
  clerkName: string;
  /** What the clerk says to a hero walking in; empty = the portal's own line */
  greeting: string;
  /** A world art id (SHOP_WORLD_CHOICES) */
  world: string;
  /** The sign, as the record keeps it: `fad fa-store` */
  icon: string;
  alwaysOpen: boolean;
  /** Local "HH:MM"; read only while the shop keeps hours */
  opensAt: string;
  closesAt: string;
  items: ShopItem[];
}

export type ShopStepId = "name" | "dress" | "hours" | "stock" | "open";

export const DEFAULT_WORLD = "hometown";
export const DEFAULT_ICON = shopIconClass("store");

/** A new shop: nameless, in the hometown with the store sign, always open, with bare shelves. */
export const blankShop = (): ShopDraft => ({
  name: "",
  description: "",
  clerkName: "",
  greeting: "",
  world: DEFAULT_WORLD,
  icon: DEFAULT_ICON,
  alwaysOpen: true,
  opensAt: DEFAULT_SHOP_HOURS.open,
  closesAt: DEFAULT_SHOP_HOURS.close,
  items: [],
});

// ---------------------------------------------------------------------------------------------------------------------
// The shelves
// ---------------------------------------------------------------------------------------------------------------------

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EVERY_DAY = "Every day";

const isDayOfTheWeek = (day: number): boolean => Number.isInteger(day) && day >= 0 && day <= 6;

/** Days 0 to 6, each once, in order; anything else is dropped. */
const cleanDays = (days: unknown): number[] =>
  Array.isArray(days) ? [...new Set(days.map(Number).filter(isDayOfTheWeek))].sort((a, b) => a - b) : [];

const copyGood = (item: ShopItem): ShopItem => ({ ...item, availableDays: [...(item.availableDays ?? [])] });

/** The shelves ready to save: one entry per good, a price only when it is whole gold, days cleaned. */
const cleanItems = (items: readonly ShopItem[] | undefined): ShopItem[] => {
  const seen = new Set<string>();
  const clean: ShopItem[] = [];
  for (const item of items ?? []) {
    const itemId = String(item?.itemId ?? "").trim();
    const isStrayOrRepeat = !itemId || seen.has(itemId);
    if (isStrayOrRepeat) continue;
    seen.add(itemId);
    const kept: ShopItem = { ...item, itemId, type: item.type ?? ShopItemType.Accessory, availableDays: cleanDays(item.availableDays) };
    const price = parsePrice(item.price);
    if (price) kept.price = price;
    else delete kept.price;
    clean.push(kept);
  }
  return clean;
};

/**
 * What the item picker handed back, on the shelves: a good still picked keeps its own price and days, a new one is
 * stocked every day at its usual price, an unpicked one is taken off. Order stays the shelf's own, new goods last.
 */
export const pickGoods = (items: readonly ShopItem[], pickedIds: readonly string[]): ShopItem[] => {
  const picked = [...new Set(pickedIds.map((id) => String(id ?? "").trim()).filter(Boolean))];
  const kept = items.filter((item) => picked.includes(item.itemId)).map(copyGood);
  const held = new Set(kept.map((item) => item.itemId));
  const added = picked.filter((id) => !held.has(id)).map((itemId): ShopItem => ({ itemId, type: ShopItemType.Accessory, availableDays: [] }));
  return [...kept, ...added];
};

/** A good's own price from what was typed ("25"); blank, zero or text puts the usual price back. */
export const setGoodPrice = (items: readonly ShopItem[], itemId: string, typed: unknown): ShopItem[] => {
  const price = parsePrice(typed);
  return items.map((item) => {
    const next = copyGood(item);
    if (item.itemId !== itemId) return next;
    if (price) next.price = price;
    else delete next.price;
    return next;
  });
};

/** The days a good is stocked; none = every day. */
export const setGoodDays = (items: readonly ShopItem[], itemId: string, days: readonly number[]): ShopItem[] =>
  items.map((item) => (item.itemId === itemId ? { ...copyGood(item), availableDays: cleanDays([...days]) } : copyGood(item)));

export const dropGood = (items: readonly ShopItem[], itemId: string): ShopItem[] =>
  items.filter((item) => item.itemId !== itemId).map(copyGood);

/** "Every day" (none picked, or all seven) or "Mon, Wed, Fri". */
export const daysLine = (days?: readonly number[] | null): string => {
  const clean = cleanDays(days ? [...days] : []);
  const isEveryDay = clean.length === 0 || clean.length === 7;
  return isEveryDay ? EVERY_DAY : clean.map((day) => DAY_NAMES[day]).join(", ");
};

// ---------------------------------------------------------------------------------------------------------------------
// The hours
// ---------------------------------------------------------------------------------------------------------------------

type HoursDraft = Pick<ShopDraft, "alwaysOpen" | "opensAt" | "closesAt">;

const hasReadableTimes = (draft: HoursDraft): boolean => clockToMinutes(draft.opensAt) !== null && clockToMinutes(draft.closesAt) !== null;

/** The two times to save, or null for an always open shop (and for times that cannot be read, as the hero's shop does). */
export const hoursOf = (draft: HoursDraft): ShopHours | null => {
  const keepsNoHours = draft.alwaysOpen || !hasReadableTimes(draft);
  return keepsNoHours ? null : { open: draft.opensAt, close: draft.closesAt };
};

/** The one line under the times when they do something a parent may not expect; empty otherwise. */
export const hoursNote = (draft: HoursDraft): string => {
  if (!hoursOf(draft)) return "";
  if (draft.opensAt === draft.closesAt) return "Opening and closing at the same time keeps the shop open all day.";
  const closesBeforeOpening = (clockToMinutes(draft.closesAt) as number) < (clockToMinutes(draft.opensAt) as number);
  return closesBeforeOpening ? `This runs past midnight: heroes can shop until ${formatClock(draft.closesAt)} the next morning.` : "";
};

// ---------------------------------------------------------------------------------------------------------------------
// Opening a saved shop, and the record to save
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Opens a saved shop as a draft, with every field present and a copy of the shelves. The clerk is only what the Game
 * Master chose: a seeded shop's registry clerk stands in on the portal until then, so it is not shown as a choice.
 */
export const shopFromRecord = (record: Partial<ShopInterface>): ShopDraft => {
  const hours = record.hours;
  const hoursAreReadable = Boolean(hours) && clockToMinutes(hours?.open) !== null && clockToMinutes(hours?.close) !== null;
  return {
    id: record.id ? String(record.id) : undefined,
    name: String(record.name ?? ""),
    description: String(record.description ?? ""),
    clerkName: customClerkName({ id: String(record.id ?? ""), clerkName: record.clerkName }),
    greeting: customGreeting(record),
    world: normalWorld(record.world) || DEFAULT_WORLD,
    icon: String(record.icon ?? "").trim() || DEFAULT_ICON,
    alwaysOpen: !hoursAreReadable,
    opensAt: hoursAreReadable ? (hours as ShopHours).open : DEFAULT_SHOP_HOURS.open,
    closesAt: hoursAreReadable ? (hours as ShopHours).close : DEFAULT_SHOP_HOURS.close,
    items: (record.items ?? []).map(copyGood),
  };
};

/**
 * The record to save. It starts from the shop as it was stored, so what the wizard does not ask survives an edit. The
 * clerk and the greeting are written the way the Clerk tab writes them (an empty name puts the registry clerk back, an
 * empty greeting is removed), the hours the way the Hours tab does (null = always open). With no id the database mints one.
 */
export const shopToRecord = (draft: ShopDraft, original?: ShopInterface | null): ShopInterface => {
  const id = draft.id ?? original?.id ?? "";
  const record: ShopInterface = {
    ...(original ?? {}),
    id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    world: normalWorld(draft.world) || DEFAULT_WORLD,
    icon: draft.icon.trim() || DEFAULT_ICON,
    clerkName: draft.clerkName.trim() || SHOP_METADATA[id]?.clerkName || "",
    hours: hoursOf(draft),
    items: cleanItems(draft.items),
  };
  const greeting = draft.greeting.trim();
  if (greeting) record.greeting = greeting;
  else delete record.greeting;
  return record;
};

// ---------------------------------------------------------------------------------------------------------------------
// The steps
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The screens as steps of the shared wizard shell, the guide's line in the Game Master's voice. A name is the only
 * required answer: the look, the hours and the shelves all start filled in, and the shelves may stay bare (stocking can
 * wait for the Items tab, and a Game Master with no items yet must still be able to open the doors). The last step is
 * the summary: its verb is "Open" and the shell opens an edit there.
 */
export const shopWizardSteps = (): WizardStep<ShopDraft>[] => [
  {
    id: "name",
    title: "Name the shop and clerk",
    guide: "What is the shop called, and who stands behind the counter?",
    icon: "store",
    isValid: (draft) => draft.name.trim().length > 0 || "Name the shop",
  },
  {
    id: "dress",
    title: "Dress the shop",
    guide: "What does the shop look like from the street?",
    icon: "paint-brush",
    isValid: (draft) => {
      if (!draft.world.trim()) return "Pick a look for the shop";
      return draft.icon.trim().length > 0 || "Pick a sign for the shop";
    },
  },
  {
    id: "hours",
    title: "Open hours",
    guide: "When are the doors open?",
    icon: "clock",
    isValid: (draft) => draft.alwaysOpen || hasReadableTimes(draft) || "Pick when it opens and closes",
  },
  {
    id: "stock",
    title: "Stock it",
    guide: "What goes on the shelves?",
    icon: "boxes",
    isValid: () => true,
  },
  {
    id: "open",
    title: "Open the shop",
    guide: "Look it over. Ready to open the doors?",
    icon: "door-open",
    isValid: () => true,
  },
];

// ---------------------------------------------------------------------------------------------------------------------
// The summary
// ---------------------------------------------------------------------------------------------------------------------

export interface ShopSummaryRow {
  id: "shop" | "clerk" | "look" | "hours" | "shelves";
  /** The step that owns this answer: a tap on the row jumps there */
  step: ShopStepId;
  label: string;
  value: string;
}

const clerkLine = (draft: ShopDraft): string => {
  const clerk = draft.clerkName.trim();
  const greeting = draft.greeting.trim();
  const usual = clerkDefaultFor(draft.id).shopkeep;
  const isTheUsualClerk = !clerk && !greeting;
  if (isTheUsualClerk) return `${usual}, the usual clerk`;
  return `${clerk || usual}${greeting ? `: "${greeting}"` : ""}`;
};

/** "Empty for now", "1 good", "3 goods (1 priced by you, 1 on set days)" */
const shelvesLine = (items: readonly ShopItem[]): string => {
  const goods = cleanItems(items);
  if (!goods.length) return "Empty for now";
  const priced = goods.filter((item) => item.price).length;
  const onSetDays = goods.filter((item) => daysLine(item.availableDays) !== EVERY_DAY).length;
  const extras = [priced ? `${priced} priced by you` : "", onSetDays ? `${onSetDays} on set days` : ""].filter(Boolean);
  const count = `${goods.length} good${goods.length === 1 ? "" : "s"}`;
  return extras.length ? `${count} (${extras.join(", ")})` : count;
};

/** The answers of the wizard in a parent's words, one row each, every row owned by the step that asked it. */
export const shopSummary = (draft: ShopDraft): ShopSummaryRow[] => [
  { id: "shop", step: "name", label: "Shop", value: draft.name.trim() || "No name yet" },
  { id: "clerk", step: "name", label: "Clerk", value: clerkLine(draft) },
  { id: "look", step: "dress", label: "Look", value: `${worldLabel(draft.world) || "No look yet"}, ${shopIconLabel(draft.icon || DEFAULT_ICON)} sign` },
  { id: "hours", step: "hours", label: "Hours", value: hoursSummary(hoursOf(draft)) },
  { id: "shelves", step: "stock", label: "Shelves", value: shelvesLine(draft.items) },
];
