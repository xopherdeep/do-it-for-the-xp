import type { Storage } from "@ionic/storage";

import { abilitiesStorage } from "@/lib/databases/AbilitiesDb";
import { accessoriesStorage } from "@/lib/databases/AccessoriesDb";
import { achievementCategoryStorage, achievementStorage } from "@/lib/databases/AchievementDb";
import { beastStorage } from "@/lib/databases/BestiaryDb";
import { chatStorage } from "@/lib/databases/ChatDb";
import { dosDontsStorage } from "@/lib/databases/DosDontsDb";
import { packLibraryStorage } from "@/lib/databases/PackLibraryDb";
import { profileStorage } from "@/lib/databases/profileStorage";
import { purchaseLogStorage } from "@/lib/databases/PurchaseLogDb";
import { questLogStorage } from "@/lib/databases/QuestLogDb";
import { shopStorage } from "@/lib/databases/ShopsDb";
import { templeStorage } from "@/lib/databases/TempleDb";
import { templeProgressStorage } from "@/lib/databases/TempleProgressDb";
import { canManageFamily, RESTORE_GM_ONLY_MESSAGE } from "@/router/_Guards/gm.guard";
import StorageService from "@/lib/services/core/StorageService";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

/**
 * One backup file for everything the app keeps in Ionic Storage (Settings > General).
 *
 * File format, version 1:
 *   {
 *     "version": 1,
 *     "exportedAt": "2026-10-09T01:23:45.678Z",
 *     "stores": { "__profiles": [ { "key": "<storage key>", "value": { ...record } }, ... ], ... }
 *   }
 * Entries keep the storage KEY next to the value, so a restore writes every record back under the
 * very id it had. (BestiaryDb.importBeastsData gives imports fresh ids, which orphans every link
 * between beasts, quests and temples; a backup must never do that.)
 *
 * Restore: validate the whole file first (a malformed file touches nothing), snapshot the stores it
 * will change, then write them one by one in BACKUP_STORES order. If any write fails, every store
 * touched so far is put back from the snapshot. Only after the last store is written do the
 * post-restore steps run: refresh anything mirrored elsewhere, then reload the user store.
 *
 * Two modes. "replace" (the default, a normal backup restore) clears each store in the file and refills
 * it. "merge" (the starter world) clears nothing: it writes the file's records under their keys, so a
 * record the file owns is replaced and every other record in the store stays.
 */

export const BACKUP_VERSION = 1;

/** The slice of Ionic Storage a backup needs. The real `Storage` fits; the unit tests pass an in-memory fake. */
export type BackupStorage = Pick<Storage, "create" | "forEach" | "set" | "clear">;

/** One record exactly as the store holds it. */
export interface BackupEntry {
  key: string;
  value: unknown;
}

export interface BackupFile {
  version: typeof BACKUP_VERSION;
  /** ISO timestamp of when the backup was made */
  exportedAt: string;
  /** Store name (its Ionic Storage database name) to that store's records */
  stores: Record<string, BackupEntry[]>;
}

export interface BackupStoreDef {
  /** The name used in the file: the Ionic Storage database name, so it never changes by accident */
  name: string;
  /** What the Settings screen calls it */
  label: string;
  storage: BackupStorage;
  /** Runs once, after the whole restore succeeded, with this store's restored records (for data mirrored elsewhere) */
  afterRestore?: (entries: readonly BackupEntry[]) => Promise<void>;
}

/** ProfileDb also mirrors every profile into Capacitor Preferences (it survives a reinstall); keep that copy in step. */
const mirrorProfiles = async (entries: readonly BackupEntry[]): Promise<void> => {
  await StorageService.saveProfiles(entries.map((entry) => entry.value));
};

/**
 * Every store a backup covers. ONE LINE PER STORE: add a store by importing its exported Storage
 * instance and adding a line here.
 *
 * The order is the restore order: stores that others point at come first (profiles, quest
 * categories and beasts before the quests that reference them; accessories and abilities before
 * the shops that sell them; temples before the progress through them; quests, shops and profiles
 * before the logs that record them).
 */
