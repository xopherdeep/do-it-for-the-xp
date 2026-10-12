/**
 * Class passives: the one thing each hero class changes about the loop (docs/Items-And-Classes-Contract.md, C).
 *
 * Rule zero still holds: no class completes a chore. A passive changes the brace, the MP bill, the loot, the
 * escape odds, the clock or what a win restores. `classPassive(jobClass)` is the whole table as one typed
 * object; the engines read the field they care about and never spell a class name themselves. The hero's
 * trained stats lay over this table in `StatEffects.heroPassive` (docs/Stats-Contract.md).
 *
 * Pure: nothing here touches the store. Callers that know the hero look up their jobClass and hand it in.
 */
import { JOB_UNLOCK_REQUIREMENTS } from './PlayerStatsService';

export interface ClassPassive {
  /** Share of a strike that lands through a brace (Defend). 0.5 for most; a Warrior's wall takes a quarter. */
  braceFactor: number;
  /** Share of every strike that lands at all; 1 for every class (trained strength lowers it, see StatEffects). */
  strikeFactor: number;
  /** Share taken off every item and ability MP cost. */
  mpDiscount: number;
  /** Share of max MP restored on a win. */
  mpRegenOnWin: number;
  /** Extra share of GP from quests and chests. */
  gpBonus: number;
  /** Run Away odds against a plain monster, or null to keep the beast's own odds. */
  runChance: number | null;
  /** Added to the Run Away odds against any beast; 0 for every class (trained agility raises it, see StatEffects). */
  runChanceBonus: number;
  /** Flat minutes added to what every chore earns on the clock. */
  cooldownMinutesBonus: number;
  /** Extra AP on every win. */
  apBonusOnWin: number;
  /** Share of max HP healed on a win. */
  hpRegenOnWin: number;
  /** The beast's first strike of every fight misses. */
  skipFirstStrike: boolean;
  /** One line for the class card, in the voice of the game. */
  blurb: string;
}

export const DEFAULT_BRACE_FACTOR = 0.5;
export const WARRIOR_BRACE_FACTOR = 0.25;
export const MAGE_MP_DISCOUNT = 0.25;
export const SAGE_MP_DISCOUNT = 0.5;
export const WIN_MP_REGEN = 0.1;
export const WIN_HP_REGEN = 0.1;
export const THIEF_GP_BONUS = 0.25;
export const THIEF_RUN_CHANCE = 0.9;
export const MONK_MINUTE = 1;
export const MONK_AP = 1;
// Tier-2 nudges: each advanced class is its parent's passive plus one of these (docs/Items-And-Classes-Contract.md, C)
export const KNIGHT_HP_REGEN = 0.05;
export const BERSERKER_BRACE_FACTOR = 0.35;
export const BERSERKER_HP_REGEN = 0.15;
export const WHITE_MAGE_MP_REGEN = 0.2;
export const WHITE_MAGE_HP_REGEN = 0.1;
export const BLACK_MAGE_MP_DISCOUNT = 0.35;
export const ASSASSIN_GP_BONUS = 0.3;
export const RANGER_GP_BONUS = 0.25;
export const MARTIAL_ARTIST_MINUTES = 2;
export const MYSTIC_AP = 2;
export const MYSTIC_MP_REGEN = 0.1;

const NONE: ClassPassive = {
  braceFactor: DEFAULT_BRACE_FACTOR,
  strikeFactor: 1,
  mpDiscount: 0,
  mpRegenOnWin: 0,
  gpBonus: 0,
  runChance: null,
  runChanceBonus: 0,
  cooldownMinutesBonus: 0,
  apBonusOnWin: 0,
  hpRegenOnWin: 0,
  skipFirstStrike: false,
  blurb: 'An adventurer with no trick up the sleeve yet. Pick a class!',
};

