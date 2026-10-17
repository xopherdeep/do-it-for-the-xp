import { clampCashOutRate, MAX_CASH_OUT_RATE } from "@/lib/services/family/familySettings";

describe("a custom cash out rate", () => {
  it("is a whole number of GP per dollar, 1 to the maximum", () => {
    expect(clampCashOutRate("35")).toBe(35);
    expect(clampCashOutRate(12.6)).toBe(13);
    expect(clampCashOutRate(0)).toBe(1);
    expect(clampCashOutRate(-5)).toBe(1);
    expect(clampCashOutRate(999999)).toBe(MAX_CASH_OUT_RATE);
  });

  it("is nothing for what is not a number", () => {
    expect(clampCashOutRate("")).toBeNull();
    expect(clampCashOutRate(null)).toBeNull();
    expect(clampCashOutRate(undefined)).toBeNull();
    expect(clampCashOutRate("abc")).toBeNull();
  });
});
