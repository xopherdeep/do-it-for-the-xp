import {
  canAffordPrice,
  canAffordWalletWare,
  keepsWalletWare,
  keepsWare,
  walletWareShortBy,
} from "@/lib/services/shop/shelfFilter";
import { walletOfferAt } from "@/lib/services/gp/walletShops";

describe("the shop's shelves filter", () => {
  const prices = [9, 40, 41, 184];
  const shelfFor = (filter: "all" | "affordable" | "out-of-budget", wallet: number) =>
    prices.filter((price) => keepsWare(filter, canAffordPrice(wallet, price)));

  it("counts a price the wallet holds exactly as affordable", () => {
    expect(canAffordPrice(40, 40)).toBe(true);
    expect(canAffordPrice(40, 41)).toBe(false);
  });

  it("splits the shelf between Can Afford and Can't Afford, and All keeps everything", () => {
    expect(shelfFor("all", 40)).toEqual(prices);
    expect(shelfFor("affordable", 40)).toEqual([9, 40]);
    expect(shelfFor("out-of-budget", 40)).toEqual([41, 184]);
  });

  describe("the Bigger Wallet a world shop sells", () => {
    // A level 3 hero with the starting ₲500 wallet: the Pegasus Ranch sells their next one (₲1500) for 300 GP
    const poor = { limit: 500, wallet: 40, savings: 250 };
    const rich = { limit: 500, wallet: 60, savings: 240 };
    const ranch = (gp: typeof poor, level = 3) => walletOfferAt("pegasus-ranch", gp, level);

    it("is affordable only when savings and wallet together cover it", () => {
      expect(ranch(poor)?.status).toBe("for-sale");
      expect(canAffordWalletWare(ranch(poor), poor)).toBe(false);
      expect(walletWareShortBy(ranch(poor), poor)).toBe(10);
      expect(canAffordWalletWare(ranch(rich), rich)).toBe(true);
      expect(walletWareShortBy(ranch(rich), rich)).toBe(0);
    });

    it("follows the filter instead of showing under every choice", () => {
      expect(keepsWalletWare("all", ranch(poor), poor)).toBe(true);
      expect(keepsWalletWare("affordable", ranch(poor), poor)).toBe(false);
      expect(keepsWalletWare("out-of-budget", ranch(poor), poor)).toBe(true);
      expect(keepsWalletWare("affordable", ranch(rich), rich)).toBe(true);
      expect(keepsWalletWare("out-of-budget", ranch(rich), rich)).toBe(false);
    });

    it("counts a wallet locked to a higher level as one the hero can't buy yet", () => {
      const locked = walletOfferAt("pegasus-ranch", rich, 1);
      expect(locked?.status).toBe("locked");
      expect(keepsWalletWare("affordable", locked, rich)).toBe(false);
      expect(keepsWalletWare("out-of-budget", locked, rich)).toBe(true);
    });

    it("shows a wallet the hero already carries, or one that is not their next, under All only", () => {
      const carried = { limit: 1500, wallet: 0, savings: 0 };
      const owned = walletOfferAt("pegasus-ranch", carried, 3);
      const ahead = walletOfferAt("hermits-tent", poor, 3);
      expect(owned?.status).toBe("owned");
      expect(ahead?.status).toBe("ahead");
      for (const ware of [owned, ahead]) {
        expect(keepsWalletWare("all", ware, poor)).toBe(true);
        expect(keepsWalletWare("affordable", ware, poor)).toBe(false);
        expect(keepsWalletWare("out-of-budget", ware, poor)).toBe(false);
      }
    });

    it("keeps nothing at a shop that sells no wallet", () => {
      expect(keepsWalletWare("all", null, poor)).toBe(false);
    });
  });
});
