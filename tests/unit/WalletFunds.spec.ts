import { borrowGp, creditLineOf, loanFee, loanRoom } from "@/lib/services/gp/wallet";
import { amountAsk, debtMenuPrompt } from "@/lib/services/gp/bankPrompts";
import { bankReceipt, bankRefusal } from "@/lib/services/gp/bankTeller";
import {
  MAX_GP_LEDGER,
  appendEntry,
  entriesIn,
  entryAmount,
  entryOf,
  groupByDay,
  inferKind,
  ledgerOf,
  ledgerTotals,
  purseDelta,
  rangeWindow,
  withEntry,
  type GpLedgerEntry,
} from "@/lib/services/gp/gpLedger";
import { cashOutName, cashOutQuote, cashValue, dollars } from "@/lib/services/gp/cashOut";
import { addRequest, heroName, removeRequest, requestsOf } from "@/lib/services/gp/gpGifts";
import { cashOutPrompt, cashOutRefusal, heroChoices } from "@/lib/services/gp/walletPrompts";

jest.mock("@/lib/store/stores/user", () => ({ useUserStore: jest.fn() }));
jest.mock("@/lib/databases/PurchaseLogDb", () => ({ getPurchaseLogDb: jest.fn() }));

const purse = (gp: Record<string, number>) => ({ wallet: 0, savings: 0, debt: 0, hospitalBill: 0, limit: 300, ...gp });

describe("loans", () => {
  it("lends up to half the wallet's size, counting the debt and the 10% fee", () => {
    expect(creditLineOf({ limit: 300 })).toBe(150);
    expect(loanFee(50)).toBe(5);
    expect(loanFee(4)).toBe(0);
    // 136 + 14 = 150: the most that fits the line
    expect(loanRoom(purse({ wallet: 0 }))).toBe(136);
    // the wallet's room caps it too
    expect(loanRoom(purse({ wallet: 280 }))).toBe(20);
    expect(loanRoom(purse({ debt: 150 }))).toBe(0);
  });

  it("will not lend while the Hospital is owed", () => {
    expect(loanRoom(purse({ hospitalBill: 10 }))).toBe(0);
    const move = borrowGp(purse({ hospitalBill: 10 }), 20);
    expect(move.amount).toBe(0);
    expect(bankRefusal("borrow", purse({ hospitalBill: 10 }), move)).toMatch(/Hospital/);
  });

  it("puts the loan in the wallet and the loan plus its fee on the debt", () => {
    const move = borrowGp(purse({ wallet: 50, debt: 0 }), 40);
    expect(move).toMatchObject({ amount: 40, capped: "none", gp: { wallet: 90, debt: 44 } });
    expect(bankReceipt("borrow", purse({ wallet: 50 }), move)).toContain("₲44");
  });

  it("lends only what the line allows and says so", () => {
    const move = borrowGp(purse({ wallet: 0, debt: 100 }), 100);
    expect(move.amount).toBe(45);
    expect(move.capped).toBe("credit");
    expect(bankReceipt("borrow", purse({ debt: 100 }), move)).toMatch(/all the bank will lend/);
  });

  it("asks how much with the stepper reaching the loan room, and offers paying only when something is owed", () => {
    const ask = amountAsk("borrow", purse({ wallet: 0 }));
    expect("prompt" in ask && ask.prompt.amount?.max).toBe(136);
    const free = debtMenuPrompt(purse({}));
    expect(free.choices.find((c) => c.id === "payDebt")?.disabled).toBe(true);
    const owing = debtMenuPrompt(purse({ debt: 5 }));
    expect(owing.choices.find((c) => c.id === "payDebt")?.disabled).toBe(false);
  });
});

