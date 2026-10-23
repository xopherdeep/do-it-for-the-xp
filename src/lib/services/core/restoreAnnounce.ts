import { emitStoreRestored } from "@/lib/services/sync/recordSignals";
import type { BackupEntry, RestoreMode } from "./BackupService";

/** The keys a store held before a restore that the restored records do not carry */
const keysDroppedBy = (before: readonly BackupEntry[], after: readonly BackupEntry[]): string[] => {
  const kept = new Set(after.map((entry) => entry.key));
  return before.filter((entry) => !kept.has(entry.key)).map((entry) => entry.key);
};

/**
 * Tells Family Sync what a restore rewrote (recordSignals.ts `storeRestored`), store by store, with the keys it removed
 * and what they held (a merge keeps every record, so it removed none). Called only once every store is written, so a
 * restore that was rolled back announces nothing.
 */
export const announceRestored = (
  stores: readonly { name: string }[],
  snapshots: ReadonlyMap<string, readonly BackupEntry[]>,
  restored: Record<string, readonly BackupEntry[]>,
  mode: RestoreMode
): void => {
  for (const { name } of stores) {
    const before = snapshots.get(name) ?? [];
    const removedKeys = mode === "merge" ? [] : keysDroppedBy(before, restored[name]);
    const previous = new Map(before.filter((entry) => removedKeys.includes(entry.key)).map((entry) => [entry.key, entry.value]));
    emitStoreRestored({ store: name, removedKeys, previous });
  }
};