/** The table from the contract, keyed by the class name as JOB_CLASS_OPTIONS spells it. */
const PASSIVES: Record<string, Partial<ClassPassive>> = {
  Warrior: {
    braceFactor: WARRIOR_BRACE_FACTOR,
    blurb: 'Braces like a wall: Defend takes a quarter of the strike instead of half.',
  },
  Mage: {
    mpDiscount: MAGE_MP_DISCOUNT,
    mpRegenOnWin: WIN_MP_REGEN,
    blurb: 'Items and abilities cost 25% less MP; wins restore 10% MP.',
  },
  Thief: {
    gpBonus: THIEF_GP_BONUS,
    runChance: THIEF_RUN_CHANCE,
    blurb: '+25% GP from quests and chests; Run Away succeeds 90% against monsters.',
  },
  Monk: {
    cooldownMinutesBonus: MONK_MINUTE,
    apBonusOnWin: MONK_AP,
    blurb: 'Each chore earns +1 minute on the clock; +1 AP on every win.',
  },
  // Tier 2: the parent's passive plus one nudge, made only of the fields above
  Knight: {
    braceFactor: WARRIOR_BRACE_FACTOR,
    hpRegenOnWin: KNIGHT_HP_REGEN,
    blurb: 'Braces like a wall, and every win mends a little.',
  },
  Berserker: {
    braceFactor: BERSERKER_BRACE_FACTOR,
    hpRegenOnWin: BERSERKER_HP_REGEN,
    blurb: 'Shrugs off the hit; wins heal a chunk.',
  },
  'White Mage': {
    mpDiscount: MAGE_MP_DISCOUNT,
    mpRegenOnWin: WHITE_MAGE_MP_REGEN,
    hpRegenOnWin: WHITE_MAGE_HP_REGEN,
    blurb: 'Cheap casts, MP back on wins, and a little HP too.',
  },
  'Black Mage': {
    mpDiscount: BLACK_MAGE_MP_DISCOUNT,
    mpRegenOnWin: WIN_MP_REGEN,
    blurb: 'A deep MP discount; spells come easy.',
  },
  Assassin: {
    runChance: THIEF_RUN_CHANCE,
    gpBonus: ASSASSIN_GP_BONUS,
    blurb: 'Slips away from almost anything, and pockets extra GP.',
  },
  Ranger: {
    gpBonus: RANGER_GP_BONUS,
    cooldownMinutesBonus: MONK_MINUTE,
    blurb: 'Extra GP from every quest, and a spare minute on the clock.',
  },
  'Martial Artist': {
    cooldownMinutesBonus: MARTIAL_ARTIST_MINUTES,
    apBonusOnWin: MONK_AP,
    blurb: 'Two extra minutes a chore, and AP on every win.',
  },
  Mystic: {
    apBonusOnWin: MYSTIC_AP,
    mpRegenOnWin: MYSTIC_MP_REGEN,
    blurb: 'Double AP on every win, and MP back as you go.',
  },
  // Tier 3: the passives of the old pair rule, unchanged
  Paladin: {
    braceFactor: WARRIOR_BRACE_FACTOR,
    hpRegenOnWin: WIN_HP_REGEN,
    blurb: "A Warrior's brace, and every win heals 10% HP.",
  },
  Ninja: {
    gpBonus: THIEF_GP_BONUS,
    runChance: THIEF_RUN_CHANCE,
    skipFirstStrike: true,
    blurb: "A Thief's run and loot, and the beast's first strike of every fight hits only shadow.",
  },
  Sage: {
    mpDiscount: SAGE_MP_DISCOUNT,
    mpRegenOnWin: WIN_MP_REGEN,
    cooldownMinutesBonus: MONK_MINUTE,
    blurb: "A Mage's discount doubled (50% off MP), wins restore 10% MP, and a Monk's minute on the clock.",
  },
};

/** "warrior" and "Warrior" are the same class; profiles have stored both. */
export const canonicalClassName = (jobClass: string | null | undefined): string => {
  const wanted = String(jobClass ?? '').trim().toLowerCase();
  return Object.keys(PASSIVES).find((name) => name.toLowerCase() === wanted) ?? String(jobClass ?? '');
};

