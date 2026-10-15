import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";
import type { CachedLicense } from "@/lib/services/pro/entitlement";

/** What this install knows about XP Pro: who the family is, which device this is, and the cached license. */
export interface ProState {
  familyId: string;
  deviceId: string;
  license: CachedLicense | null;
}

export const proStorage = new Storage({
  name: "__xp_pro",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

const RECORD_KEY = "pro";

export class ProDb extends DbStorageApi {
  public async getState(): Promise<ProState | null> {
    const stored = await this.get(RECORD_KEY);
    return stored && typeof stored === "object" ? (stored as ProState) : null;
  }

  public async saveState(state: ProState): Promise<void> {
    await this.set(RECORD_KEY, state);
  }
}

let instance: ProDb | null = null;
export const getProDb = (): ProDb => {
  if (!instance) instance = new ProDb(proStorage);
  return instance;
};

export default ProDb;
