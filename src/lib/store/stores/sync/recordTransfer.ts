import type { OutboxItem, SyncState } from "@/lib/databases/SyncDb";
import { BACKUP_STORES } from "@/lib/services/core/BackupService";
import { ensureIdentity } from "@/lib/services/pro/familyIdentity";
import { fetchRecords, putRecords, type ReceivedRecord } from "@/lib/services/sync/familySyncClient";
import type { LocalChanges } from "@/lib/services/sync/localChanges";
import { emitRecordsLanded } from "@/lib/services/sync/recordSignals";
import { applyRecords, rawTargetFor, readRawEntries, readRawRecord, refreshMirrors, type ApplyOutcome } from "@/lib/services/sync/recordApply";
import { dropItems, dropWhere, nextBatch, settlePut, type BatchRecord } from "@/lib/services/sync/recordOutbox";
import { heroIdOf, scopeOf, SYNC_STORES } from "@/lib/services/sync/syncScopes";
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
 * `xp_family_turn` names the heroes another device took over (`turnLost`). The changes a takeover or a Not now drops
 * (`dropHero`) are repaired by the next read: it reads the family's records from the start once and lands the site's
 * copy of each dropped key, from any device, over what was played here (a key the site never had is removed), so the
 * copy here is the holder's again even where this device had already read past the holder's row.
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
  /** The first push started (0), has sent so many records, or ended (null) */
  pushing(total: number | null): void;
  /** A kid phone's own hero's profile is here (its first pull is done only then); always true on a family device */
  hasArrived(): Promise<boolean>;
  /** Whether a queued record may go now: a family record always, a hero's while this device holds the hero's turn */
  maySend(heroId: string | null): boolean;
  /** Whether this device keeps its changes to the hero (held here, or waiting on the player's busy answer); otherwise a
   *  received record of that hero lands over a change made here */
  isPlayedHere(heroId: string): boolean;
  /** Before a send: holds made offline ask the site again (the site refuses a hero's records from a device it has not granted) */
  confirmTurns(): Promise<void>;
  /** The site refused these heroes' records with xp_family_turn: another device holds their turn */
  turnLost(heroIds: string[]): void;
  /** Every record the site refused in a put, with its code and the body it went with (a claim lost to a takeover goes again) */
  refused(records: (BatchRecord & { code: string })[]): void;
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
  /** A round that reads on until this device has the newest record (a hero's turn just taken); false when it could not get there */
  catchUp(): Promise<boolean>;
  /** Reads until this device has the newest record, from inside a lane job (a confirm before a send); false when it could not */
  readToEnd(): Promise<boolean>;
  /** A hero was taken over: its queued records leave the outbox for good, and stop holding the download back; answers them */
  dropHero(heroId: string): Promise<OutboxItem[]>;
  /** Every record of the hero this device holds goes in the outbox: its copy goes up whole (the holder's copy is the truth) */
  queueHero(heroId: string): Promise<void>;
  /** The device left the family: the bodies kept for the first push go */
  forget(): void;
}

