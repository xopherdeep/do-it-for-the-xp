/**
 * What a temple chest holds, as the chest reveal shows it: a name, an icon, one line about what it does and how
 * rare it is. `value` is the token `processChestItems` takes back (the item's name, the dungeon item, or
 * `gold:<amount>`), so a reveal never has to know how the loot is stored.
 */
import type { RoomContent } from '@/lib/engine/core/dungeons/types';

/** How the reveal frames the item: keys and maps are the temple's own, relics are the prize behind the boss. */
export type LootTier = 'relic' | 'key' | 'gold' | 'supply' | 'item';

export interface ChestLoot {
  value: string;
  name: string;
  /** Font Awesome duotone name, without the `fa-` prefix */
  icon: string;
  blurb: string;
  tier: LootTier;
}

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
  'master-key': { name: 'Master Key', icon: 'key-skeleton', blurb: "Opens the great door to the temple's master.", tier: 'key' },
  map: { name: 'Dungeon Map', icon: 'map', blurb: 'Shows every room of the temple.', tier: 'key' },
  compass: { name: 'Compass', icon: 'compass', blurb: 'Reveals what waits in the rooms ahead.', tier: 'key' },
  potion: { name: 'Potion', icon: 'flask-potion', blurb: 'Restores HP. Goes in your bag.', tier: 'supply' },
  ether: { name: 'Ether', icon: 'flask', blurb: 'Restores MP. Goes in your bag.', tier: 'supply' },
  elixir: { name: 'Elixir', icon: 'flask-poison', blurb: 'Restores HP and MP. Goes in your bag.', tier: 'supply' },
};

/** The relics behind each temple's boss, by the name the temple gives them. */
const RELICS: Record<string, { icon: string; blurb: string }> = {
  'Pegasus Whistle': { icon: 'whistle', blurb: 'Its call sets a Pegasus free.' },
  'Frost Wand': { icon: 'wand-magic', blurb: 'A relic of the Ice Temple. Equip it as the Ice Wand.' },
  'Lightning Rod': { icon: 'bolt', blurb: "A relic of the Storm Temple. Equip it as Tesla's Bolt." },
  "Gaia's Hammer": { icon: 'hammer-war', blurb: "A relic of the Earth Temple. Equip it as Gaia's Quake." },
  'Lunar Pendant': { icon: 'moon-stars', blurb: "A relic of the Moon Temple. Equip it as Night's Light." },
  'Moon Shard': { icon: 'moon', blurb: 'A sliver of moonlight, cold to the touch.' },
  'Void Dagger': { icon: 'dagger', blurb: 'A relic of the Shadow Temple.' },
  'Trident of Tides': { icon: 'water', blurb: 'A relic of the Water Temple.' },
  'Flame Shield': { icon: 'shield', blurb: 'A relic of the Fire Temple.' },
  'Dawnbreaker Bow': { icon: 'bow-arrow', blurb: 'A relic of the Light Temple.' },
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

/** Everything in the chest, in the order it comes out: the items, the temple's own item, then the gold. */
export const chestLoot = (content: RoomContent | undefined): ChestLoot[] => {
  if (!content) return [];
  const loot: ChestLoot[] = (content.items ?? []).map((item) => ({ value: item, ...lootFace(item) }));

  if (content.chest === 'dungeon' && content.dungeon) {
    const face = lootFace(content.dungeon);
    // The Pegasus chest's item is a relic whatever it is called
    loot.push({ value: content.dungeon, ...face, tier: content.pegasus === true ? 'relic' : face.tier });
  }

  const gold = Math.floor(Number(content.gold) || 0);
  if (gold > 0) {
    loot.push({ value: `gold:${gold}`, name: `${gold} GP`, icon: 'coins', blurb: 'Straight into your purse.', tier: 'gold' });
  }

  return loot;
};

/** The most precious tier in the chest, which sets the colour of its light. */
export const chestGlow = (loot: ChestLoot[]): LootTier | null => {
  const order: LootTier[] = ['relic', 'key', 'gold', 'supply', 'item'];
  return order.find((tier) => loot.some((item) => item.tier === tier)) ?? null;
};
