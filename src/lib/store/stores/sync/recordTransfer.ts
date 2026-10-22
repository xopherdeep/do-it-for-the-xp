import type { OutboxItem, SyncState } from "@/lib/databases/SyncDb";
import { BACKUP_STORES } from "@/lib/services/core/BackupService";
import { ensureIdentity } from "@/lib/services/pro/familyIdentity";
import { fetchRecords, putRecords, type ReceivedRecord } from "@/lib/services/sync/familySyncClient";
import { applyRecords, readRawEntries, readRawRecord, refreshMirrors } from "@/lib/services/sync/recordApply";
import { dropItems, nextBatch, settlePut, type BatchRecord } from "@/lib/services/sync/recordOutbox";
import { heroIdOf, SYNC_STORES } from "@/lib/services/sync/syncScopes";
import { batchRecordOf, cursorAfter, holdBackQueued, newestSeqOf, type QueueRef } from "@/lib/services/sync/syncQueue";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";
import debug from "@/lib/utils/debug";

/**
 * The sync store's transfer (section 4 of the family sync spec): the outbox goes up in batches of 50 records and 1 MB, and
 * the family's records come down 100 at a time, up to 5 pages a call, landing in the raw stores with `lastSeq` saved after
 * each page. The site also ends a page at 1 MB of bodies, so a short page is not the end: reading stops at an empty page
 * or one that does not move `lastSeq`, and what is left after the fifth page waits for the next round. One upload and one
 * download at a time; a call while one runs joins it.
 *
 * Bound to the sync store the way the family store binds its sender (`family/familySender.ts`): the store hands over what
 * the device keeps, how to save a change, the sign-in, and what a failure means.
 */
export interface TransferContext {
  /** What the device keeps, loaded */
  kept(): Promise<SyncState>;
  /** Saves a change, unless the store was reset since the work began in `startedIn` */
  update(change: (current: SyncState) => SyncState, startedIn: number): Promise<void>;
  /** How many resets so far: work that began before the latest one stops */
  generation(): number;
  /** The sign-in for a call now; null while the sync is off or paused */
  auth(): TownHallAuth | null;
  /** A call went well */
  succeeded(): void;
  /** A call failed: an upload or a download notes it here and resolves */
  failed(error: unknown): Promise<void>;
  /** A page of this many records landed */
  pulled(count: number): void;
}

/** How a read of pages ended: at the newest record, with more to read, or stopped (off, paused, or reset) */
export type PullResult = "caughtUp" | "more" | "stopped";

export interface RecordTransfer {
  /** Sends the outbox until it is empty. Never rejects */
  upload(): Promise<void>;
  /** Reads up to 5 pages. Rejects when the site fails */
  pull(): Promise<PullResult>;
  /** Reads until this device has the newest record; resolves to whether it got there. Rejects when the site fails */
  pullToEnd(): Promise<boolean>;
  /** Reads up to 5 pages. Never rejects */
  download(): Promise<void>;
}

/** Pages read per download, at most: a device that was away long catches up over a few rounds */
const MAX_PAGES = 5;
const PAGE = 100;

/** A record sealed the way a backup seals it (a profile's PINs) before it leaves this device */
const sealed = (store: string, value: unknown): unknown => {
  const clean = BACKUP_STORES.find((def) => def.name === store)?.cleanRecord;
  const hasValue = value !== null && value !== undefined;
  return clean && hasValue ? clean(value) : value;
};

/** A queued record as it goes now: its current value, sealed; null when it is gone (a tombstone goes instead) */
const readToSend = async (item: OutboxItem): Promise<BatchRecord | null> =>
  batchRecordOf(item, sealed(item.store, await readRawRecord(item.store, item.key)));

/** Every record of every synced store, each with its hero, for the first push */
export const everyRecord = async (): Promise<QueueRef[]> => {
  const refs: QueueRef[] = [];
  for (const { store } of SYNC_STORES) {
    const entries = await readRawEntries(store);
    entries.forEach(({ key, value }) => refs.push({ store, key, heroId: heroIdOf(store, key, value) }));
  }
  return refs;
};

