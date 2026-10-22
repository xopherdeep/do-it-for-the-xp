/**
 * Two small signals the storage layer raises for Family Sync: a record was written or removed, and a backup restore rewrote a whole store.
 * DbStorageApi and BackupService only say what happened; the sync store listens. This file imports nothing from stores or databases
 * (DbStorageApi imports it), so no cycle can form. Built with the emitter gameSignals.ts uses: a listener that throws is logged and
 * never breaks the write, nor the listeners after it.
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

const recordWritten = makeSignal<RecordWrite>("recordWritten");
const storeRestored = makeSignal<StoreRestored>("storeRestored");

export const onRecordWritten = recordWritten.on;
export const emitRecordWritten = recordWritten.emit;
export const onStoreRestored = storeRestored.on;
export const emitStoreRestored = storeRestored.emit;
