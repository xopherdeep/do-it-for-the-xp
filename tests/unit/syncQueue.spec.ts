import { TextEncoder } from "util";
import type { OutboxItem } from "@/lib/databases/SyncDb";
import type { ReceivedRecord } from "@/lib/services/sync/familySyncClient";
import { batchRecordOf, cursorAfter, holdBackQueued, newestSeqOf, queueAll } from "@/lib/services/sync/syncQueue";

// jsdom has no TextEncoder; the browser and the app's WebView do
Object.assign(globalThis, { TextEncoder });

const NOW = new Date("2026-10-22T10:00:00.000Z");
const EARLIER = "2026-10-22T09:00:00.000Z";

const item = (store: string, key: string, heroId: string | null = null, queuedAt = EARLIER): OutboxItem => ({ store, key, heroId, queuedAt });

const received = (store: string, key: string, seq: number): ReceivedRecord => ({
  store,
  key,
  heroId: null,
  deleted: false,
  body: JSON.stringify({ id: key }),
  seq,
  deviceId: "device-other",
  savedAt: "2026-10-22T10:00:00.000Z",
});

describe("batchRecordOf", () => {
  it("sends the record as a JSON string with the hero the queue kept", () => {
    const queued = item("__questLog", "q1", "h-1");
    const record = batchRecordOf(queued, { id: "q1", userId: "h-1" });

    expect(record).toEqual({
      store: "__questLog",
      key: "q1",
      heroId: "h-1",
      deleted: false,
      body: '{"id":"q1","userId":"h-1"}',
      item: queued,
      bytes: 26,
    });
  });

  it("measures the body in UTF-8 bytes, not in characters", () => {
    const record = batchRecordOf(item("__chat", "c1"), { text: "é🐉" });

    // {"text":"é🐉"} has a .length of 14; in UTF-8 it is 11 plain bytes, 2 for the é and 4 for the dragon
    expect(record?.body).toBe('{"text":"é🐉"}');
    expect(record?.body).toHaveLength(14);
    expect(record?.bytes).toBe(17);
  });

  it("is nothing when the store holds nothing under the key, so a tombstone goes instead", () => {
    expect(batchRecordOf(item("__beasts", "b1"), null)).toBeNull();
    expect(batchRecordOf(item("__beasts", "b1"), undefined)).toBeNull();
  });
});

describe("queueAll", () => {
  it("queues every record once, after what already waits, at one time", () => {
    const waiting = [item("__chat", "c1")];

    const outbox = queueAll(waiting, [
      { store: "__beasts", key: "b1", heroId: null },
      { store: "__profiles", key: "h-1", heroId: "h-1" },
    ], NOW);

    expect(outbox).toEqual([
      item("__chat", "c1"),
      item("__beasts", "b1", null, NOW.toISOString()),
      item("__profiles", "h-1", "h-1", NOW.toISOString()),
    ]);
  });

  it("replaces a key that already waits, as a later change does, and names a key once", () => {
    const waiting = [item("__beasts", "b1"), item("__chat", "c1")];

    const outbox = queueAll(waiting, [
      { store: "__beasts", key: "b1", heroId: null },
      { store: "__beasts", key: "b1", heroId: null },
    ], NOW);

    expect(outbox).toEqual([item("__chat", "c1"), item("__beasts", "b1", null, NOW.toISOString())]);
  });

  it("tells stores apart: the same key in two stores is two records", () => {
    const outbox = queueAll([item("__beasts", "x")], [{ store: "__chat", key: "x", heroId: null }], NOW);

    expect(outbox.map((queued) => `${queued.store}/${queued.key}`)).toEqual(["__beasts/x", "__chat/x"]);
  });

  it("leaves the queue it was given alone", () => {
    const waiting = [item("__beasts", "b1")];
    queueAll(waiting, [{ store: "__beasts", key: "b1", heroId: null }], NOW);
    expect(waiting).toEqual([item("__beasts", "b1")]);
  });
});

describe("holdBackQueued", () => {
  it("holds back the records whose key waits in the outbox, and lets the rest land in order", () => {
    const page = [received("__beasts", "b1", 4), received("__beasts", "b2", 5), received("__chat", "b1", 6)];

    const { toApply, heldBack } = holdBackQueued(page, [item("__beasts", "b1")]);

    expect(toApply.map((r) => r.seq)).toEqual([5, 6]);
    expect(heldBack.map((r) => r.seq)).toEqual([4]);
  });

  it("holds nothing back when nothing waits", () => {
    const page = [received("__beasts", "b1", 4)];
    expect(holdBackQueued(page, [])).toEqual({ toApply: page, heldBack: [] });
  });
});

describe("newestSeqOf and cursorAfter", () => {
  it("newestSeqOf is the highest finite number, or null", () => {
    expect(newestSeqOf([received("__beasts", "a", 3), received("__beasts", "b", 9), received("__beasts", "c", NaN)])).toBe(9);
    expect(newestSeqOf([received("__beasts", "c", Number.POSITIVE_INFINITY)])).toBeNull();
    expect(newestSeqOf([])).toBeNull();
  });

  it("cursorAfter moves to the highest number given and never back", () => {
    expect(cursorAfter(10, [12, null, 15])).toBe(15);
    expect(cursorAfter(10, [null, null])).toBe(10);
    expect(cursorAfter(10, [7])).toBe(10);
  });
});
