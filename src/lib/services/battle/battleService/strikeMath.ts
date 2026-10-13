import { MAX_GRUDGE_FACTOR } from "@/lib/services/battle/questGrudge";
import type { BattlePassive, PartingDodge, PartingSoftener } from "./types";

/** A strike costs about this share of the hero's max HP. */
const STRIKE_SHARE_OF_MAX_HP = 0.12;
/** The share of a strike a brace lets through when the class does not say otherwise. */
const DEFAULT_BRACE_FACTOR = 0.5;
/** However nimble the hero, agility never dodges more than this share of parting strikes (tunable). */
export const PARTING_DODGE_CEILING = 0.5;

/**
 * What one beast strike costs the hero: about 12% of their max HP, scaled by the beast's attack
 * (10 is the baseline, so a boss with 15 bites 1.5x as hard) and a +-10% roll. It never scales
 * with time or chores left. Trained strength lets only `strikeFactor` of it land (1 by default, never
 * below three quarters), a beast that holds a grudge against the hero hits `grudge` times as hard (1 by default,
 * 25% a mark, never past 1.75: docs/Quest-Rooms-Spec.md 5.7), and a brace lets `braceFactor` of that through (half by
 * default, a quarter for a Warrior's wall), each rounded down, never below 1.
 */
export function strikeDamage(
  maxHp: number,
  attack: number,
  braced: boolean,
  roll: number = Math.random(),
  braceFactor: number = DEFAULT_BRACE_FACTOR,
  strikeFactor: number = 1,
  grudge: number = 1
): number {
  const raw = Math.round(maxHp * STRIKE_SHARE_OF_MAX_HP * ((attack || 10) / 10) * (0.9 + roll * 0.2));
  const share = Number.isFinite(strikeFactor) && strikeFactor > 0 && strikeFactor <= 1 ? strikeFactor : 1;
  const harder = Number.isFinite(grudge) ? Math.min(MAX_GRUDGE_FACTOR, Math.max(1, grudge)) : 1;
  const full = Math.max(1, Math.floor((Number.isFinite(raw) ? Math.max(1, raw) : 1) * share * harder + 1e-9));
  const factor = Number.isFinite(braceFactor) && braceFactor > 0 ? braceFactor : DEFAULT_BRACE_FACTOR;
  return braced ? Math.max(1, Math.floor(full * factor + 1e-9)) : full;
}

/** The hero's passive with every missing field filled in with the default rule. */
export function resolvePassive(passive?: Partial<BattlePassive>): BattlePassive {
  return {
    braceFactor: DEFAULT_BRACE_FACTOR,
    strikeFactor: 1,
    runChance: null,
    runChanceBonus: 0,
    cooldownMinutesBonus: 0,
    skipFirstStrike: false,
    ...passive,
  };
}

/** The chance trained agility alone dodges a parting strike: the bonus (1% a point), never past PARTING_DODGE_CEILING. */
export function partingDodgeChance(passive: BattlePassive): number {
  const bonus = passive.runChanceBonus;
  const hasNoBonus = !Number.isFinite(bonus) || bonus <= 0;
  if (hasNoBonus) return 0;
  return Math.min(PARTING_DODGE_CEILING, bonus);
}

/**
 * What softens the parting strike, if anything: a brace the hero was already in, or a class that slips away
 * (`runChance` set: Thief, Assassin, Ninja). Either way the brace factor applies once; the two do not stack.
 */
export function partingStrikeSoftener(passive: BattlePassive, wasBracing: boolean): PartingSoftener | null {
  if (wasBracing) return 'brace';
  return typeof passive.runChance === 'number' ? 'slip' : null;
}

/** What the fight still owes the hero's getaway: each of these makes the parting strike miss. */
export interface PartingStrikeOwed {
  /** The Ninja's first strike of the fight, not yet spent. */
  shadow: boolean;
  /** The clock stands under Chronos' ice. */
  frozen: boolean;
  /** Thor's Hammer has a strike left to skip. */
  hammer: boolean;
  /** X's Invisibility: the hero vanished before running. */
  vanish: boolean;
}

export interface PartingStrikeInput {
  maxHp: number;
  /** The hero's HP now, to tell whether the strike would empty it. */
  hp: number;
  /** The beast's attack. */
  attack: number;
  passive: BattlePassive;
  wasBracing: boolean;
  owed: PartingStrikeOwed;
  /** A roll in [0, 1) against the agility dodge. */
  dodgeRoll: number;
  /** A roll in [0, 1) for the strike itself. */
  strikeRoll: number;
  /** The beast's grudge against the hero: 1 (none, the default) to 1.75. It hits the parting strike like any other. */
  grudge?: number;
}

export interface PartingStrike {
  dodgedBy: PartingDodge | null;
  /** What the strike is worth, floor and all, before any HP rule; 0 when it was dodged. */
  damage: number;
  softener: PartingSoftener | null;
  /** The strike would take the hero's last HP (never true for a dodged one). */
  emptied: boolean;
}

/**
 * The strike a hero takes on the way out of a fight (docs/Quest-Rooms-Spec.md 5.6): one full strike from the
 * beast, softened by the brace factor when the hero was bracing or the class slips away. It misses when the hero
 * vanished (checked first, so nothing else owed is spent), the Ninja's first strike is still owed, the clock is
 * frozen, a hammer skip is owed (checked in the order a real strike checks them), or the agility roll falls under
 * the dodge chance. Pure: the caller spends whatever was owed.
 */
export function partingStrike(input: PartingStrikeInput): PartingStrike {
  const { owed, passive } = input;
  let dodgedBy: PartingDodge | null = null;
  if (owed.vanish) dodgedBy = 'vanish';
  else if (owed.shadow) dodgedBy = 'shadow';
  else if (owed.frozen) dodgedBy = 'frozen';
  else if (owed.hammer) dodgedBy = 'hammer';
  else if (input.dodgeRoll < partingDodgeChance(passive)) dodgedBy = 'agility';
  if (dodgedBy) return { dodgedBy, damage: 0, softener: null, emptied: false };

  const softener = partingStrikeSoftener(passive, input.wasBracing);
  const damage = strikeDamage(
    input.maxHp,
    input.attack,
    softener !== null,
    input.strikeRoll,
    passive.braceFactor,
    passive.strikeFactor,
    input.grudge
  );
  return { dodgedBy: null, damage, softener, emptied: damage >= input.hp };
}
