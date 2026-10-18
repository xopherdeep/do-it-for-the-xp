import { backoff, markSending, nextBatch, settle, type QueuedEvent } from "@/lib/services/multiplayer/eventOutbox";
import type { FamilyEvent } from "@/lib/services/multiplayer/familyEvents";
import { familyProblem, retryAfterMs, sendEvents, type FamilyProblem, type SendResult } from "@/lib/services/multiplayer/familyServer";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";
import debug from "@/lib/utils/debug";

/**
 * The family store's sending (multiplayer, MP12). The send queue in FamilyEventsDb goes to the site one request at a
 * time, 50 events per request, until nothing is due or a send fails. A failed batch waits a growing pause, or as long
 * as a 429's Retry-After asked, and a timer wakes up when the first event may go again. A move of the family's home, a
 * refused link and a refused family stop sending until someone acts.
 *
 * Bound to the store the way the user store binds its persister (`stores/user/persistence.ts`): the store hands over
 * how to read and save what this device keeps, and what a move or a refusal means.
 */
/** What a sender needs of what the device keeps: the send queue (the family device's FamilyEventsDb, or a hero phone's) */
export interface KeepsOutbox {
  outbox: QueuedEvent[];
}

export interface SenderContext<S extends KeepsOutbox = KeepsOutbox> {
  /** Whether events may go: the flag is on and this device is the family's home (or a linked hero phone) */
  maySend(): boolean;
  /** The parent's sign-in while the family is linked, or the hero phone's key */
  auth(): TownHallAuth | null;
  /** What the device keeps, loaded */
  kept(): Promise<S>;
  /** Saves a change to what the device keeps, one save at a time */
  update(change: (current: S) => S): Promise<void>;
  /** The site said the family's home is another device now */
  moved(): Promise<void>;
  /** A failure that waits for the Game Master: a refused link or phone key, a family the site does not know, or one that is taken */
  refused(found: FamilyProblem): Promise<void>;
  /** The site refused these events for good (they leave the queue); a hero phone marks its claims refused */
  rejected?(ids: string[]): Promise<void>;
}

export interface FamilySender {
  /** Sends what is due, one request at a time: a call while a send runs joins it */
  flush(): Promise<void>;
  /** The connection may be back (online, the app in front): sends what waits, pauses included, but not inside a 429's */
  sendEverything(): Promise<void>;
  /** Sends in `ms`, unless a send is already set for sooner */
  sendIn(ms: number): void;
  /** The store is gone: no more timed sends */
  dispose(): void;
}

/** The failures kept as the problem: sending waits for the Game Master to link again or register the family */
const REFUSALS: FamilyProblem[] = ["unlinked", "not-member", "taken", "key-revoked"];

/** What the site is sent: the event, without the queue's own fields */
const wireEventOf = ({ id, heroId, deviceId, kind, at, data }: QueuedEvent): FamilyEvent => ({ id, heroId, deviceId, kind, at, data });

/** When the first queued event may go (now, for one with no pause), or null when nothing is queued */
const nextTryOf = (outbox: QueuedEvent[], now: number): number | null => {
  const times = outbox.filter((e) => e.status === "queued").map((e) => e.nextTryAt ?? now);
  const isEmpty = times.length === 0;
  return isEmpty ? null : Math.min(...times);
};