export const createRecordTransfer = (ctx: TransferContext): RecordTransfer => {
  /** Records the site would refuse for their size every time: logged and dropped, never retried */
  const dropOversize = async (oversize: OutboxItem[], startedIn: number): Promise<void> => {
    oversize.forEach((item) => debug.warn(`[sync] record ${item.store}/${item.key} is over 512 KB; dropped`));
    await ctx.update((current) => ({ ...current, outbox: dropItems(current.outbox, oversize) }), startedIn);
  };

  /** Sends one batch; resolves to whether the queue moved (a batch the answer settles nothing of would go forever) */
  const sendBatch = async (auth: TownHallAuth, deviceId: string, records: BatchRecord[], startedIn: number): Promise<boolean> => {
    const result = await putRecords(auth, deviceId, records);
    let settledCount = 0;
    await ctx.update((current) => {
      const settled = settlePut(current.outbox, records, result);
      settledCount = current.outbox.length - settled.outbox.length;
      return { ...current, outbox: settled.outbox };
    }, startedIn);
    result.refused.forEach((refused) => debug.warn(`[sync] the site refused ${refused.store}/${refused.key} (${refused.code}); dropped`));
    ctx.succeeded();
    return settledCount > 0;
  };

  const runUpload = async (): Promise<void> => {
    const startedIn = ctx.generation();
    const { deviceId } = await ensureIdentity();
    for (;;) {
      const { outbox } = await ctx.kept();
      const auth = ctx.auth();
      const mayGo = auth !== null && startedIn === ctx.generation() && outbox.length > 0;
      if (!mayGo) return;
      const { records, oversize } = await nextBatch(outbox, readToSend);
      const hasOversize = oversize.length > 0;
      if (hasOversize) await dropOversize(oversize, startedIn);
      const hasRecords = records.length > 0;
      const hasMoved = hasRecords ? await sendBatch(auth, deviceId, records, startedIn) : hasOversize;
      if (!hasMoved) return;
    }
  };

  /** Lands one page and answers the cursor after it: a record whose key waits in the outbox is held back, but its number counts */
  const landPage = async (records: ReceivedRecord[], deviceId: string, since: number): Promise<number> => {
    const { toApply, heldBack } = holdBackQueued(records, (await ctx.kept()).outbox);
    const applied = await applyRecords(toApply, deviceId);
    const outcome = { ...applied, skipped: applied.skipped + heldBack.length };
    try {
      await refreshMirrors(outcome);
    } catch (error) {
      // The records are in the stores; the screens read them on their next visit
      debug.warn("sync: could not refresh the mirrors", error);
    }
    return cursorAfter(since, [outcome.maxSeq, newestSeqOf(heldBack)]);
  };

  const runPull = async (): Promise<PullResult> => {
    const startedIn = ctx.generation();
    const { deviceId } = await ensureIdentity();
    for (let page = 0; page < MAX_PAGES; page++) {
      const since = (await ctx.kept()).lastSeq;
      const auth = ctx.auth();
      const mayRead = auth !== null && startedIn === ctx.generation();
      if (!mayRead) return "stopped";
      const records = await fetchRecords(auth, since, PAGE);
      const isStillOn = ctx.auth() !== null && startedIn === ctx.generation();
      if (!isStillOn) return "stopped";
      ctx.succeeded();
      // Only an empty page is the end, never a short one: the site cuts a page at 1 MB of bodies too
      const isEmpty = records.length === 0;
      if (isEmpty) return "caughtUp";
      const next = await landPage(records, deviceId, since);
      await ctx.update((current) => ({ ...current, lastSeq: Math.max(current.lastSeq, next) }), startedIn);
      ctx.pulled(records.length);
      // A page whose numbers do not move the cursor (none finite) would be read again forever
      const hasNotMoved = next <= since;
      if (hasNotMoved) return "caughtUp";
    }
    return "more";
  };

  let uploading: Promise<void> | null = null;
  let pulling: Promise<PullResult> | null = null;

  const upload = (): Promise<void> => {
    if (!uploading) {
      uploading = runUpload()
        .catch(ctx.failed)
        .finally(() => {
          uploading = null;
        });
    }
    return uploading;
  };

  const pull = (): Promise<PullResult> => {
    if (!pulling) {
      pulling = runPull().finally(() => {
        pulling = null;
      });
    }
    return pulling;
  };

  const pullToEnd = async (): Promise<boolean> => {
    for (;;) {
      const result = await pull();
      const isDone = result !== "more";
      if (isDone) return result === "caughtUp";
    }
  };

  const download = async (): Promise<void> => {
    await pull().then(() => undefined, ctx.failed);
  };

  return { upload, pull, pullToEnd, download };
};
