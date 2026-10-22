/**
 * What a temple chest holds, as the chest reveal shows it: a name, an icon, one line about what it does and how
 * rare it is. `value` is the token `claimChestItems` takes back (the item's name, the dungeon item, or
 * `gold:<amount>`), so a reveal never has to know how the loot is stored.
 */
import type { RoomContent } from '@/lib/engine/core/dungeons/types';

/**
 * The room types that hold a Pegasus: the Temple Creator's Dragon Egg (`dragon-egg`) and the picker's `master` room,
 * the temple's final chamber that the Game Master places after the boss. In play both are the Pegasus chest.
 */
export const PEGASUS_ROOM_TYPES: readonly string[] = ['dragon-egg', 'master'];

/** What a Pegasus chest holds when the Game Master did not pick a Pegasus: the temple's own, set free by taking it. */
export const DEFAULT_PEGASUS_ITEM = 'Pegasus';

/**
 * The temple's own items a Dungeon Item chest can hold, by the id the take path knows: the small key, the Boss Key
 * (id `master-key`, it opens the boss door), the map and the compass. None of them is ever a Pegasus's prize.
 */
const TEMPLE_ITEMS: readonly string[] = ['key', 'master-key', 'map', 'compass'];

/** The Temple Creator's Dungeon Item picker spells two of them differently from the temples and the take path. */
const DUNGEON_ITEM_IDS: Record<string, string> = { 'small-key': 'key', 'dungeon-map': 'map' };

/** The id the take path knows for a dungeon item as the editor or a layout wrote it ("small-key" -> "key"). */
export const dungeonItemId = (value: string): string => DUNGEON_ITEM_IDS[value] ?? value;

/** Whether a stored dungeon item is one of the temple's keys, map or compass (so not a Pegasus's prize). */
export const isTempleItem = (value: unknown): boolean => TEMPLE_ITEMS.includes(dungeonItemId(String(value ?? '')));

