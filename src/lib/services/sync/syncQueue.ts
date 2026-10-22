/**
 * The sync store's pure pieces (section 4 of the family sync spec): a stored record made ready to send, every record of the
 * synced stores queued at once for the first push or a restore, and a downloaded page split into what may land and what a
 * local change still waiting in the outbox supersedes. Nothing here reads a store or talks to the site.
 */
import type { OutboxItem } from "@/lib/databases/SyncDb";
import type { ReceivedRecord } from "./familySyncClient";
import type { BatchRecord } from "./recordOutbox";

/** A record to queue: where it lives, and the hero it belongs to (null for a family record) */
export interface QueueRef {
  store: string;
  key: string;
  heroId: string | null;
}

/** One name per record, store and key together: the same key in two stores is two records */
const recordId = (record: { store: string; key: string }): string => JSON.stringify([record.store, record.key]);

/**
 * A queued record as it goes, from the value its store holds now: the body is the record as a JSON string, measured in
 * UTF-8 bytes as the site measures it (an accented letter is two, an emoji four), and the hero is the one the queue kept.
 * Null when the store holds nothing under the key: the record is gone, and nextBatch sends a tombstone in its place.
 */
export const batchRecordOf = (item: OutboxItem, value: unknown): BatchRecord | null => {
  const isGone = value === null || value === undefined;
  if (isGone) return null;
  const body = JSON.stringify(value);
  const bytes = new TextEncoder().encode(body).length;
  return { store: item.store, key: item.key, heroId: item.heroId, deleted: false, body, item, bytes };
};

/**
 * Every record queued once, after what already waits: a record already queued is replaced and goes to the end, as
 * enqueueKey does for one change, in one pass however many records there are
 */
export const queueAll = (outbox: OutboxItem[], refs: QueueRef[], now: Date): OutboxItem[] => {
  const queuedAt = now.toISOString();
  const incoming = new Map(refs.map((ref) => [recordId(ref), ref]));
  const kept = outbox.filter((item) => !incoming.has(recordId(item)));
  const added = Array.from(incoming.values(), ({ store, key, heroId }) => ({ store, key, heroId, queuedAt }));
  return [...kept, ...added];
};

/**
 * A downloaded page split in two, keeping its order: the records that may land, and the ones whose key waits in the outbox.
 * A waiting key holds a local change the site has not seen; the upload reads it at send time, so the site's older copy must
 * not land over it first.
 */
export const holdBackQueued = (records: ReceivedRecord[], outbox: OutboxItem[]): { toApply: ReceivedRecord[]; heldBack: ReceivedRecord[] } => {
  const waiting = new Set(outbox.map(recordId));
  const toApply: ReceivedRecord[] = [];
  const heldBack: ReceivedRecord[] = [];
  records.forEach((record) => (waiting.has(recordId(record)) ? heldBack : toApply).push(record));
  return { toApply, heldBack };
};

/** The highest finite number among these records, or null when none has one */
export const newestSeqOf = (records: ReceivedRecord[]): number | null => {
  const numbers = records.map((record) => record.seq).filter((seq) => Number.isFinite(seq));
  const hasNumber = numbers.length > 0;
  return hasNumber ? Math.max(...numbers) : null;
};

/** The cursor after a page: the highest of the numbers given, never lower than where it was */
export const cursorAfter = (current: number, newest: (number | null)[]): number =>
  newest.reduce<number>((cursor, seq) => (seq === null ? cursor : Math.max(cursor, seq)), current);