const TURN_REFUSAL = "xp_family_turn";

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
  /** Record id -> a change a takeover or a Not now dropped: the next read lands the site's copy over it */
  const repairs = new Map<string, StoreRef>();

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
    let refusedRecords: (BatchRecord & { code: string })[] = [];
    await ctx.update((current) => {
      const settled = settlePut(current.outbox, records, result);
      settledCount = current.outbox.length - settled.outbox.length;
      takenOver = settled.takenOver;
      refusedRecords = settled.refusedRecords;
      return { ...current, outbox: settled.outbox };
    }, startedIn);
    result.refused.forEach((refused) => debug.warn(`[sync] the site refused ${refused.store}/${refused.key} (${refused.code}); dropped`));
    settle([...result.accepted, ...result.refused]);
    ctx.succeeded();
    // A record refused because another device took its hero: the next read lands the holder's copy over it
    refusedRecords.filter((record) => record.code === TURN_REFUSAL).forEach((record) => repairs.set(recordId(record), { store: record.store, key: record.key }));
    const hasRefused = refusedRecords.length > 0;
    if (hasRefused) ctx.refused(refusedRecords);
    const isTakenOver = takenOver.length > 0;
    if (isTakenOver) ctx.turnLost(takenOver);
    return settledCount > 0;
  };

  /** Sends the outbox until it is empty; `onSent` hears how many records each batch carried */
  const upload = async (onSent?: (count: number) => void): Promise<void> => {
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
      if (hasRecords) onSent?.(records.length);
      if (!hasMoved) return;
    }
  };

  // --- Down ---

  /** A record changed here and not settled; this device's own rows never count (they are skipped, never landed) */
  const isChangedHere = (record: ReceivedRecord, deviceId: string): boolean => {
    const isOwn = record.deviceId !== "" && record.deviceId === deviceId;
    return !isOwn && ctx.isLocal(record.store, record.key);
  };

  /**
   * A hero record of a hero this device does not play: the device holding the turn wrote it, and it wins. An any-writer
   * row carries the hero of the phone that wrote it, but no turn: it follows the held-back rule like a family record
   */
  const isWritersCopy = (record: ReceivedRecord): boolean => {
    const isHeroRecord = record.heroId !== null && scopeOf(record.store) === "hero";
    return isHeroRecord && !ctx.isPlayedHere(record.heroId as string);
  };

  /** The changes a writer's copy landed over leave the outbox: they were made without the turn, and are gone from the store */
  const dropReplaced = async (replaced: (StoreRef & { mark: number | undefined })[], startedIn: number): Promise<void> => {
    await ctx.update((current) => ({ ...current, outbox: dropItems(current.outbox, replaced) }), startedIn);
    replaced.forEach((ref) => {
      ctx.changes.settled(ref.store, ref.key, ref.mark);
      debug.warn(`[sync] ${ref.store}/${ref.key} was changed here without its hero's turn; the copy of the device holding it replaced it`);
    });
  };

  /**
   * Lands a page record by record, stopping before the first one held back; answers what landed and how many. The keys
   * that landed are announced per store once the page is in (`recordsLanded`), so the copies held in memory read them again
   */
  const landPage = async (records: ReceivedRecord[], deviceId: string, startedIn: number): Promise<{ outcome: ApplyOutcome; landed: number }> => {
    const isCollecting = ctx.owes() === "push";
    let outcome = emptyOutcome();
    let landed = 0;
    const replaced: (StoreRef & { mark: number | undefined })[] = [];
    const landedKeys = new Map<string, string[]>();
    for (const record of records) {
      const isLocal = isChangedHere(record, deviceId);
      const isHeld = isLocal && !isWritersCopy(record);
      if (isHeld) break;
      if (isLocal) replaced.push({ store: record.store, key: record.key, mark: ctx.changes.markOf(record.store, record.key) });
      if (isCollecting) received.set(recordId(record), record.deleted ? null : record.body ?? null);
      const applied = await applyRecords([record], deviceId);
      outcome = mergeOutcomes(outcome, applied);
      const hasLanded = applied.applied > 0;
      if (hasLanded) landedKeys.set(record.store, [...(landedKeys.get(record.store) ?? []), record.key]);
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
    landedKeys.forEach((keys, store) => emitRecordsLanded({ store, keys }));
    return { outcome, landed };
  };

  /** Every page of the family's records from the start: the copies of the keys asked for, or null when it was stopped */
  const readAllFor = async (auth: TownHallAuth, wanted: Map<string, StoreRef>, startedIn: number): Promise<ReceivedRecord[] | null> => {
    const found: ReceivedRecord[] = [];
    let since = 0;
    for (;;) {
      const page = await fetchRecords(auth, since, PAGE);
      const isStopped = startedIn !== ctx.generation();
      if (isStopped) return null;
      found.push(...page.filter((record) => wanted.has(recordId(record))));
      const next = Math.max(since, ...page.map((record) => record.seq).filter(Number.isFinite));
      const isEnd = next <= since;
      if (isEnd) return found;
      since = next;
    }
  };

  /** The dropped changes: the site's copy of each lands (from any device), and a key the site never had is removed */
  const repairDropped = async (startedIn: number): Promise<void> => {
    const auth = ctx.auth();
    const isDue = repairs.size > 0 && auth !== null;
    if (!isDue) return;
    const wanted = new Map(repairs);
    const found = await readAllFor(auth as TownHallAuth, wanted, startedIn);
    if (!found) return;
    const isChangedAgain = (ref: StoreRef): boolean => ctx.isLocal(ref.store, ref.key);
    const landedKeys = new Map<string, string[]>();
    for (const record of found.filter((each) => !isChangedAgain(each))) {
      // An empty device id lands this device's own rows too: what it played meanwhile was dropped
      await applyRecords([record], "");
      landedKeys.set(record.store, [...(landedKeys.get(record.store) ?? []), record.key]);
      wanted.delete(recordId(record));
    }
    for (const ref of Array.from(wanted.values()).filter((each) => !isChangedAgain(each))) await rawTargetFor(ref.store)?.remove(ref.key);
    Array.from(repairs.keys()).forEach((id) => repairs.delete(id));
    landedKeys.forEach((keys, store) => emitRecordsLanded({ store, keys }));
  };

  const download = async (): Promise<PullResult> => {
    const startedIn = ctx.generation();
    const { deviceId } = await ensureIdentity();
    await repairDropped(startedIn);
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

  /** A kid phone's first open: the family's save, then the portal may open, once its hero has arrived (each round reads on until then) */
  const firstPull = async (): Promise<void> => {
    const startedIn = ctx.generation();
    await upload();
    const isCaughtUp = await readToEnd();
    const isDone = isCaughtUp && (await ctx.hasArrived());
    if (!isDone) return;
    await ctx.update((current) => ({ ...current, firstPullDone: true }), startedIn);
  };

  /**
   * A family device's first push: always the family's save first, to the end (a read cut off earlier leaves lastSeq past
   * 0, and the family's records must still land before anything goes up), then every record the family lacks or holds
   * with another body. A record that just arrived never goes back up.
   */
  const firstPush = async (): Promise<void> => {
    const startedIn = ctx.generation();
    let total = 0;
    ctx.pushing(total);
    try {
      await upload();
      const isCaughtUp = await readToEnd();
      if (!isCaughtUp) return;
      const refs = firstPushRefs(await everyEntry(), received, bodyToSend);
      await ctx.update((current) => ({ ...current, outbox: queueAll(current.outbox, refs, new Date()), firstPushDone: true }), startedIn);
      received.clear();
      await upload((count) => {
        total += count;
        ctx.pushing(total);
      });
      await download();
    } finally {
      ctx.pushing(null);
    }
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

  const catchUp = async (): Promise<boolean> => {
    const isOwed = ctx.owes() !== null;
    if (isOwed) await round();
    else await upload();
    return readToEnd();
  };

  const dropHero = async (heroId: string): Promise<OutboxItem[]> => {
    let dropped: OutboxItem[] = [];
    await ctx.update((current) => {
      const isHeros = (item: OutboxItem): boolean => item.heroId === heroId;
      dropped = current.outbox.filter(isHeros);
      dropped.forEach((item) => ctx.changes.settled(item.store, item.key, ctx.changes.markOf(item.store, item.key)));
      dropped.forEach((item) => repairs.set(recordId(item), { store: item.store, key: item.key }));
      return { ...current, outbox: dropWhere(current.outbox, isHeros) };
    }, ctx.generation());
    return dropped;
  };

  const queueHero = async (heroId: string): Promise<void> => {
    const refs = (await everyEntry())
      .filter(({ store, key, value }) => heroIdOf(store, key, value) === heroId)
      .map(({ store, key }) => ({ store, key, heroId }));
    await ctx.update((current) => ({ ...current, outbox: queueAll(current.outbox, refs, new Date()) }), ctx.generation());
  };

  const forget = (): void => {
    received.clear();
    repairs.clear();
  };

  return { upload: () => upload(), download, round, catchUp, readToEnd, dropHero, queueHero, forget };
};
