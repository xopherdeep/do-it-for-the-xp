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
  /** One line of attitude for the Class Codex ("Shows up and finishes."). */
  creed: string;
  /** Three short lines for the Class Codex: what chores suit it, what it does for you, what it trains. */
  realLife: [string, string, string];
  // Each class focuses on 3 pillars for balanced coverage
  primaryPillar: PillarType;
  secondaryPillar: PillarType;
  tertiaryPillar: PillarType;
  baseStats?: Record<string, number>; // Base stats at level 1
  statBoosts: ClassStatBoost[];
}

/**
 * The class tree is 4 -> 8 -> 3. A tier-2 class grows out of ONE tier-1 class (unlocked when that class is level 10);
 * a tier-3 class pairs TWO tier-2 classes (unlocked when both are level 10). The unlock levels live in
 * PlayerStatsService's JOB_UNLOCK_REQUIREMENTS; these two maps say which classes are the parents.
 */
export const TIER_2_PARENT: Record<string, string> = {
  Knight: 'Warrior',
  Berserker: 'Warrior',
  'White Mage': 'Mage',
  'Black Mage': 'Mage',
  Assassin: 'Thief',
  Ranger: 'Thief',
  'Martial Artist': 'Monk',
  Mystic: 'Monk',
};

/** The two tier-2 classes a tier-3 class pairs; the picker shows them as "Knight 10 + Mystic 10". */
export const TIER_3_PARENTS: Record<string, [string, string]> = {
  Paladin: ['Knight', 'Mystic'],
  Ninja: ['Assassin', 'Berserker'],
  Sage: ['White Mage', 'Mystic'],
};

/** Base stats of a tier-3 class: its two parents' average, rounded. */
export const averageBaseStats = (a: Record<string, number> = {}, b: Record<string, number> = {}): Record<string, number> =>
  Object.fromEntries(
    Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).map((stat) => [stat, Math.round(((a[stat] ?? 0) + (b[stat] ?? 0)) / 2)])
  );

/** Level boosts of a tier-3 class: every stat either parent boosts, at the bigger of the two amounts. */
export const combineStatBoosts = (a: ClassStatBoost[] = [], b: ClassStatBoost[] = []): ClassStatBoost[] => {
  const merged = new Map<string, number>();
  [...a, ...b].forEach((boost) => merged.set(boost.stat, Math.max(merged.get(boost.stat) ?? 0, boost.amount)));
  return Array.from(merged.entries()).map(([stat, amount]) => ({ stat, amount }));
};

/**
 * Base stats of a tier-2 class: its parent's, each 10 % higher, rounded up. Integer maths on purpose
 * (`value * 11 / 10`): `Math.ceil(10 * 1.1)` is 12, because 1.1 is not exact in floating point.
 */
export const raiseBaseStats = (base: Record<string, number> = {}): Record<string, number> =>
  Object.fromEntries(Object.entries(base).map(([stat, value]) => [stat, Math.ceil((value * 11) / 10)]));

