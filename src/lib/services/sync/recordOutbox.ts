/**
 * The send queue for Family Sync records, as pure functions over a list, in the manner of eventOutbox.ts. The queue holds the
 * store and key of each changed record, never its value: the value is read when a batch is made, so a key changed twice is
 * sent once, with its latest value. A key is in the queue once; a later change replaces the earlier one and goes to the end.
 * Every function returns a new list and leaves the one it was given alone.
 *
 * A key leaves the queue when the site answers for it, accepted or refused: a refusal is final (the site would say the same
 * again), so a refused key is never put back. A key the answer does not mention stays, and goes again. Nothing here talks to the
 * site or reads a store: the caller does, and hands the results in.
 */
import type { OutboxItem } from "@/lib/databases/SyncDb";
import { MAX_BATCH_BYTES, MAX_RECORD_BATCH, MAX_RECORD_BYTES, type PutResult, type WireRecord } from "./familySyncClient";

/** The code the site refuses a record with when the writing device does not hold the record's hero's turn */
const TURN_REFUSAL = "xp_family_turn";

/** A record ready to send, with the queue item it came from and the byte length of its body */
export interface BatchRecord extends WireRecord {
  item: OutboxItem;
  /** The UTF-8 byte length of `body`; 0 for a tombstone */
  bytes: number;
}

export interface BatchLimits {
  /** Most records in one put */
  count: number;
  /** Most bytes in one put, all bodies together */
  bytes: number;
  /** Most bytes in one record's body; a record over it is never sent */
  record: number;
}

export const DEFAULT_BATCH_LIMITS: BatchLimits = { count: MAX_RECORD_BATCH, bytes: MAX_BATCH_BYTES, record: MAX_RECORD_BYTES };

/** A record named by its store and key */
interface RecordRef {
  store: string;
  key: string;
}

const isSameRecord = (a: RecordRef, b: RecordRef): boolean => a.store === b.store && a.key === b.key;

/** Queues a changed record; one already queued is replaced by this change (the newest hero and time) and moves to the end */
export const enqueueKey = (outbox: OutboxItem[], store: string, key: string, heroId: string | null, now: Date): OutboxItem[] => [
  ...outbox.filter((queued) => !isSameRecord(queued, { store, key })),
  { store, key, heroId, queuedAt: now.toISOString() },
];

/** The queue without these records, whatever time they were queued at */
export const dropItems = (outbox: OutboxItem[], items: RecordRef[]): OutboxItem[] =>
  outbox.filter((queued) => !items.some((gone) => isSameRecord(queued, gone)));

/** The queue without the items the test picks */
export const dropWhere = (outbox: OutboxItem[], pred: (item: OutboxItem) => boolean): OutboxItem[] => outbox.filter((queued) => !pred(queued));

/** A record that no longer exists here, to be removed on the site: no body, and the hero the queue item kept */
const tombstoneOf = (item: OutboxItem): BatchRecord => ({
  store: item.store,
  key: item.key,
  heroId: item.heroId,
  deleted: true,
  item,
  bytes: 0,
});

/**
 * The next records to send, in queue order. `read` gives a record's current form, or null when it is gone (it is then sent
 * as a tombstone, never dropped). A record over the per-record cap is set aside in `oversize` and left out: it would be refused
 * every time, so the caller reports it and drops it. The batch stops before the record that would pass the count or the byte
 * total, and does not skip ahead to a smaller one, so the order of changes holds.
 */
export const nextBatch = async (
  outbox: OutboxItem[],
  read: (item: OutboxItem) => Promise<BatchRecord | null>,
  limits: BatchLimits = DEFAULT_BATCH_LIMITS,
): Promise<{ records: BatchRecord[]; oversize: OutboxItem[] }> => {
  const records: BatchRecord[] = [];
  const oversize: OutboxItem[] = [];
  let total = 0;
  for (const queued of outbox) {
    const isBatchFull = records.length >= limits.count;
    if (isBatchFull) break;
    const record = (await read(queued)) ?? tombstoneOf(queued);
    const isOversize = record.bytes > limits.record;
    if (isOversize) {
      oversize.push(queued);
      continue;
    }
    const wouldPassTotal = total + record.bytes > limits.bytes;
    if (wouldPassTotal) break;
    records.push(record);
    total += record.bytes;
  }
  return { records, oversize };
};

/** A queue item as it was when it was sent: a key queued again since has a newer time and is a different change */
const stampOf = (item: OutboxItem): string => JSON.stringify([item.store, item.key, item.queuedAt]);

const sentKey = (ref: RecordRef): string => JSON.stringify([ref.store, ref.key]);

/**
 * The site answered a put. Every record it accepted or refused leaves the queue, unless the key was changed again while the put
 * was out (that newer change has not been sent). `takenOver` lists, once each, the heroes whose records were refused because
 * another device holds their turn. `refusedRecords` hands back every refused record with its code, so the caller can answer to
 * a refusal it cares about (a claim refused in a takeover is sent again as pending). An answer about a record that was not in
 * this put is ignored.
 */
export const settlePut = (
  outbox: OutboxItem[],
  sent: BatchRecord[],
  result: PutResult,
): { outbox: OutboxItem[]; takenOver: string[]; refusedRecords: (BatchRecord & { code: string })[] } => {
  const sentBy = new Map(sent.map((record) => [sentKey(record), record]));
  const accepted = result.accepted.flatMap((answer) => sentBy.get(sentKey(answer)) ?? []);
  const refusedRecords = result.refused.flatMap((answer) => {
    const record = sentBy.get(sentKey(answer));
    return record ? [{ ...record, code: answer.code }] : [];
  });
  const settled = new Set([...accepted, ...refusedRecords].map((record) => stampOf(record.item)));
  const takenOver = refusedRecords.flatMap(({ code, heroId }) => {
    const isTakeover = code === TURN_REFUSAL && heroId !== null;
    return isTakeover ? [heroId as string] : [];
  });
  return {
    outbox: outbox.filter((queued) => !settled.has(stampOf(queued))),
    takenOver: Array.from(new Set(takenOver)),
    refusedRecords,
  };
};
