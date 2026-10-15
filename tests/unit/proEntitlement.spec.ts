import { isPro, needsRecheck, CachedLicense } from "@/lib/services/pro/entitlement";

const NOW = new Date("2026-11-01T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600000).toISOString();
const daysAhead = (d: number) => new Date(NOW.getTime() + d * 86400000).toISOString();

const lic = (over: Partial<CachedLicense> = {}): CachedLicense => ({
  key: "XP-PRO-AAAA-BBBB-CCCC",
  plan: "yearly",
  expiresAt: daysAhead(10),
  env: "production",
  pro: true,
  lastValidatedAt: hoursAgo(1),
  ...over,
});

describe("isPro", () => {
  it("is false with no license", () => {
    expect(isPro(null, NOW, true)).toBe(false);
  });
  it("lifetime is Pro", () => {
    expect(isPro(lic({ plan: "lifetime", expiresAt: null }), NOW, true)).toBe(true);
  });
  it("active inside the expiry is Pro", () => {
    expect(isPro(lic(), NOW, true)).toBe(true);
  });
  it("is Pro on day 2 after expiry and not on day 4", () => {
    expect(isPro(lic({ expiresAt: daysAgo(2) }), NOW, true)).toBe(true);
    expect(isPro(lic({ expiresAt: daysAgo(4) }), NOW, true)).toBe(false);
  });
  it("is not Pro 31 days after lastValidatedAt", () => {
    expect(isPro(lic({ expiresAt: null, lastValidatedAt: daysAgo(31) }), NOW, true)).toBe(false);
    expect(isPro(lic({ expiresAt: null, lastValidatedAt: daysAgo(29) }), NOW, true)).toBe(true);
  });
  it("pro:false is never Pro", () => {
    expect(isPro(lic({ pro: false }), NOW, false)).toBe(false);
  });
  it("sandbox is Pro in a dev build and not in a production build", () => {
    expect(isPro(lic({ env: "sandbox" }), NOW, false)).toBe(true);
    expect(isPro(lic({ env: "sandbox" }), NOW, true)).toBe(false);
  });
  it("a lastValidatedAt in the future is not Pro", () => {
    expect(isPro(lic({ lastValidatedAt: daysAhead(5) }), NOW, true)).toBe(false);
  });
});

describe("needsRecheck", () => {
  it("is true with no license", () => {
    expect(needsRecheck(null, NOW)).toBe(true);
  });
  it("is true 25 hours after a check", () => {
    expect(needsRecheck(lic({ lastValidatedAt: hoursAgo(25) }), NOW)).toBe(true);
  });
  it("is true once expiresAt has passed", () => {
    expect(needsRecheck(lic({ expiresAt: daysAgo(1) }), NOW)).toBe(true);
  });
  it("is true when lastValidatedAt is in the future (clock set back)", () => {
    expect(needsRecheck(lic({ lastValidatedAt: daysAhead(3) }), NOW)).toBe(true);
  });
  it("is false 1 hour after a check", () => {
    expect(needsRecheck(lic({ lastValidatedAt: hoursAgo(1) }), NOW)).toBe(false);
  });
});
