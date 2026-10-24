import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";
import type { ProjectTypeId } from "@/lib/services/core/packs/projects";
import type { ProjectRecord } from "@/lib/services/projects/projectRecord";

/**
 * The family's projects on disk: one record per run (see services/projects/projectRecord.ts), kept under its id. A
 * run that is cleared stays, so the next run of the same type can start from its chore list. Travels in a backup.
 */
export const projectStorage = new Storage({
  name: "__projects",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

/** A stored value that can be read as a record (older or damaged entries are left alone, never read) */
const isRecord = (value: unknown): value is ProjectRecord => {
  const isObject = typeof value === "object" && value !== null;
  const { id, status } = (isObject ? value : {}) as Partial<ProjectRecord>;
  const hasIdAndStatus = typeof id === "string" && typeof status === "string";
  return hasIdAndStatus;
};

/** Negative, zero or positive by plain character order: the stamps are ISO text, which sorts as time does */
const compareText = (a: string, b: string): number => Number(a > b) - Number(a < b);

/** The record with the latest stamp; a tie goes to the later id, so the answer never depends on the order they were stored in */
const newestBy = (records: readonly ProjectRecord[], stamp: (record: ProjectRecord) => string): ProjectRecord | null => {
  const latestFirst = [...records].sort((a, b) => {
    const byStamp = compareText(stamp(b), stamp(a));
    return byStamp !== 0 ? byStamp : compareText(b.id, a.id);
  });
  return latestFirst[0] ?? null;
};

export class ProjectDb extends DbStorageApi {
  public async getAll(): Promise<ProjectRecord[]> {
    const stored: unknown[] = await super.getAll();
    return stored.filter(isRecord);
  }

  /** The run in progress; if the store somehow holds two, the one that started last */
  public async getActive(): Promise<ProjectRecord | null> {
    const records = await this.getAll();
    return newestBy(records.filter((record) => record.status === "active"), (record) => record.startOn);
  }

  /** The latest cleared run of a type (by when it was cleared), for the next run to start from */
  public async lastOfType(typeId: ProjectTypeId): Promise<ProjectRecord | null> {
    const records = await this.getAll();
    const cleared = records.filter((record) => record.status === "cleared" && record.typeId === typeId);
    return newestBy(cleared, (record) => record.clearedAt ?? "");
  }

  public async save(record: ProjectRecord): Promise<void> {
    await this.set(record.id, record);
  }
}

let instance: ProjectDb | null = null;
export const getProjectDb = (): ProjectDb => {
  if (!instance) instance = new ProjectDb(projectStorage);
  return instance;
};

export default ProjectDb;
