import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";

/**
 * Late penalties already charged: one record per hero, chore and window (services/quests/lateRules.ts penaltyKeyOf), so
 * a penalty falls once however often the quest watch runs. Kept apart from the Quest Log on purpose: a log entry is a
 * completion, counts toward a chore's allowance and shows in the Approvals and the tamed counts; a penalty is none of those.
 */
export const latePenaltyStorage = new Storage({
  name: "__latePenalties",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface LatePenaltyRecord {
  heroId: string;
  questId: string;
  questName: string;
  /** ISO moment the chore's window closed */
  deadline: string;
  /** ISO moment the penalty was charged */
  chargedAt: string;
  /** What was really taken (after the caps) */
  xp: number;
  gp: number;
}

export class LatePenaltyLogDb extends DbStorageApi {
  public async getRecord(key: string): Promise<LatePenaltyRecord | null> {
    const stored = await this.get(key);
    return stored && typeof stored === "object" ? (stored as LatePenaltyRecord) : null;
  }

  public async saveRecord(key: string, record: LatePenaltyRecord): Promise<void> {
    await this.set(key, record);
  }
}

let instance: LatePenaltyLogDb | null = null;
export const getLatePenaltyLogDb = (): LatePenaltyLogDb => {
  if (!instance) instance = new LatePenaltyLogDb(latePenaltyStorage);
  return instance;
};

export default LatePenaltyLogDb;
