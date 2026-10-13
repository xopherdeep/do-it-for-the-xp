import { BANKER, GOLD_APP, amountAsk, atmMenuPrompt, bankMenuChoices, bankMenuPrompt, noticePrompt, savingsMenuPrompt } from "@/lib/services/gp/bankPrompts";

const purse = (extra: object = {}) => ({ wallet: 120, savings: 300, debt: 0, hospitalBill: 0, limit: 500, ...extra });

describe("the banker's menu", () => {
  it("lists the old action sheet's choices in order, with Leave Bank last and dim", () => {
    const choices = bankMenuChoices(purse());
    expect(choices.map((choice) => choice.id)).toEqual(["atm", "withdraw", "deposit", "payDebt", "storage", "leave"]);
    expect(choices.map((choice) => choice.label)).toEqual([
      "Use ATM",
      "Withdraw from Savings",
      "Deposit to Savings",
      "Pay down Debt",
      "Storage",
      "Leave Bank",
    ]);
    expect(choices[5].tone).toBe("ghost");
  });

  it("gives every row an icon, not only the active one", () => {
    expect(bankMenuChoices(purse()).map((choice) => choice.icon)).toEqual([
      "hand-holding-usd",
      "wallet",
      "piggy-bank",
      "credit-card",
      "treasure-chest",
      "door-open",
    ]);
    expect(atmMenuPrompt(purse()).choices.every((choice) => Boolean(choice.icon))).toBe(true);
    expect(noticePrompt("Done.").choices.every((choice) => Boolean(choice.icon))).toBe(true);
  });

  it("swaps the debt card for the hospital while a bill is owed", () => {
    expect(bankMenuChoices(purse({ hospitalBill: 40 }))[3].icon).toBe("hospital");
    expect(atmMenuPrompt(purse({ hospitalBill: 40 })).choices[2].icon).toBe("hospital");
  });

  it("reads the pay-down row as the Hospital bill while one is owed", () => {
    expect(bankMenuChoices(purse({ hospitalBill: 40 }))[3].label).toBe("Pay Hospital Bill");
  });

  it("has the banker speak, then the menu, and Escape only steps away from the counter", () => {
    const prompt = bankMenuPrompt(["Welcome!"], purse());
    expect(prompt).toMatchObject({ speaker: BANKER, lines: ["Welcome!"], cancelId: "stay" });
    expect(prompt.choices.some((choice) => choice.id === "stay")).toBe(false);
  });

  it("gives the ATM its three money moves and a sign-off", () => {
    const prompt = atmMenuPrompt(purse());
    expect(prompt.choices.map((choice) => choice.id)).toEqual(["deposit", "withdraw", "payDebt", "leave"]);
    expect(prompt.sprite).toBe("coins");
    expect(prompt.cancelId).toBe("stay");
  });
});

describe("noticePrompt", () => {
  it("is one line and one OK, and Escape is OK too", () => {
    expect(noticePrompt("Done.", "coins")).toMatchObject({ speaker: BANKER, sprite: "coins", lines: ["Done."], cancelId: "ok" });
    expect(noticePrompt("Done.").choices).toEqual([{ id: "ok", label: "OK", icon: "check", tone: "primary" }]);
    expect(noticePrompt("Done.", undefined, "ATM").speaker).toBe("ATM");
  });
});

describe("amountAsk: how much, on the stepper", () => {
  const promptOf = (ask: ReturnType<typeof amountAsk>) => {
    if ("refusal" in ask) throw new Error(`refused: ${ask.refusal}`);
    return ask.prompt;
  };

  it("lets a deposit reach the whole wallet, with coins rising and presets", () => {
    const prompt = promptOf(amountAsk("deposit", purse()));
    expect(prompt.amount).toMatchObject({ min: 1, max: 120, step: 1 });
    expect(prompt.amount?.presets?.map((preset) => preset.label)).toEqual(["10", "50", "100", "All"]);
    expect(prompt.sprite).toBe("coins");
    expect(prompt.lines[0]).toContain("₲120");
    expect(prompt.choices.map((choice) => choice.label)).toEqual(["Deposit", "Never mind"]);
    expect(prompt.choices.map((choice) => choice.icon)).toEqual(["piggy-bank", "times"]);
    expect(prompt.cancelId).toBe("cancel");
  });

  it("stops a withdrawal at the room left in the wallet, not at the savings", () => {
    const prompt = promptOf(amountAsk("withdraw", purse({ wallet: 450, limit: 500, savings: 300 })));
    expect(prompt.amount?.max).toBe(50);
    expect(prompt.choices[0].label).toBe("Withdraw");
  });

  it("stops a withdrawal at the savings when the wallet has room for more", () => {
    expect(promptOf(amountAsk("withdraw", purse())).amount?.max).toBe(300);
  });

  it("stops a payment at the wallet or the debt, whichever is smaller", () => {
    expect(promptOf(amountAsk("payDebt", purse({ debt: 50 }))).amount?.max).toBe(50);
    expect(promptOf(amountAsk("payDebt", purse({ debt: 900 }))).amount?.max).toBe(120);
  });

  it("counts the Hospital bill with the debt, and names it", () => {
    const prompt = promptOf(amountAsk("payDebt", purse({ debt: 10, hospitalBill: 40 })));
    expect(prompt.amount?.max).toBe(50);
    expect(prompt.lines[0]).toContain("Hospital is owed ₲40");
    expect(promptOf(amountAsk("payDebt", purse({ debt: 10 }))).lines[0]).toContain("You owe ₲10");
  });

  it("gives the teller's reason instead when the move would move nothing", () => {
    expect(amountAsk("deposit", purse({ wallet: 0 }))).toEqual({ refusal: "Your wallet is empty! Nothing to deposit." });
    expect(amountAsk("withdraw", purse({ savings: 0 }))).toEqual({ refusal: "You have nothing saved. Your savings are empty!" });
    expect(amountAsk("withdraw", purse({ wallet: 500 }))).toEqual({ refusal: "Your wallet is full! It holds ₲500 at most." });
    expect(amountAsk("payDebt", purse())).toEqual({ refusal: "You owe nothing. Debt-free!" });
    expect(amountAsk("payDebt", purse({ debt: 40, wallet: 0 }))).toEqual({ refusal: "Your wallet is empty! Come back with some GP." });
  });
});

describe("the hero's own Gold app", () => {
  it("offers deposit or withdraw with the coins rising, in the bank's accent, and Escape is never mind", () => {
    const prompt = savingsMenuPrompt(purse());
    expect(prompt).toMatchObject({ speaker: GOLD_APP, accent: "bank", sprite: "coins", cancelId: "never" });
    expect(prompt.lines[0]).toBe("Savings: ₲300. Wallet: ₲120. What would you like to do?");
    expect(prompt.choices.map((choice) => [choice.id, choice.label, Boolean(choice.icon)])).toEqual([
      ["deposit", "Deposit to Savings", true],
      ["withdraw", "Withdraw from Savings", true],
      ["never", "Never mind", true],
    ]);
  });

  it("asks the same amount questions as the counter, in the app's own voice", () => {
    const ask = amountAsk("deposit", purse(), GOLD_APP);
    if ("refusal" in ask) throw new Error("expected a prompt");
    expect(ask.prompt).toMatchObject({ speaker: GOLD_APP, accent: "bank", sprite: "coins" });
    expect(ask.prompt.amount?.max).toBe(120);
    expect(noticePrompt("Done.", undefined, GOLD_APP)).toMatchObject({ speaker: GOLD_APP, accent: "atm" });
  });
});
