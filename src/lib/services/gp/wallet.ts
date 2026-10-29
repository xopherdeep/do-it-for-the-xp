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
  { limit: 500, minLevel: 1 },
  { limit: 1500, minLevel: 3 },
  { limit: 3000, minLevel: 5 },
  { limit: 6000, minLevel: 10 },
  { limit: 12000, minLevel: 15 },
  { limit: 25000, minLevel: 20 },
  { limit: 50000, minLevel: 30 },
];

export const DEFAULT_WALLET_LIMIT: number = WALLET_TIERS[0].limit;

export interface GpPurse {
  wallet?: number;
  savings?: number;
  debt?: number;
  /**
   * What the hero still owes the Hospital (docs/Quest-Rooms-Spec.md 5.8). Kept apart from `debt` so one number has one
   * meaning: owed > 0 means the hero is grounded, whatever else they owe.
   */
  hospitalBill?: number;
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
  return {
    wallet: money(gp?.wallet),
    savings: money(gp?.savings),
    debt: money(gp?.debt),
    hospitalBill: money(gp?.hospitalBill),
    limit: walletLimitOf(gp),
  };
}

/** What the hero still owes the Hospital: a missing or broken value is nothing. */
export function hospitalBillOf(gp?: GpPurse | null): number {
  return money(gp?.hospitalBill);
}

/** Grounded means a hospital bill is unpaid. Plain debt never grounds; paying the bill to 0 lifts it at once. */
export function isGrounded(gp?: GpPurse | null): boolean {
  return hospitalBillOf(gp) > 0;
}

/** A bigger wallet costs a fifth of its size. */
export function walletUpgradePrice(limit: number): number {
  return Math.round(limit / 5);
}

/** The next wallet on sale for this purse, or null when the hero already carries the biggest one. */
export function nextWalletUpgrade(gp?: GpPurse | null): WalletUpgradeOffer | null {
  const current = walletLimitOf(gp);
  const floor = Math.max(current, DEFAULT_WALLET_LIMIT);
  const next = WALLET_TIERS.find((tier) => tier.limit > floor);
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
  const isUnderLevel = heroLevel < offer.minLevel;
  if (isUnderLevel) return { ok: false, reason: "locked", offer, short: 0 };
  const purse = normalizePurse(gp);
  const available = purse.savings + purse.wallet;
  const isShortOfGp = available < offer.price;
  if (isShortOfGp) return { ok: false, reason: "poor", offer, short: offer.price - available };

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
  capped: "none" | "wallet-full" | "savings" | "wallet" | "debt" | "bill" | "credit";
  /** How much of `amount` went to the hospital bill (only the pay-down moves set it) */
  billPaid?: number;
}

const resolveWithdrawCap = (amount: number, wanted: number, room: number, savings: number): BankMove["capped"] => {
  const isUncapped = amount === wanted;
  if (isUncapped) return "none";
  const isWalletTheLimit = room < savings && room < wanted;
  if (isWalletTheLimit) return "wallet-full";
  return "savings";
};

const resolveDebtCap = (amount: number, wanted: number, debt: number, wallet: number): BankMove["capped"] => {
  const isUncapped = amount === wanted;
  if (isUncapped) return "none";
  const isDebtTheLimit = debt < wallet;
  if (isDebtTheLimit) return "debt";
  return "wallet";
};

/** Withdraw from savings into the wallet: never more than is saved, never past the wallet's limit. */
export function withdrawFromSavings(gp: GpPurse | null | undefined, requested: number): BankMove {
  const purse = normalizePurse(gp);
  const room = Math.max(0, purse.limit - purse.wallet);
  const wanted = money(requested);
  const amount = Math.min(wanted, purse.savings, room);
  const capped = resolveWithdrawCap(amount, wanted, room, purse.savings);
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
  const capped = resolveDebtCap(amount, wanted, purse.debt, purse.wallet);
  return { gp: { ...purse, wallet: purse.wallet - amount, debt: purse.debt - amount }, amount, capped };
}

/**
 * Pay the hospital bill from the wallet: never more than the wallet holds or the bill owed. Savings and other debt are
 * untouched (savings come out through Withdraw first).
 */
export function payHospitalBill(gp: GpPurse | null | undefined, requested: number): BankMove {
  const purse = normalizePurse(gp);
  const wanted = money(requested);
  const amount = Math.min(wanted, purse.wallet, purse.hospitalBill);
  let capped: BankMove["capped"] = "none";
  const isCapped = amount !== wanted;
  if (isCapped) capped = purse.hospitalBill < purse.wallet ? "bill" : "wallet";
  return {
    gp: { ...purse, wallet: purse.wallet - amount, hospitalBill: purse.hospitalBill - amount },
    amount,
    capped,
    billPaid: amount,
  };
}

/**
 * The bank's pay-down button: the hospital bill first, then any other debt, all from the wallet. A hero who owes only
 * plain debt is paid exactly as `payDownDebt` does. `billPaid` says how much of the payment went to the bill.
 */
export function payDownBills(gp: GpPurse | null | undefined, requested: number): BankMove {
  const wanted = money(requested);
  const billMove = payHospitalBill(gp, wanted);
  const debtMove = payDownDebt(billMove.gp, wanted - billMove.amount);
  const amount = billMove.amount + debtMove.amount;
  const owed = normalizePurse(gp);
  let capped: BankMove["capped"] = "none";
  const isCapped = amount !== wanted;
  if (isCapped) capped = owed.hospitalBill + owed.debt < owed.wallet ? "debt" : "wallet";
  return { gp: debtMove.gp, amount, capped, billPaid: billMove.amount };
}

// --- Loans: the bank lends GP against the wallet's size, and wants a little more back ------------------------------

/** What a loan costs on top: 10% of what was borrowed, to the nearest GP (a loan under 5 GP costs nothing extra). */
export const LOAN_FEE_RATE = 0.1;

/** The fee on a loan of `amount` GP. */
export const loanFee = (amount: number): number => Math.round(money(amount) * LOAN_FEE_RATE);

/** The most a hero may owe the bank in all: half the wallet's size (a bigger wallet is a bigger line). */
export const creditLineOf = (gp?: GpPurse | null): number => Math.floor(walletLimitOf(gp) / 2);

/**
 * The most the bank will lend right now: what is left of the line once the debt and the new loan's fee are counted,
 * never past the wallet's room, and nothing while the Hospital is owed (the bill is paid first).
 */
export function loanRoom(gp?: GpPurse | null): number {
  const purse = normalizePurse(gp);
  const isBillOwed = purse.hospitalBill > 0;
  if (isBillOwed) return 0;
  const line = Math.max(0, creditLineOf(gp) - purse.debt);
  let amount = Math.min(line, Math.max(0, purse.limit - purse.wallet));
  while (amount > 0 && amount + loanFee(amount) > line) amount--;
  return amount;
}

/** Borrow from the bank: the wallet gains the loan, the debt gains the loan and its fee. */
export function borrowGp(gp: GpPurse | null | undefined, requested: number): BankMove {
  const purse = normalizePurse(gp);
  const wanted = money(requested);
  const amount = Math.min(wanted, loanRoom(gp));
  const fee = amount > 0 ? loanFee(amount) : 0;
  let capped: BankMove["capped"] = "none";
  const isCapped = amount !== wanted;
  if (isCapped) capped = purse.wallet + amount >= purse.limit ? "wallet-full" : "credit";
  return { gp: { ...purse, wallet: purse.wallet + amount, debt: purse.debt + amount + fee }, amount, capped };
}
