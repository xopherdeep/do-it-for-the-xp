/**
 * Writes the records Family Sync downloaded into this device's stores (section 4 of the family sync spec, "Downloading").
 * A record lands by its key: its body (a JSON string on the wire) is parsed and set, or, for a tombstone, the key is removed.
 *
 * The writes go to the RAW Ionic `Storage` of each store (the `storage` field of `BACKUP_STORES`), never through `DbStorageApi`:
 * `DbStorageApi` announces every write (recordSignals.ts) and the sync store would queue it, so a download would echo straight
 * back to the site. A removal here also skips what the Db classes do on top of it (ProfileDb.removeProfile tells the family
 * server the hero is gone): the site already knows.
 *
 * `applyRecords` is pure over its targets (tests hand it in-memory ones). `refreshMirrors` then does what a backup restore does
 * after the profiles store changed, because that is the one store something else mirrors; every other store is read on demand
 * by its screen. `readRawRecord` and `readRawEntries` read the same raw stores the other way, for the upload: a record as it
 * is when it is sent, and every record of a store for the first push.
 */
import type { Storage } from "@ionic/storage";
import { BACKUP_STORES, type BackupStorage } from "@/lib/services/core/BackupService";
import StorageService from "@/lib/services/core/StorageService";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import type { ReceivedRecord } from "./familySyncClient";
import { isSyncedStore } from "./syncScopes";