export const BACKUP_STORES: readonly BackupStoreDef[] = [
  { name: "__profiles", label: "Profiles", storage: profileStorage, afterRestore: mirrorProfiles },
  { name: "__achievementCategories", label: "Quest categories", storage: achievementCategoryStorage },
  { name: "__beasts", label: "Bestiary", storage: beastStorage },
  { name: "__achievements", label: "Quests", storage: achievementStorage },
  { name: "__abilities", label: "Abilities", storage: abilitiesStorage },
  { name: "__accessories", label: "Accessories", storage: accessoriesStorage },
  { name: "__shops", label: "Shops", storage: shopStorage },
  { name: "__temples", label: "Temples", storage: templeStorage },
  { name: "__templeProgress", label: "Temple progress", storage: templeProgressStorage },
  { name: "__questLog", label: "Quest log", storage: questLogStorage },
  { name: "__purchaseLog", label: "Purchase log", storage: purchaseLogStorage },
  { name: "__chat", label: "Chat", storage: chatStorage },
  { name: "__dosDonts", label: "Dos and Don'ts", storage: dosDontsStorage },
  { name: "__packs", label: "Added packs", storage: packLibraryStorage },
];

/** The file is not a backup this app can read. Thrown before anything is touched. */
export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupFormatError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** A restore was asked for by someone who is not a Game Master. Thrown before anything is touched. */
export class BackupPermissionError extends Error {
  constructor(message: string = RESTORE_GM_ONLY_MESSAGE) {
    super(message);
    this.name = "BackupPermissionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** A store could not be read or written. */
export class BackupStorageError extends Error {
  constructor(
    message: string,
    /** Name of the store that failed */
    public readonly store: string,
    /** True when the app's data is exactly as it was before the call: reads change nothing, and a failed restore was rolled back */
    public readonly dataIntact: boolean
  ) {
    super(message);
    this.name = "BackupStorageError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface BackupStoreSummary {
  name: string;
  label: string;
  count: number;
}

export interface BackupSummary {
  exportedAt: string;
  /** Stores this backup carries and this app knows, in restore order */
  stores: BackupStoreSummary[];
  /** Records across `stores` */
  total: number;
  /** Store names in the file that this version of the app does not have; they are skipped */
  ignored: string[];
  /** Labels of stores this app has but the file lacks; a restore leaves them as they are */
  untouched: string[];
}

/** "replace" empties each store in the file first; "merge" only writes the file's records and keeps the rest */
export type RestoreMode = "replace" | "merge";

export interface RestoreOptions {
  /** Defaults to "replace" */
  mode?: RestoreMode;
}

export interface RestoreResult extends BackupSummary {
  mode: RestoreMode;
  /** False when the data was restored but the user store could not be refreshed; reload the app */
  usersReloaded: boolean;
}

export interface ExportResult {
  fileName: string;
  summary: BackupSummary;
}

const WRITE_BATCH_SIZE = 100;
const OBJECT_URL_LIFETIME_MS = 10_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A stored row needs a non-empty text key and some value to restore. */
const isBackupEntry = (entry: unknown): entry is BackupEntry =>
  isRecord(entry) && typeof entry.key === "string" && entry.key !== "" && entry.value !== undefined;

const hasOwn = (target: object, name: string): boolean => Object.prototype.hasOwnProperty.call(target, name);

const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Same flattening DbStorageApi.set applies on every write, so a backup only ever holds plain JSON. */
const toJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const readEntries = async (storage: BackupStorage): Promise<BackupEntry[]> => {
  const entries: BackupEntry[] = [];
  await storage.forEach((value, key) => {
    // Block body on purpose: forEach stops iterating as soon as the callback returns anything but undefined
    const isStored = value !== undefined;
    if (isStored) entries.push({ key, value: toJson(value) });
  });
  return entries;
};

const writeEntries = async (storage: BackupStorage, entries: readonly BackupEntry[]): Promise<void> => {
  for (let start = 0; start < entries.length; start += WRITE_BATCH_SIZE) {
    const batch = entries.slice(start, start + WRITE_BATCH_SIZE);
    // allSettled, not all: after one write fails, its siblings must finish before the rollback starts
    const results = await Promise.allSettled(batch.map(async ({ key, value }) => storage.set(key, value)));
    const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failed) throw failed.reason;
  }
};

const replaceEntries = async (storage: BackupStorage, entries: readonly BackupEntry[]): Promise<void> => {
  await storage.clear();
  await writeEntries(storage, entries);
};

const parseEntries = (store: string, entries: unknown): BackupEntry[] => {
  if (!Array.isArray(entries)) {
    throw new BackupFormatError(`"${store}" must be a list of entries.`);
  }
  const seen = new Set<string>();
  return entries.map((entry, index) => {
    if (!isBackupEntry(entry)) {
      throw new BackupFormatError(`"${store}", entry ${index + 1}: every entry needs a "key" (text) and a "value".`);
    }
    const isDuplicateKey = seen.has(entry.key);
    if (isDuplicateKey) {
      throw new BackupFormatError(`"${store}" lists the key "${entry.key}" more than once.`);
    }
    seen.add(entry.key);
    return { key: entry.key, value: entry.value };
  });
};

/** Local calendar date, so a backup taken late at night is named for the day the family is living in. */
export const backupFileName = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `do-it-for-the-xp-backup-${year}-${month}-${day}.json`;
};

const mayRestore = (): boolean => canManageFamily();

const reloadUserStore = async (): Promise<void> => {
  await useUserStore().loadUsers();
};

export class BackupService {
  constructor(
    private readonly stores: readonly BackupStoreDef[] = BACKUP_STORES,
    private readonly reloadUsers: () => Promise<void> = reloadUserStore,
    private readonly canRestore: () => boolean = mayRestore
  ) {}

