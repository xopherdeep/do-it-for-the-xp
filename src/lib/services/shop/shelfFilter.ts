/**
 * The shop's shelves sheet (All | Can Afford | Can't Afford): which wares each choice keeps.
 *
 * A ware the GM stocked is paid from the wallet, so the wallet decides. The Bigger Wallet a world shop sells is paid
 * from savings first and then the wallet (buyWalletUpgrade), and only when it is the hero's next one at their level;
 * one the hero already carries, or one that is not their next, is not on sale to them and shows under All only.
 */
import { spendableGp, type GpPurse } from "@/lib/services/gp/wallet";
import type { WalletWare } from "@/lib/services/gp/walletShops";

export type ShelfFilter = "all" | "affordable" | "out-of-budget";

/** A price the hero holds exactly is one they can pay. */
export const canAffordPrice = (wallet: number, price: number): boolean => Number(wallet) >= Number(price);

/** Whether a ware the hero could buy here, affordable or not, stays on the shelf under this filter. */
export const keepsWare = (filter: ShelfFilter, affordable: boolean): boolean => {
  const isShowingAll = filter === "all";
  if (isShowingAll) return true;
  return filter === "affordable" ? affordable : !affordable;
};

/** The Bigger Wallet is affordable when it is on sale to this hero and savings plus wallet cover it. */
export const canAffordWalletWare = (ware: Pick<WalletWare, "status" | "price"> | null | undefined, gp?: GpPurse | null): boolean =>
  ware?.status === "for-sale" && spendableGp(gp) >= ware.price;

/** How much more GP the Bigger Wallet needs, 0 when it is covered or not for sale. */
export const walletWareShortBy = (ware: Pick<WalletWare, "status" | "price"> | null | undefined, gp?: GpPurse | null): number =>
  ware?.status === "for-sale" ? Math.max(0, ware.price - spendableGp(gp)) : 0;

/** Whether the Bigger Wallet stays on the shelf under this filter. */
export const keepsWalletWare = (
  filter: ShelfFilter,
  ware: Pick<WalletWare, "status" | "price"> | null | undefined,
  gp?: GpPurse | null
): boolean => {
  if (!ware) return false;
  const isShowingAll = filter === "all";
  if (isShowingAll) return true;
  const isNotForThisHero = ware.status === "owned" || ware.status === "ahead";
  if (isNotForThisHero) return false;
  return keepsWare(filter, canAffordWalletWare(ware, gp));
};
