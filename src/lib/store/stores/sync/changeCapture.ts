import type { SyncState } from "@/lib/databases/SyncDb";
import { createLocalChanges, type LocalChanges } from "@/lib/services/sync/localChanges";
import { readRawEntries } from "@/lib/services/sync/recordApply";
import type { RecordWrite, StoreRestored } from "@/lib/services/sync/recordSignals";
import { heroIdOf, isSyncedStore, mayPhoneWrite } from "@/lib/services/sync/syncScopes";
import { queueAll, type QueueRef } from "@/lib/services/sync/syncQueue";
import debug from "@/lib/utils/debug";

/**
 * The sync store's change capture (section 4 of the family sync spec): every write to a synced store that this device may
 * send goes in the outbox, and is known at once as a change made here (`changes`), before anything awaits, so a page
 * landing meanwhile never overwrites it. A backup restore rewrote whole stores without announcing their records: what each
 * holds goes again, and each key it removed as a tombstone. Bound to the sync store the way the transfer is.
 */
export interface CaptureContext {
  /** Whether writes are queued now (the device syncs, or has synced) */
  isCapturing(): boolean;
  /** The hero a kid phone was linked to; null on a family device */
  phoneHero(): string | null;
  /** Saves a change of what the device keeps */
  update(change: (current: SyncState) => SyncState): Promise<void>;
  /** A change was queued: the upload goes a moment after the last one */
  queued(): void;
}

export interface ChangeCapture {
  /** The records changed here that the site has not settled */
  changes: LocalChanges;
  onWrite(write: RecordWrite): void;
  onRestored(restored: StoreRestored): Promise<void>;
}

export const createChangeCapture = (ctx: CaptureContext): ChangeCapture => {
  const changes = createLocalChanges();

  function queue(refs: QueueRef[]): void {
    ctx
      .update((current) => ({ ...current, outbox: queueAll(current.outbox, refs, new Date()) }))
      .then(() => ctx.queued())
      .catch((error) => debug.warn("sync: could not queue a record", error));
  }

  /** A kid phone sends only what the site lets it write: its own hero's records and the any-writer stores */
  const isRefusedOnPhone = (store: string, heroId: string | null): boolean => {
    const phoneHero = ctx.phoneHero();
    return phoneHero !== null && !mayPhoneWrite(store, heroId, phoneHero);
  };

  /** A record was written here: a synced one goes in the outbox. An announced null is a removal, never a stored record */
  function onWrite(write: RecordWrite): void {
    const isCarried = ctx.isCapturing() && isSyncedStore(write.store);
    if (!isCarried) return;
    const isRemoval = write.value === null || write.value === undefined;
    const heroId = heroIdOf(write.store, write.key, isRemoval ? write.previous : write.value);
    const isRefused = isRefusedOnPhone(write.store, heroId);
    if (isRefused) return;
    // Known at once, before anything awaits: a page landing meanwhile must not overwrite it
    changes.touch(write.store, write.key);
    queue([{ store: write.store, key: write.key, heroId }]);
  }

  /** A restore rewrote a store without announcing its records: all it holds now goes again, and each key it removed as a tombstone */
  async function onRestored(restored: StoreRestored): Promise<void> {
    const isCarried = ctx.isCapturing() && isSyncedStore(restored.store);
    if (!isCarried) return;
    const { store, removedKeys, previous } = restored;
    const held = await readRawEntries(store);
    const refs = [
      ...removedKeys.map((key) => ({ store, key, heroId: heroIdOf(store, key, previous?.get(key)) })),
      ...held.map(({ key, value }) => ({ store, key, heroId: heroIdOf(store, key, value) })),
    ].filter((ref) => !isRefusedOnPhone(ref.store, ref.heroId));
    const hasNothing = refs.length === 0;
    if (hasNothing) return;
    refs.forEach((ref) => changes.touch(ref.store, ref.key));
    queue(refs);
  }

  return { changes, onWrite, onRestored };
};
