export interface ClassStatBoost {
  stat: string;
  amount: number;
}

export type PillarType = 'physical' | 'mental' | 'vibrational' | 'relational' | 'eternal';

export interface JobClass {
  name: string;
  icon: string;
  tier?: number;
  description?: string;
  // Each class focuses on 3 pillars for balanced coverage
  primaryPillar: PillarType;
  secondaryPillar: PillarType;
  tertiaryPillar: PillarType;
  baseStats?: Record<string, number>; // Base stats at level 1
  statBoosts: ClassStatBoost[];
}

/** The parent classes a tier-2 class grows out of; the picker shows them as "Warrior 10 + Monk 10". */
export const TIER_2_PARENTS: Record<string, [string, string]> = {
  Paladin: ['Warrior', 'Monk'],
  Ninja: ['Thief', 'Warrior'],
  Sage: ['Mage', 'Monk'],
};

/** Base stats of a tier-2 class: its parents' average, rounded. */
export const averageBaseStats = (a: Record<string, number> = {}, b: Record<string, number> = {}): Record<string, number> =>
  Object.fromEntries(
    Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).map((stat) => [stat, Math.round(((a[stat] ?? 0) + (b[stat] ?? 0)) / 2)])
  );

/** Level boosts of a tier-2 class: every stat either parent boosts, at the bigger of the two amounts. */
export const combineStatBoosts = (a: ClassStatBoost[] = [], b: ClassStatBoost[] = []): ClassStatBoost[] => {
  const merged = new Map<string, number>();
  [...a, ...b].forEach((boost) => merged.set(boost.stat, Math.max(merged.get(boost.stat) ?? 0, boost.amount)));
  return Array.from(merged.entries()).map(([stat, amount]) => ({ stat, amount }));
};

const BASE_CLASSES: JobClass[] = [
  // Base Classes (Tier 1) - Currently Active
  {
    name: "Warrior",
    icon: "fa-swords",
    tier: 1,
    description: "Built for the physical grind. Trains Body (strength and endurance) and Legend (guts) with every level, and braces like a wall. Ideal for those who thrive on physical challenges.",
    primaryPillar: 'physical',     // HP: strength, endurance
    secondaryPillar: 'eternal',    // XP: guts
    tertiaryPillar: 'relational',  // GP: presence
    baseStats: {
      strength: 12,
      endurance: 10,
      defense: 8,
      guts: 8,
      presence: 5,
      agility: 4,
      flow: 3,
      focus: 4,
      intelligence: 2,
      wisdom: 2,
      perception: 3,
      awareness: 4,
      charisma: 4,
      luck: 3,
      mastery: 2
    },
    statBoosts: [
      { stat: 'strength', amount: 2 },
      { stat: 'endurance', amount: 1 },
      { stat: 'guts', amount: 1 },
      { stat: 'presence', amount: 1 }
    ]
  },
  {
    name: "Mage",
    icon: "fa-hat-wizard",
    tier: 1,
    description: "A path of the Mind. Trains intelligence and wisdom with every level, pays less MP and gets some back on every win. Best for those who use intelligence to optimize their everyday routines.",
    primaryPillar: 'mental',       // MP: intelligence, wisdom
    secondaryPillar: 'eternal',    // XP: mastery
    tertiaryPillar: 'vibrational', // AP: focus
    baseStats: {
      intelligence: 12,
      wisdom: 10,
      perception: 8,
      mastery: 8,
      focus: 6,
      strength: 2,
      endurance: 3,
      defense: 2,
      agility: 4,
      flow: 5,
      guts: 3,
      presence: 3,
      awareness: 5,
      charisma: 4,
      luck: 4
    },
    statBoosts: [
      { stat: 'intelligence', amount: 2 },
      { stat: 'wisdom', amount: 1 },
      { stat: 'mastery', amount: 1 },
      { stat: 'focus', amount: 1 }
    ]
  },
  {
    name: "Thief",
    icon: "fa-user-secret",
    tier: 1,
    description: "The agile resource gatherer. Trains agility, charisma and luck with every level, takes more GP from quests and chests, and slips away from monsters. Perfect for scavengers who value luck and social grace.",
    primaryPillar: 'vibrational',  // AP: agility, flow
    secondaryPillar: 'relational', // GP: charisma
    tertiaryPillar: 'eternal',     // XP: luck
    baseStats: {
      agility: 12,
      flow: 10,
      luck: 10,
      charisma: 8,
      awareness: 8,
      strength: 4,
      endurance: 4,
      defense: 3,
      intelligence: 4,
      wisdom: 3,
      perception: 5,
      guts: 4,
      presence: 6,
      mastery: 3,
      focus: 5
    },
    statBoosts: [
      { stat: 'agility', amount: 2 },
      { stat: 'flow', amount: 1 },
      { stat: 'charisma', amount: 1 },
      { stat: 'luck', amount: 1 }
    ]
  },
  {
    name: "Monk",
    icon: "fa-fist-raised",
    tier: 1,
    description: "The balanced ascetic. Trains endurance, wisdom and perception with every level, and earns a spare minute and an extra AP from every fight. A versatile choice for those seeking total self-mastery.",
    primaryPillar: 'physical',     // HP: endurance
    secondaryPillar: 'mental',     // MP: wisdom, perception
    tertiaryPillar: 'vibrational', // AP: focus
    baseStats: {
      endurance: 10,
      strength: 8,
      defense: 8,
      focus: 10,
      wisdom: 8,
      perception: 6,
      intelligence: 4,
      agility: 6,
      flow: 6,
      guts: 6,
      presence: 4,
      awareness: 6,
      charisma: 3,
      luck: 4,
      mastery: 5
    },
    statBoosts: [
      { stat: 'endurance', amount: 1 },
      { stat: 'wisdom', amount: 1 },
      { stat: 'perception', amount: 1 },
      { stat: 'focus', amount: 2 }
    ]
  },
  // { name: "Dark Knight", icon: "fa-skull" },
  // { name: "Gunbreaker", icon: "fa-gun" },
  // { name: "White Mage", icon: "fa-hat-wizard" },
  // { name: "Scholar", icon: "fa-book-spells" },
  // { name: "Astrologian", icon: "fa-astrology" },
  // { name: "Monk", icon: "fa-fist-raised" },
  // { name: "Dragoon", icon: "fa-dragon" },
  // { name: "Samurai", icon: "fa-samurai" },
  // { name: "Bard", icon: "fa-bow-arrow" },
  // { name: "Machinist", icon: "fa-crosshairs" },
  // { name: "Dancer", icon: "fa-dance-ballroom" },
  // { name: "Black Mage", icon: "fa-hat-wizard" },
  // { name: "Summoner", icon: "fa-hat-wizard" },
  // { name: "Red Mage", icon: "fa-hat-wizard" },
  // { name: "Blue Mage", icon: "fa-hat-wizard" },
  // { name: "Carpenter", icon: "fa-hammer" },
  // { name: "Blacksmith", icon: "fa-hammer-war" },
  // { name: "Armorer", icon: "fa-shield" },
  // { name: "Goldsmith", icon: "fa-gem" },
  // { name: "Leatherworker", icon: "fa-leather" },
  // { name: "Weaver", icon: "fa-spider" },
  // { name: "Alchemist", icon: "fa-flask" },
  // { name: "Culinarian", icon: "fa-utensils" },
  // { name: "Miner", icon: "fa-pickaxe" },
  // { name: "Botanist", icon: "fa-leaf" },
  // { name: "Fisher", icon: "fa-fish" },
];

