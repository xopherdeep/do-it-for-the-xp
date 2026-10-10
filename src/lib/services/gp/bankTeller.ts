/**
 * What the Gold Bank teller says. The money rules live in wallet.ts; this turns their results into the toast copy
 * so the bank screen only has to show it. Pure, so the words can be tested without Ionic.
 */
import { type BankMove, type GpPurse, normalizePurse } from "./wallet";

export type BankAction = "withdraw" | "deposit" | "payDebt";

/** GP the way the game prints it */
export const gold = (value: number): string => `₲${Math.round(Number(value) || 0)}`;

/**
 * Why a move moved nothing, in the teller's words, or null when GP actually changed hands.
 * `before` is the purse the move was computed from.
 */
export function bankRefusal(action: BankAction, before: GpPurse | null | undefined, move: BankMove): string | null {
  if (move.amount > 0) return null;
  const purse = normalizePurse(before);
  switch (action) {
    case "withdraw":
      if (purse.savings <= 0) return "You have nothing saved. Your savings are empty!";
      if (purse.wallet >= purse.limit) return `Your wallet is full! It holds ${gold(purse.limit)} at most.`;
      return "Name an amount to withdraw first.";
    case "deposit":
      if (purse.wallet <= 0) return "Your wallet is empty! Nothing to deposit.";
      return "Name an amount to deposit first.";
    case "payDebt":
      if (purse.debt <= 0) return "You owe nothing. Debt-free!";
      if (purse.wallet <= 0) return "Your wallet is empty! Come back with some GP.";
      return "Name an amount to pay first.";
  }
}

/** The receipt for a move that moved GP, with a note when the bank moved less than was asked for. */
export function bankReceipt(action: BankAction, before: GpPurse | null | undefined, move: BankMove): string {
  const purse = normalizePurse(before);
  const after = move.gp;
  const room = Math.max(0, purse.limit - purse.wallet);
  let line = "";
  switch (action) {
    case "withdraw":
      line = `${gold(move.amount)} withdrawn. Wallet: ${gold(after.wallet)} | Savings: ${gold(after.savings)}.`;
      break;
    case "deposit":
      line = `${gold(move.amount)} deposited. Wallet: ${gold(after.wallet)} | Savings: ${gold(after.savings)}.`;
      break;
    case "payDebt":
      line = `${gold(move.amount)} paid. Wallet: ${gold(after.wallet)} | Debt: ${gold(after.debt)}.`;
      break;
  }
  switch (move.capped) {
    case "wallet-full":
      return `${line} Your wallet only holds ${gold(room)} more.`;
    case "savings":
      return `${line} That was everything you had saved.`;
    case "wallet":
      return `${line} That was everything in your wallet.`;
    case "debt":
      return `${line} That clears your debt entirely!`;
    default:
      return line;
  }
}
