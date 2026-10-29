import { GP_PER_DOLLAR, gpForDollars } from "@/lib/services/gp/exchangeRate";

describe("exchangeRate", () => {
  it("is one cent per GP", () => {
    expect(GP_PER_DOLLAR).toBe(100);
  });

  it("prices dollars at the family rate", () => {
    expect(gpForDollars(4)).toBe(400);
    expect(gpForDollars(1.5)).toBe(150);
    expect(gpForDollars(6)).toBe(600);
    expect(gpForDollars(25)).toBe(2500);
    expect(gpForDollars(150)).toBe(15000);
    expect(gpForDollars(0.75)).toBe(75);
    expect(gpForDollars(0)).toBe(0);
  });

  it("honours a custom rate", () => {
    expect(gpForDollars(60, 10)).toBe(600);
  });

  it("rounds to 25 below 500 and to 50 from 500", () => {
    expect(gpForDollars(1.1)).toBe(100);
    expect(gpForDollars(1.14)).toBe(125);
    expect(gpForDollars(4.8)).toBe(475);
    expect(gpForDollars(5.2)).toBe(500);
    expect(gpForDollars(5.3)).toBe(550);
    expect(gpForDollars(5.24)).toBe(500);
  });

  it("returns 0 for bad input", () => {
    expect(gpForDollars(-3)).toBe(0);
    expect(gpForDollars(NaN)).toBe(0);
    expect(gpForDollars(Infinity)).toBe(0);
  });
});
