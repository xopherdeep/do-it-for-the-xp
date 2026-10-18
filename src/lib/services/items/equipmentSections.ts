/**
 * How the Equipment screen sorts and labels its items: the sections the bag is split into, and where each item
 * does something (the chips on its card). Pure: names in, labels out; the item rules (ItemRules) say where a tool works.
 */
import { itemRule } from './ItemRules';

export type EquipmentSectionId = 'tools' | 'magic' | 'relics' | 'menus';

export interface EquipmentSection {
  id: EquipmentSectionId;
  label: string;
  /** Font Awesome duotone icon for the header */
  icon: string;
}

/** In the order the screen lists them */
export const EQUIPMENT_SECTIONS: readonly EquipmentSection[] = [
  { id: 'tools', label: 'Tools', icon: 'toolbox' },
  { id: 'magic', label: 'Magic', icon: 'sparkles' },
  { id: 'relics', label: 'Relics', icon: 'gem' },
  { id: 'menus', label: 'Menus', icon: 'scroll' },
];

const SECTION_OF: Record<string, EquipmentSectionId> = {
  'Silver Arrow': 'tools',
  'Hook Shot': 'tools',
  Bombs: 'tools',
  "Thor's Hammer": 'tools',
  Lantern: 'tools',
  Bottles: 'tools',
  "Sol's Flare": 'magic',
  "Tesla's Bolt": 'magic',
  "Gaia's Quake": 'magic',
  "Chronos' Clock": 'magic',
  "Night's Light": 'magic',
  "Gale's Wind": 'magic',
  "X's Invisibility": 'magic',
  'Fire Wand': 'magic',
  'Ice Wand': 'magic',
  'Pegasus Boots': 'relics',
  'Wind Whistle': 'relics',
  'Portal Home': 'relics',
  'My Quests': 'menus',
  'Book Of Spells': 'menus',
  Goods: 'menus',
  Wallet: 'menus',
};

/** The section an item belongs to; an item the table does not know is a tool */
export const sectionOf = (name: string): EquipmentSectionId => SECTION_OF[name] ?? 'tools';

/** The items split into the screen's sections, in section order, keeping each item's catalogue order; empty sections left out */
export const groupBySection = <T extends { name: string }>(items: readonly T[]) =>
  EQUIPMENT_SECTIONS.map((section) => ({
    section,
    items: items.filter((item) => sectionOf(item.name) === section.id),
  })).filter((group) => group.items.length > 0);

export type UseChipId = 'temple' | 'battle' | 'anywhere';

export interface UseChip {
  id: UseChipId;
  label: string;
  icon: string;
  /** What it does there, when the rules say */
  line?: string;
}

/**
 * Where an item does something: Temple and Battle from its rule, with the rule's line for each. An item with no
 * temple or fight use (a menu, a relic) works Anywhere: it opens its page or does its thing wherever the hero is.
 */
export const whereItWorks = (name: string): UseChip[] => {
  const rule = itemRule(name);
  const chips: UseChip[] = [];
  const worksInTemple = Boolean(rule?.temple || rule?.templeLine);
  if (worksInTemple) chips.push({ id: 'temple', label: 'Temple', icon: 'dungeon', line: rule?.templeLine });
  const worksInBattle = Boolean(rule?.fight || rule?.fightLine || rule?.container);
  if (worksInBattle) chips.push({ id: 'battle', label: 'Battle', icon: 'swords', line: rule?.fightLine });
  const hasNoTempleOrFightUse = chips.length === 0;
  if (hasNoTempleOrFightUse) chips.push({ id: 'anywhere', label: 'Anywhere', icon: 'globe-americas' });
  return chips;
};

/** The MP an item costs to use, 0 when free */
export const mpCostOf = (name: string, fallback = 0): number => itemRule(name)?.mp ?? fallback;
