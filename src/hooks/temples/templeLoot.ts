/**
 * Handing out what a temple's loot holds, for useTemple: a chest's rows and a beast's drop go through the same
 * `handOutItems` (gold into the purse, supplies and Bombs into the bag, keys, the map and the compass into the run, a
 * relic unlocked on the hero). A drop is taken whole through `takeDrop`: all of what the hero picked or nothing, then
 * the run remembers it taken (TempleSystem.markDropTaken). A chest keeps what did not fit for a later visit; a drop has
 * no such memory, so a bag that cannot hold it all takes none of it.
 */
import type { Ref } from 'vue';
import type { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import type { RoomContent, RoomDrops } from '@/lib/engine/core/dungeons/types';
import { chestLoot, dungeonItemId, lootFace, type ChestLoot } from '@/lib/services/temples/ChestLoot';
import { bagHolds, bagHoldsAll, bagItemOf } from '@/lib/services/temples/lootBag';
import { earnGold } from '@/lib/services/temples/RoomInteractions';
import { chestItemUnlocks, freeTemplePegasus } from '@/lib/services/temples/TemplePegasus';
import { useUserStore } from '@/lib/store/stores/user';

/** What the temple screen hands the loot rules: the run, the hero, and the screen's own copies of the map and the compass. */
export interface LootHandOut {
  templeId: string;
  /** The hero the loot is for; without one, gold and bag items go nowhere (a run kept in memory only) */
  userId?: string;
  templeSystem: TempleSystem;
  hasMap: Ref<boolean>;
  hasCompass: Ref<boolean>;
}

/** What handing the loot out did */
export interface HandedOut {
  /** What the message lists: each item by its proper name, the gold as it was paid */
  collected: string[];
  /** What the hero had no room for */
  leftBehind: string[];
  /** The news of a Pegasus the loot freed, when it did */
  freed?: string;
}

/** What the temple says when the bag cannot hold what a drop would put in it */
export const BAG_FULL_LINE = 'Your bag is full. Store something at home first.';

/**
 * Hand out the items the hero picked from a chest or a drop. Gold is paid with the hero's class and awareness bonus. A
 * supply or a Bomb goes in the bag, a supply in storage when the bag is full and a Bomb only in the bag; with no room it is
 * left behind. A key, the Boss Key, the map and the compass go into the run, a Pegasus's egg frees the world's Pegasus, and
 * any other item unlocks what it stands for on the hero. The run is not saved here: the caller does that.
 * @param content What the loot came from: a chest's content (a Pegasus chest's egg is its `dungeon` item), or a drop's
 */
export const handOutItems = (deps: LootHandOut, selectedItems: string[], content?: RoomContent): HandedOut => {
  const { templeId, userId, templeSystem, hasMap, hasCompass } = deps;
  const collected: string[] = [];
  const leftBehind: string[] = [];
  let freed: string | undefined;

  selectedItems.forEach((item) => {
    // Handle special gold item format
    const isGold = item.startsWith('gold:');
    if (isGold) {
      const goldAmount = parseInt(item.split(':')[1], 10);
      // Paid with the hero's class and awareness bonus, like any other temple gold
      const canPayGold = !isNaN(goldAmount) && userId;
      if (canPayGold) collected.push(`${earnGold(userId, goldAmount)} GP`);
      return;
    }

    // Restoratives and Bombs go in the bag (My Goods files them under Consumables), a restorative in storage when the
    // bag is full; with no room the chest keeps them (a drop is checked whole before it gets here)
    const bagLoot = userId ? bagItemOf(item) : null;
    const isBagItemForHero = userId && bagLoot;
    if (isBagItemForHero) {
      const store = useUserStore();
      const isInBag = bagHolds(store.getUserById(userId), bagLoot) && store.addInventoryItem(userId, bagLoot.item);
      if (isInBag) collected.push(lootFace(item).name);
      else leftBehind.push(item);
      return;
    }

    collected.push(lootFace(item).name);

    // Handle special items by updating both local refs AND the temple system state
    if (item === 'key') {
      // The temple holds the count (and saves it with the hero's progress); the header reads it from there
      templeSystem.addKey(templeId);
    } else if (item === 'master-key') {
      // Holding the master key opens the temple's gate without the beast that guards it
      templeSystem.grantMasterKey(templeId);
    } else if (item === 'map') {
      hasMap.value = true;
      // Update the temple system state directly
      const state = templeSystem.getTempleState(templeId);
      if (state) state.hasMap = true;
    } else if (item === 'compass') {
      hasCompass.value = true;
      // Update the temple system state directly
      const state = templeSystem.getTempleState(templeId);
      if (state) state.hasCompass = true;
    } else {
      // The Pegasus chest behind the boss: the egg frees the world's Pegasus and clears the temple. The egg is the
      // chest's whole prize token: it unlocks no item (the Wind Temple's whistle is a row of its own).
      const isEgg = content?.pegasus === true && item === content.dungeon;
      if (isEgg) freed = freeTemplePegasus(templeId, userId, item).message;
      // A named item (Frost Wand, the Wind Whistle...): the hero may now equip it, and what it stands for
      const shouldUnlockItem = userId && !isEgg;
      if (shouldUnlockItem) {
        const store = useUserStore();
        chestItemUnlocks(templeId, item).forEach((name) => store.unlockItem(userId, name));
      }
    }
  });

  return { collected, leftBehind, freed };
};

/**
 * What a beast dropped, as the chest reveal shows it: the rows of the drop read exactly as a chest's (items, the dungeon item,
 * gold), the dungeon item by the id the take path knows ("small-key" is "key"), every row ticked because a drop is meant to be
 * taken whole. Nothing for a room that drops nothing.
 */
export const dropRows = (drops: RoomDrops | null): ChestLoot[] => {
  if (!drops) return [];
  const dungeon = typeof drops.dungeon === 'string' ? dungeonItemId(drops.dungeon) : drops.dungeon;
  return chestLoot({ ...drops, dungeon }).map((row) => ({ ...row, checked: true }));
};

/** What taking a drop needs: the loot rules' deps and the room the drop lies in */
export interface DropTake extends LootHandOut {
  level: string;
  position: [number, number];
}

/** What the temple says about the take, and for how long */
export interface DropTaken {
  message: string;
  duration: number;
}

/**
 * The hero takes what they picked of the drop in the room they stand in. The drop is one thing: it goes whole or not at all.
 * If a supply or a Bomb has no room in the bag (or storage, for a supply), nothing is taken and the drop waits. Otherwise the
 * picked rows are handed out as a chest's are, the run is saved and the drop is remembered taken (markDropTaken): the rows
 * the hero did not pick are not kept for later. Only the drop's own rows are handed out.
 * @param rows What the drop holds now (`dropContents`); empty once it is taken
 * @param selected The rows the hero ticked in the reveal
 */
export const takeDrop = (deps: DropTake, rows: readonly ChestLoot[], content: RoomDrops | null, selected: string[]): DropTaken => {
  const { templeId, userId, templeSystem, level, position } = deps;
  const isNothingLeft = rows.length === 0;
  if (isNothingLeft) return { message: 'Nothing left here.', duration: 2000 };

  const held = rows.map((row) => row.value);
  const picked = selected.filter((value) => held.includes(value));
  const hasPicked = picked.length > 0;
  if (!hasPicked) return { message: 'You took nothing.', duration: 2000 };

  const bagLoot = userId ? picked.map(bagItemOf).filter((loot) => loot !== null) : [];
  const hero = userId ? useUserStore().getUserById(userId) : undefined;
  const isBagFull = !bagHoldsAll(hero, bagLoot);
  if (isBagFull) return { message: BAG_FULL_LINE, duration: 3500 };

  // The room was checked above, so nothing is left behind here
  const { collected } = handOutItems(deps, picked, content ?? undefined);
  // The state above was changed directly, so it has to be asked to save
  templeSystem.saveProgress(templeId);
  templeSystem.markDropTaken(templeId, level, position);
  return { message: `Collected: ${collected.join(', ')}`, duration: 3000 };
};
