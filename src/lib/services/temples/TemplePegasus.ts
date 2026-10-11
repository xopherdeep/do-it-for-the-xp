/**
 * The Pegasus chest (R7 of docs/Temple-Generation-Contract.md): every temple keeps one behind its boss,
 * `{ chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true }`. Opening it frees the Pegasus of the
 * temple's world (one of the nine in `stats.pegasi`, in the order of XpWorldMapModal) and marks the temple
 * cleared. Only the wind temple's chest also hands out the Wind Whistle item: the other eight temples' whistle
 * is the call that frees their Pegasus, not a thing for the hero's hands.
 */
import { TEMPLE_METADATA } from '@/lib/engine/temples/templeRegistry';
import { unlocksFromChest } from '@/lib/services/quests/ItemEffects';
import { useUserStore } from '@/lib/store/stores/user';
import { clearTemple, type ClearedReward } from './RoomInteractions';

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

/** How a Pegasus looks and what it is called on screen (the order of `PEGASI` and of `stats.pegasi`). */
export interface PegasusLook {
  id: string;
  color: string;
  secondaryColor: string;
  name: string;
  /** The temple's name as the world map says it */
  temple: string;
  desc: string;
}

/**
 * The nine Pegasi's colours and lore, keyed by index like `PEGASI`. It is the table XpWorldMapModal draws its eggs
 * from, so the temple's own celebration paints the same Pegasus in the same colours.
 */
export const PEGASUS_LOOK: readonly PegasusLook[] = [
  { id: 'ventus', color: '#f1f2f6', secondaryColor: '#2f3542', name: 'Ventus', temple: 'Cloud Temple', desc: 'The swift winds of change. Soaring high above the troubles.' },
  { id: 'ignis', color: '#ff4757', secondaryColor: '#f1c40f', name: 'Ignis', temple: 'Fire Temple', desc: 'The burning spirit of passion. Rescued from the ashes of the Red Dragon.' },
  { id: 'sol', color: '#ffa502', secondaryColor: '#ff6b81', name: 'Sol', temple: 'Sun Temple', desc: 'The radiant light of hope. Its warmth melts even the coldest despair.' },
  { id: 'aura', color: '#badc58', secondaryColor: '#ffffff', name: 'Aura', temple: 'Plains', desc: 'The spirit of new beginnings, wandering the grassy fields.' },
  { id: 'terra', color: '#2ed573', secondaryColor: '#2f3542', name: 'Terra', temple: 'Forest Temple', desc: 'The unshakeable foundation. Grounded and strong against all odds.' },
  { id: 'glacie', color: '#00d2d3', secondaryColor: '#5352ed', name: 'Glacie', temple: 'Frozen Temple', desc: 'The calm clarity of mind. Found deep within the cryo-chambers.' },
  { id: 'aqua', color: '#3742fa', secondaryColor: '#7bed9f', name: 'Aqua', temple: 'Water Temple', desc: 'The healing flow. Cleanses the spirit with pure waters.' },
  { id: 'venenum', color: '#8e44ad', secondaryColor: '#badc58', name: 'Venenum', temple: 'Swamp Temple', desc: 'The shadow that protects. Lurking in the mist to guard the weak.' },
  { id: 'umbra', color: '#130f40', secondaryColor: '#ffffff', name: 'Umbra', temple: 'Moon Temple', desc: 'The mysterious guide of dreams. Sees what is hidden in the dark.' },
];

/** The other names the screens use for a world */
const WORLD_ALIASES: Record<string, string> = { sands: 'desert', tundra: 'ice', 'the-moon': 'moon' };

export const pegasusOfWorld = (world: string): Pegasus | undefined => {
  const key = WORLD_ALIASES[world] ?? world;
  return PEGASI.find((pegasus) => pegasus.world === key);
};

/**
 * The Pegasus a Game Master's key item names: "Aura", "pegasus-aura", "Aura's Egg" and "AURA" all mean Aura. Any other
 * value (the Pegasus Whistle, "Pegasus", the editor's own key items) names none, and the temple's own Pegasus is meant.
 */
export const pegasusOfKeyItem = (value: string | null | undefined): Pegasus | undefined => {
  const words = String(value ?? '')
    .toLowerCase()
    .replace(/['\u2019]s\b/g, '')
    .split(/[^a-z]+/)
    .filter(Boolean);
  return PEGASI.find((pegasus) => words.includes(pegasus.name.toLowerCase()));
};

/** The Pegasus a temple keeps, by the world the temple registry places it in. */
export const pegasusOfTemple = (templeId: string): Pegasus | undefined => {
  const world = TEMPLE_METADATA[templeId]?.world;
  return world ? pegasusOfWorld(world) : undefined;
};

/** What the temple's cleared celebration needs to draw a Pegasus: its colours, its name and where it was freed. */
export interface PegasusView {
  name: string;
  color: string;
  secondaryColor: string;
  world: string;
  temple: string;
}

/** The Pegasus a temple's clear frees as the celebration draws it: the Game Master's pick if there is one, else the temple's own; none for a temple that keeps no Pegasus. */
export const pegasusView = (templeId: string, pick?: string | null): PegasusView | null => {
  const pegasus = pegasusOfKeyItem(pick) ?? pegasusOfTemple(templeId);
  const look = pegasus ? PEGASUS_LOOK[pegasus.index] : undefined;
  if (!pegasus || !look) return null;
  return { name: pegasus.name, color: look.color, secondaryColor: look.secondaryColor, world: pegasus.world, temple: look.temple };
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
 * The hero opened the temple's Pegasus chest: the world's Pegasus is free (on the hero, when one is named) and the
 * temple is cleared, which the hero's progress remembers. The first clear pays the temple's reward (`clearTemple`);
 * a temple already cleared (by its gate) pays nothing more.
 * @param pick The chest's prize as the Game Master set it: a Pegasus it names is the one freed, else the temple's own
 * @returns What the temple says, the Pegasus freed when the temple has one, and the reward paid when this clear paid it
 */
export const freeTemplePegasus = (
  templeId: string,
  userId?: string,
  pick?: string | null,
): { message: string; pegasus?: Pegasus; cleared?: ClearedReward } => {
  const cleared = clearTemple(templeId, userId) ?? undefined;

  const pegasus = pegasusOfKeyItem(pick) ?? pegasusOfTemple(templeId);
  if (!pegasus) return { message: 'A Pegasus is free!', ...(cleared && { cleared }) };
  if (userId) useUserStore().unlockPegasus(userId, pegasus.index);
  return { message: pegasusFreedLine(pegasus.name), pegasus, ...(cleared && { cleared }) };
};
