import type { Enemy } from "./types";
import { clampMarks } from "@/lib/services/battle/questGrudge";

export type BribeTier = "full" | "low";

export interface BribeQuotes {
  baseCost: number;
  wealthSurcharge: number;
  fullCost: number;
  lowCost: number;
  canAffordFull: boolean;
  canAffordLow: boolean;
}

/** Minimum GP for any bribe attempt */
export const MIN_BRIBE_BASE = 5;

/** Wealth percentage factor (5% of hero's total GP) */
export const WEALTH_PERCENT_FACTOR = 0.05;

/** Extra cost multiplier per grudge mark (50% per mark) */
export const GRUDGE_COST_MULTIPLIER = 0.5;

/** Low bribe discount factor (50% of the full formula) */
export const LOW_BRIBE_DISCOUNT = 0.5;

/** Base bribe cost based on enemy attack power */
export const bribeBaseCost = (attack?: number): number => {
  const atk = typeof attack === "number" && Number.isFinite(attack) ? attack : 5;
  return Math.max(MIN_BRIBE_BASE, Math.round(atk * 1.5));
};

/** Surcharge based on hero's total assets (wallet + savings) */
export const bribeWealthSurcharge = (wallet?: number, savings?: number): number => {
  const safeWallet = typeof wallet === "number" && Number.isFinite(wallet) && wallet > 0 ? wallet : 0;
  const safeSavings = typeof savings === "number" && Number.isFinite(savings) && savings > 0 ? savings : 0;
  const totalAssets = safeWallet + safeSavings;
  return Math.floor(totalAssets * WEALTH_PERCENT_FACTOR);
};

/**
 * Calculates full and discounted bribe quotes:
 * - base cost: derived from enemy attack
 * - wealth surcharge: scaled by total assets (wallet + savings)
 * - full cost: scaled higher by existing grudge marks
 * - low cost: discounted below the formula (carries grudge penalty)
 */
export const calculateBribeQuotes = (
  enemy: Enemy | null,
  heroGp?: { wallet?: number; savings?: number } | null,
  grudgeMarks?: number
): BribeQuotes => {
  const baseCost = bribeBaseCost(enemy?.attack);
  const wallet = heroGp?.wallet ?? 0;
  const savings = heroGp?.savings ?? 0;
  const wealthSurcharge = bribeWealthSurcharge(wallet, savings);
  const marks = clampMarks(grudgeMarks ?? enemy?.grudgeMarks);

  const scaledBase = baseCost + wealthSurcharge;
  const fullCost = Math.round(scaledBase * (1 + marks * GRUDGE_COST_MULTIPLIER));
  const lowCost = Math.max(1, Math.round(fullCost * LOW_BRIBE_DISCOUNT));

  const availableWallet = typeof wallet === "number" && Number.isFinite(wallet) && wallet > 0 ? wallet : 0;

  return {
    baseCost,
    wealthSurcharge,
    fullCost,
    lowCost,
    canAffordFull: availableWallet >= fullCost,
    canAffordLow: availableWallet >= lowCost,
  };
};
