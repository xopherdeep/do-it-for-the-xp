import { DEFAULT_WALLET_LIMIT, walletLimitOf } from '@/lib/services/gp/wallet';
import type { GpPurse } from '@/lib/services/gp/wallet';
import type { GpPayload } from './types';

/** A profile's HP or MP is missing, or still the old plain number, so it needs its { now, max } object. */
export const needsPointsObject = (stat: unknown): boolean => typeof stat !== 'object' || stat === null;

/**
 * Add a GP payload to a hero's stats (starting a purse when there is none) and return the stats to store.
 * The caller writes them back and persists.
 */
export function applyGpChange(existingStats: any, payload: GpPayload): any {
  const { wallet, savings, debt, hospitalBill } = payload;

  const userStats = existingStats || { gp: { wallet: 0, savings: 0, debt: 0, hospitalBill: 0, limit: DEFAULT_WALLET_LIMIT } };

  // Initialize stats if missing
  if (!userStats.gp) userStats.gp = { wallet: 0, savings: 0, debt: 0, hospitalBill: 0, limit: DEFAULT_WALLET_LIMIT };

  if (wallet !== undefined) userStats.gp.wallet = (userStats.gp.wallet || 0) + wallet;
  if (savings !== undefined) userStats.gp.savings = (userStats.gp.savings || 0) + savings;
  if (debt !== undefined) userStats.gp.debt = (userStats.gp.debt || 0) + debt;
  // The Hospital's bill (docs/Quest-Rooms-Spec.md 5.8) never goes below 0: paying past it is not a credit
  if (hospitalBill !== undefined) userStats.gp.hospitalBill = Math.max(0, (userStats.gp.hospitalBill || 0) + hospitalBill);

  // Wallet overflow protection: excess goes to savings (Earthbound-style ATM)
  const walletLimit = walletLimitOf(userStats.gp);
  if (userStats.gp.wallet > walletLimit) {
    const overflow = userStats.gp.wallet - walletLimit;
    userStats.gp.wallet = walletLimit;
    userStats.gp.savings = (userStats.gp.savings || 0) + overflow;
  }

  return userStats;
}

/**
 * Replace a hero's purse wholesale and return their stats (what a wallet upgrade from a world shop hands back:
 * new limit, savings and wallet already charged). The caller writes them back and persists.
 */
export function applyWallet(user: any, gp: GpPurse): any {
  const stats = user.stats || {};
  const current = stats.gp || {};
  stats.gp = {
    ...current,
    wallet: Number(gp.wallet ?? current.wallet) || 0,
    savings: Number(gp.savings ?? current.savings) || 0,
    debt: Number(gp.debt ?? current.debt) || 0,
    hospitalBill: Number(gp.hospitalBill ?? current.hospitalBill) || 0,
    limit: walletLimitOf({ limit: gp.limit ?? current.limit }),
  };
  return stats;
}

/**
 * Apply damage (negative amount) or healing (positive amount) to a hero's stats, standardizing their HP and MP
 * objects on the way. Returns true if the player is still alive, false if defeated.
 */
export function applyHpChange(userStats: any, amount: number): boolean {
  // Initialize/Standardize hp structure if missing or primitive
  if (needsPointsObject(userStats.hp)) {
    const currentHp = typeof userStats.hp === 'number' ? userStats.hp : 100;
    const maxHp = typeof userStats.maxHp === 'number' ? userStats.maxHp : 100;
    userStats.hp = { now: currentHp, max: maxHp };
  }

  // Ensure maxHp is synced if it exists as a top-level property
  if (typeof userStats.maxHp === 'number') {
    userStats.hp.max = userStats.maxHp;
  }

  // Apply damage (negative amount) or healing (positive amount)
  userStats.hp.now = Math.max(0, Math.min(userStats.hp.max, userStats.hp.now + amount));

  // Standardize mp structure while we're here
  if (needsPointsObject(userStats.mp)) {
    const currentMp = typeof userStats.mp === 'number' ? userStats.mp : 100;
    const maxMp = typeof userStats.maxMp === 'number' ? userStats.maxMp : 100;
    userStats.mp = { now: currentMp, max: maxMp };
  }

  return userStats.hp.now > 0;
}

/**
 * Mirrors applyHpChange for MP: negative spends, positive restores, and the result stays between 0 and the
 * maximum. Returns true while the hero still has MP left.
 */
export function applyMpChange(userStats: any, amount: number): boolean {
  // Initialize/Standardize mp structure if missing or primitive
  if (needsPointsObject(userStats.mp)) {
    const currentMp = typeof userStats.mp === 'number' ? userStats.mp : 100;
    const maxMp = typeof userStats.maxMp === 'number' ? userStats.maxMp : 100;
    userStats.mp = { now: currentMp, max: maxMp };
  }

  // Ensure maxMp is synced if it exists as a top-level property
  if (typeof userStats.maxMp === 'number') {
    userStats.mp.max = userStats.maxMp;
  }

  userStats.mp.now = Math.max(0, Math.min(userStats.mp.max, userStats.mp.now + amount));

  // Standardize hp structure while we're here
  if (needsPointsObject(userStats.hp)) {
    const currentHp = typeof userStats.hp === 'number' ? userStats.hp : 100;
    const maxHp = typeof userStats.maxHp === 'number' ? userStats.maxHp : 100;
    userStats.hp = { now: currentHp, max: maxHp };
  }

  return userStats.mp.now > 0;
}
