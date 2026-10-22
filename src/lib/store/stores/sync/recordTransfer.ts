import type { OutboxItem, SyncState } from "@/lib/databases/SyncDb";
import { BACKUP_STORES } from "@/lib/services/core/BackupService";
import { ensureIdentity } from "@/lib/services/pro/familyIdentity";
import { fetchRecords, putRecords, type ReceivedRecord } from "@/lib/services/sync/familySyncClient";
import type { LocalChanges } from "@/lib/services/sync/localChanges";
import { applyRecords, readRawEntries, readRawRecord, refreshMirrors, type ApplyOutcome } from "@/lib/services/sync/recordApply";
import { dropItems, dropWhere, nextBatch, settlePut, type BatchRecord } from "@/lib/services/sync/recordOutbox";
import { SYNC_STORES } from "@/lib/services/sync/syncScopes";
import { batchRecordOf, cursorAfter, emptyOutcome, firstPushRefs, mergeOutcomes, queueAll, recordId, type StoreEntry } from "@/lib/services/sync/syncQueue";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";
import debug from "@/lib/utils/debug";

/** A record named by its store and key */
interface StoreRef {
  store: string;
  key: string;
}

/**
 * The sync store's transfer (section 4 of the family sync spec): the outbox goes up in batches of 50 records and 1 MB, and
 * the family's records come down 100 at a time, up to 5 pages a call, landing in the raw stores with `lastSeq` saved after
 * each page. The site also ends a page at 1 MB of bodies, so a short page is not the end: reading stops at an empty page or
 * one that does not move `lastSeq`, and what is left after the fifth page waits for the next round.
 *
 * A downloaded record whose key was changed here and not yet settled by the site (in the outbox, or written a moment ago)
 * is never landed: the read stops before it, the cursor stays before it, and the next round reads it again after its
 * upload (by then the site's newest row for that key is usually this device's own). Checked record by record, just
 * before each one lands.
 *
 * Hero records follow the hero's turn (section 5): one is sent only while this device holds the hero (`maySend`), and a
 * hero record of a hero this device does not play always lands, over a change made here without the turn, which is
 * then dropped: the device holding the turn wrote it, and it is the hero's only writer. A put the site refuses with
 * `xp_family_turn` names the heroes another device took over (`turnLost`).
 *
 * The sync store runs these one at a time through its work lane (services/sync/workLane.ts); nothing here joins or
 * queues. Every call rejects when the site fails; the store notes it. Bound to the store the way the family store binds
 * its sender (`family/familySender.ts`).
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
  /** The records changed here that the site has not settled; the upload settles them */
  changes: LocalChanges;
  /** Whether the record was changed here and not settled by the site (written a moment ago, or waiting in the outbox) */
  isLocal(store: string, key: string): boolean;
  /** The first sync this device still owes: a kid phone's pull, a family device's push, or none */
  owes(): "pull" | "push" | null;
  /** A call went well */
  succeeded(): void;
  /** A page landed this many records */
  pulled(count: number): void;
  /** Whether a queued record may go now: a family record always, a hero's while this device holds the hero's turn */
  maySend(heroId: string | null): boolean;
  /** Whether this device plays the hero (its turn held here); a hero record of a hero it does not play lands over local changes */
  isPlayedHere(heroId: string): boolean;
  /** Before a send: holds made offline ask the site again (the site refuses a hero's records from a device it has not granted) */
  confirmTurns(): Promise<void>;
  /** The site refused these heroes' records with xp_family_turn: another device holds their turn */
  turnLost(heroIds: string[]): void;
}

/** How a read of pages ended: at the newest record, with more to read, before a record changed here, or stopped */
export type PullResult = "caughtUp" | "more" | "held" | "stopped";

export interface RecordTransfer {
  /** Sends the outbox until it is empty */
  upload(): Promise<void>;
  /** Reads up to 5 pages */
  download(): Promise<PullResult>;
  /** The first pull or push while one is owed, otherwise upload then download */
  round(): Promise<void>;
  /** A hero was taken over: its queued records leave the outbox for good, and stop holding the download back */
  dropHero(heroId: string): Promise<void>;
  /** The device left the family: the bodies kept for the first push go */
  forget(): void;
}

/** Pages read per download, at most: a device that was away long catches up over a few rounds */
const MAX_PAGES = 5;
const PAGE = 100;

/** A record sealed the way a backup seals it (a profile's PINs) before it leaves this device */
const sealed = (store: string, value: unknown): unknown => {
  const clean = BACKUP_STORES.find((def) => def.name === store)?.cleanRecord;
  if (!clean) return value;
  const hasValue = value !== null && value !== undefined;
  return hasValue ? clean(value) : value;
};

