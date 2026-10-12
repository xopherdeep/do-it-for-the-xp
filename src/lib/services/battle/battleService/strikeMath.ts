import type { BattlePassive, Enemy } from "./types";

/** A strike costs about this share of the hero's max HP. */
const STRIKE_SHARE_OF_MAX_HP = 0.12;
/** The share of a strike a brace lets through when the class does not say otherwise. */
const DEFAULT_BRACE_FACTOR = 0.5;
/** Run Away never becomes a sure thing, however nimble the hero. */
const RUN_CHANCE_CEILING = 0.95;

/**
 * What one beast strike costs the hero: about 12% of their max HP, scaled by the beast's attack
 * (10 is the baseline, so a boss with 15 bites 1.5x as hard) and a +-10% roll. It never scales
 * with time or chores left. Trained strength lets only `strikeFactor` of it land (1 by default, never
 * below three quarters), and a brace lets `braceFactor` of that through (half by default, a quarter for
 * a Warrior's wall), each rounded down, never below 1.
 */
export function strikeDamage(
  maxHp: number,
  attack: number,
  braced: boolean,
  roll: number = Math.random(),
  braceFactor: number = DEFAULT_BRACE_FACTOR,
  strikeFactor: number = 1
): number {
  const raw = Math.round(maxHp * STRIKE_SHARE_OF_MAX_HP * ((attack || 10) / 10) * (0.9 + roll * 0.2));
  const share = Number.isFinite(strikeFactor) && strikeFactor > 0 && strikeFactor <= 1 ? strikeFactor : 1;
  const full = Math.max(1, Math.floor((Number.isFinite(raw) ? Math.max(1, raw) : 1) * share + 1e-9));
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

/**
 * The odds of a clean getaway from `enemy` (0 to 1): the base by beast kind, the class's own run chance
 * for ordinary monsters, plus the trained agility bonus, never past RUN_CHANCE_CEILING. The roll against
 * it, and the free-fight "always escapes", stay with the caller.
 */
export function escapeChanceAgainst(enemy: Enemy | null, passive: BattlePassive): number {
  let escapeChance = 0.75;
  if (enemy?.isBoss) {
    escapeChance = 0.25;
  } else if (enemy?.type === 'miniboss') {
    escapeChance = 0.5;
  } else if (typeof passive.runChance === 'number') {
    escapeChance = passive.runChance;
  }
  const bonus = passive.runChanceBonus;
  const hasRunBonus = Number.isFinite(bonus) && bonus > 0;
  if (hasRunBonus) escapeChance = Math.min(RUN_CHANCE_CEILING, escapeChance + bonus);
  return escapeChance;
}
