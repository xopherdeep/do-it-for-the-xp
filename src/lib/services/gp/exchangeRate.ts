/**
 * GP mirrors real money at one family-wide rate: every real-life reward preset
 * is priced as dollars x GP_PER_DOLLAR (1 GP = 1 cent).
 */
export const GP_PER_DOLLAR = 100;

/** GP price for a dollar amount: nearest 25 below 500 GP, nearest 50 from 500 GP up */
export function gpForDollars(dollars: number, rate: number = GP_PER_DOLLAR): number {
  const raw = dollars * rate;
  if (!Number.isFinite(raw) || raw < 0) return 0;
  const step = raw < 500 ? 25 : 50;
  return Math.round(raw / step) * step;
}
