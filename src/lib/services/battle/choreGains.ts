/**
 * What a finished chore gives back in a fight. Pure: the battle page reads this when a chore completes and
 * applies the gains to the hero.
 *
 * Every tool costs MP, so MP has to come from somewhere. A chore finished in a fight that holds a quest
 * returns a tenth of max MP (at least 1); the `charge` effect doubles it. The `moonlight` effect heals a
 * twentieth of max HP per chore (at least 1). A free fight gives nothing: its moves are not real chores
 * and could be farmed.
 */

/** Share of max MP a chore in a quest fight gives back. */
export const CHORE_MP_SHARE = 0.1;
/** Share of max HP a chore heals under moonlight. */
export const MOONLIGHT_HP_SHARE = 0.05;

export interface ChoreGainsInput {
  maxHp: number;
  maxMp: number;
  /** True when the fight holds a real quest; a free fight gives nothing. */
  questFight: boolean;
  /** The `charge` effect is up: the MP gain doubles. */
  charged: boolean;
  /** The `moonlight` effect is up: each chore also heals. */
  moonlit: boolean;
}

export interface ChoreGains {
  hp: number;
  mp: number;
}

/** A share of a pool, rounded, and never under 1 for a pool that exists. */
const shareOf = (max: number, share: number): number => (max > 0 ? Math.max(1, Math.round(max * share)) : 0);

export function choreGains(input: ChoreGainsInput): ChoreGains {
  if (!input.questFight) return { hp: 0, mp: 0 };
  const mp = shareOf(input.maxMp, CHORE_MP_SHARE) * (input.charged ? 2 : 1);
  const hp = input.moonlit ? shareOf(input.maxHp, MOONLIGHT_HP_SHARE) : 0;
  return { hp, mp };
}
