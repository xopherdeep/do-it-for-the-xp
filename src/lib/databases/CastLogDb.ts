import { v4 as uuidv4 } from "uuid";
import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";

/**
 * Cast Log: one record per time a hero casts a Power.
 * Casts are remembered per hero, so one hero's cast never cools the Power for another hero.
 * The Power records stay pure definitions; the cooldown reads this log (see heroAbilityStatus).
 */
export const castLogStorage = new Storage({
  name: "__castLog",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface CastLogEntry {
  id: string;
  userId: string;
  abilityId: string;
  /** Copied at cast time so the log still reads right if the Power is renamed or deleted later */
  abilityName: string;
  abilityType: "real-life" | "in-game";
  /** ISO timestamp of when the hero cast it */
  castAt: string;
  /** MP the hero paid for the cast */
  mpPaid: number;
}

export type NewCastLogEntry = Pick<CastLogEntry, "userId" | "abilityId" | "abilityName" | "abilityType" | "mpPaid"> &
  Partial<Pick<CastLogEntry, "id" | "castAt">>;

const newestFirst = (a: CastLogEntry, b: CastLogEntry): number => b.castAt.localeCompare(a.castAt);

/** The newest cast of each Power in `entries` (ability id to ISO timestamp). Entries with an unreadable date are skipped. */
export const lastCastsOf = (entries: CastLogEntry[]): Record<string, string> => {
  const newest: Record<string, string> = {};
  const newestTime: Record<string, number> = {};
  for (const entry of entries) {
    const time = new Date(entry?.castAt).getTime();
    const isUnusableEntry = !entry?.abilityId || Number.isNaN(time);
    if (isUnusableEntry) continue;
    const hasNewerCast = newestTime[entry.abilityId] !== undefined && newestTime[entry.abilityId] >= time;
    if (hasNewerCast) continue;
    newestTime[entry.abilityId] = time;
    newest[entry.abilityId] = entry.castAt;
  }
  return newest;
};

export class CastLogDb extends DbStorageApi {
  public async logCast(input: NewCastLogEntry): Promise<CastLogEntry> {
    const entry: CastLogEntry = {
      id: input.id || uuidv4(),
      userId: input.userId,
      abilityId: input.abilityId,
      abilityName: input.abilityName,
      abilityType: input.abilityType,
      castAt: input.castAt || new Date().toISOString(),
      mpPaid: input.mpPaid,
    };
    await this.set(entry.id, entry);
    return entry;
  }

  public async getEntry(id: string): Promise<CastLogEntry | null> {
    return ((await this.get(id)) as CastLogEntry | null) || null;
  }

  /** Every cast, newest first */
  public async getAll(): Promise<CastLogEntry[]> {
    const entries = (await super.getAll()) as CastLogEntry[];
    return entries.filter(Boolean).sort(newestFirst);
  }

  /** One hero's casts, newest first */
  public async getForHero(userId: string): Promise<CastLogEntry[]> {
    return (await this.getAll()).filter((entry) => entry.userId === userId);
  }

  /** One hero's casts of one Power, newest first */
  public async getForHeroAndPower(userId: string, abilityId: string): Promise<CastLogEntry[]> {
    return (await this.getForHero(userId)).filter((entry) => entry.abilityId === abilityId);
  }
}

let castLogDb: CastLogDb | null = null;

export const getCastLogDb = (): CastLogDb => {
  if (!castLogDb) castLogDb = new CastLogDb(castLogStorage);
  return castLogDb;
};

export default CastLogDb;
