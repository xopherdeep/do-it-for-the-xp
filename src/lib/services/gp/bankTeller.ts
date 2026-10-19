/**
 * What the Gold Bank teller says. The money rules live in wallet.ts; this turns their results into the toast copy
 * so the bank screen only has to show it. Pure, so the words can be tested without Ionic.
 */
import { copyFor, copyFrom } from "../copy/copy";
import type { CopyCatalog, Voice } from "../copy/voices";
import type { NextStorageTier, StoragePurchase } from "../inventory/Storage";
import {
  type BankMove,
  type GpPurse,
  type Purse,
  borrowGp,
  creditLineOf,
  depositToSavings,
  normalizePurse,
  payDownBills,
  withdrawFromSavings,
} from "./wallet";
import type { SavingsInterestSettings } from "./savingsInterest";

export type BankAction = "withdraw" | "deposit" | "payDebt" | "borrow";

const BANK_MOVES: Record<BankAction, (gp: GpPurse | null | undefined, amount: number) => BankMove> = {
  withdraw: withdrawFromSavings,
  deposit: depositToSavings,
  payDebt: payDownBills,
  borrow: borrowGp,
};

/** The purse after the teller does `action` with `amount` GP (paying debt clears the hospital bill first). */
export const bankMove = (action: BankAction, gp: GpPurse | null | undefined, amount: number): BankMove => BANK_MOVES[action](gp, amount);

/** GP the way the game prints it */
export const gold = (value: number): string => `₲${Math.round(Number(value) || 0)}`;

/**
 * Why a move moved nothing, in the teller's words, or null when GP actually changed hands.
 * `before` is the purse the move was computed from.
 */
export function bankRefusal(action: BankAction, before: GpPurse | null | undefined, move: BankMove, voice: Voice = "adventure"): string | null {
  const isMoved = move.amount > 0;
  if (isMoved) return null;
  const purse = normalizePurse(before);
  switch (action) {
    case "withdraw": {
      const hasNoSavings = purse.savings <= 0;
      if (hasNoSavings) return copyFor("bank.refusal.noSavings", voice);
      const isWalletFull = purse.wallet >= purse.limit;
      if (isWalletFull) return copyFor("bank.refusal.walletFull", voice, { limit: gold(purse.limit) });
      return copyFor("bank.refusal.nameWithdraw", voice);
    }
    case "deposit": {
      const isWalletEmpty = purse.wallet <= 0;
      if (isWalletEmpty) return copyFor("bank.refusal.walletEmpty", voice);
      return copyFor("bank.refusal.nameDeposit", voice);
    }
    case "payDebt": {
      const isDebtFree = purse.debt <= 0 && purse.hospitalBill <= 0;
      if (isDebtFree) return copyFor("bank.refusal.noDebt", voice);
      const isWalletEmpty = purse.wallet <= 0;
      if (isWalletEmpty) return copyFor("bank.refusal.walletEmptyDebt", voice);
      return copyFor("bank.refusal.namePay", voice);
    }
    case "borrow": {
      const isBillOwed = purse.hospitalBill > 0;
      if (isBillOwed) return copyFor("bank.refusal.loanBill", voice);
      const isWalletFull = purse.wallet >= purse.limit;
      if (isWalletFull) return copyFor("bank.refusal.loanWalletFull", voice);
      return copyFor("bank.refusal.loanLine", voice, { line: gold(creditLineOf(purse)) });
    }
  }
}

/**
 * The pay-down receipt. A hero who owed the Hospital sees the bill between wallet and debt, and a payment that brings
 * the bill to 0 says they are free (the grounding lifts at that moment).
 */
function payDebtReceipt(before: Purse, move: BankMove, voice: Voice): string {
  const after = move.gp;
  const amount = gold(move.amount);
  const hadBill = before.hospitalBill > 0;
  if (!hadBill) return copyFor("bank.receipt.payDebt", voice, { amount, wallet: gold(after.wallet), debt: gold(after.debt) });
  const sums = copyFor("bank.receipt.payBill", voice, {
    amount,
    wallet: gold(after.wallet),
    bill: gold(after.hospitalBill),
    debt: gold(after.debt),
  });
  return after.hospitalBill <= 0 ? `${sums} ${copyFor("bank.receipt.billFree", voice)}` : sums;
}