export const createFamilySender = <S extends KeepsOutbox>(ctx: SenderContext<S>): FamilySender => {
  let sending: Promise<void> | null = null;
  /** A 429 asked for a pause until this time (ms since the epoch) */
  let heldUntil = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timerAt = Number.POSITIVE_INFINITY;
  let disposed = false;

  const cancelTimer = (): void => {
    clearTimeout(timer);
    timer = undefined;
    timerAt = Number.POSITIVE_INFINITY;
  };

  const sendIn = (ms: number): void => {
    const delay = Math.max(0, ms);
    const at = Date.now() + delay;
    const isSoonerSet = timerAt <= at;
    const isNeeded = !disposed && !isSoonerSet;
    if (!isNeeded) return;
    cancelTimer();
    timerAt = at;
    timer = setTimeout(() => {
      cancelTimer();
      flush().catch((error) => debug.warn("family: a timed send failed", error));
    }, delay);
  };

  /** Wakes up when the first event waiting out its pause may go */
  const sendWhenDue = async (): Promise<void> => {
    const now = Date.now();
    const next = nextTryOf((await ctx.kept()).outbox, now);
    const isWaiting = next !== null;
    if (!isWaiting) return;
    sendIn(next - now);
  };

  /** The answer settles the batch; an event it does not mention goes back to queued with a pause, never left sending */
  const settleBatch = async (ids: string[], result: SendResult): Promise<void> => {
    for (const rejection of result.rejected) debug.warn(`family: the site refused event ${rejection.id} (${rejection.code})`, rejection.message);
    await ctx.update((current) => {
      const outbox = settle(current.outbox, result);
      const unanswered = ids.filter((id) => outbox.some((e) => e.id === id));
      return { ...current, outbox: backoff(outbox, unanswered, Date.now()) };
    });
    const hasRejections = result.rejected.length > 0;
    const wantsRejections = hasRejections && Boolean(ctx.rejected);
    if (wantsRejections) await ctx.rejected?.(result.rejected.map((rejection) => rejection.id));
  };

  /** The send failed: the batch waits (as long as a 429 asked); a move or a refusal stops sending */
  const sendFailed = async (ids: string[], error: unknown): Promise<void> => {
    const found = familyProblem(error);
    const wait = found === "rate-limited" ? retryAfterMs(error) : undefined;
    heldUntil = Math.max(heldUntil, Date.now() + (wait ?? 0));
    await ctx.update((current) => ({ ...current, outbox: backoff(current.outbox, ids, Date.now(), wait) }));
    const isMoved = found === "moved";
    const isRefused = REFUSALS.includes(found);
    const isUnexplained = found === "server";
    if (isMoved) return ctx.moved();
    if (isRefused) return ctx.refused(found);
    if (isUnexplained) debug.warn("family: the site could not take the events", error);
    await sendWhenDue();
  };

  /** Sends one batch and settles it; false when the send failed, which ends the run */
  const sendBatch = async (auth: TownHallAuth, batch: QueuedEvent[]): Promise<boolean> => {
    const ids = batch.map((e) => e.id);
    await ctx.update((current) => ({ ...current, outbox: markSending(current.outbox, ids) }));
    let result: SendResult;
    try {
      result = await sendEvents(auth, batch.map(wireEventOf));
    } catch (error) {
      await sendFailed(ids, error);
      return false;
    }
    await settleBatch(ids, result);
    return true;
  };

  /** The next batch: events not yet tried in this run, due now (or every queued one when pauses are ignored) */
  const batchOf = (outbox: QueuedEvent[], tried: Set<string>, ignoresPauses: boolean): QueuedEvent[] => {
    const untried = outbox.filter((e) => !tried.has(e.id));
    const now = ignoresPauses ? Number.POSITIVE_INFINITY : Date.now();
    return nextBatch(untried, now);
  };

  /** Batches until nothing is due (true) or the run has to stop (false): a failed send, home moved, the link gone */
  const sendAll = async (auth: TownHallAuth, ignoresPauses: boolean): Promise<boolean> => {
    const tried = new Set<string>();
    for (;;) {
      const mayGoOn = ctx.maySend() && ctx.auth() !== null;
      if (!mayGoOn) return false;
      const batch = batchOf((await ctx.kept()).outbox, tried, ignoresPauses);
      const isEmpty = batch.length === 0;
      if (isEmpty) return true;
      batch.forEach((e) => tried.add(e.id));
      const isSent = await sendBatch(auth, batch);
      if (!isSent) return false;
    }
  };

  const runSend = async (everything: boolean): Promise<void> => {
    const auth = ctx.auth();
    if (!auth) return;
    const mayStart = ctx.maySend();
    if (!mayStart) return;
    // This run covers what is due now; it sets the next timed send itself for what still waits
    cancelTimer();
    const ignoresPauses = everything && Date.now() >= heldUntil;
    const isDone = await sendAll(auth, ignoresPauses);
    if (isDone) await sendWhenDue();
  };

  const sendInTurn = (everything: boolean): Promise<void> => {
    if (!sending) {
      sending = runSend(everything).finally(() => {
        sending = null;
      });
    }
    return sending;
  };

  const flush = (): Promise<void> => sendInTurn(false);
  const sendEverything = (): Promise<void> => sendInTurn(true);
  const dispose = (): void => {
    disposed = true;
    cancelTimer();
  };

  return { flush, sendEverything, sendIn, dispose };
};
