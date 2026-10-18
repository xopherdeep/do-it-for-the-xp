import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";
import { readPhoneState, type HeroPhoneState } from "@/lib/services/multiplayer/phoneClaims";

/**
 * What a linked hero phone keeps for two-phone play (phoneClaims.ts): the claims waiting to be sent, the claims the hero
 * made here and their answers, the newest sheet from the family device, and how far it has read the server's events.
 *
 * Never added to BACKUP_STORES, like FamilyEventsDb: a restore must not resend old claims, and the game itself lives on
 * the family device.
 */
export const heroPhoneStorage = new Storage({
  name: "__xp_hero_phone",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

const RECORD_KEY = "state";

export class HeroPhoneDb extends DbStorageApi {
  public async getState(): Promise<HeroPhoneState> {
    return readPhoneState(await this.get(RECORD_KEY));
  }

  public async saveState(state: HeroPhoneState): Promise<void> {
    await this.set(RECORD_KEY, state);
  }

  /** The phone was unlinked and starts fresh: its claims and sheet go with the link */
  public async clearState(): Promise<void> {
    await this.remove(RECORD_KEY);
  }
}

let instance: HeroPhoneDb | null = null;
export const getHeroPhoneDb = (): HeroPhoneDb => {
  if (!instance) instance = new HeroPhoneDb(heroPhoneStorage);
  return instance;
};

export default HeroPhoneDb;
