/**
 * What the Gold Bank teller says. The money rules live in wallet.ts; this turns their results into the toast copy
 * so the bank screen only has to show it. Pure, so the words can be tested without Ionic.
 */
import { copyFor } from "../copy/copy";
import type { Voice } from "../copy/voices";
import type { NextStorageTier, StoragePurchase } from "../inventory/Storage";
import { type BankMove, type GpPurse, type Purse, normalizePurse } from "./wallet";

export type BankAction = "withdraw" | "deposit" | "payDebt";

/** GP the way the game prints it */
export const gold = (value: number): string => `₲${Math.round(Number(value) || 0)}`;

/**
 * Why a move moved nothing, in the teller's words, or null when GP actually changed hands.
 * `before` is the purse the move was computed from.
 */
export function bankRefusal(action: BankAction, before: GpPurse | null | undefined, move: BankMove, voice: Voice = "adventure"): string | null {
  if (move.amount > 0) return null;
  const purse = normalizePurse(before);
  switch (action) {
    case "withdraw":
      if (purse.savings <= 0) return copyFor("bank.refusal.noSavings", voice);
      if (purse.wallet >= purse.limit) return copyFor("bank.refusal.walletFull", voice, { limit: gold(purse.limit) });
      return copyFor("bank.refusal.nameWithdraw", voice);
    case "deposit":
      if (purse.wallet <= 0) return copyFor("bank.refusal.walletEmpty", voice);
      return copyFor("bank.refusal.nameDeposit", voice);
    case "payDebt":
      if (purse.debt <= 0 && purse.hospitalBill <= 0) return copyFor("bank.refusal.noDebt", voice);
      if (purse.wallet <= 0) return copyFor("bank.refusal.walletEmptyDebt", voice);
      return copyFor("bank.refusal.namePay", voice);
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
    payDebt: () => payDebtReceipt(purse, move, voice)
  };
  const line = lineOf[action]?.() ?? "";
  const noteOf: Partial<Record<BankMove["capped"], () => string>> = {
    "wallet-full": () => copyFor("bank.cap.walletFull", voice, { room: gold(room) }),
    savings: () => copyFor("bank.cap.savings", voice),
    wallet: () => copyFor("bank.cap.wallet", voice),
    // a hero who owed only the Hospital has no debt to clear: the receipt already says the bill is paid
    debt: () => (purse.debt > 0 ? copyFor("bank.cap.debt", voice) : "")
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
  if (sale.ok) return null;
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
