/**
 * The send queue for family events, as pure functions over a list. Game events only get appended, so they wait here
 * (unlike the Town Hall's posts, which wait for approvals): `queued` until a send takes them, `sending` while a
 * request is out. Every function returns a new list and leaves the one it was given alone.
 *
 * An event leaves the queue when the server lists it as accepted, duplicate or rejected. A failed send puts the batch
 * back with a growing pause (or the pause the server asked for). An event still `sending` when the app starts goes
 * back to `queued`, because the answer may never have been read.
 */
import type { FamilyEvent } from "./familyEvents";
import type { SendResult } from "./familyServer";

export interface QueuedEvent extends FamilyEvent {
  status: "queued" | "sending";
  tries: number;
  /** Not before this time (ms since the epoch); missing means now */
  nextTryAt?: number;
}

/** The most events one request carries (the server refuses more) */
export const MAX_BATCH = 50;

/** The pauses after a failed send, by try: 5 seconds, 30 seconds, 2 minutes, 10 minutes, then 30 minutes */
const BACKOFF_MS = [5_000, 30_000, 120_000, 600_000, 1_800_000];

export const backoffMs = (tries: number): number => {
  const index = Math.min(Math.max(tries, 1), BACKOFF_MS.length) - 1;
  return BACKOFF_MS[index];
};

/** Adds an event, unless one with its id is already waiting */
export const enqueue = (outbox: QueuedEvent[], e: FamilyEvent): QueuedEvent[] => {
  const isWaiting = outbox.some((queued) => queued.id === e.id);
  if (isWaiting) return outbox.slice();
  return [...outbox, { ...e, status: "queued", tries: 0 }];
};

/** After a start: whatever was out when the app closed is queued again, and due now */
export const resetSending = (outbox: QueuedEvent[]): QueuedEvent[] =>
  outbox.map((e) => {
    const wasOut = e.status === "sending";
    if (!wasOut) return { ...e };
    const { nextTryAt: _held, ...rest } = e;
    return { ...rest, status: "queued" };
  });

const timeOf = (e: FamilyEvent): number => {
  const time = Date.parse(e.at);
  return Number.isNaN(time) ? 0 : time;
};

const isDue = (e: QueuedEvent, now: number): boolean => {
  const isWaiting = e.status === "queued";
  const isReady = (e.nextTryAt ?? 0) <= now;
  return isWaiting && isReady;
};

/** The next events to send: queued and due, oldest first, at most `max` */
export const nextBatch = (outbox: QueuedEvent[], now: number, max = MAX_BATCH): QueuedEvent[] =>
  outbox
    .filter((e) => isDue(e, now))
    .sort((a, b) => timeOf(a) - timeOf(b))
    .slice(0, max);

export const markSending = (outbox: QueuedEvent[], ids: string[]): QueuedEvent[] =>
  outbox.map((e) => (ids.includes(e.id) ? { ...e, status: "sending" } : { ...e }));

/** The server answered: accepted, duplicate and rejected events are done (a rejection is final), the rest stay */
export const settle = (outbox: QueuedEvent[], r: SendResult): QueuedEvent[] => {
  const done = new Set([...r.accepted, ...r.duplicate, ...r.rejected.map((rejection) => rejection.id)]);
  return outbox.filter((e) => !done.has(e.id));
};

/** The send failed: the events go back to queued with one more try, to wait `retryAfterMs` or the next growing pause */
export const backoff = (outbox: QueuedEvent[], ids: string[], now: number, retryAfterMs?: number): QueuedEvent[] =>
  outbox.map((e) => {
    const isFailed = ids.includes(e.id);
    if (!isFailed) return { ...e };
    const tries = e.tries + 1;
    return { ...e, status: "queued", tries, nextTryAt: now + (retryAfterMs ?? backoffMs(tries)) };
  });
