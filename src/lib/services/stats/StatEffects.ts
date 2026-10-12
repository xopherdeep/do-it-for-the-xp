/**
 * Stat effects: what the fifteen special stats on the profile sheet do (docs/Stats-Contract.md).
 *
 * The badge on the sheet shows the class's starting number plus the points the hero has *trained*
 * (earned at level-ups, kept on `stats.special`). The starting numbers are already folded into the
 * class's base HP/MP and its passive, so every effect here counts trained points only, exactly as
 * `calculateMaxHp` / `calculateMaxMp` have always done for endurance, intelligence and wisdom.
 *
 * `statEffects(trained)` is the whole table as one object of multipliers; `heroPassive(hero)` lays it
 * over the class passive (multiplying, never replacing) so the battle engine, the MP bill and the
 * temple's gold read one object. Stats that cannot do anything yet are "flavour for now": the copy on
 * the sheet says so instead of promising.
 *
 * Pure: nothing here touches the store. Callers hand in the hero they already looked up.
 */
import { JOB_CLASS_OPTIONS } from '@/constants/JOB_CLASS_OPTIONS';
import { classPassive, type ClassPassive } from './ClassPassives';
import { JOB_CLASS_BASE_STATS } from './PlayerStatsService';

export const STAT_NAMES = [
  'defense',
  'strength',
  'endurance',
  'perception',
  'intelligence',
  'wisdom',
  'agility',
  'focus',
  'flow',
  'awareness',
  'presence',
  'charisma',
  'guts',
  'luck',
  'mastery',
] as const;
export type StatName = (typeof STAT_NAMES)[number];

/** Trained points per stat, as `stats.special` stores them. */
export type TrainedStats = Partial<Record<StatName, number>>;

/** The slice of a stored hero profile the effects read (the user store keeps profiles untyped). */
export interface HeroLike {
  jobClass?: string | null;
  stats?: ({ special?: Record<string, unknown> | null } & Record<string, unknown>) | null;
}

/** Per trained point, and the cap each effect stops at. */
export const STAT_RATES = {
  /** Strength: share taken off every beast strike per point, and the most it can take. */
  strikePerPoint: 0.01,
  strikeCap: 0.25,
  /** Guts: share taken off what a brace still lets through per point, and the most it can take. */
  bracePerPoint: 0.01,
  braceCap: 0.25,
  /** Intelligence: share taken off every MP cost per point, and the most it can take. */
  mpPerPoint: 0.01,
  mpCap: 0.25,
  /** Agility: Run Away odds added per point, and the most it can add. */
  runPerPoint: 0.01,
  runCap: 0.25,
  /** Agility: seconds added to every chore's clock per point, and the most it can add. */
  clockSecondsPerPoint: 1,
  clockSecondsCap: 120,
  /** Perception: chance added to finding something in a temple search per point, and the cap. */
  findPerPoint: 0.02,
  findCap: 0.3,
  /** Awareness: extra share of temple gold per point, and the cap. */
  goldPerPoint: 0.01,
  goldCap: 0.25,
  /** Luck: how much the top of a gold range grows per point, and the cap. */
  luckPerPoint: 0.02,
  luckCap: 0.5,
  /** Charisma: share taken off shop prices per point, and the cap. */
  shopPerPoint: 0.01,
  shopCap: 0.2,
  /** Defense: HP added to the maximum per point (see calculateMaxHp). */
  hpPerDefense: 1,
  /** Guts: HP added to the maximum per point (see calculateMaxHp). */
  hpPerGuts: 0.5,
} as const;

export interface StatEffects {
  /** Share of every beast strike that lands (1 is the full strike). Strength. */
  strikeFactor: number;
  /** Multiplies the class's brace factor: a braced strike lets through this much of what it would. Guts. */
  braceMultiplier: number;
  /** Share of every MP cost the hero pays after the class discount. Intelligence. */
  mpCostFactor: number;
  /** Added to the Run Away odds against any beast. Agility. */
  runChanceBonus: number;
  /** Seconds added to every chore's clock. Agility. */
  clockSecondsPerChore: number;
  /** Added to the chance of finding something when searching a temple room. Perception. */
  findChanceBonus: number;
  /** Multiplies temple gold (chests, searches, the gate) after the class loot bonus. Awareness. */
  goldMultiplier: number;
  /** The top of a gold range grows by this share. Luck. */
  luckyRangeBonus: number;
  /** Share of a shop price the hero pays, in town and in temple shops. Charisma. */
  shopPriceFactor: number;
}

