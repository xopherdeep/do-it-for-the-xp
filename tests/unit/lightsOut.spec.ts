import { isLightsOut, wakeUpLine, type LightsOutInput } from "@/lib/services/family/lightsOut";
import { BEDTIME_CLOCKS, clockLabel } from "@/lib/services/family/familySettings";

const at = (hours: number, minutes = 0) => new Date(2026, 9, 18, hours, minutes);

const hero = (now: Date, change: Partial<LightsOutInput> = {}): LightsOutInput => ({
  bedtime: { enabled: true, from: "21:00", to: "07:00" },
  now,
  signedIn: true,
  canManage: false,
  isPublicScreen: false,
  inBattle: false,
  ...change,
});

describe("Lights out", () => {
  it("puts a hero's screens to sleep between the two clocks, past midnight too", () => {
    expect(isLightsOut(hero(at(21, 0)))).toBe(true);
    expect(isLightsOut(hero(at(2, 30)))).toBe(true);
    expect(isLightsOut(hero(at(7, 0)))).toBe(false);
    expect(isLightsOut(hero(at(20, 59)))).toBe(false);
  });

  it("does nothing while the bedtime is off", () => {
    expect(isLightsOut(hero(at(23), { bedtime: { enabled: false, from: "21:00", to: "07:00" } }))).toBe(false);
  });

  it("never puts a Game Master to bed", () => {
    expect(isLightsOut(hero(at(23), { canManage: true }))).toBe(false);
  });

  it("lets a running fight finish and keeps the profile chooser open", () => {
    expect(isLightsOut(hero(at(23), { inBattle: true }))).toBe(false);
    expect(isLightsOut(hero(at(23), { isPublicScreen: true }))).toBe(false);
    expect(isLightsOut(hero(at(23), { signedIn: false }))).toBe(false);
  });

  it("says when the portal opens again", () => {
    expect(wakeUpLine({ enabled: true, from: "21:00", to: "07:30" })).toBe("The portal opens again at 7:30 AM.");
  });

  it("offers every half hour on a 12-hour clock face", () => {
    expect(BEDTIME_CLOCKS).toHaveLength(48);
    expect(clockLabel("00:00")).toBe("12:00 AM");
    expect(clockLabel("12:30")).toBe("12:30 PM");
    expect(clockLabel("21:00")).toBe("9:00 PM");
  });
});
