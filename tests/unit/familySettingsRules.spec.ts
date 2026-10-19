import { DEFAULT_FAMILY_SETTINGS, loadFamilySettings } from "@/lib/services/family/familySettings";

let mockStored: Record<string, unknown> | null = null;
jest.mock("@/lib/databases/FamilySettingsDb", () => ({
  __esModule: true,
  getFamilySettingsDb: () => ({ getSettings: async () => mockStored, saveSettings: async () => undefined }),
}));

describe("The family rules built from Coming soon", () => {
  it("start with auto-save off, game items packed at once and the week on Monday", async () => {
    mockStored = null;
    const settings = await loadFamilySettings();
    expect(settings).toMatchObject({ autoSavePercent: 0, approveAllPurchases: false, weekStartsOn: 1 });
    expect(DEFAULT_FAMILY_SETTINGS.bedtime.enabled).toBe(false);
  });

  it("keep the choices the Game Master saved", async () => {
    mockStored = { autoSavePercent: 25, approveAllPurchases: true, weekStartsOn: 0, bedtime: { enabled: true, from: "20:30", to: "06:30" } };
    expect(await loadFamilySettings()).toMatchObject({
      autoSavePercent: 25,
      approveAllPurchases: true,
      weekStartsOn: 0,
      bedtime: { enabled: true, from: "20:30", to: "06:30" },
    });
  });

  it("turn a broken saved share or weekday back into the defaults", async () => {
    mockStored = { autoSavePercent: 33, weekStartsOn: 4, approveAllPurchases: "yes" };
    expect(await loadFamilySettings()).toMatchObject({ autoSavePercent: 0, weekStartsOn: 1, approveAllPurchases: false });
  });
});

describe("Cash out starts off until the Game Master agrees to real money", () => {
  it("is off on a fresh family and in the defaults", async () => {
    mockStored = null;
    expect(DEFAULT_FAMILY_SETTINGS.cashOut.enabled).toBe(false);
    expect((await loadFamilySettings()).cashOut).toMatchObject({ enabled: false, gpPerDollar: 10, heroIds: [] });
  });

  it("stays off in an older save that never said", async () => {
    mockStored = { streaks: true };
    expect((await loadFamilySettings()).cashOut.enabled).toBe(false);
    mockStored = { cashOut: { gpPerDollar: 20, heroIds: ["ava"] } };
    expect((await loadFamilySettings()).cashOut).toMatchObject({ enabled: false, gpPerDollar: 20, heroIds: ["ava"] });
  });

  it("keeps a stored true, and a stored false", async () => {
    mockStored = { cashOut: { enabled: true, gpPerDollar: 25 } };
    expect((await loadFamilySettings()).cashOut).toMatchObject({ enabled: true, gpPerDollar: 25 });
    mockStored = { cashOut: { enabled: false } };
    expect((await loadFamilySettings()).cashOut.enabled).toBe(false);
  });

  it("reads anything that is not a real true as off", async () => {
    mockStored = { cashOut: { enabled: "yes" } };
    expect((await loadFamilySettings()).cashOut.enabled).toBe(false);
  });
});

describe("Savings interest starts off and the Game Master picks the rate", () => {
  it("is off at 2 percent a week on a fresh family and in the defaults", async () => {
    mockStored = null;
    expect(DEFAULT_FAMILY_SETTINGS.savingsInterest).toEqual({ enabled: false, weeklyRatePercent: 2 });
    expect((await loadFamilySettings()).savingsInterest).toEqual({ enabled: false, weeklyRatePercent: 2 });
  });

  it("fills the rule into an older save that has none", async () => {
    mockStored = { autoSavePercent: 10 };
    expect((await loadFamilySettings()).savingsInterest).toEqual({ enabled: false, weeklyRatePercent: 2 });
  });

  it("keeps the choice the Game Master saved", async () => {
    mockStored = { savingsInterest: { enabled: true, weeklyRatePercent: 5 } };
    expect((await loadFamilySettings()).savingsInterest).toEqual({ enabled: true, weeklyRatePercent: 5 });
  });

  it("turns a broken rate back into the default and keeps the switch", async () => {
    mockStored = { savingsInterest: { enabled: true, weeklyRatePercent: "lots" } };
    expect((await loadFamilySettings()).savingsInterest).toEqual({ enabled: true, weeklyRatePercent: 2 });
    mockStored = { savingsInterest: { enabled: true, weeklyRatePercent: 400 } };
    expect((await loadFamilySettings()).savingsInterest.weeklyRatePercent).toBe(10);
  });
});
