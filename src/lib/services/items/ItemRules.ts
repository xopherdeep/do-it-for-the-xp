/**
 * Item rules: the one table every tool reads its MP, its temple use, its fight effect and its card text from
 * (docs/superpowers/specs/2026-10-13-equipment-rules-design.md, 2).
 *
 * Costs and text come from here by item name, never from the `desc` a profile stored with its copy of an item:
 * an old copy ("50MP | Freeze distractions in their tracks.") still costs what the table says.
 *
 * Rule zero: no item completes a chore. A temple use opens the way, an effect in a fight buys time or blunts
 * the beast; the chore is still done in the real world and approved by the Game Master.
 *
 * Pure: no store, no screen. The temple (ItemUse) and the fight (BattleItems) look an item up here.
 */
import type { BattleEffectId } from '@/lib/services/battle/BattleEffects';

/** What a tool does inside a temple. */
export type TempleUseId =
  | 'map-compass'
  | 'bottle-spring'
  | 'blast-door'
  | 'reveal-secrets'
  | 'cross-pit'
  | 'slip-out'
  | 'freeze-trap'
  | 'moonlit-riddle';

export interface ItemRule {
  /** The list price in MP, before the hero's class discount. */
  mp: number;
  temple?: TempleUseId;
  fight?: BattleEffectId;
  /** The item opens a sheet in a fight instead of running an effect. */
  container?: 'potions';
  /** The item spends one of these from the pack on each use (the Bombs). */
  consumes?: 'Bomb';
  /** One sentence of what it does in a temple. */
  templeLine?: string;
  /** One sentence of what it does in a fight. */
  fightLine?: string;
}

/** The table from the spec, in the order the Compendium lists the tools. */
export const ITEM_RULES: Record<string, ItemRule> = {
  Lantern: { mp: 5, temple: 'map-compass', templeLine: "Shows this temple's map and compass." },
  Bottles: {
    mp: 0,
    temple: 'bottle-spring',
    container: 'potions',
    templeLine: 'Bottles an unused spring as Spring Water or Silver Water.',
    fightLine: 'Opens your potions and food.',
  },
  Bombs: {
    mp: 0,
    consumes: 'Bomb',
    temple: 'blast-door',
    fight: 'stun',
    templeLine: 'Blows open a cracked wall.',
    fightLine: 'The beast misses its next strike.',
  },
  "Gaia's Quake": {
    mp: 10,
    temple: 'reveal-secrets',
    templeLine: 'Hidden rooms on this floor appear on your map.',
  },
  'Hook Shot': { mp: 5, temple: 'cross-pit', templeLine: 'Swing over a pit to the room beyond.' },
  "X's Invisibility": {
    mp: 15,
    temple: 'slip-out',
    fight: 'vanish',
    templeLine: "Slip out of a monster's room without its fight (not a quest's).",
    fightLine: 'Run away with no parting strike.',
  },
  'Fire Wand': { mp: 10, fight: 'kindle', fightLine: 'Every chore earns 1.5x the minutes.' },
  "Thor's Hammer": { mp: 15, fight: 'stun', fightLine: 'The beast misses its next strike.' },
  'Silver Arrow': { mp: 25, fight: 'pin', fightLine: 'The beast misses its next two strikes.' },
  "Sol's Flare": { mp: 20, fight: 'weaken', fightLine: "Halves the beast's attack." },
  'Ice Wand': {
    mp: 10,
    temple: 'freeze-trap',
    fight: 'frost',
    templeLine: 'Freezes the traps next to you.',
    fightLine: '+10 minutes on the clock.',
  },
  "Tesla's Bolt": { mp: 5, fight: 'charge', fightLine: 'Chores give back double MP.' },
  "Gale's Wind": { mp: 15, fight: 'gust', fightLine: 'Refills the clock to full.' },
  "Night's Light": {
    mp: 10,
    temple: 'moonlit-riddle',
    fight: 'moonlight',
    templeLine: 'One wrong answer of a riddle fades.',
    fightLine: 'Each chore heals 5% of max HP.',
  },
  "Chronos' Clock": { mp: 20, fight: 'time-stop', fightLine: 'Pauses the clock for 15 minutes.' },
};

/** The rule for an item by name, or undefined for a page, a Pegasus item or anything the table does not know. */
export const itemRule = (name: string | undefined): ItemRule | undefined =>
  name !== undefined && Object.prototype.hasOwnProperty.call(ITEM_RULES, name) ? ITEM_RULES[name] : undefined;

/** The card's "Temple: …" and "Fight: …" parts, each left out when the item has no such use. */
const useLines = (rule: ItemRule): string[] => [
  ...(rule.templeLine ? [`Temple: ${rule.templeLine}`] : []),
  ...(rule.fightLine ? [`Fight: ${rule.fightLine}`] : []),
];

/**
 * The catalogue text of a tool: "10MP | Temple: Freezes the traps next to you. Fight: +10 minutes on the clock."
 * The "10MP | " prefix is left out at 0 MP. Null for a name with no rule, whose text lives elsewhere.
 */
export const describeItem = (name: string): string | null => {
  const rule = itemRule(name);
  if (!rule) return null;
  const price = rule.mp > 0 ? [`${rule.mp}MP |`] : [];
  return [...price, ...useLines(rule)].join(' ');
};

/**
 * One line for a toast or a card: "Ice Wand (10 MP). Temple: … Fight: …". The Bombs read "(uses a Bomb)" and
 * a tool that costs nothing and consumes nothing (the Bottles) has no bracket. No rule: "{name}: nothing happens here."
 */
export const itemCardLine = (name: string): string => {
  const rule = itemRule(name);
  if (!rule) return `${name}: nothing happens here.`;
  const price = rule.mp > 0 ? `${rule.mp} MP` : '';
  const cost = rule.consumes ? `uses a ${rule.consumes}` : price;
  const head = cost ? `${name} (${cost}).` : `${name}.`;
  return [head, ...useLines(rule)].join(' ');
};
