import { bankReceipt, bankRefusal } from "@/lib/services/gp/bankTeller";
import { depositToSavings, payDownDebt, withdrawFromSavings } from "@/lib/services/gp/wallet";

describe("gold bank teller copy", () => {
  it("explains why nothing moved", () => {
    const full = { wallet: 100, savings: 50, debt: 0, limit: 100 };
    expect(bankRefusal("withdraw", full, withdrawFromSavings(full, 20))).toMatch(/wallet is full/i);
    const broke = { wallet: 0, savings: 0, debt: 0, limit: 100 };
    expect(bankRefusal("withdraw", broke, withdrawFromSavings(broke, 20))).toMatch(/nothing saved/i);
    expect(bankRefusal("deposit", broke, depositToSavings(broke, 20))).toMatch(/wallet is empty/i);
    expect(bankRefusal("payDebt", broke, payDownDebt(broke, 20))).toMatch(/owe nothing/i);
    const indebted = { wallet: 0, savings: 0, debt: 40, limit: 100 };
    expect(bankRefusal("payDebt", indebted, payDownDebt(indebted, 20))).toMatch(/wallet is empty/i);
  });

  it("is silent when GP moved", () => {
    const purse = { wallet: 20, savings: 50, debt: 0, limit: 100 };
    expect(bankRefusal("withdraw", purse, withdrawFromSavings(purse, 20))).toBeNull();
  });

  it("says how much the wallet still holds when a withdrawal is capped", () => {
    const purse = { wallet: 70, savings: 500, debt: 0, limit: 100 };
    const move = withdrawFromSavings(purse, 200);
    expect(move.amount).toBe(30);
    expect(bankReceipt("withdraw", purse, move)).toBe(
      "₲30 withdrawn. Wallet: ₲100 | Savings: ₲470. Your wallet only holds ₲30 more."
    );
  });

  it("writes a plain receipt when nothing was capped", () => {
    const purse = { wallet: 50, savings: 0, debt: 30, limit: 100 };
    expect(bankReceipt("deposit", purse, depositToSavings(purse, 20))).toBe("₲20 deposited. Wallet: ₲30 | Savings: ₲20.");
    expect(bankReceipt("payDebt", purse, payDownDebt(purse, 10))).toBe("₲10 paid. Wallet: ₲40 | Debt: ₲20.");
  });

  it("notes when a payment clears the debt or empties the wallet", () => {
    const purse = { wallet: 50, savings: 0, debt: 30, limit: 100 };
    expect(bankReceipt("payDebt", purse, payDownDebt(purse, 99))).toMatch(/clears your debt/i);
    expect(bankReceipt("deposit", purse, depositToSavings(purse, 99))).toMatch(/everything in your wallet/i);
  });
});