const BASE_CLASSES: JobClass[] = [
  // Base Classes (Tier 1) - Currently Active
  {
    name: "Warrior",
    icon: "fa-swords",
    tier: 1,
    description: "Built for the physical grind. Trains Body (strength and endurance) and Legend (guts) with every level, and braces like a wall. Ideal for those who thrive on physical challenges.",
    creed: "Shows up and finishes.",
    realLife: [
      "Suits the heavy work: yard, hauling, big clean-ups, sports practice.",
      "Takes pressure well: when a deadline bites, a Warrior's brace blocks most of the hit.",
      "Trains Body and Legend every level: tougher and gutsier.",
    ],
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
    creed: "Thinks first, then acts.",
    realLife: [
      "Suits homework, reading, planning the week, fixing what's broken.",
      "Casts cheaper: privileges and spells cost 25% less MP, and wins give MP back.",
      "Trains Mind every level: more MP, cheaper casts.",
    ],
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
    creed: "Quick hands, quick wits.",
    realLife: [
      "Suits errands, helping out, trading and finding bargains.",
      "Earns more: +25% GP from quests and chests means more allowance.",
      "Trains Spirit and Heart every level: faster, luckier, more charming.",
    ],
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
    creed: "Steady every day.",
    realLife: [
      "Suits routines: making the bed, practice, tidying a little every day.",
      "Charges privileges faster: +1 AP on every win, and an extra minute on the clock.",
      "Trains Body, Mind and Spirit evenly: the balanced path.",
    ],
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
  // { name: "Scholar", icon: "fa-book-spells" },
  // { name: "Astrologian", icon: "fa-astrology" },
  // { name: "Monk", icon: "fa-fist-raised" },
  // { name: "Dragoon", icon: "fa-dragon" },
  // { name: "Samurai", icon: "fa-samurai" },
  // { name: "Bard", icon: "fa-bow-arrow" },
  // { name: "Machinist", icon: "fa-crosshairs" },
  // { name: "Dancer", icon: "fa-dance-ballroom" },
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
 * A tier-2 class is its single parent grown up: the parent's base stats each 10 % higher (rounded up) and the
 * parent's level boosts. It unlocks once the parent reaches the level in PlayerStatsService's
 * JOB_UNLOCK_REQUIREMENTS (ClassPassives.isClassUnlocked). Its passive is the parent's plus one nudge
 * (ClassPassives).
 */
const evolved = (
  name: string,
  icon: string,
  description: string,
  creed: string,
  realLife: [string, string, string],
  pillars: [PillarType, PillarType, PillarType]
): JobClass => {
  const parent = baseClass(TIER_2_PARENT[name]);
  return {
    name,
    icon,
    tier: 2,
    description,
    creed,
    realLife,
    primaryPillar: pillars[0],
    secondaryPillar: pillars[1],
    tertiaryPillar: pillars[2],
    baseStats: raiseBaseStats(parent.baseStats),
    statBoosts: parent.statBoosts.map((boost) => ({ ...boost })),
  };
};

// Advanced Classes (Tier 2) - one parent each, locked until that parent reaches level 10
const ADVANCED_CLASSES: JobClass[] = [
  evolved(
    "Knight",
    "fa-helmet-battle",
    "The Warrior who guards others: trains Body and Legend every level, braces like a wall and mends a little after every win, so it suits the protectors of the house.",
    "Holds the line.",
    [
      "Suits the protector jobs: locking up at night, checking on siblings, keeping the house safe.",
      "Steadfast: a Warrior's brace, and every win heals you a little.",
      "Trains Body and Legend: the shield grows with you.",
    ],
    ['physical', 'eternal', 'relational']
  ),
  evolved(
    "Berserker",
    "fa-axe-battle",
    "The Warrior who goes all in: trains Body and Spirit every level, shrugs off hits and heals a chunk of HP on every win, so it suits sprinters who clear the whole list in one go.",
    "All in, every time.",
    [
      "Suits the sprint jobs: the garage in one go, the whole yard before lunch.",
      "Shrugs it off: hits land softer and every win heals a chunk of HP.",
      "Trains Body and Spirit: strength with a wild streak.",
    ],
    ['physical', 'eternal', 'vibrational']
  ),
  evolved(
    "White Mage",
    "fa-hand-holding-medical",
    "The Mage who looks after the party: trains Mind and Heart every level, casts for less, gets MP back on every win and mends a little HP too, so it suits the helpers of the house.",
    "Heals the party.",
    [
      "Suits the helper jobs: cooking for others, caring for pets, cheering a sibling on.",
      "Mends: cheaper casts, MP back on every win, and a little HP too.",
      "Trains Mind and Heart: wisdom you share.",
    ],
    ['mental', 'relational', 'eternal']
  ),
  evolved(
    "Black Mage",
    "fa-meteor",
    "The Mage who burns through the list: trains Mind and Spirit every level and casts for much less MP, so it suits deep-focus workers who study, build and fix.",
    "Burns through the list.",
    [
      "Suits deep focus: homework, study, building and fixing things.",
      "Potent: a deep MP discount, so spells come easy.",
      "Trains Mind and Spirit: focus turned to power.",
    ],
    ['mental', 'vibrational', 'eternal']
  ),
  evolved(
    "Assassin",
    "fa-dagger",
    "The Thief who is done before anyone notices: trains Spirit and Body every level, slips away from almost any beast and pockets extra GP, so it suits quick, quiet jobs.",
    "In and out before anyone notices.",
    [
      "Suits quick, quiet jobs: the dishes right after dinner, the trash before it's asked.",
      "Slick: slips away from almost any beast, and brings home extra GP.",
      "Trains Spirit and Body: speed with muscle.",
    ],
    ['vibrational', 'physical', 'eternal']
  ),
  evolved(
    "Ranger",
    "fa-bow-arrow",
    "The Thief with a patient aim: trains Spirit and Heart every level, earns extra GP from every quest and gets a spare minute on the clock, so it suits outdoor jobs and errands.",
    "Patient, then precise.",
    [
      "Suits the outdoor jobs: the yard, the pets, the long walk, the errand across town.",
      "Ready: extra GP from every quest, and a spare minute on the clock.",
      "Trains Spirit and Heart: eyes open, hands quick.",
    ],
    ['vibrational', 'relational', 'eternal']
  ),
  evolved(
    "Martial Artist",
    "fa-hand-rock",
    "The Monk who lives by practice: trains Body and Spirit with a clear Mind, earns two extra minutes a chore and AP on every win, so it suits daily drills done on time.",
    "Practice is the point.",
    [
      "Suits the daily drills: exercise, instrument practice, chores done at the same time every day.",
      "Tempo: two extra minutes per chore, and AP on every win.",
      "Trains Body and Spirit, with a clear Mind.",
    ],
    ['physical', 'vibrational', 'mental']
  ),
  evolved(
    "Mystic",
    "fa-eye",
    "The Monk who finds the calm: trains Mind and Spirit every level, earns double AP on every win and gets MP back as it goes, so it suits quiet jobs done without being asked.",
    "Calm sees further.",
    [
      "Suits the quiet jobs: reading, tidying, helping without being asked.",
      "Centred: double AP on every win, and MP back as you go.",
      "Trains Mind and Spirit: stillness that charges privileges.",
    ],
    ['mental', 'vibrational', 'physical']
  ),
];

const advancedClass = (name: string): JobClass => {
  const found = ADVANCED_CLASSES.find((job) => job.name === name);
  if (!found) throw new Error(`JOB_CLASS_OPTIONS: unknown tier-2 parent class ${name}`);
  return found;
};

/**
 * A tier-3 class is its two tier-2 parents folded together: the base stats their average and the boosts their
 * union, with three pillars of its own. It unlocks once both parents reach the level in
 * PlayerStatsService's JOB_UNLOCK_REQUIREMENTS (ClassPassives.isClassUnlocked).
 */
const pair = (
  name: string,
  icon: string,
  description: string,
  creed: string,
  realLife: [string, string, string],
  pillars: [PillarType, PillarType, PillarType]
): JobClass => {
  const [first, second] = TIER_3_PARENTS[name].map(advancedClass);
  return {
    name,
    icon,
    tier: 3,
    description,
    creed,
    realLife,
    primaryPillar: pillars[0],
    secondaryPillar: pillars[1],
    tertiaryPillar: pillars[2],
    baseStats: averageBaseStats(first.baseStats, second.baseStats),
    statBoosts: combineStatBoosts(first.statBoosts, second.statBoosts),
  };
};

// Crown Classes (Tier 3) - locked until both tier-2 parents reach level 10
const CROWN_CLASSES: JobClass[] = [
  pair(
    "Paladin",
    "fa-shield-cross",
    "A Knight's shield with a Mystic's calm. Body (HP) first, then Mind and Legend. Holds the line and walks away from every fight a little healed.",
    "Protects the party.",
    [
      "Suits the big jobs done steadily: the long clean-up, the week-long project.",
      "Warrior's brace, and every win heals 10% HP.",
      "The family's shield: tough, steady, dependable.",
    ],
    ['physical', 'mental', 'eternal']
  ),
  pair(
    "Ninja",
    "fa-user-ninja",
    "An Assassin's feet with a Berserker's arm. Spirit (AP), Body (HP) and Heart (GP). Slips the first strike and leaves with the heavier purse.",
    "Strikes before the clock does.",
    [
      "Suits quick turnarounds: dishes right after dinner, bag packed the night before.",
      "Thief's escape, and the beast's first strike always misses.",
      "The fast finisher: done before the pressure builds.",
    ],
    ['vibrational', 'physical', 'relational']
  ),
  pair(
    "Sage",
    "fa-hat-wizard",
    "A White Mage's mind with a Mystic's patience. Mind (MP), Spirit (AP) and Legend (XP). Spells for half price and a spare minute on every clock.",
    "Knows the way.",
    [
      "Suits the planners: study schedules, teaching a sibling, reading ahead.",
      "Mage's discount doubled (50% off MP), plus Monk's minute.",
      "The wise planner: the cheapest casts in the game.",
    ],
    ['mental', 'vibrational', 'eternal']
  ),
];

export const JOB_CLASS_OPTIONS: JobClass[] = [...BASE_CLASSES, ...ADVANCED_CLASSES, ...CROWN_CLASSES];
