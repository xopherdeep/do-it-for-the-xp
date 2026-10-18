/**
 * One money move at a counter (an ATM in a shop or a hotel, the wallet app): the teller's rules decide the purse,
 * the store saves it with its line in the wallet's history, and paying the Hospital's bill to 0 lifts the grounding
 * and tells the family, the same way at every counter. The screen only shows the refusal or the receipt.
 */
import type { Voice } from "../copy/voices";
import { announceBillPaid } from "@/lib/services/hometown/hospitalAdmission";
import { useUserStore } from "@/lib/store/stores/user";
import { type BankAction, bankMove, bankReceipt, bankRefusal } from "./bankTeller";
import { hospitalBillOf } from "./wallet";

export type BankErrand =
  | { ok: false; refusal: string }
  | { ok: true; receipt: string; clearsBill: boolean };

/** How the wallet's history names an ATM move */
export const ATM_NOTES: Record<BankAction, string> = { withdraw: "withdrew", deposit: "deposited", payDebt: "paid debt", borrow: "borrowed" };

/**
 * Do `action` with `amount` GP for the hero. Null when there is nothing to move (no amount, or no hero loaded);
 * otherwise the refusal in the teller's words, or the receipt once the purse is saved.
 */
export function runBankErrand(heroId: string, action: BankAction, amount: number, voice: Voice = "adventure", note?: string): BankErrand | null {
  const store = useUserStore();
  const stats = amount > 0 ? store.users[heroId]?.stats : undefined;
  if (!stats) return null;

  const before = stats.gp;
  const move = bankMove(action, before, amount);
  const refusal = bankRefusal(action, before, move, voice);
  if (refusal) return { ok: false, refusal };

  const clearsBill = hospitalBillOf(before) > 0 && hospitalBillOf(move.gp) === 0;
  const receipt = bankReceipt(action, before, move, voice);
  store.setWallet(heroId, move.gp, note ? { kind: action, note } : { kind: action });
  if (clearsBill) announceBillPaid(heroId);
  return { ok: true, receipt, clearsBill };
}
