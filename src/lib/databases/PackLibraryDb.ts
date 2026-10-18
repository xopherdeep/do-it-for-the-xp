import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";
import type { XpPack } from "@/lib/services/core/packs/packFormat";
import type { PackDetails } from "@/lib/services/core/packs/packExport";

/**
 * The packs this family added from a file or the Town Hall (the built-ins live in the app), and what the Game Master
 * called the family's own pack the last time it was saved, so saving it again keeps its id.
 *
 * It is in BACKUP_STORES: a restored backup brings back the records of an added pack, and the pack has to come back
 * with them, or its records would read as the family's own.
 */
export const packLibraryStorage = new Storage({
  name: "__packs",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

const ADDED_KEY = "added";
const OWN_KEY = "own";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export class PackLibraryDb extends DbStorageApi {
  public async getAdded(): Promise<XpPack[]> {
    const stored = await this.get(ADDED_KEY);
    return Array.isArray(stored) ? (stored.filter(isRecord) as unknown as XpPack[]) : [];
  }

  public async saveAdded(packs: readonly XpPack[]): Promise<void> {
    await this.set(ADDED_KEY, packs);
  }

  public async getOwnDetails(): Promise<PackDetails | null> {
    const stored = await this.get(OWN_KEY);
    return isRecord(stored) && typeof stored.name === "string" ? (stored as unknown as PackDetails) : null;
  }

  public async saveOwnDetails(details: PackDetails): Promise<void> {
    await this.set(OWN_KEY, details);
  }
}

let instance: PackLibraryDb | null = null;
export const getPackLibraryDb = (): PackLibraryDb => {
  if (!instance) instance = new PackLibraryDb(packLibraryStorage);
  return instance;
};

export default PackLibraryDb;