/** The body a record goes up with */
const bodyToSend = (store: string, value: unknown): string => JSON.stringify(sealed(store, value));

/** A queued record as it goes now: its current value, sealed; null when it is gone (a tombstone goes instead) */
const readToSend = async (item: OutboxItem): Promise<BatchRecord | null> =>
  batchRecordOf(item, sealed(item.store, await readRawRecord(item.store, item.key)));

/** Every record of every synced store */
const everyEntry = async (): Promise<StoreEntry[]> => {
  const entries: StoreEntry[] = [];
  for (const { store } of SYNC_STORES) {
    const held = await readRawEntries(store);
    held.forEach(({ key, value }) => entries.push({ store, key, value }));
  }
  return entries;
};

export const createRecordTransfer = (ctx: TransferContext): RecordTransfer => {
  /** Record id -> the body the site sent (null for a tombstone), while the first push is owed: what not to send back */
  const received = new Map<string, string | null>();

  // --- Up ---

  /** Records the site would refuse for their size every time: logged and dropped, never retried */
  const dropOversize = async (oversize: OutboxItem[], startedIn: number): Promise<void> => {
    oversize.forEach((item) => debug.warn(`[sync] record ${item.store}/${item.key} is over 512 KB; dropped`));
    await ctx.update((current) => ({ ...current, outbox: dropItems(current.outbox, oversize) }), startedIn);
  };

  /**
   * Sends one batch; resolves to whether the queue moved (a batch the answer settles nothing of would go forever).
   * `settle` hears every record the site answered for, kept or refused: it has left the outbox for good.
   */
  const sendBatch = async (
    auth: TownHallAuth,
    deviceId: string,
    records: BatchRecord[],
    startedIn: number,
    settle: (refs: { store: string; key: string }[]) => void
  ): Promise<boolean> => {
    const result = await putRecords(auth, deviceId, records);
    let settledCount = 0;
    let takenOver: string[] = [];
    await ctx.update((current) => {
      const settled = settlePut(current.outbox, records, result);
      settledCount = current.outbox.length - settled.outbox.length;
      takenOver = settled.takenOver;
      return { ...current, outbox: settled.outbox };
    }, startedIn);
    result.refused.forEach((refused) => debug.warn(`[sync] the site refused ${refused.store}/${refused.key} (${refused.code}); dropped`));
    settle([...result.accepted, ...result.refused]);
    ctx.succeeded();
    const isTakenOver = takenOver.length > 0;
    if (isTakenOver) ctx.turnLost(takenOver);
    return settledCount > 0;
  };

  const upload = async (): Promise<void> => {
    const startedIn = ctx.generation();
    const { deviceId } = await ensureIdentity();
    const mayAsk = ctx.auth() !== null;
    if (mayAsk) await ctx.confirmTurns();
    for (;;) {
      // A hero's records wait while another device (or no device) holds the hero's turn
      const sendable = (await ctx.kept()).outbox.filter((item) => ctx.maySend(item.heroId));
      const auth = ctx.auth();
      const mayGo = auth !== null && startedIn === ctx.generation() && sendable.length > 0;
      if (!mayGo) return;
      // Each record's change mark is noted before it is read: a change made after it stays known until it goes too
      const marks = new Map<string, number | undefined>();
      const { records, oversize } = await nextBatch(sendable, (item) => {
        marks.set(recordId(item), ctx.changes.markOf(item.store, item.key));
        return readToSend(item);
      });
      const settle = (refs: { store: string; key: string }[]): void =>
        refs.forEach((ref) => ctx.changes.settled(ref.store, ref.key, marks.get(recordId(ref))));
      const hasOversize = oversize.length > 0;
      if (hasOversize) await dropOversize(oversize, startedIn);
      settle(oversize);
      const hasRecords = records.length > 0;
      const hasMoved = hasRecords ? await sendBatch(auth, deviceId, records, startedIn, settle) : hasOversize;
      if (!hasMoved) return;
    }
  };

  // --- Down ---

  /** A record changed here and not settled; this device's own rows never count (they are skipped, never landed) */
  const isChangedHere = (record: ReceivedRecord, deviceId: string): boolean => {
    const isOwn = record.deviceId !== "" && record.deviceId === deviceId;
    return !isOwn && ctx.isLocal(record.store, record.key);
  };

  /** A hero record of a hero this device does not play: the device holding the turn wrote it, and it wins */
  const isWritersCopy = (record: ReceivedRecord): boolean => record.heroId !== null && !ctx.isPlayedHere(record.heroId);

  /** The changes a writer's copy landed over leave the outbox: they were made without the turn, and are gone from the store */
  const dropReplaced = async (replaced: (StoreRef & { mark: number | undefined })[], startedIn: number): Promise<void> => {
    await ctx.update((current) => ({ ...current, outbox: dropItems(current.outbox, replaced) }), startedIn);
    replaced.forEach((ref) => {
      ctx.changes.settled(ref.store, ref.key, ref.mark);
      debug.warn(`[sync] ${ref.store}/${ref.key} was changed here without its hero's turn; the copy of the device holding it replaced it`);
    });
  };

  /** Lands a page record by record, stopping before the first one held back; answers what landed and how many */
  const landPage = async (records: ReceivedRecord[], deviceId: string, startedIn: number): Promise<{ outcome: ApplyOutcome; landed: number }> => {
    const isCollecting = ctx.owes() === "push";
    let outcome = emptyOutcome();
    let landed = 0;
    const replaced: (StoreRef & { mark: number | undefined })[] = [];
    for (const record of records) {
      const isLocal = isChangedHere(record, deviceId);
      const isHeld = isLocal && !isWritersCopy(record);
      if (isHeld) break;
      if (isLocal) replaced.push({ store: record.store, key: record.key, mark: ctx.changes.markOf(record.store, record.key) });
      if (isCollecting) received.set(recordId(record), record.deleted ? null : record.body ?? null);
      outcome = mergeOutcomes(outcome, await applyRecords([record], deviceId));
      landed += 1;
    }
    const hasReplaced = replaced.length > 0;
    if (hasReplaced) await dropReplaced(replaced, startedIn);
    try {
      await refreshMirrors(outcome);
    } catch (error) {
      // The records are in the stores; the screens read them on their next visit
      debug.warn("sync: could not refresh the mirrors", error);
    }
    return { outcome, landed };
  };

  const download = async (): Promise<PullResult> => {
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
      const { outcome, landed } = await landPage(records, deviceId, startedIn);
      // The cursor moves over what landed (or was skipped) only, so a record held back is read again
      const next = cursorAfter(since, [outcome.maxSeq]);
      const hasMoved = next > since;
      if (hasMoved) await ctx.update((current) => ({ ...current, lastSeq: Math.max(current.lastSeq, next) }), startedIn);
      ctx.pulled(landed);
      const isHeld = landed < records.length;
      if (isHeld) return "held";
      // A page whose numbers do not move the cursor (none finite) would be read again forever
      if (!hasMoved) return "caughtUp";
    }
    return "more";
  };

  /** Reads until this device has the newest record; resolves to whether it got there */
  const readToEnd = async (): Promise<boolean> => {
    for (;;) {
      const result = await download();
      const isDone = result !== "more";
      if (isDone) return result === "caughtUp";
    }
  };

  // --- The first sync ---

  /** A kid phone's first open: the family's save, then the portal may open */
  const firstPull = async (): Promise<void> => {
    const startedIn = ctx.generation();
    await upload();
    const isCaughtUp = await readToEnd();
    if (!isCaughtUp) return;
    await ctx.update((current) => ({ ...current, firstPullDone: true }), startedIn);
  };

  /**
   * A family device's first push: always the family's save first, to the end (a read cut off earlier leaves lastSeq past
   * 0, and the family's records must still land before anything goes up), then every record the family lacks or holds
   * with another body. A record that just arrived never goes back up.
   */
  const firstPush = async (): Promise<void> => {
    const startedIn = ctx.generation();
    await upload();
    const isCaughtUp = await readToEnd();
    if (!isCaughtUp) return;
    const refs = firstPushRefs(await everyEntry(), received, bodyToSend);
    await ctx.update((current) => ({ ...current, outbox: queueAll(current.outbox, refs, new Date()), firstPushDone: true }), startedIn);
    received.clear();
    await upload();
    await download();
  };

  const round = async (): Promise<void> => {
    const owed = ctx.owes();
    const isPullOwed = owed === "pull";
    if (isPullOwed) return firstPull();
    const isPushOwed = owed === "push";
    if (isPushOwed) return firstPush();
    await upload();
    await download();
  };

  const dropHero = (heroId: string): Promise<void> =>
    ctx.update((current) => {
      const isHeros = (item: OutboxItem): boolean => item.heroId === heroId;
      current.outbox.filter(isHeros).forEach((item) => ctx.changes.settled(item.store, item.key, ctx.changes.markOf(item.store, item.key)));
      return { ...current, outbox: dropWhere(current.outbox, isHeros) };
    }, ctx.generation());

  return { upload, download, round, dropHero, forget: () => received.clear() };
};
