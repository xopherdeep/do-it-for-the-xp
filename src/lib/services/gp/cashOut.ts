/**
 * Cash out: a hero trades GP for real money at the rate the Game Master set (Settings > Rewards). The GP leaves the
 * wallet at once and the cash out waits in Approvals with the shop's Real Life purchases: Fulfil when the money is
 * handed over, Refund to give the GP back (PurchaseService.fulfillPurchase / refundPurchase). The rules are pure; only
 * `requestCashOut` touches the store and the purchase log.
 */
import { getPurchaseLogDb, type PurchaseLogEntry } from "@/lib/databases/PurchaseLogDb";
import type { CashOutSettings } from "@/lib/services/family/familySettings";
import { useUserStore } from "@/lib/store/stores/user";
import { normalizePurse, type GpPurse } from "./wallet";

/** The purchase log's item id for a cash out, so Approvals and the wallet can tell one from a shop sale */
export const CASH_OUT_ITEM_ID = "cash-out";

/** Dollars the way the wallet prints them: $5 or $2.50 */
export const dollars = (value: number): string => {
  const n = Math.max(0, Number(value) || 0);
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
};

/** What `gp` GP is worth at this rate */
export const cashValue = (gp: number, gpPerDollar: number): number => {
  const rate = Math.max(1, Math.round(Number(gpPerDollar) || 1));
  return Math.round((Math.max(0, Number(gp) || 0) / rate) * 100) / 100;
};

/** The purchase log's name for a cash out: "Cash out: $5 (50 GP)" */
export const cashOutName = (gp: number, gpPerDollar: number): string => `Cash out: ${dollars(cashValue(gp, gpPerDollar))} (${gp} GP)`;

export type CashOutBlock = "off" | "not-allowed" | "short";

export interface CashOutQuote {
  /** Why the hero can't cash out now, or null when they can */
  blocked: CashOutBlock | null;
  rate: number;
  /** The stepper's range: whole dollars only, so it moves a dollar's worth of GP at a time */
  min: number;
  max: number;
  step: number;
}

/** Whether this hero may cash out, and how much: at least $1, at most what the wallet holds in whole dollars. */
export function cashOutQuote(gp: GpPurse | null | undefined, settings: CashOutSettings, heroId: string): CashOutQuote {
  const rate = Math.max(1, Math.round(Number(settings.gpPerDollar) || 1));
  const wallet = normalizePurse(gp).wallet;
  const max = Math.floor(wallet / rate) * rate;
  const isAllowed = !settings.heroIds.length || settings.heroIds.includes(String(heroId));
  let blocked: CashOutBlock | null = null;
  if (!settings.enabled) blocked = "off";
  else if (!isAllowed) blocked = "not-allowed";
  else if (max < rate) blocked = "short";
  return { blocked, rate, min: rate, max, step: rate };
}

/** A cash out still waiting on a Game Master */
export const isPendingCashOut = (entry: PurchaseLogEntry, heroId: string): boolean =>
  entry.itemId === CASH_OUT_ITEM_ID && entry.status === "pending" && String(entry.userId) === String(heroId);

/**
 * Take `gp` from the wallet and leave the cash out for a Game Master. Charges and logs in one go; if the log can't be
 * written the GP goes back, so nothing is ever charged without a request to hand over.
 */
export async function requestCashOut(heroId: string, gp: number, gpPerDollar: number): Promise<PurchaseLogEntry | null> {
  const userStore = useUserStore();
  const wallet = Number(userStore.users[heroId]?.stats?.gp?.wallet) || 0;
  const amount = Math.round(Number(gp) || 0);
  const isUnpayable = amount <= 0 || amount > wallet;
  if (isUnpayable) return null;
  const itemName = cashOutName(amount, gpPerDollar);
  await userStore.updateUserGP({ userId: heroId, wallet: -amount, kind: "cashOut", note: itemName });
  try {
    return await getPurchaseLogDb().logPurchase({ userId: heroId, itemId: CASH_OUT_ITEM_ID, itemName, price: amount, status: "pending" });
  } catch (error) {
    await userStore.updateUserGP({ userId: heroId, wallet: amount, kind: "refund", note: `Refund: ${itemName}` });
    throw error;
  }
}