const baseClass = (name: string): JobClass => {
  const found = BASE_CLASSES.find((job) => job.name === name);
  if (!found) throw new Error(`JOB_CLASS_OPTIONS: unknown parent class ${name}`);
  return found;
};

/**
 * A tier-2 class is its two parents folded together: three pillars drawn from the parents', the base stats
 * their average and the boosts their union. It unlocks once both parents reach the level in
 * PlayerStatsService's JOB_UNLOCK_REQUIREMENTS (ClassPassives.isClassUnlocked).
 */
const tier2 = (name: string, icon: string, description: string, pillars: [PillarType, PillarType, PillarType]): JobClass => {
  const [first, second] = TIER_2_PARENTS[name].map(baseClass);
  return {
    name,
    icon,
    tier: 2,
    description,
    primaryPillar: pillars[0],
    secondaryPillar: pillars[1],
    tertiaryPillar: pillars[2],
    baseStats: averageBaseStats(first.baseStats, second.baseStats),
    statBoosts: combineStatBoosts(first.statBoosts, second.statBoosts),
  };
};

// Advanced Classes (Tier 2) - locked until both parents reach level 10
const ADVANCED_CLASSES: JobClass[] = [
  tier2(
    "Paladin",
    "fa-shield-cross",
    "A Warrior's heart with a Monk's calm. Body (HP) first, then Mind and Legend. Holds the line and walks away from every fight a little healed.",
    ['physical', 'mental', 'eternal']
  ),
  tier2(
    "Ninja",
    "fa-user-ninja",
    "A Thief's feet with a Warrior's arm. Spirit (AP), Body (HP) and Heart (GP). Slips the first strike and leaves with the heavier purse.",
    ['vibrational', 'physical', 'relational']
  ),
  tier2(
    "Sage",
    "fa-hat-wizard",
    "A Mage's mind with a Monk's patience. Mind (MP), Spirit (AP) and Legend (XP). Spells for half price and a spare minute on every clock.",
    ['mental', 'vibrational', 'eternal']
  ),
];

export const JOB_CLASS_OPTIONS: JobClass[] = [...BASE_CLASSES, ...ADVANCED_CLASSES];