/** The receipt for a move that moved GP, with a note when the bank moved less than was asked for. */
export function bankReceipt(action: BankAction, before: GpPurse | null | undefined, move: BankMove, voice: Voice = "adventure"): string {
  const purse = normalizePurse(before);
  const after = move.gp;
  const room = Math.max(0, purse.limit - purse.wallet);
  const sums = { amount: gold(move.amount), wallet: gold(after.wallet), savings: gold(after.savings) };
  const lineOf: Record<BankAction, () => string> = {
    withdraw: () => copyFor("bank.receipt.withdraw", voice, sums),
    deposit: () => copyFor("bank.receipt.deposit", voice, sums),
    payDebt: () => payDebtReceipt(purse, move, voice),
    borrow: () => copyFor("bank.receipt.borrow", voice, { amount: gold(move.amount), wallet: gold(after.wallet), debt: gold(after.debt) }),
  };
  const line = lineOf[action]?.() ?? "";
  const noteOf: Partial<Record<BankMove["capped"], () => string>> = {
    "wallet-full": () => copyFor("bank.cap.walletFull", voice, { room: gold(room) }),
    savings: () => copyFor("bank.cap.savings", voice),
    wallet: () => copyFor("bank.cap.wallet", voice),
    // a hero who owed only the Hospital has no debt to clear: the receipt already says the bill is paid
    debt: () => (purse.debt > 0 ? copyFor("bank.cap.debt", voice) : ""),
    credit: () => copyFor("bank.cap.credit", voice),
  };
  const note = noteOf[move.capped]?.();
  return note ? `${line} ${note}` : line;
}

// --- Storage: the Gold Bank sells room at home, tier by tier (services/inventory/Storage.ts) ------------------------

/** What the banker says when there is no bigger storage to sell. */
export const STORAGE_MAXED = "Your storage is as big as it gets.";

/** `STORAGE_MAXED` in the hero's voice. */
export const storageMaxed = (voice: Voice = "adventure"): string => copyFor("bank.storage.maxed", voice);

/** The next storage on sale the way the banker says it: "Storage Box: 10 slots for 100 GP" first, "Bigger storage: ..." after. */
export function storageOffer(next: NextStorageTier): string {
  const name = next.tier === 1 ? "Storage Box" : "Bigger storage";
  return `${name}: ${next.slots} slots for ${next.price} GP`;
}

/** The banker's ask before the sale: what the storage holds and what it costs, in his voice. */
export function storageQuestion(next: NextStorageTier, voice: Voice = "adventure"): string {
  const name = next.tier === 1 ? "A Storage Box" : "Bigger storage";
  return copyFor("bank.storage.question", voice, { name, slots: next.slots, price: next.price });
}

/** The banker's offer when the wallet falls short but the savings would cover the rest: they are in the bank, so he asks. */
export function storageTopUpQuestion(sale: Extract<StoragePurchase, { ok: false; reason: "gp" }>, voice: Voice = "adventure"): string {
  return copyFor("bank.storage.topUp", voice, { short: sale.short });
}

/** Why the sale did not go through, in the banker's words, or null when it did. */
export function storageRefusal(sale: StoragePurchase | { ok: false; reason: "hero" }, voice: Voice = "adventure"): string | null {
  const isSold = sale.ok;
  if (isSold) return null;
  switch (sale.reason) {
    case "max":
      return storageMaxed(voice);
    case "gp":
      return sale.shortAll > 0
        ? copyFor("bank.storage.shortAll", voice, { short: sale.shortAll })
        : copyFor("bank.storage.shortWallet", voice, { short: sale.short });
    default:
      return copyFor("bank.storage.noAccount", voice);
  }
}

/** The banker's line once the sale is made; says so when part of the price came out of the savings. */
export function storageReceipt(sale: Extract<StoragePurchase, { ok: true }>, voice: Voice = "adventure"): string {
  const line = copyFor(sale.tier === 1 ? "bank.storage.gotBox" : "bank.storage.grew", voice, { slots: sale.slots });
  return sale.fromSavings > 0 ? `${line} ${copyFor("bank.storage.fromSavings", voice, { n: sale.fromSavings })}` : line;
}

// --- Savings interest: the banker mentions it only while the Game Master has it on (services/gp/savingsInterest.ts) ---

const INTEREST_COPY: CopyCatalog = {
  "bank.greet.interest": {
    simple: "Saved gold grows {rate}% every week!",
    adventure: "Gold left in savings grows by {rate}% every week. Let it sit and watch it climb!",
    classic: "Savings earn {rate}% interest each week.",
  },
};

/** The banker's line about weekly interest, or null while it is off (he never brags about a rate that is not paid). */
export function interestGreeting(rules: SavingsInterestSettings | null | undefined, voice: Voice = "adventure"): string | null {
  const isInterestOff = rules?.enabled !== true;
  if (isInterestOff) return null;
  return copyFrom(INTEREST_COPY, "bank.greet.interest", voice, { rate: rules.weeklyRatePercent });
}
