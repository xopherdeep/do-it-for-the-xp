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
