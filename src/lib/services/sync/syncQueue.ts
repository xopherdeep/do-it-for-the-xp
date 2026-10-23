/**
 * The sync store's pure pieces (section 4 of the family sync spec): a stored record made ready to send, records queued at
 * once (a restore, the first push), what the first push sends, and the outcomes of records landed one by one. Nothing here
 * reads a store or talks to the site.
 */
import type { OutboxItem } from "@/lib/databases/SyncDb";
import type { ApplyOutcome } from "./recordApply";
import type { BatchRecord } from "./recordOutbox";
import { heroIdOf } from "./syncScopes";

/** A record to queue: where it lives, and the hero it belongs to (null for a family record) */
export interface QueueRef {
  store: string;
  key: string;
  heroId: string | null;
}

/** A record as a store holds it */
export interface StoreEntry {
  store: string;
  key: string;
  value: unknown;
}

/** One name per record, store and key together: the same key in two stores is two records */
export const recordId = (record: { store: string; key: string }): string => JSON.stringify([record.store, record.key]);

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

/** The cursor after a page: the highest of the numbers given, never lower than where it was */
export const cursorAfter = (current: number, newest: (number | null)[]): number =>
  newest.reduce<number>((cursor, seq) => (seq === null ? cursor : Math.max(cursor, seq)), current);

/** An outcome with nothing landed yet */
export const emptyOutcome = (): ApplyOutcome => ({ applied: 0, skipped: 0, stores: [], heroes: [], removedProfiles: [], maxSeq: null });

const union = (a: string[], b: string[]): string[] => Array.from(new Set([...a, ...b]));

/** Two outcomes as one, `b` landed after `a` */
export const mergeOutcomes = (a: ApplyOutcome, b: ApplyOutcome): ApplyOutcome => {
  const seqs = [a.maxSeq, b.maxSeq].filter((seq): seq is number => seq !== null);
  const hasSeq = seqs.length > 0;
  return {
    applied: a.applied + b.applied,
    skipped: a.skipped + b.skipped,
    stores: union(a.stores, b.stores),
    heroes: union(a.heroes, b.heroes),
    removedProfiles: union(a.removedProfiles, b.removedProfiles),
    maxSeq: hasSeq ? Math.max(...seqs) : null,
  };
};

/**
 * What a family device's first push sends, after it has read the family's save to the end: each record the save did not
 * deliver, or delivered with another body (`received` maps a record id to the body the site sent, null for a tombstone).
 * A record that arrived and was not changed here since is the family's own copy, and never goes back up.
 */
export const firstPushRefs = (
  entries: StoreEntry[],
  received: ReadonlyMap<string, string | null>,
  bodyOf: (store: string, value: unknown) => string
): QueueRef[] =>
  entries
    .filter((entry) => received.get(recordId(entry)) !== bodyOf(entry.store, entry.value))
    .map(({ store, key, value }) => ({ store, key, heroId: heroIdOf(store, key, value) }));
