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
  statBoosts: ClassStatBoost[];
}

export const JOB_CLASS_OPTIONS: JobClass[] = [
  // Base Classes (Tier 1) - Currently Active
  {
    name: "Warrior",
    icon: "fa-swords",
    tier: 1,
    description: "Built for the physical grind. Enhances Body (HP) through brute force and Legend (XP) through sheer guts. Ideal for those who thrive on physical challenges.",
    primaryPillar: 'physical',     // HP: strength, endurance
    secondaryPillar: 'eternal',    // XP: guts
    tertiaryPillar: 'relational',  // GP: presence
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
    description: "A path of the Mind. Sharpens focus for Spirit (AP) and mastery for Legend (XP). Best for those who use intelligence to optimize their everyday routines.",
    primaryPillar: 'mental',       // MP: intelligence, wisdom
    secondaryPillar: 'eternal',    // XP: mastery
    tertiaryPillar: 'vibrational', // AP: focus
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
    description: "The agile resource gatherer. Maximizes Spirit (AP) flow and Heart (GP) through charisma. Perfect for efficient scavengers who value luck and social grace.",
    primaryPillar: 'vibrational',  // AP: agility, flow
    secondaryPillar: 'relational', // GP: charisma
    tertiaryPillar: 'eternal',     // XP: luck
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
    description: "The balanced ascetic. Harmonizes Body (HP) with Mind (MP) while maintaining intense Spirit (AP) focus. A versatile choice for those seeking total self-mastery.",
    primaryPillar: 'physical',     // HP: endurance
    secondaryPillar: 'mental',     // MP: wisdom, perception
    tertiaryPillar: 'vibrational', // AP: focus
    statBoosts: [
      { stat: 'endurance', amount: 1 },
      { stat: 'wisdom', amount: 1 },
      { stat: 'perception', amount: 1 },
      { stat: 'focus', amount: 2 }
    ]
  },
  // { name: "Paladin", icon: "fa-shield-cross" },
  // { name: "Dark Knight", icon: "fa-skull" },
  // { name: "Gunbreaker", icon: "fa-gun" },
  // { name: "White Mage", icon: "fa-hat-wizard" },
  // { name: "Scholar", icon: "fa-book-spells" },
  // { name: "Astrologian", icon: "fa-astrology" },
  // { name: "Monk", icon: "fa-fist-raised" },
  // { name: "Dragoon", icon: "fa-dragon" },
  // { name: "Ninja", icon: "fa-ninja" },
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
]