describe("the GP history", () => {
  const at = new Date(2026, 9, 16, 12, 0);

  it("reads what moved, and the kind when the caller does not say", () => {
    const delta = purseDelta({ wallet: 10, savings: 5 }, { wallet: 0, savings: 15 });
    expect(delta).toEqual({ wallet: -10, savings: 10, debt: 0, bill: 0 });
    expect(inferKind(delta)).toBe("deposit");
    expect(inferKind(purseDelta({ wallet: 10 }, { wallet: 30 }))).toBe("earn");
    expect(inferKind(purseDelta({ wallet: 30 }, { wallet: 5 }))).toBe("spend");
    expect(inferKind(purseDelta({ wallet: 30, debt: 20 }, { wallet: 10, debt: 0 }))).toBe("payDebt");
    expect(inferKind(purseDelta({ wallet: 0 }, { wallet: 10, debt: 11 }))).toBe("borrow");
  });

  it("writes no line when nothing moved, and the caller's words when there are some", () => {
    expect(entryOf({ wallet: 5 }, { wallet: 5 })).toBeNull();
    const line = entryOf({ wallet: 5 }, { wallet: 25 }, { note: "Quest: Feed the cat" }, at);
    expect(line).toMatchObject({ kind: "earn", gp: 20, wallet: 20, note: "Quest: Feed the cat", at: at.toISOString() });
  });

  it("keeps the ledger from before, drops broken lines and keeps only the latest", () => {
    const after = withEntry({ wallet: 5, ledger: [{ junk: true }] } as any, { wallet: 9 }, {}, at);
    expect(after.ledger).toHaveLength(1);
    expect(ledgerOf({ ledger: "nope" })).toEqual([]);
    const full = Array.from({ length: MAX_GP_LEDGER }, (_, i) => entryOf({ wallet: 0 }, { wallet: i + 1 }, {}, at)!);
    const trimmed = appendEntry(full, entryOf({ wallet: 0 }, { wallet: 999 }, {}, at));
    expect(trimmed).toHaveLength(MAX_GP_LEDGER);
    expect(trimmed[trimmed.length - 1].gp).toBe(999);
  });

  it("filters by range, newest first, and totals what came in and went out", () => {
    const line = (iso: Date, gp: number, kind: GpLedgerEntry["kind"] = gp >= 0 ? "earn" : "spend"): GpLedgerEntry => ({
      id: `${iso.getTime()}`,
      at: iso.toISOString(),
      kind,
      gp,
      wallet: gp,
      savings: 0,
      debt: 0,
      bill: 0,
      note: "",
    });
    const ledger = [
      line(new Date(2026, 9, 1, 9), 50),
      line(new Date(2026, 9, 15, 9), -20),
      line(new Date(2026, 9, 16, 8), 10),
      line(new Date(2026, 9, 16, 9), 0, "deposit"),
    ];
    expect(entriesIn(ledger, "today", at).map((l) => l.gp)).toEqual([0, 10]);
    expect(entriesIn(ledger, "yesterday", at).map((l) => l.gp)).toEqual([-20]);
    expect(entriesIn(ledger, "month", at)).toHaveLength(4);
    expect(rangeWindow("all", at)).toBeNull();
    // Friday the 16th: the week began on Monday the 12th
    expect(rangeWindow("week", at)?.from).toEqual(new Date(2026, 9, 12));
    expect(ledgerTotals(ledger)).toEqual({ earned: 60, spent: 20, net: 40 });
    expect(groupByDay(entriesIn(ledger, "all", at), at).map((g) => g.day).slice(0, 2)).toEqual(["Today", "Yesterday"]);
  });

  it("shows a move between wallet and savings by what moved", () => {
    const deposit = entryOf({ wallet: 30, savings: 0 }, { wallet: 10, savings: 20 }, {}, at)!;
    expect(entryAmount(deposit)).toBe(20);
  });
});

describe("cash out", () => {
  const settings = { enabled: true, gpPerDollar: 10, heroIds: [] as string[] };

  it("prints the money and the log's name", () => {
    expect(dollars(5)).toBe("$5");
    expect(dollars(2.5)).toBe("$2.50");
    expect(cashValue(25, 10)).toBe(2.5);
    expect(cashOutName(50, 10)).toBe("Cash out: $5 (50 GP)");
  });

  it("steps a dollar's worth at a time up to the wallet in whole dollars", () => {
    expect(cashOutQuote({ wallet: 57 }, settings, "ava")).toEqual({ blocked: null, rate: 10, min: 10, max: 50, step: 10 });
    const prompt = cashOutPrompt(cashOutQuote({ wallet: 57 }, settings, "ava"));
    expect(prompt.amount).toMatchObject({ min: 10, max: 50, step: 10 });
    expect(prompt.amount?.presets?.every((p) => p.value % 10 === 0)).toBe(true);
  });

  it("refuses when switched off, not for this hero, or short of a dollar", () => {
    expect(cashOutQuote({ wallet: 57 }, { ...settings, enabled: false }, "ava").blocked).toBe("off");
    expect(cashOutQuote({ wallet: 57 }, { ...settings, heroIds: ["ben"] }, "ava").blocked).toBe("not-allowed");
    expect(cashOutQuote({ wallet: 57 }, { ...settings, heroIds: ["ava"] }, "ava").blocked).toBeNull();
    const short = cashOutQuote({ wallet: 9 }, settings, "ava");
    expect(short.blocked).toBe("short");
    expect(cashOutRefusal(short)).toMatch(/10 GP/);
  });
});

describe("send and request", () => {
  const ask = (id: string, fromId: string, amount = 5) => ({ id, fromId, amount, at: "2026-10-16T10:00:00.000Z" });

  it("keeps one open ask per hero, and drops broken ones", () => {
    const list = addRequest(addRequest([], ask("a", "mia")), ask("b", "mia", 9));
    expect(list).toEqual([ask("b", "mia", 9)]);
    expect(removeRequest(addRequest(list, ask("c", "ben")), "b")).toEqual([ask("c", "ben")]);
    expect(requestsOf({ requests: [ask("d", "ben"), { id: "x" }, null] })).toEqual([ask("d", "ben")]);
    expect(requestsOf(undefined)).toEqual([]);
  });

  it("names heroes by nickname and lists everyone else, heroes before Game Masters", () => {
    expect(heroName({ name: { nick: "Max", first: "Maxwell" } })).toBe("Max");
    expect(heroName({ name: { full: "Mia Power" } })).toBe("Mia");
    const choices = heroChoices(
      [
        { id: "gm", name: { nick: "Mom" }, isAdult: true },
        { id: "me", name: { nick: "Max" } },
        { id: "mia", name: { nick: "Mia" } },
      ],
      "me"
    );
    expect(choices.map((c) => c.id)).toEqual(["mia", "gm", "never"]);
    expect(choices[1].hint).toBe("Game Master");
  });
});