/** Where one store's downloaded records land */
export interface ApplyTarget {
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface ApplyOutcome {
  /** Records written or removed */
  applied: number;
  /** Records left alone: this device's own, an unknown store, a number or body that cannot be used, a write that failed */
  skipped: number;
  /** The stores that changed, once each, in the order they first changed */
  stores: string[];
  /** The heroes whose records changed, once each */
  heroes: string[];
  /** The profiles (hero ids) a tombstone removed */
  removedProfiles: string[];
  /** The highest finite number among the records seen, applied or not; the caller moves its cursor to it. Null when none had one */
  maxSeq: number | null;
}

const PROFILES = "__profiles";

/** What a backup store really is: an Ionic `Storage`. `BackupStorage` names only what a backup uses; a removal and a read are not in it */
type RawStorage = BackupStorage & Pick<Storage, "remove" | "get">;

/** The storages already created (or being created) this session: `create()` is called once per storage, not once per write */
const created = new WeakMap<RawStorage, Promise<unknown>>();

/** A store nothing has opened yet has no database; its write would fail. Open it once, and try again after a failure */
const open = async (storage: RawStorage): Promise<void> => {
  const pending = created.get(storage) ?? storage.create();
  created.set(storage, pending);
  try {
    await pending;
  } catch (error) {
    created.delete(storage);
    throw error;
  }
};

const rawStorageOf = (store: string): RawStorage | null => {
  const def = isSyncedStore(store) ? BACKUP_STORES.find((candidate) => candidate.name === store) : undefined;
  return def ? (def.storage as RawStorage) : null;
};

/**
 * The raw storage of a synced store, as a target; null for a store that is unknown or does not sync (`__localSettings` is a
 * backup store about this device, and the site never carries it).
 */
export const rawTargetFor = (store: string): ApplyTarget | null => {
  const storage = rawStorageOf(store);
  if (!storage) return null;
  return {
    set: async (key, value) => {
      await open(storage);
      await storage.set(key, value);
    },
    remove: async (key) => {
      await open(storage);
      await storage.remove(key);
    },
  };
};

/** Every record a synced store holds, with its key; nothing for a store that is unknown or does not sync */
export const readRawEntries = async (store: string): Promise<{ key: string; value: unknown }[]> => {
  const storage = rawStorageOf(store);
  if (!storage) return [];
  await open(storage);
  const entries: { key: string; value: unknown }[] = [];
  await storage.forEach((value, key) => {
    // Block body on purpose: forEach stops iterating as soon as the callback returns anything but undefined
    const isStored = value !== undefined && value !== null;
    if (isStored) entries.push({ key, value });
  });
  return entries;
};

/** What a synced store holds under the key now; null when it holds nothing there, or the store is unknown or does not sync */
export const readRawRecord = async (store: string, key: string): Promise<unknown> => {
  const storage = rawStorageOf(store);
  if (!storage) return null;
  await open(storage);
  return (await storage.get(key)) ?? null;
};

/** Every profile the raw profiles store holds, as the profile mirror wants them */
const readAllProfiles = async (): Promise<unknown[]> => (await readRawEntries(PROFILES)).map((entry) => entry.value);

/** The record's body as a value to store, or null when there is none: a body missing, not JSON, or not an object (a list is one: notifications, packs) */
const bodyOf = (record: ReceivedRecord): object | null => {
  if (!record.body) return null;
  try {
    const parsed: unknown = JSON.parse(record.body);
    const isObject = typeof parsed === "object" && parsed !== null;
    return isObject ? parsed : null;
  } catch {
    return null;
  }
};

const addOnce = (list: string[], value: string): void => {
  if (!list.includes(value)) list.push(value);
};

/** Lands one record in its target; resolves to whether it did. A failing write is logged, never thrown */
const applyOne = async (record: ReceivedRecord, target: ApplyTarget): Promise<boolean> => {
  try {
    if (record.deleted) {
      await target.remove(record.key);
      return true;
    }
    const body = bodyOf(record);
    if (body === null) {
      debug.warn(`[sync] record ${record.store}/${record.key} has no usable body; skipped`);
      return false;
    }
    await target.set(record.key, body);
    return true;
  } catch (error) {
    debug.warn(`[sync] could not write record ${record.store}/${record.key}; skipped`, error);
    return false;
  }
};

/**
 * Applies downloaded records in the order given. Nothing here throws: a record that cannot be used is counted in `skipped` and
 * the rest carry on. A record whose `seq` is not a finite number is never used to move the cursor (`maxSeq`), or one bad row
 * would hide every row after it.
 */
export const applyRecords = async (
  records: ReceivedRecord[],
  ownDeviceId: string,
  targetFor: (store: string) => ApplyTarget | null = rawTargetFor
): Promise<ApplyOutcome> => {
  const outcome: ApplyOutcome = { applied: 0, skipped: 0, stores: [], heroes: [], removedProfiles: [], maxSeq: null };
  for (const record of records) {
    const hasNumber = Number.isFinite(record.seq);
    if (!hasNumber) {
      outcome.skipped++;
      continue;
    }
    outcome.maxSeq = Math.max(outcome.maxSeq ?? record.seq, record.seq);

    // An empty id is no device: a row that names none is not this device's
    const isOwn = ownDeviceId !== "" && record.deviceId === ownDeviceId;
    const target = isOwn ? null : targetFor(record.store);
    const wasApplied = target ? await applyOne(record, target) : false;
    if (!wasApplied) {
      outcome.skipped++;
      continue;
    }

    outcome.applied++;
    addOnce(outcome.stores, record.store);
    if (record.heroId) addOnce(outcome.heroes, record.heroId);
    const isRemovedProfile = record.deleted && record.store === PROFILES;
    if (isRemovedProfile) addOnce(outcome.removedProfiles, record.key);
  }
  return outcome;
};

/**
 * What a restore does after the profiles changed: copy the profiles into Capacitor Preferences (they survive a reinstall), then
 * reload the user store so the roster and the signed-in hero show what arrived. A hero removed on another device while signed in
 * here is signed out first, so the reload does not sign them back in. A mirror that cannot be saved does not stop the reload.
 */
export const refreshMirrors = async (outcome: ApplyOutcome): Promise<void> => {
  const profilesChanged = outcome.stores.includes(PROFILES);
  if (!profilesChanged) return;

  try {
    await StorageService.saveProfiles(await readAllProfiles());
  } catch (error) {
    debug.warn("[sync] could not mirror the profiles into Preferences", error);
  }

  const userStore = useUserStore();
  const signedInId = userStore.currentUser.id;
  const signedInWasRemoved = signedInId !== null && outcome.removedProfiles.includes(signedInId);
  if (signedInWasRemoved) userStore.logoutUser();
  await userStore.loadUsers();
};
