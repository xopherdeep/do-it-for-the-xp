import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";

/**
 * Temple progress: one record per hero per temple, so a reload picks a run up where it stopped.
 * It holds what the hero did (rooms visited and won, keys, map, compass, where they stand).
 * What the temple is made of (chests, doors, fights) belongs to the layout in TempleDb.
 */
export const templeProgressStorage = new Storage({
  name: "__templeProgress",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface TempleProgressEntry {
  userId: string;
  templeId: string;
  /** Floor the hero stands on, e.g. "1F" */
  currentLevel: string;
  /** [row, col] of the room the hero stands in, on currentLevel */
  currentPosition: [number, number];
  hasMap: boolean;
  hasCompass: boolean;
  playerKeys: number;
  /** Rooms the hero has been in, as `${level}:${row},${col}` */
  visitedRooms: string[];
  /** Combat rooms the hero has won, as `${level}:${row},${col}` */
  clearedRooms: string[];
  /** The master key is in hand this run (it is not spent on the boss door; a blood moon forgets it) */
  hasMasterKey: boolean;
  /** Doors opened this run, as `${level}:${row},${col}>${direction}` of the room the hero stood in */
  openedDoors: string[];
  /** Rooms whose one thing was taken this run (a chest of consumables, a key, map or compass, the secret chest, a find, a riddle solved), as `${level}:${row},${col}`; a blood moon gives them back */
  openedChests: string[];
  /** Items taken from chests that still hold others, as `${level}:${row},${col}>${item}`; a blood moon refills them */
  takenFromChests?: string[];
  /** Key items the temple handed out (the temple's tool, the Pegasus); kept across blood moons */
  keyItems: string[];
  /** How often the hero opened the gate of this temple */
  timesCleared: number;
  /** How often the blood moon reset this temple for the hero */
  bloodMoons: number;
  /** ISO time the Game Master scheduled the next blood moon for; the reset fires at the hero's first entry after it */
  bloodMoonAt?: string;
  /** The Game Master's cadence: a due moon that fires re-schedules itself a week later (TempleSystem.loadProgress) */
  bloodMoonEvery?: "weekly";
  /** ISO timestamp of the last save */
  updatedAt: string;
}

/** What a save needs from the caller: the entry without its timestamp, which the save stamps. */
export type NewTempleProgress = Omit<TempleProgressEntry, "updatedAt">;

/** Storage key of a hero's progress in one temple. */
export const templeProgressKey = (userId: string, templeId: string): string => `${userId}:${templeId}`;

const toCoordinate = (value: unknown): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;

const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const toCount = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

/** The one cadence there is, or undefined for anything else */
const toCadence = (value: unknown): "weekly" | undefined => (value === "weekly" ? "weekly" : undefined);

/** An ISO time, or undefined for anything that is not a date */
const toIsoTime = (value: unknown): string | undefined =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : undefined;

/**
 * Read a stored record as an entry. Anything missing or malformed falls back to a fresh run's value
 * instead of throwing, so one damaged field cannot lock a hero out of a temple.
 * @returns null when the record is not a progress entry at all
 */
export const toTempleProgress = (raw: unknown): TempleProgressEntry | null => {
  const isNotARecord = !raw || typeof raw !== "object";
  if (isNotARecord) return null;
  const data = raw as Record<string, unknown>;
  const { userId, templeId } = data;
  const isMissingIds = typeof userId !== "string" || typeof templeId !== "string";
  if (isMissingIds) return null;

  const position = Array.isArray(data.currentPosition) ? data.currentPosition : [];
  const bloodMoonAt = toIsoTime(data.bloodMoonAt);
  const bloodMoonEvery = toCadence(data.bloodMoonEvery);
  const takenFromChests = toStringList(data.takenFromChests);

  return {
    userId,
    templeId,
    currentLevel: typeof data.currentLevel === "string" && data.currentLevel ? data.currentLevel : "1F",
    currentPosition: [toCoordinate(position[0]), toCoordinate(position[1])],
    hasMap: data.hasMap === true,
    hasCompass: data.hasCompass === true,
    playerKeys: toCount(data.playerKeys),
    visitedRooms: toStringList(data.visitedRooms),
    clearedRooms: toStringList(data.clearedRooms),
    hasMasterKey: data.hasMasterKey === true,
    openedDoors: toStringList(data.openedDoors),
    openedChests: toStringList(data.openedChests),
    ...(takenFromChests.length ? { takenFromChests } : {}),
    keyItems: toStringList(data.keyItems),
    timesCleared: toCount(data.timesCleared),
    bloodMoons: toCount(data.bloodMoons),
    ...(bloodMoonAt ? { bloodMoonAt } : {}),
    ...(bloodMoonEvery ? { bloodMoonEvery } : {}),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date(0).toISOString(),
  };
};

export class TempleProgressDb extends DbStorageApi {
  /** Write a hero's progress in a temple, replacing the previous record, and stamp it. */
  public async saveProgress(progress: NewTempleProgress): Promise<TempleProgressEntry> {
    const entry = toTempleProgress({ ...progress, updatedAt: new Date().toISOString() });
    if (!entry) throw new Error("A temple progress record needs a userId and a templeId");
    await this.set(templeProgressKey(entry.userId, entry.templeId), entry);
    return entry;
  }

  public async getProgress(userId: string, templeId: string): Promise<TempleProgressEntry | null> {
    const entry = toTempleProgress(await this.get(templeProgressKey(userId, templeId)));
    return entry && entry.userId === userId && entry.templeId === templeId ? entry : null;
  }

  public async getProgressForUser(userId: string): Promise<TempleProgressEntry[]> {
    const entries = (await this.getAll()).map(toTempleProgress);
    return entries.filter((entry): entry is TempleProgressEntry => entry !== null && entry.userId === userId);
  }

  /**
   * Game Master action: schedule the blood moon over a temple for a hero. The reset itself fires when the
   * hero next enters the temple after that time (TempleSystem reads the record back and resets it).
   * @param whenISO When the moon rises; null takes a scheduled one back
   * @returns The record as saved, or null when the hero has no progress in that temple (nothing to reset)
   */
  public async scheduleBloodMoon(userId: string, templeId: string, whenISO: string | null): Promise<TempleProgressEntry | null> {
    const isUnreadableDate = whenISO !== null && toIsoTime(whenISO) === undefined;
    if (isUnreadableDate) throw new Error(`Not a date: ${whenISO}`);
    const current = await this.getProgress(userId, templeId);
    if (!current) return null;

    // toTempleProgress drops an undefined bloodMoonAt, so taking the moon back leaves no field behind
    return this.saveProgress({ ...current, bloodMoonAt: whenISO === null ? undefined : new Date(whenISO).toISOString() });
  }

  /**
   * Game Master action: put a hero's blood moon in a temple on a cadence (null takes it off). It changes
   * nothing about the date already scheduled; TempleSystem re-schedules a week later each time a due moon fires.
   * @returns The record as saved, or null when the hero has no progress in that temple
   */
  public async setBloodMoonEvery(userId: string, templeId: string, every: "weekly" | null): Promise<TempleProgressEntry | null> {
    const current = await this.getProgress(userId, templeId);
    if (!current) return null;
    return this.saveProgress({ ...current, bloodMoonEvery: every === null ? undefined : every });
  }

  /** Forget a hero's run through a temple, so the next visit starts from the entrance. */
  public async clearProgress(userId: string, templeId: string): Promise<void> {
    await this.remove(templeProgressKey(userId, templeId));
  }
}

let templeProgressDb: TempleProgressDb | null = null;

export const getTempleProgressDb = (): TempleProgressDb => {
  if (!templeProgressDb) templeProgressDb = new TempleProgressDb(templeProgressStorage);
  return templeProgressDb;
};

export default TempleProgressDb;