  /**
   * Reads every registered store into one backup object. All or nothing: if a single store cannot
   * be read this throws, so a backup that silently lacks a store never exists.
   */
  async createBackup(now: Date = new Date()): Promise<BackupFile> {
    const stores: Record<string, BackupEntry[]> = {};
    for (const store of this.stores) {
      try {
        await store.storage.create();
        stores[store.name] = await readEntries(store.storage);
      } catch (error) {
        throw new BackupStorageError(
          `Could not read ${store.label} (${store.name}): ${reasonOf(error)}. No backup was made.`,
          store.name,
          true
        );
      }
    }
    return { version: BACKUP_VERSION, exportedAt: now.toISOString(), stores };
  }

  /** Hands the backup to the browser as a file download and returns the file name. */
  downloadBackup(backup: BackupFile): string {
    const madeAt = new Date(backup.exportedAt);
    const fileName = backupFileName(Number.isNaN(madeAt.getTime()) ? new Date() : madeAt);
    const json = JSON.stringify(backup, null, 2);
    // A Blob URL has no size limit; a data: URL stops working in some browsers at about 2 MB
    const useBlob = typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
    const href = useBlob
      ? URL.createObjectURL(new Blob([json], { type: "application/json" }))
      : `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;

    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (useBlob) setTimeout(() => URL.revokeObjectURL(href), OBJECT_URL_LIFETIME_MS);
    return fileName;
  }

  /** The Settings > General "Back up everything" action: read every store, then download one file. */
  async exportAll(): Promise<ExportResult> {
    const backup = await this.createBackup();
    const fileName = this.downloadBackup(backup);
    return { fileName, summary: this.summarizeBackup(backup) };
  }

  /**
   * Checks a backup file (its JSON text, or the object already parsed) and returns it typed.
   * Throws BackupFormatError, in plain words, for anything that is not a restorable version-1 backup.
   */
  parseBackup(raw: unknown): BackupFile {
    let data: unknown = raw;
    const isJsonText = typeof raw === "string";
    if (isJsonText) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new BackupFormatError("The file is not valid JSON, so it cannot be a backup.");
      }
    }
    if (Array.isArray(data)) {
      throw new BackupFormatError(
        "This file is a single list (like a profile or quest export), not a full backup. Use the import on that screen instead."
      );
    }
    if (!isRecord(data)) {
      throw new BackupFormatError("The file is not a backup.");
    }
    const isKnownVersion = data.version === BACKUP_VERSION;
    if (!isKnownVersion) {
      throw new BackupFormatError(
        typeof data.version === "number" && data.version > BACKUP_VERSION
          ? `This backup was made by a newer version of the app (backup version ${data.version}). Update the app and try again.`
          : `This backup has an unknown version. This app reads backup version ${BACKUP_VERSION}.`
      );
    }
    const { exportedAt } = data;
    const isDated = typeof exportedAt === "string";
    if (!isDated) {
      throw new BackupFormatError("The backup has no export date.");
    }
    if (!isRecord(data.stores)) {
      throw new BackupFormatError("The backup has no list of stores.");
    }

    const stores: Record<string, BackupEntry[]> = {};
    for (const [name, entries] of Object.entries(data.stores)) {
      stores[name] = parseEntries(name, entries);
    }
    const hasKnownStore = this.stores.some((store) => hasOwn(stores, store.name));
    if (!hasKnownStore) {
      throw new BackupFormatError("The backup holds none of the data this version of the app stores, so there is nothing to restore.");
    }
    return { version: BACKUP_VERSION, exportedAt, stores };
  }

  /** What restoring this backup would replace, for the confirm dialog and the result message. */
  summarizeBackup(backup: BackupFile): BackupSummary {
    const known = new Set(this.stores.map((store) => store.name));
    const stores = this.stores
      .filter((store) => hasOwn(backup.stores, store.name))
      .map((store) => ({ name: store.name, label: store.label, count: backup.stores[store.name].length }));
    return {
      exportedAt: backup.exportedAt,
      stores,
      total: stores.reduce((sum, store) => sum + store.count, 0),
      ignored: Object.keys(backup.stores).filter((name) => !known.has(name)),
      untouched: this.stores.filter((store) => !hasOwn(backup.stores, store.name)).map((store) => store.label),
    };
  }

  /**
   * Replaces the contents of every store in the backup, in BACKUP_STORES order, keeping every key.
   * With `{ mode: "merge" }` it instead writes the backup's records into the stores and keeps every
   * record the backup does not carry. Stores the file does not mention are left alone either way.
   * Throws BackupFormatError (nothing touched) for a bad file, or BackupStorageError when a store
   * fails (the earlier stores are put back first).
   */
  async restoreBackup(input: string | BackupFile, options: RestoreOptions = {}): Promise<RestoreResult> {
    const mode: RestoreMode = options.mode ?? "replace";
    // 0. Restore replaces everyone's data: only a Game Master may run it (backing up stays open)
    if (!this.canRestore()) throw new BackupPermissionError();

    // 1. Validate everything up front: a malformed file must not cost anyone a single record
    const backup = this.parseBackup(input);
    const summary = this.summarizeBackup(backup);
    const plan = this.stores.filter((store) => hasOwn(backup.stores, store.name));

    // 2. Snapshot what is there now, so a failure halfway can be undone
    const snapshots = new Map<string, BackupEntry[]>();
    for (const store of plan) {
      try {
        await store.storage.create();
        snapshots.set(store.name, await readEntries(store.storage));
      } catch (error) {
        throw new BackupStorageError(
          `Could not read ${store.label} before restoring: ${reasonOf(error)}. Nothing was changed.`,
          store.name,
          true
        );
      }
    }

    // 3. Clear and refill store by store (merge: write over the same keys and keep the rest)
    const touched: BackupStoreDef[] = [];
    const writeStore = mode === "merge" ? writeEntries : replaceEntries;
    try {
      for (const store of plan) {
        touched.push(store);
        await writeStore(store.storage, backup.stores[store.name]);
      }
    } catch (error) {
      const failed = touched[touched.length - 1];
      const notRestored = await this.rollback(touched, snapshots);
      throw new BackupStorageError(
        notRestored.length === 0
          ? `Could not restore ${failed.label}: ${reasonOf(error)}. Your previous data was put back.`
          : `Could not restore ${failed.label}: ${reasonOf(error)}. Putting the previous data back also failed for ${notRestored.join(", ")}, so some data may be incomplete. Restore the same file again to fix it.`,
        failed.name,
        notRestored.length === 0
      );
    }

    // 4. Only now that every store is written: refresh mirrored copies, then rebuild the user store
    for (const store of plan) {
      const { afterRestore } = store;
      if (!afterRestore) continue;
      try {
        // A merge leaves other records in the store, and a mirror wants the store's whole contents
        await afterRestore(mode === "merge" ? await readEntries(store.storage) : backup.stores[store.name]);
      } catch (error) {
        debug.error(`Backup restore: post-restore step for ${store.name} failed`, error);
      }
    }
    let usersReloaded = true;
    try {
      await this.reloadUsers();
    } catch (error) {
      usersReloaded = false;
      debug.error("Backup restore: reloading the user store failed", error);
    }
    return { ...summary, mode, usersReloaded };
  }

  /** Puts the touched stores back from the snapshots, newest first. Returns the labels of stores that could not be put back. */
  private async rollback(touched: readonly BackupStoreDef[], snapshots: ReadonlyMap<string, BackupEntry[]>): Promise<string[]> {
    const notRestored: string[] = [];
    for (const store of [...touched].reverse()) {
      try {
        await replaceEntries(store.storage, snapshots.get(store.name) ?? []);
      } catch (error) {
        debug.error(`Backup restore: could not put ${store.name} back`, error);
        notRestored.push(store.label);
      }
    }
    return notRestored;
  }
}

export const backupService = new BackupService();

export default backupService;
