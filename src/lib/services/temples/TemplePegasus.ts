/**
 * The Pegasus chest (R7 of docs/Temple-Generation-Contract.md): every temple keeps one behind its boss,
 * `{ chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true }`. Opening it frees the Pegasus of the
 * temple's world (one of the nine in `stats.pegasi`, in the order of XpWorldMapModal) and marks the temple
 * cleared. Only the wind temple's chest also hands out the Wind Whistle item: the other eight temples' whistle
 * is the call that frees their Pegasus, not a thing for the hero's hands.
 */
import { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import { TEMPLE_METADATA } from '@/lib/engine/temples/templeRegistry';
import { unlocksFromChest } from '@/lib/services/quests/ItemEffects';
import { useUserStore } from '@/lib/store/stores/user';

export interface Pegasus {
  /** Index into `stats.pegasi` */
  index: number;
  name: string;
  /** The world (templeRegistry's spelling) the Pegasus belongs to */
  world: string;
}

/** The nine sacred Pegasi in the order of `stats.pegasi`, each with the world whose temple holds it. */
export const PEGASI: readonly Pegasus[] = [
  { index: 0, name: 'Ventus', world: 'clouds' },
  { index: 1, name: 'Ignis', world: 'mountains' },
  { index: 2, name: 'Sol', world: 'desert' },
  { index: 3, name: 'Aura', world: 'plains' },
  { index: 4, name: 'Terra', world: 'forest' },
  { index: 5, name: 'Glacie', world: 'ice' },
  { index: 6, name: 'Aqua', world: 'islands' },
  { index: 7, name: 'Venenum', world: 'swamps' },
  { index: 8, name: 'Umbra', world: 'moon' },
];

/** The other names the screens use for a world */
const WORLD_ALIASES: Record<string, string> = { sands: 'desert', tundra: 'ice', 'the-moon': 'moon' };

export const pegasusOfWorld = (world: string): Pegasus | undefined => {
  const key = WORLD_ALIASES[world] ?? world;
  return PEGASI.find((pegasus) => pegasus.world === key);
};

/** The Pegasus a temple keeps, by the world the temple registry places it in. */
export const pegasusOfTemple = (templeId: string): Pegasus | undefined => {
  const world = TEMPLE_METADATA[templeId]?.world;
  return world ? pegasusOfWorld(world) : undefined;
};

/** Only the wind temple's whistle is the Wind Whistle the hero can equip. */
export const WIND_TEMPLE_ID = 'wind-temple';
const PEGASUS_WHISTLE = 'Pegasus Whistle';

/** What a chest item unlocks on the hero: the Pegasus Whistle only in the wind temple, anything else as itself. */
export const chestItemUnlocks = (templeId: string, chestItem: string): string[] => {
  if (chestItem === PEGASUS_WHISTLE && templeId !== WIND_TEMPLE_ID) return [];
  return unlocksFromChest(chestItem);
};

export const pegasusFreedLine = (name: string): string => `The ${name} is free!`;

/**
 * The hero opened the temple's Pegasus chest: the world's Pegasus is free (on the hero, when one is named)
 * and the temple is cleared, which the hero's progress remembers.
 * @returns What the temple says, and the Pegasus freed when the temple has one
 */
export const freeTemplePegasus = (templeId: string, userId?: string): { message: string; pegasus?: Pegasus } => {
  TempleSystem.getInstance().markTempleCleared(templeId);

  const pegasus = pegasusOfTemple(templeId);
  if (!pegasus) return { message: 'A Pegasus is free!' };
  if (userId) useUserStore().unlockPegasus(userId, pegasus.index);
  return { message: pegasusFreedLine(pegasus.name), pegasus };
};