/** Every passive of a class as one object. Unknown classes (and "default") get the no-trick table. */
export const classPassive = (jobClass: string | null | undefined): ClassPassive => ({
  ...NONE,
  ...(PASSIVES[canonicalClassName(jobClass)] ?? {}),
});

/** An item or ability's MP cost once the class discount is taken, rounded down, never below 0 (a free thing stays free). */
export const discountedMp = (cost: number, jobClass: string | null | undefined): number => {
  if (!(cost > 0)) return 0;
  return Math.max(0, Math.floor(cost * (1 - classPassive(jobClass).mpDiscount)));
};

/** GP with the class loot bonus on top, rounded to whole coins. */
export const bonusGp = (gp: number, jobClass: string | null | undefined): number => {
  if (!(gp > 0)) return Math.max(0, Math.round(gp || 0));
  return Math.round(gp * (1 + classPassive(jobClass).gpBonus));
};

/**
 * The class levels on a hero, as `isClassUnlocked` wants them, from `stats.classes` ({ [name]: { level } }).
 * `stats.classes` is keyed by `jobClass` exactly as the hero's class is spelled ("White Mage"), for every tier.
 */
export const classLevelsOf = (
  classes: Record<string, { level?: number } | undefined> | null | undefined
): Record<string, number> =>
  Object.fromEntries(
    Object.entries(classes ?? {}).map(([name, progress]) => [name, Math.max(0, Number(progress?.level) || 0)])
  );

/** The requirement of an advanced class (tier 2 or 3), or null when the class has none (tier 1 and unknown classes are open). */
export const classRequirement = (jobClass: string | null | undefined): Record<string, number> | null =>
  JOB_UNLOCK_REQUIREMENTS[canonicalClassName(jobClass)] ?? null;

/** "Warrior 10" or "Knight 10 + Mystic 10": the requirement as the picker prints it, or '' when there is none. */
export const classRequirementLabel = (jobClass: string | null | undefined): string => {
  const requirement = classRequirement(jobClass);
  if (!requirement) return '';
  return Object.entries(requirement)
    .map(([name, level]) => `${name} ${level}`)
    .join(' + ');
};

/**
 * Whether the hero may pick this class: tier 1 always, tier 2 once its parent and tier 3 once both its parents in
 * JOB_UNLOCK_REQUIREMENTS have reached their level. Class names in `classLevels` match however they are cased
 * (names with a space, "White Mage", included).
 */
export const isClassUnlocked = (jobClass: string | null | undefined, classLevels: Record<string, number>): boolean => {
  const requirement = classRequirement(jobClass);
  if (!requirement) return true;
  const levelOf = (name: string): number => {
    const key = Object.keys(classLevels).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
    return key ? Number(classLevels[key]) || 0 : 0;
  };
  return Object.entries(requirement).every(([name, level]) => levelOf(name) >= level);
};

/** Rewards as a win pays them with the class on top: the loot bonus on GP and the Monk's AP. */
export const rewardsWithPassive = <T extends { gp: number; ap: number }>(rewards: T, passive: ClassPassive): T => ({
  ...rewards,
  gp: rewards.gp > 0 ? Math.round(rewards.gp * (1 + passive.gpBonus)) : rewards.gp,
  ap: rewards.ap + (rewards.ap >= 0 ? passive.apBonusOnWin : 0),
});

/** What a win restores: whole points of HP and MP from the class shares, never past the max. */
export const winRegen = (
  passive: ClassPassive,
  hp: { now: number; max: number },
  mp: { now: number; max: number }
): { hp: number; mp: number } => {
  const share = (points: { now: number; max: number }, ratio: number): number => {
    const hasNothingToRestore = !(ratio > 0) || !(points.max > 0);
    if (hasNothingToRestore) return 0;
    const missing = Math.max(0, points.max - points.now);
    return Math.min(missing, Math.max(1, Math.round(points.max * ratio)));
  };
  return { hp: share(hp, passive.hpRegenOnWin), mp: share(mp, passive.mpRegenOnWin) };
};