/** "Dragon_Egg" -> "dragon-egg": the layouts spell room types a few ways. */
const roomTypeOf = (room: { type?: string } | undefined): string =>
  String(room?.type ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

/** Whether a room is a Dragon Egg or `master` room (the Pegasus chamber) that is not yet a chest. */
export const isPegasusRoom = (room: { type?: string } | undefined): boolean => PEGASUS_ROOM_TYPES.includes(roomTypeOf(room));

/**
 * A Dragon Egg or `master` room, as the loot room holding the Pegasus chest that the built-in temples and the
 * generator use: `{ chest: 'dungeon', dungeon: <the Game Master's pick, else 'Pegasus'>, pegasus: true }`. Taking that
 * chest's prize frees the Pegasus and clears the temple. Any other room comes back untouched (the same object), so
 * this is safe to run on every room, and running it twice changes nothing. Pure: the room given is not modified.
 */
export const asPegasusChest = <R extends { type?: string; content?: RoomContent }>(room: R): R => {
  if (!isPegasusRoom(room)) return room;
  const content = room.content ?? {};
  // A key or map left over from the room's earlier life is not a Pegasus to pick: the temple's own is meant
  const pick = content.dungeon && !isTempleItem(content.dungeon) ? content.dungeon : DEFAULT_PEGASUS_ITEM;
  return { ...room, type: 'loot', content: { ...content, chest: 'dungeon', dungeon: pick, pegasus: true } };
};

/**
 * A room as the temple plays it: a Dragon Egg or `master` room is the Pegasus chest (`asPegasusChest`), and a Dungeon
 * Item chest holds the id the take path knows: the editor's "small-key" and "dungeon-map" are the small key and the
 * map, and a chest that holds one of the temple's own items (the Boss Key above all) is not a Pegasus chest, whatever
 * `pegasus` flag the room carried over from the Pegasus chest it was edited from. Any other room comes back untouched
 * (the same object); running it twice changes nothing. Pure.
 */
export const asChestRoom = <R extends { type?: string; content?: RoomContent }>(given: R, templeId?: string): R => {
  const room = asPegasusChest(given);
  const content = room.content;
  const chestItem = content?.dungeon;
  const isDungeonItemChest = roomTypeOf(room) === 'loot' && content?.chest === 'dungeon' && typeof chestItem === 'string';
  if (!isDungeonItemChest) return asWhistled(room, templeId);

  const dungeon = dungeonItemId(chestItem);
  const stale = content.pegasus === true && isTempleItem(dungeon);
  const isChestUpToDate = dungeon === chestItem && !stale;
  if (isChestUpToDate) return asWhistled(room, templeId);

  const { pegasus, ...rest } = content;
  // The flag first, the whistle after: a room that is no longer a Pegasus chest gets no whistle
  return asWhistled({ ...room, content: { ...rest, dungeon, ...(pegasus === true && !stale ? { pegasus } : {}) } }, templeId);
};

/**
 * The Wind Temple's Pegasus chest holds the Wind Whistle beside the egg, as a row of its own (an item in the chest,
 * so taking it or leaving it is remembered like any other row). Needs the temple to be known; any other room, and
 * every other temple, comes back untouched.
 */
const asWhistled = <R extends { type?: string; content?: RoomContent }>(room: R, templeId?: string): R => {
  const content = room.content;
  const isNotWindPegasusChest = templeId !== WIND_TEMPLE_ID || roomTypeOf(room) !== 'loot' || content?.pegasus !== true;
  if (isNotWindPegasusChest) return room;
  const hasWhistle = (content.items ?? []).includes(WIND_WHISTLE);
  if (hasWhistle) return room;
  return { ...room, content: { ...content, items: [...(content.items ?? []), WIND_WHISTLE] } };
};

/** How the reveal frames the item: keys and maps are the temple's own, relics are the prize behind the boss. */
export type LootTier = 'relic' | 'key' | 'gold' | 'supply' | 'item';

export interface ChestLoot {
  value: string;
  name: string;
  /** Font Awesome duotone name, without the `fa-` prefix */
  icon: string;
  blurb: string;
  tier: LootTier;
  /** Duotone colours for the icon (a Pegasus's egg is painted in its own); the reveal's own colours when absent */
  color?: string;
  secondaryColor?: string;
  /** The row starts ticked (a Pegasus chest's egg and whistle: the prize is meant to be taken) */
  checked?: boolean;
}

/** A Pegasus's egg as the chest shows it: the name on its row and the colours of its shell. */
export interface PegasusEgg {
  name: string;
  color: string;
  secondaryColor: string;
}

/** The egg of a Pegasus nobody can name (a temple the registry has no world for): the editor's golden egg. */
export const UNKNOWN_EGG: PegasusEgg = { name: 'A Pegasus Egg', color: '#ffd740', secondaryColor: '#fff6d0' };

/** The Wind Temple's Pegasus chest holds a second prize beside the egg: the Wind Whistle (every other temple's whistle is the call). */
export const WIND_TEMPLE_ID = 'wind-temple';
export const WIND_WHISTLE = 'Wind Whistle';

interface LootFace {
  name: string;
  icon: string;
  blurb: string;
  tier: LootTier;
}

/** The temple tools and supplies a chest can hold, by the lowercase name the temples store. */
const KNOWN: Record<string, LootFace> = {
  key: { name: 'Small Key', icon: 'key', blurb: 'Opens one locked door in this temple.', tier: 'key' },
  'small key': { name: 'Small Key', icon: 'key', blurb: 'Opens one locked door in this temple.', tier: 'key' },
  // The key that opens the boss door is the Boss Key to the player; its id stays `master-key`
  'master-key': { name: 'Boss Key', icon: 'key-skeleton', blurb: "Opens the great door to the temple's boss.", tier: 'key' },
  map: { name: 'Dungeon Map', icon: 'map', blurb: 'Shows every room of the temple.', tier: 'key' },
  'dungeon-map': { name: 'Dungeon Map', icon: 'map', blurb: 'Shows every room of the temple.', tier: 'key' },
  'small-key': { name: 'Small Key', icon: 'key', blurb: 'Opens one locked door in this temple.', tier: 'key' },
  compass: { name: 'Compass', icon: 'compass', blurb: 'Reveals what waits in the rooms ahead.', tier: 'key' },
  'wind whistle': { name: 'Wind Whistle', icon: 'whistle', blurb: 'Its call carries you to a Pegasus you have freed.', tier: 'item' },
  potion: { name: 'Potion', icon: 'flask-potion', blurb: 'Restores HP. Goes in your bag.', tier: 'supply' },
  ether: { name: 'Ether', icon: 'flask', blurb: 'Restores MP. Goes in your bag.', tier: 'supply' },
  elixir: { name: 'Elixir', icon: 'flask-poison', blurb: 'Restores HP and MP. Goes in your bag.', tier: 'supply' },
  bomb: { name: 'Bomb', icon: 'bomb', blurb: 'Blows open a cracked wall. Goes in your bag.', tier: 'supply' },
};

/** The relics behind each temple's boss, by the name the temple gives them. */
const RELICS: Record<string, { icon: string; blurb: string }> = {
  'Pegasus Whistle': { icon: 'whistle', blurb: 'Its call sets a Pegasus free.' },
  'Frost Wand': { icon: 'wand-magic', blurb: 'A relic of the Ice Temple. Equip it as the Ice Wand.' },
  'Lightning Rod': { icon: 'bolt', blurb: "A relic of the Storm Temple. Equip it as Tesla's Bolt." },
  "Gaia's Hammer": { icon: 'hammer-war', blurb: "A relic of the Earth Temple. Equip it as Gaia's Quake." },
  'Lunar Pendant': { icon: 'moon-stars', blurb: "A relic of the Moon Temple. Equip it as Night's Light." },
  'Moon Shard': { icon: 'moon', blurb: 'A sliver of moonlight, cold to the touch.' },
  'Void Dagger': { icon: 'dagger', blurb: "A relic of the Shadow Temple. Equip it as X's Invisibility." },
  'Trident of Tides': { icon: 'water', blurb: 'A relic of the Water Temple. Equip it as the Hook Shot.' },
  'Flame Shield': { icon: 'shield', blurb: 'A relic of the Fire Temple. Equip it as the Fire Wand.' },
  'Dawnbreaker Bow': { icon: 'bow-arrow', blurb: 'A relic of the Light Temple. Equip it as the Silver Arrow.' },
};

/** "golden key" -> "Golden Key": loot names are stored lowercase, the chest shows them properly. */
export const titleCase = (value: string): string =>
  String(value).replace(/\b([a-z])/g, (letter) => letter.toUpperCase());

/** How one stored item looks in the chest. Anything the temple does not know is shown as a plain item. */
export const lootFace = (item: string): LootFace => {
  const known = KNOWN[String(item).toLowerCase()];
  if (known) return known;
  const relic = RELICS[item];
  if (relic) return { name: item, tier: 'relic', ...relic };
  return { name: titleCase(item), icon: 'gift', blurb: 'Goes in your bag.', tier: 'item' };
};

/** The Pegasus chest's egg row: "{Name}'s Egg", painted in the Pegasus's own colours, ticked to be taken. */
const eggRow = (value: string, egg: PegasusEgg): ChestLoot => ({
  value,
  name: egg.name,
  icon: 'egg',
  blurb: egg.name === UNKNOWN_EGG.name ? 'A Pegasus sleeps inside. Take it to set it free.' : `${egg.name.replace(/'s Egg$/, '')} sleeps inside. Take it to set it free.`,
  tier: 'relic',
  color: egg.color,
  secondaryColor: egg.secondaryColor,
  checked: true,
});

/**
 * Everything in the chest, in the order it comes out: a Pegasus chest's egg first, then the items, the temple's own
 * item, then the gold. A Pegasus chest (`pegasus: true`) lists its prize as the egg of the Pegasus it frees, whatever
 * the stored value is ("Pegasus", "Pegasus Whistle", a Game Master's pick); `egg` names that Pegasus and its colours
 * (the temple screen asks `pegasusEgg`), and without it the egg is a plain "A Pegasus Egg". The Pegasus chest's rows
 * start ticked: the egg, and the Wind Whistle beside it in the Wind Temple.
 */
export const chestLoot = (content: RoomContent | undefined, egg?: PegasusEgg | null): ChestLoot[] => {
  if (!content) return [];
  const isPegasus = content.pegasus === true;
  const loot: ChestLoot[] = [];
  const dungeonItem = content.dungeon;

  const hasPegasusEgg = isPegasus && content.chest === 'dungeon' && dungeonItem;
  if (hasPegasusEgg) loot.push(eggRow(dungeonItem, egg ?? UNKNOWN_EGG));

  (content.items ?? []).forEach((item) => loot.push({ value: item, ...lootFace(item), ...(isPegasus ? { checked: true } : {}) }));

  const hasDungeonItem = !isPegasus && content.chest === 'dungeon' && dungeonItem;
  if (hasDungeonItem) loot.push({ value: dungeonItem, ...lootFace(dungeonItem) });

  const gold = Math.floor(Number(content.gold) || 0);
  const hasGold = gold > 0;
  if (hasGold) {
    loot.push({ value: `gold:${gold}`, name: `${gold} GP`, icon: 'coins', blurb: 'Straight into your purse.', tier: 'gold' });
  }

  return loot;
};

/** The most precious tier in the chest, which sets the colour of its light. */
export const chestGlow = (loot: ChestLoot[]): LootTier | null => {
  const order: LootTier[] = ['relic', 'key', 'gold', 'supply', 'item'];
  return order.find((tier) => loot.some((item) => item.tier === tier)) ?? null;
};