/** Stats that change nothing yet; the sheet says "flavour for now" for these instead of promising. */
export const FLAVOUR_STATS: readonly StatName[] = ['focus', 'flow', 'presence', 'mastery'];

const points = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

const capped = (count: number, perPoint: number, cap: number): number => Math.min(cap, count * perPoint);

/** Round away the float dust a chain of multipliers leaves (0.75 * 0.96 is not quite 0.72). */
const tidy = (value: number): number => Math.round(value * 1e6) / 1e6;

/**
 * The points a hero has trained, per stat: `stats.special`, or for a profile saved before `special`
 * existed, the same keys at the top of `stats`. Never negative, never fractional.
 */
export const trainedStats = (hero: HeroLike | null | undefined): TrainedStats => {
  const stats = hero?.stats ?? {};
  const special = (stats.special ?? {}) as Record<string, unknown>;
  const trained: TrainedStats = {};
  STAT_NAMES.forEach((stat) => {
    const value = points(special[stat] ?? stats[stat]);
    if (value > 0) trained[stat] = value;
  });
  return trained;
};

/** The class's starting number for a stat: its base stats, or 5 for a hero without a class. */
export const classBaseStat = (jobClass: string | null | undefined, stat: string): number => {
  const job = JOB_CLASS_OPTIONS.find((candidate) => candidate.name === (jobClass || 'Adventurer'));
  return job?.baseStats?.[stat] || 5;
};

/** The number the profile badge shows: class base plus trained points. */
export const statTotal = (hero: HeroLike | null | undefined, stat: string): number =>
  classBaseStat(hero?.jobClass, stat) + points(trainedStats(hero)[stat as StatName]);

/** The whole table of multipliers for a set of trained points. No points: every factor is neutral. */
export const statEffects = (trained: TrainedStats = {}): StatEffects => {
  const of = (stat: StatName): number => points(trained[stat]);
  return {
    strikeFactor: tidy(1 - capped(of('strength'), STAT_RATES.strikePerPoint, STAT_RATES.strikeCap)),
    braceMultiplier: tidy(1 - capped(of('guts'), STAT_RATES.bracePerPoint, STAT_RATES.braceCap)),
    mpCostFactor: tidy(1 - capped(of('intelligence'), STAT_RATES.mpPerPoint, STAT_RATES.mpCap)),
    runChanceBonus: tidy(capped(of('agility'), STAT_RATES.runPerPoint, STAT_RATES.runCap)),
    clockSecondsPerChore: capped(of('agility'), STAT_RATES.clockSecondsPerPoint, STAT_RATES.clockSecondsCap),
    findChanceBonus: tidy(capped(of('perception'), STAT_RATES.findPerPoint, STAT_RATES.findCap)),
    goldMultiplier: tidy(1 + capped(of('awareness'), STAT_RATES.goldPerPoint, STAT_RATES.goldCap)),
    luckyRangeBonus: tidy(capped(of('luck'), STAT_RATES.luckPerPoint, STAT_RATES.luckCap)),
    shopPriceFactor: tidy(1 - capped(of('charisma'), STAT_RATES.shopPerPoint, STAT_RATES.shopCap)),
  };
};

/** The effects of a stored hero. */
export const heroEffects = (hero: HeroLike | null | undefined): StatEffects => statEffects(trainedStats(hero));

/**
 * The class passive with the hero's trained stats laid over it: the brace factor, the MP discount and
 * the loot bonus are multiplied (a Warrior's quarter with 10 guts is 0.225, never replaced), the strike
 * share and the run bonus are the stats' own, and agility's seconds join the Monk's minute on the clock.
 * The engine, the MP bill and the temple's gold all read this one object.
 */
export const heroPassive = (hero: HeroLike | null | undefined): ClassPassive => {
  const base = classPassive(hero?.jobClass);
  const fx = heroEffects(hero);
  return {
    ...base,
    braceFactor: tidy(base.braceFactor * fx.braceMultiplier),
    strikeFactor: fx.strikeFactor,
    mpDiscount: tidy(1 - (1 - base.mpDiscount) * fx.mpCostFactor),
    gpBonus: tidy((1 + base.gpBonus) * fx.goldMultiplier - 1),
    runChanceBonus: fx.runChanceBonus,
    cooldownMinutesBonus: tidy(base.cooldownMinutesBonus + fx.clockSecondsPerChore / 60),
  };
};

