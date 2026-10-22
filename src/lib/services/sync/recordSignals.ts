/**
 * Small signals for Family Sync: a record was written or removed, and a backup restore rewrote a whole store (the storage layer
 * raises both; the sync store listens), and records another device wrote landed in a store (the sync store raises it after a
 * download; the copies held in memory, such as a temple run, a notification feed or the chat rooms, read them again).
 * DbStorageApi and BackupService only say what happened. The writes still on their way are noted too (`trackWrite`), so a
 * rest can wait for a change made a moment ago before it gives a hero's turn back. This file imports nothing from stores or databases (DbStorageApi and
 * the temple engine import it), so no cycle can form. Built with the emitter gameSignals.ts uses: a listener that throws is
 * logged and never breaks the write, nor the listeners after it.
 */
import { makeSignal } from "@/lib/services/multiplayer/gameSignals";

/** One record written to, or removed from, a store; `value` is null for a removal */
export interface RecordWrite {
  /** The store's name, as BACKUP_STORES knows it (`__beasts`); empty when the storage cannot say */
  store: string;
  key: string;
  value: unknown | null;
  /** A removal only: the record that was there (null when none was). A removal has no value to name its hero from, so this does */
  previous?: unknown;
}

/** A restore rewrote a store, and these keys were in it before and are not any more */
export interface StoreRestored {
  store: string;
  removedKeys: string[];
  /** What each removed key held before the restore: a removed log entry names its hero only by its value */
  previous?: ReadonlyMap<string, unknown>;
}

/** Records the family's download landed in one store (written or removed in the raw store, never captured) */
export interface RecordsLanded {
  store: string;
  keys: string[];
}

const recordWritten = makeSignal<RecordWrite>("recordWritten");
const recordsLanded = makeSignal<RecordsLanded>("recordsLanded");
const storeRestored = makeSignal<StoreRestored>("storeRestored");

export const onRecordWritten = recordWritten.on;
export const emitRecordWritten = recordWritten.emit;
export const onStoreRestored = storeRestored.on;
export const emitStoreRestored = storeRestored.emit;
export const onRecordsLanded = recordsLanded.on;
export const emitRecordsLanded = recordsLanded.emit;

/** Writes to the stores still on their way (a save scheduled for the end of the tick, a storage call not answered yet) */
const writesInFlight = new Set<Promise<unknown>>();

/** Notes a write on its way, until it settles; answers the same promise */
export const trackWrite = <T>(write: Promise<T>): Promise<T> => {
  writesInFlight.add(write);
  const forget = (): void => {
    writesInFlight.delete(write);
  };
  write.then(forget, forget);
  return write;
};

/** Resolves once every write on its way has settled (and those they started): a rest waits for it before it uploads */
export const writesSettled = async (): Promise<void> => {
  while (writesInFlight.size > 0) await Promise.allSettled(Array.from(writesInFlight));
};
