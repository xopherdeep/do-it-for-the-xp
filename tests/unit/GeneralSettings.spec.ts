import { reactive } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import GeneralSettings from "@/app/SideMenu/XpSettings/components/GeneralSettings.vue";

const mockFamily = reactive({ isKidMode: false });
jest.mock("@/lib/store/stores/family", () => ({ __esModule: true, useFamilyStore: () => mockFamily }));

jest.mock("@/lib/store/stores/gameRules", () => ({
  __esModule: true,
  useGameRulesStore: () => ({ load: jest.fn(), weekStartsOn: 1, setWeekStartsOn: jest.fn() }),
}));
jest.mock("@/hooks/useBackupRestore", () => ({
  __esModule: true,
  useBackupRestore: () => ({ isBackupBusy: false, runWithLoading: jest.fn(), selectRestoreFile: jest.fn() }),
}));
jest.mock("@/lib/services/core/BackupService", () => ({ __esModule: true, default: { exportAll: jest.fn() } }));

const open = async () => {
  const wrapper = mount(GeneralSettings, { global: { stubs: { "xp-back-button": true, "xp-coming-soon-card": true } } });
  await flushPromises();
  return wrapper;
};

describe("Settings, General", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockFamily.isKidMode = false;
  });

  it("offers Backup & Restore on a device that is not a kid phone", async () => {
    const text = (await open()).text();

    expect(text).toContain("Back up everything");
    expect(text).toContain("Restore from backup");
    expect(text).toContain("Landing page");
  });

  it("keeps the Backup & Restore card, and the note about backing up, off a kid phone", async () => {
    mockFamily.isKidMode = true;
    const text = (await open()).text();

    expect(text).not.toMatch(/back up|backup|restore/i);
    expect(text).toContain("Helper dialogs");
    expect(text).toContain("Landing page");
  });
});