/** An item or ability's MP bill for this hero: class discount and intelligence taken, rounded down, never below 0. */
export const heroMpBill = (cost: number, hero: HeroLike | null | undefined): number => {
  if (!(cost > 0)) return 0;
  return Math.max(0, Math.floor(cost * (1 - heroPassive(hero).mpDiscount) + 1e-9));
};

/** Temple gold as this hero is paid it: the class loot bonus and awareness, rounded to whole coins. */
export const heroGold = (amount: number, hero: HeroLike | null | undefined): number => {
  if (!(amount > 0)) return Math.max(0, Math.round(amount || 0));
  return Math.round(amount * (1 + heroPassive(hero).gpBonus));
};

/** The top of a gold range once luck has had its say: `max` grown by the luck share, rounded up. */
export const luckyTop = (max: number, hero: HeroLike | null | undefined): number => {
  if (!(max > 0)) return 0;
  return max + Math.ceil(max * heroEffects(hero).luckyRangeBonus - 1e-9);
};

/** A shop price for this hero: charisma taken off, rounded to whole coins, never below 1 for a priced ware. */
export const shopPrice = (price: number, hero: HeroLike | null | undefined): number => {
  if (!(price > 0)) return 0;
  return Math.max(1, Math.round(price * heroEffects(hero).shopPriceFactor));
};

/** "8% off" for the shop's sign, or '' when charisma has nothing to take off yet. */
export const shopDiscountLabel = (hero: HeroLike | null | undefined): string => {
  const off = Math.round((1 - heroEffects(hero).shopPriceFactor) * 100);
  return off > 0 ? `${off}% off` : '';
};

const pct = (share: number): string => `${Math.round(share * 100)}%`;

/**
 * One short line per stat for the profile sheet, read from the hero's trained points: what the points
 * do right now ("Trained 4: strikes land 4% softer"). '' for a stat with nothing trained, and for the
 * flavour stats, whose description already says they change nothing yet.
 */
export const statEffectLine = (stat: string, hero: HeroLike | null | undefined): string => {
  const trained = points(trainedStats(hero)[stat as StatName]);
  const hasNothingToDescribe = !trained || FLAVOUR_STATS.includes(stat as StatName);
  if (hasNothingToDescribe) return '';
  const fx = heroEffects(hero);
  const growth = JOB_CLASS_BASE_STATS[hero?.jobClass || ''] || JOB_CLASS_BASE_STATS.default;
  const lead = `Trained ${trained}: `;
  switch (stat as StatName) {
    case 'defense':
      return `${lead}+${Math.floor(trained * STAT_RATES.hpPerDefense)} max HP`;
    case 'strength':
      return `${lead}strikes land ${pct(1 - fx.strikeFactor)} softer`;
    case 'endurance':
      return `${lead}+${Math.floor(trained * growth.enduranceMultiplier)} max HP`;
    case 'perception':
      return `${lead}+${pct(fx.findChanceBonus)} to find things in temple rooms`;
    case 'intelligence':
      return `${lead}+${Math.floor(trained * growth.intelligenceMultiplier)} max MP, MP costs ${pct(1 - fx.mpCostFactor)} off`;
    case 'wisdom':
      return `${lead}+${Math.floor(trained * growth.wisdomMultiplier)} max MP`;
    case 'agility':
      return `${lead}+${pct(fx.runChanceBonus)} Run Away odds, +${fx.clockSecondsPerChore}s per chore on the clock`;
    case 'awareness':
      return `${lead}+${pct(fx.goldMultiplier - 1)} temple gold`;
    case 'charisma':
      return `${lead}shop prices ${pct(1 - fx.shopPriceFactor)} off`;
    case 'guts':
      return `${lead}Defend blocks ${pct(1 - fx.braceMultiplier)} more, +${Math.floor(trained * STAT_RATES.hpPerGuts)} max HP`;
    case 'luck':
      return `${lead}gold ranges reach ${pct(fx.luckyRangeBonus)} higher`;
    default:
      return '';
  }
};
