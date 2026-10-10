import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";
import type { FamilySettings } from "@/lib/services/family/familySettings";

/**
 * The Game Master's family-wide switches on disk: one record (see services/family/familySettings.ts),
 * the way NotificationsDb keeps a hero's feed. Read it through `loadFamilySettings`, which fills the gaps.
 */
export const familySettingsStorage = new Storage({
  name: "__family_settings",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

const RECORD_KEY = "family";

export class FamilySettingsDb extends DbStorageApi {
  public async getSettings(): Promise<Partial<FamilySettings> | null> {
    const stored = await this.get(RECORD_KEY);
    return stored && typeof stored === "object" ? (stored as Partial<FamilySettings>) : null;
  }

  public async saveSettings(settings: FamilySettings): Promise<void> {
    await this.set(RECORD_KEY, settings);
  }
}

let instance: FamilySettingsDb | null = null;
export const getFamilySettingsDb = (): FamilySettingsDb => {
  if (!instance) instance = new FamilySettingsDb(familySettingsStorage);
  return instance;
};

export default FamilySettingsDb;
