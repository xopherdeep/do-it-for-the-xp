/**
 * What the shops carry before the Game Master stocks them, and which shelves an item sits on.
 *
 * Every shop in the registry opens with potions on its shelf, whatever pack (if any) the family loaded: the early
 * regions sell Health and Mana Potions, the middle ones add the Ether and the far ones the Elixir. A shop is stocked
 * this way once (`defaultStocked`), and only when its shelf is empty, so a shelf the Game Master or a pack already
 * filled is left alone and a shelf the Game Master emptied on purpose stays empty.
 *
 * The plan functions are pure; `stockDefaultShops` reads and writes the shops and items stores.
 */
import AccessoriesDb, { accessoriesStorage } from "@/lib/databases/AccessoriesDb";
import type { Accessory } from "@/lib/databases/AccessoriesDb";
import shopsDb, { ShopItemType, registryShop } from "@/lib/databases/ShopsDb";
import type { ShopInterface } from "@/lib/databases/ShopsDb";
import { getAllShops } from "@/lib/engine/core/shopRegistry";
import type { ShopMetadata } from "@/lib/engine/core/shopRegistry";
import { BASIC_CONSUMABLE_PRESETS, consumableFromPreset } from "./rewardPresets";

const HEALTH = "item-health-potion";
const MANA = "item-mana-potion";
const ETHER = "item-ether";
const ELIXIR = "item-elixir";

const EARLY = [HEALTH, MANA];
const MIDDLE = [HEALTH, MANA, ETHER];
const FAR = [HEALTH, MANA, ETHER, ELIXIR];

/** The potions each registry shop opens with, by shop id (a shop not listed gets the early pair). */
export const DEFAULT_SHOP_STOCK: Readonly<Record<string, readonly string[]>> = {
  "hometown-market": EARLY,
  "pegasus-ranch": EARLY,
  "hermits-tent": MIDDLE,
  "wrecked-ship": EARLY,
  "witchs-hut": [MANA, ETHER],
  "crystal-caverns": MIDDLE,
  "pond-of-life": MIDDLE,
  "snow-shack": FAR,
  "cloud-market": FAR,
  "theia-city": FAR,
  "traveling-merchant": FAR,
};

export const defaultStockOf = (shopId: string): readonly string[] => DEFAULT_SHOP_STOCK[shopId] ?? EARLY;

/** The built-in potions as item records, by id */
const POTION_ITEMS: ReadonlyMap<string, Accessory> = new Map(
  BASIC_CONSUMABLE_PRESETS.map((preset) => [preset.id, consumableFromPreset(preset)])
);

export interface DefaultStockPlan {
  /** Shop records to write: new registry shops, empty shelves now stocked, and filled shelves marked as done */
  shops: ShopInterface[];
  /** Potion records the stocked shelves need that the catalogue does not hold yet */
  items: Accessory[];
}

/** What to write so every registry shop has been stocked once; an empty plan when there is nothing to do. */
export const defaultStockPlan = (
  shopsNow: readonly ShopInterface[],
  itemsNow: readonly Pick<Accessory, "id">[],
  registry: readonly ShopMetadata[] = getAllShops()
): DefaultStockPlan => {
  const byId = new Map(shopsNow.map((shop) => [shop.id, shop]));
  const held = new Set(itemsNow.map((item) => String(item.id)));
  const needed = new Set<string>();

  const shops = registry.flatMap((meta) => {
    const current = byId.get(meta.id);
    const isDone = Boolean(current?.defaultStocked);
    if (isDone) return [];
    const base = current ?? registryShop(meta);
    const isFilled = (base.items ?? []).length > 0;
    if (isFilled) return [{ ...base, defaultStocked: true }];
    const stock = defaultStockOf(meta.id);
    stock.forEach((itemId) => needed.add(itemId));
    const items = stock.map((itemId) => ({ itemId, type: ShopItemType.Accessory }));
    return [{ ...base, items, defaultStocked: true }];
  });

  const items = Array.from(needed)
    .filter((itemId) => !held.has(itemId))
    .flatMap((itemId) => {
      const item = POTION_ITEMS.get(itemId);
      return item ? [{ ...item }] : [];
    });
  return { shops, items };
};

/** Stock every registry shop that has never been stocked; safe to call on each visit (it writes only the first time). */
export const stockDefaultShops = async (): Promise<void> => {
  const accessoriesDb = new AccessoriesDb(accessoriesStorage);
  const [shopsNow, itemsNow] = await Promise.all([shopsDb.getShops(), accessoriesDb.getAccessories()]);
  const plan = defaultStockPlan(shopsNow, (itemsNow as Accessory[]).filter(Boolean));
  for (const item of plan.items) await accessoriesDb.setAccessory(item);
  for (const shop of plan.shops) await shopsDb.setShop(shop);
};

// ---- Which shelves an item is on (the item wizard's Stock it step) ----------------------------------------------------

/** The ids of the shops whose shelf holds the item */
export const shelvesHolding = (shops: readonly ShopInterface[], itemId: string): string[] =>
  shops.filter((shop) => (shop.items ?? []).some((slot) => slot.itemId === itemId)).map((shop) => shop.id);

/**
 * The shop records to write so the item sits on exactly the chosen shelves: added at the end of a chosen shelf that
 * lacks it, taken off a shelf that was not chosen. A slot already on a shelf keeps its price and days. Only the shops
 * that change are returned.
 */
export const reshelveItem = (
  shops: readonly ShopInterface[],
  itemId: string,
  chosenShopIds: readonly string[]
): ShopInterface[] => {
  const chosen = new Set(chosenShopIds);
  return shops.flatMap((shop) => {
    const items = shop.items ?? [];
    const isOnShelf = items.some((slot) => slot.itemId === itemId);
    const isChosen = chosen.has(shop.id);
    const isAdded = isChosen && !isOnShelf;
    const isTakenOff = !isChosen && isOnShelf;
    if (isAdded) return [{ ...shop, items: [...items, { itemId, type: ShopItemType.Accessory }] }];
    if (isTakenOff) return [{ ...shop, items: items.filter((slot) => slot.itemId !== itemId) }];
    return [];
  });
};
