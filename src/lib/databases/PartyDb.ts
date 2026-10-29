import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";
import type { PartyState } from "@/lib/services/party/partyState";

/**
 * What this device keeps about parties (see PartyState). Device-local on purpose: it is not one of the backup stores, so
 * Family Sync does not carry it (household raids across devices wait for that).
 */
export const partyStorage = new Storage({
  name: "__xp_party",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

const RECORD_KEY = "party";

export class PartyDb extends DbStorageApi {
  /** The saved record as it was written; the caller checks its shape (cleanPartyState) */
  public async getState(): Promise<unknown> {
    return this.get(RECORD_KEY);
  }

  public async saveState(state: PartyState): Promise<void> {
    await this.set(RECORD_KEY, state);
  }
}

let instance: PartyDb | null = null;
export const getPartyDb = (): PartyDb => {
  if (!instance) instance = new PartyDb(partyStorage);
  return instance;
};

export default PartyDb;
