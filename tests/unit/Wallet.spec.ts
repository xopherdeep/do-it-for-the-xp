import {
  buyWalletUpgrade,
  DEFAULT_WALLET_LIMIT,
  depositToSavings,
  nextWalletUpgrade,
  payDownDebt,
  WALLET_TIERS,
  walletLimitOf,
  withdrawFromSavings,
} from "@/lib/services/gp/wallet";

describe("wallet upgrades", () => {
  it("reads a missing or broken limit as the starting wallet", () => {
    expect(walletLimitOf(undefined)).toBe(DEFAULT_WALLET_LIMIT);
    expect(walletLimitOf({ limit: 0 })).toBe(DEFAULT_WALLET_LIMIT);
    expect(walletLimitOf({ limit: NaN })).toBe(DEFAULT_WALLET_LIMIT);
    expect(walletLimitOf({ limit: 1000 })).toBe(1000);
  });

  it("offers the next tier at half its size with its level, and nothing past the biggest", () => {
    expect(nextWalletUpgrade({ limit: 100 })).toEqual({ limit: 300, minLevel: 3, price: 150 });
    expect(nextWalletUpgrade({ limit: 1000 })).toEqual({ limit: 2500, minLevel: 15, price: 1250 });
    // an odd limit (an old profile) still steps up to the next tier above it
    expect(nextWalletUpgrade({ limit: 700 })).toEqual({ limit: 1000, minLevel: 10, price: 500 });
    expect(nextWalletUpgrade({ limit: WALLET_TIERS[WALLET_TIERS.length - 1].limit })).toBeNull();
  });

  it("pays from savings first, then the wallet", () => {
    const result = buyWalletUpgrade({ limit: 100, wallet: 80, savings: 100 }, 3);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.gp).toMatchObject({ limit: 300, savings: 0, wallet: 30 });
  });

  it("leaves the wallet alone when savings cover it, and keeps the debt", () => {
    const result = buyWalletUpgrade({ limit: 100, wallet: 50, savings: 400, debt: 10 }, 5);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.gp).toEqual({ limit: 300, savings: 250, wallet: 50, debt: 10 });
  });

  it("is locked under the tier's level, like Majora's Mask", () => {
    expect(buyWalletUpgrade({ limit: 100, wallet: 500, savings: 500 }, 2)).toMatchObject({ ok: false, reason: "locked" });
    expect(buyWalletUpgrade({ limit: 100, wallet: 500, savings: 500 }, 3).ok).toBe(true);
  });

  it("refuses when the hero is short, and says by how much", () => {
    expect(buyWalletUpgrade({ limit: 100, wallet: 20, savings: 30 }, 9)).toMatchObject({ ok: false, reason: "poor", short: 100 });
  });

  it("refuses at the biggest wallet", () => {
    expect(buyWalletUpgrade({ limit: 10000, wallet: 9999, savings: 99999 }, 99)).toMatchObject({ ok: false, reason: "maxed" });
  });
});

describe("bank moves", () => {
  it("never withdraws past the wallet limit", () => {
    const move = withdrawFromSavings({ limit: 100, wallet: 80, savings: 500 }, 90);
    expect(move).toMatchObject({ amount: 20, capped: "wallet-full" });
    expect(move.gp).toMatchObject({ wallet: 100, savings: 480 });
  });

  it("never withdraws more than is saved", () => {
    const move = withdrawFromSavings({ limit: 1000, wallet: 0, savings: 30 }, 90);
    expect(move).toMatchObject({ amount: 30, capped: "savings" });
  });

  it("deposits only what the wallet holds", () => {
    expect(depositToSavings({ limit: 100, wallet: 40, savings: 0 }, 75)).toMatchObject({ amount: 40, capped: "wallet" });
    expect(depositToSavings({ limit: 100, wallet: 40, savings: 0 }, 25).gp).toMatchObject({ wallet: 15, savings: 25 });
  });

  it("pays debt only as far as the wallet and the debt go", () => {
    expect(payDownDebt({ wallet: 50, debt: 20 }, 50)).toMatchObject({ amount: 20, capped: "debt" });
    expect(payDownDebt({ wallet: 10, debt: 20 }, 50)).toMatchObject({ amount: 10, capped: "wallet" });
    expect(payDownDebt({ wallet: 50, debt: 20 }, 5).gp).toMatchObject({ wallet: 45, debt: 15 });
  });

  it("treats garbage amounts as nothing", () => {
    expect(withdrawFromSavings({ limit: 100, wallet: 0, savings: 50 }, NaN).amount).toBe(0);
    expect(depositToSavings({ wallet: 50 }, -10).amount).toBe(0);
  });
});
