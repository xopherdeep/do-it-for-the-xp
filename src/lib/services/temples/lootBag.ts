/**
 * The loot of a temple that rides in the hero's bag: the restoratives (a Potion, an Ether, an Elixir) and the Bomb. A chest
 * and a beast's drop hand them out through the same two rules: what a loot row becomes in the bag (`bagItemOf`), and whether a
 * whole drop fits at once (`bagHoldsAll`). Keys, the map, gold and relics are not bag items: they stay on the hero.
 * Pure: it reads a hero and answers, the caller writes the bag (userStore.addInventoryItem).
 */
import type { RawInventoryItem } from '@/lib/services/inventory/Inventory';
import { canCarry, type StorageOwner } from '@/lib/services/inventory/Storage';
import { BOMB_ITEM } from '@/lib/services/temples/fightDrops';

/** The raw row the bag stores for a loot item (a Bomb carries a `kind`, a supply a `type`: the bag reads either). */
export interface BagRow extends RawInventoryItem {
  name: string;
  faIcon: string;
  qty: number;
}

/** The row a loot item becomes in the bag, and where it may be kept. */
export interface BagLoot {
  item: BagRow;
  /** The item has to ride in the bag itself: a Bomb in home storage is out of the hands' reach (ItemUse.bombInPack reads the pack) */
  inBagOnly: boolean;
}

/** The supplies a chest holds, by the names the temples store ("potion", "Ether", "Elixir of ..."). */
const SUPPLY_NAME = /^(potion|ether)$|elixir/i;

/**
 * What a loot item becomes in the bag, or null for one that is not a bag item (gold, a key, the map, a relic). A Bomb is
 * the Bomb the temple shop sells: it has to ride in the bag, where the hands can use it. A supply goes in the bag or, when
 * the bag is full, in storage.
 */
export const bagItemOf = (value: string): BagLoot | null => {
  const isBomb = value === BOMB_ITEM;
  if (isBomb) return { item: { name: BOMB_ITEM, kind: 'consumable', faIcon: 'bomb', qty: 1 }, inBagOnly: true };

  const isSupply = SUPPLY_NAME.test(value);
  if (isSupply) return { item: { name: value, type: 'consumable', faIcon: 'flask-potion', qty: 1 }, inBagOnly: false };
  return null;
};

/** Whether the hero can take this bag item right now: in the bag, or in storage when it may go there. */
export const bagHolds = (hero: StorageOwner | null | undefined, loot: BagLoot): boolean => {
  const place = canCarry(hero, loot.item);
  return loot.inBagOnly ? place === 'bag' : place !== false;
};

/**
 * Whether the hero can take every one of these bag items at once. Each one counts the room the ones before it took, so two
 * supplies that each need a new stack do not both pass for the one slot the bag has left.
 */
export const bagHoldsAll = (hero: StorageOwner | null | undefined, items: readonly BagLoot[]): boolean => {
  const bag = hero?.inventory;
  const stored = hero?.storage;
  let inventory: unknown[] = Array.isArray(bag) ? [...bag] : [];
  let storage: unknown[] = Array.isArray(stored) ? [...stored] : [];
  for (const loot of items) {
    const given: StorageOwner = { inventory, storage, storageTier: hero?.storageTier };
    if (!bagHolds(given, loot)) return false;
    const isForBag = canCarry(given, loot.item) === 'bag';
    if (isForBag) inventory = [...inventory, loot.item];
    else storage = [...storage, loot.item];
  }
  return true;
};
