import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";
import type { HeroCard } from "@/lib/services/multiplayer/heroCard";

/**
 * Storage for a kid phone's linking key and registered device info (multiplayer, MP14).
 * Never added to BACKUP_STORES: a backup file must never carry a hero key.
 */
export const heroDeviceStorage = new Storage({
  name: "__xp_hero_device",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface HeroDevice {
  siteUrl: string;
  familyId: string;
  heroId: string;
  deviceId: string;
  key: string;
  label: string;
  linkedAt: number;
  card: HeroCard | null;
  unlinked?: boolean;
}

const RECORD_KEY = "device";

export class HeroDeviceDb extends DbStorageApi {
  public async getDevice(): Promise<HeroDevice | null> {
    const stored = await this.get(RECORD_KEY);
    return (stored as HeroDevice) ?? null;
  }

  public async saveDevice(device: HeroDevice): Promise<void> {
    await this.set(RECORD_KEY, device);
  }

  public async clearDevice(): Promise<void> {
    await this.remove(RECORD_KEY);
  }
}

let instance: HeroDeviceDb | null = null;
export const getHeroDeviceDb = (): HeroDeviceDb => {
  if (!instance) instance = new HeroDeviceDb(heroDeviceStorage);
  return instance;
};

export default HeroDeviceDb;
