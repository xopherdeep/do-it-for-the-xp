import {
  DEFAULT_SAVINGS_INTEREST,
  SAVINGS_INTEREST_RATES,
  interestDueFor,
  interestNote,
  interestOf,
  normalizeInterestRate,
  normalizeSavingsInterest,
  weekKeyOf,
} from "@/lib/services/gp/savingsInterest";
import { interestGreeting } from "@/lib/services/gp/bankTeller";

// 2026-10-18 is a Sunday, so with Monday weeks it belongs to the week of 2026-10-12
const sunday = new Date(2026, 9, 18, 12);
const monday = new Date(2026, 9, 19, 9);
const on = { enabled: true, weeklyRatePercent: 2 };

describe("Savings interest: the settings", () => {
  it("starts off at 2 percent a week", () => {
    expect(DEFAULT_SAVINGS_INTEREST).toEqual({ enabled: false, weeklyRatePercent: 2 });
    expect(normalizeSavingsInterest(undefined)).toEqual({ enabled: false, weeklyRatePercent: 2 });
    expect(normalizeSavingsInterest(null)).toEqual({ enabled: false, weeklyRatePercent: 2 });
  });

  it("is only on when the Game Master saved a true", () => {
    expect(normalizeSavingsInterest({ enabled: true }).enabled).toBe(true);
    expect(normalizeSavingsInterest({ enabled: "yes" as unknown as boolean }).enabled).toBe(false);
    expect(normalizeSavingsInterest({ weeklyRatePercent: 5 }).enabled).toBe(false);
  });

  it("offers steps from half a percent to ten", () => {
    expect(SAVINGS_INTEREST_RATES[0]).toBe(0.5);
    expect(SAVINGS_INTEREST_RATES[SAVINGS_INTEREST_RATES.length - 1]).toBe(10);
    expect(SAVINGS_INTEREST_RATES).toContain(2);
  });

  it("keeps a saved rate, clamps it into range and rounds it to a half step", () => {
    expect(normalizeInterestRate(5)).toBe(5);
    expect(normalizeInterestRate("7.5")).toBe(7.5);
    expect(normalizeInterestRate(25)).toBe(10);
    expect(normalizeInterestRate(0.1)).toBe(0.5);
    expect(normalizeInterestRate(3.3)).toBe(3.5);
  });

  it("turns a broken rate back into the default", () => {
    expect(normalizeInterestRate("abc")).toBe(2);
    expect(normalizeInterestRate(null)).toBe(2);
    expect(normalizeInterestRate(undefined)).toBe(2);
    expect(normalizeInterestRate(0)).toBe(2);
    expect(normalizeInterestRate(-3)).toBe(2);
    expect(normalizeInterestRate(NaN)).toBe(2);
  });
});

describe("Savings interest: the maths", () => {
  it("pays the rate on the balance, rounded down", () => {
    expect(interestOf(100, 2)).toBe(2);
    expect(interestOf(150, 2)).toBe(3);
    expect(interestOf(199, 2)).toBe(3);
    expect(interestOf(1000, 7.5)).toBe(75);
    expect(interestOf(333, 10)).toBe(33);
  });

  it("pays nothing on a balance too small to earn a whole GP", () => {
    expect(interestOf(49, 2)).toBe(0);
    expect(interestOf(100, 0.5)).toBe(0);
    expect(interestOf(200, 0.5)).toBe(1);
  });

  it("pays nothing on an empty, negative or broken balance", () => {
    expect(interestOf(0, 5)).toBe(0);
    expect(interestOf(-40, 5)).toBe(0);
    expect(interestOf(NaN, 5)).toBe(0);
    expect(interestOf(undefined as unknown as number, 5)).toBe(0);
  });

  it("writes the ledger note", () => {
    expect(interestNote(3)).toBe("Bank interest: +3 GP");
  });
});

describe("Savings interest: the week", () => {
  it("is named by the first day of the calendar week", () => {
    expect(weekKeyOf(sunday, 1)).toBe("2026-10-12");
    expect(weekKeyOf(monday, 1)).toBe("2026-10-19");
  });

  it("follows the family's first day of the week", () => {
    expect(weekKeyOf(sunday, 0)).toBe("2026-10-18");
    expect(weekKeyOf(monday, 0)).toBe("2026-10-18");
  });

  it("is the same key all week long", () => {
    const early = new Date(2026, 9, 12, 0, 5);
    const late = new Date(2026, 9, 18, 23, 55);
    expect(weekKeyOf(early, 1)).toBe(weekKeyOf(late, 1));
  });
});

describe("Savings interest: what is due", () => {
  it("is nothing while the Game Master has it off", () => {
    const off = { enabled: false, weeklyRatePercent: 5 };
    expect(interestDueFor({ rules: off, savings: 500, paidWeek: null, now: sunday, weekStartsOn: 1 })).toBeNull();
  });

  it("pays the first time a week is seen", () => {
    const due = interestDueFor({ rules: on, savings: 150, paidWeek: null, now: sunday, weekStartsOn: 1 });
    expect(due).toEqual({ week: "2026-10-12", gp: 3 });
  });

  it("never pays twice for the same week", () => {
    const due = interestDueFor({ rules: on, savings: 150, paidWeek: "2026-10-12", now: sunday, weekStartsOn: 1 });
    expect(due).toBeNull();
  });

  it("pays again when a new week begins", () => {
    const due = interestDueFor({ rules: on, savings: 153, paidWeek: "2026-10-12", now: monday, weekStartsOn: 1 });
    expect(due).toEqual({ week: "2026-10-19", gp: 3 });
  });

  it("is still due (and worth 0 GP) when the balance is too small, so the week is spent", () => {
    const due = interestDueFor({ rules: on, savings: 10, paidWeek: null, now: sunday, weekStartsOn: 1 });
    expect(due).toEqual({ week: "2026-10-12", gp: 0 });
  });

  it("reads a broken paid week as never paid", () => {
    const due = interestDueFor({ rules: on, savings: 100, paidWeek: 42 as unknown as string, now: sunday, weekStartsOn: 1 });
    expect(due).toEqual({ week: "2026-10-12", gp: 2 });
  });
});

describe("Savings interest: the teller", () => {
  it("says nothing about interest while it is off", () => {
    expect(interestGreeting({ enabled: false, weeklyRatePercent: 2 }, "adventure")).toBeNull();
  });

  it("names the weekly rate when it is on, in each voice", () => {
    const rules = { enabled: true, weeklyRatePercent: 5 };
    expect(interestGreeting(rules, "simple")).toMatch(/5%/);
    expect(interestGreeting(rules, "adventure")).toMatch(/5%/);
    expect(interestGreeting(rules, "classic")).toMatch(/5%/);
  });

  it("keeps the simple voice short and free of em dashes", () => {
    const rules = { enabled: true, weeklyRatePercent: 7.5 };
    const simple = interestGreeting(rules, "simple") as string;
    expect(simple.split(/\s+/).length).toBeLessThanOrEqual(10);
    for (const voice of ["simple", "adventure", "classic"] as const) {
      expect(interestGreeting(rules, voice)).not.toMatch(/—/);
    }
  });
});
