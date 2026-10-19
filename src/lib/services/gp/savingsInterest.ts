/**
 * Savings interest (Settings > Rewards): the Game Master can let the Gold Bank pay a hero interest on what sits in savings.
 * Off until the Game Master turns it on. Once per calendar week, the first time the app wakes in it, a hero's savings
 * earn floor(savings * rate / 100) GP, paid into savings with the ledger note "Bank interest: +N GP". Only savings earn:
 * debt never grows. The week is the family's calendar week (the first day is the weekStartsOn rule, the same week the
 * weekly recap reads), and the hero's purse remembers the last week it was paid so a week never pays twice.
 *
 * Pure: no storage, no Vue, no stores. The payout that reads the roster and moves the GP is appInterest.ts.
 */
import { weekRangeOf } from "@/lib/services/insights/weeklyRecap";

export interface SavingsInterestSettings {
  enabled: boolean;
  /** Percent of the savings balance paid each week */
  weeklyRatePercent: number;
}

/** The rates the settings offer, percent a week */
export const SAVINGS_INTEREST_RATES: readonly number[] = [0.5, 1, 2, 3, 4, 5, 7.5, 10];

export const MIN_INTEREST_RATE = 0.5;
export const MAX_INTEREST_RATE = 10;

export const DEFAULT_SAVINGS_INTEREST: SavingsInterestSettings = { enabled: false, weeklyRatePercent: 2 };

/** A stored rate as a rate the bank can pay: kept within range, on a half step; anything else is the default */
export const normalizeInterestRate = (value: unknown): number => {
  const rate = Number(value);
  const isUsable = value !== "" && value !== null && value !== undefined && Number.isFinite(rate) && rate > 0;
  if (!isUsable) return DEFAULT_SAVINGS_INTEREST.weeklyRatePercent;
  const clamped = Math.min(MAX_INTEREST_RATE, Math.max(MIN_INTEREST_RATE, rate));
  return Math.round(clamped * 2) / 2;
};

/** The saved interest rules as the game reads them: off unless saved as on, the rate always a usable one */
export const normalizeSavingsInterest = (stored: Partial<SavingsInterestSettings> | null | undefined): SavingsInterestSettings => ({
  enabled: stored?.enabled === true,
  weeklyRatePercent: normalizeInterestRate(stored?.weeklyRatePercent),
});

/** GP a week of interest pays on `savings` at `ratePercent`, rounded down; nothing for an empty or broken balance */
export const interestOf = (savings: number, ratePercent: number): number => {
  const balance = Math.floor(Number(savings));
  const hasBalance = Number.isFinite(balance) && balance > 0;
  if (!hasBalance) return 0;
  // Whole tenths of a percent keep the sum in integers, so floor never trips over 74.99999999
  const tenths = Math.round(normalizeInterestRate(ratePercent) * 10);
  return Math.floor((balance * tenths) / 1000);
};

/** The key of the calendar week `now` falls in: the day it began, as "YYYY-MM-DD" (the weekly recap's own week) */
export const weekKeyOf = (now: Date, weekStartsOn = 1): string => weekRangeOf(now, "calendar", weekStartsOn).from;

/** The ledger line for a payout */
export const interestNote = (gp: number): string => `Bank interest: +${Math.round(gp)} GP`;

export interface InterestDueInput {
  rules: SavingsInterestSettings;
  /** The hero's savings balance now */
  savings: number;
  /** The week key stored on the hero's purse the last time interest was paid, if ever */
  paidWeek: unknown;
  now: Date;
  weekStartsOn?: number;
}

export interface InterestDue {
  /** The week this payout belongs to; store it on the purse so the week is not paid again */
  week: string;
  /** GP to pay into savings (0 when the balance is too small to earn a whole GP; the week is still spent) */
  gp: number;
}

/** What the bank owes this hero this week, or null when interest is off or this week was already paid */
export const interestDueFor = ({ rules, savings, paidWeek, now, weekStartsOn = 1 }: InterestDueInput): InterestDue | null => {
  if (!rules.enabled) return null;
  const week = weekKeyOf(now, weekStartsOn);
  const isPaid = paidWeek === week;
  if (isPaid) return null;
  return { week, gp: interestOf(savings, rules.weeklyRatePercent) };
};
