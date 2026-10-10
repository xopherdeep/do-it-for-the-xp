/**
 * The hero's wallet has a limit, like Earthbound's: GP past it goes to savings at the bank. The Gold Bank sells
 * bigger wallets, each gated by level the way Majora's Mask gates its wallets, and paid for out of savings first
 * and the wallet second. Everything here is pure so the bank screen only has to show results.
 */

export interface WalletTier {
  /** The wallet size in GP */
  limit: number;
  /** The hero level needed before the bank will sell it */
  minLevel: number;
}

/** Wallet sizes, smallest first. A new hero starts with the first. */
export const WALLET_TIERS: readonly WalletTier[] = [
  { limit: 100, minLevel: 1 },
  { limit: 300, minLevel: 3 },
  { limit: 500, minLevel: 5 },
  { limit: 1000, minLevel: 10 },
  { limit: 2500, minLevel: 15 },
  { limit: 5000, minLevel: 20 },
  { limit: 10000, minLevel: 30 },
];

export const DEFAULT_WALLET_LIMIT: number = WALLET_TIERS[0].limit;

export interface GpPurse {
  wallet?: number;
  savings?: number;
  debt?: number;
  limit?: number;
}

/** A purse with every number present and sane */
export type Purse = Required<GpPurse>;

export interface WalletUpgradeOffer extends WalletTier {
  /** What the bank charges for it */
  price: number;
}

const money = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

/** The wallet limit as the game reads it: a missing or broken value is the starting size. */
export function walletLimitOf(gp?: GpPurse | null): number {
  const limit = money(gp?.limit);
  return limit > 0 ? limit : DEFAULT_WALLET_LIMIT;
}

/** The purse with every field a number, the limit defaulted. */
export function normalizePurse(gp?: GpPurse | null): Purse {
  return { wallet: money(gp?.wallet), savings: money(gp?.savings), debt: money(gp?.debt), limit: walletLimitOf(gp) };
}

/** A bigger wallet costs half its size. */
export function walletUpgradePrice(limit: number): number {
  return Math.round(limit / 2);
}

/** The next wallet on sale for this purse, or null when the hero already carries the biggest one. */
export function nextWalletUpgrade(gp?: GpPurse | null): WalletUpgradeOffer | null {
  const current = walletLimitOf(gp);
  const next = WALLET_TIERS.find((tier) => tier.limit > current);
  return next ? { ...next, price: walletUpgradePrice(next.limit) } : null;
}

/** Savings and wallet together: what the hero can put toward a bigger wallet. */
export function spendableGp(gp?: GpPurse | null): number {
  const purse = normalizePurse(gp);
  return purse.savings + purse.wallet;
}

export type WalletUpgradeResult =
  | { ok: true; gp: Purse; offer: WalletUpgradeOffer }
  | { ok: false; reason: "maxed" | "locked" | "poor"; offer: WalletUpgradeOffer | null; short: number };

/**
 * Buy the next wallet at hero level `level`. Returns the new purse (savings first, then the wallet pays the rest)
 * or why the bank refused: nothing bigger, the hero is under the level, or short of GP (`short` says by how much).
 */
export function buyWalletUpgrade(gp: GpPurse | null | undefined, level: number): WalletUpgradeResult {
  const offer = nextWalletUpgrade(gp);
  if (!offer) return { ok: false, reason: "maxed", offer: null, short: 0 };
  const heroLevel = Number.isFinite(Number(level)) ? Number(level) : 1;
  if (heroLevel < offer.minLevel) return { ok: false, reason: "locked", offer, short: 0 };
  const purse = normalizePurse(gp);
  const available = purse.savings + purse.wallet;
  if (available < offer.price) return { ok: false, reason: "poor", offer, short: offer.price - available };

  const fromSavings = Math.min(purse.savings, offer.price);
  const fromWallet = offer.price - fromSavings;
  return {
    ok: true,
    offer,
    gp: { ...purse, savings: purse.savings - fromSavings, wallet: purse.wallet - fromWallet, limit: offer.limit },
  };
}

export interface BankMove {
  /** The purse afterwards */
  gp: Purse;
  /** What actually moved, after the limits */
  amount: number;
  /** Why less (or nothing) moved */
  capped: "none" | "wallet-full" | "savings" | "wallet" | "debt";
}

/** Withdraw from savings into the wallet: never more than is saved, never past the wallet's limit. */
export function withdrawFromSavings(gp: GpPurse | null | undefined, requested: number): BankMove {
  const purse = normalizePurse(gp);
  const room = Math.max(0, purse.limit - purse.wallet);
  const wanted = money(requested);
  const amount = Math.min(wanted, purse.savings, room);
  const capped = amount === wanted ? "none" : room < purse.savings && room < wanted ? "wallet-full" : "savings";
  return { gp: { ...purse, savings: purse.savings - amount, wallet: purse.wallet + amount }, amount, capped };
}

/** Deposit from the wallet into savings: never more than the wallet holds. */
export function depositToSavings(gp: GpPurse | null | undefined, requested: number): BankMove {
  const purse = normalizePurse(gp);
  const amount = Math.min(money(requested), purse.wallet);
  return {
    gp: { ...purse, wallet: purse.wallet - amount, savings: purse.savings + amount },
    amount,
    capped: amount === money(requested) ? "none" : "wallet",
  };
}

/** Pay down debt from the wallet: never more than the wallet holds or the debt owed. */
export function payDownDebt(gp: GpPurse | null | undefined, requested: number): BankMove {
  const purse = normalizePurse(gp);
  const wanted = money(requested);
  const amount = Math.min(wanted, purse.wallet, purse.debt);
  const capped = amount === wanted ? "none" : purse.debt < purse.wallet ? "debt" : "wallet";
  return { gp: { ...purse, wallet: purse.wallet - amount, debt: purse.debt - amount }, amount, capped };
}
