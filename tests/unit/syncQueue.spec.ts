import { TextEncoder } from "util";
import type { OutboxItem } from "@/lib/databases/SyncDb";
import type { ApplyOutcome } from "@/lib/services/sync/recordApply";
import { batchRecordOf, cursorAfter, emptyOutcome, firstPushRefs, mergeOutcomes, queueAll } from "@/lib/services/sync/syncQueue";

// jsdom has no TextEncoder; the browser and the app's WebView do
Object.assign(globalThis, { TextEncoder });

const NOW = new Date("2026-10-22T10:00:00.000Z");
const EARLIER = "2026-10-22T09:00:00.000Z";

const item = (store: string, key: string, heroId: string | null = null, queuedAt = EARLIER): OutboxItem => ({ store, key, heroId, queuedAt });

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

describe("cursorAfter", () => {
  it("moves to the highest number given and never back", () => {
    expect(cursorAfter(10, [12, null, 15])).toBe(15);
    expect(cursorAfter(10, [null, null])).toBe(10);
    expect(cursorAfter(10, [7])).toBe(10);
  });
});

describe("mergeOutcomes", () => {
  const outcome = (over: Partial<ApplyOutcome>): ApplyOutcome => ({ ...emptyOutcome(), ...over });

  it("adds the counts, names each store, hero and removed profile once, and keeps the highest number", () => {
    const merged = mergeOutcomes(
      outcome({ applied: 1, skipped: 1, stores: ["__beasts"], heroes: ["h-1"], removedProfiles: [], maxSeq: 4 }),
      outcome({ applied: 2, stores: ["__profiles", "__beasts"], heroes: ["h-1", "h-2"], removedProfiles: ["h-2"], maxSeq: 7 })
    );

    expect(merged).toEqual({
      applied: 3,
      skipped: 1,
      stores: ["__beasts", "__profiles"],
      heroes: ["h-1", "h-2"],
      removedProfiles: ["h-2"],
      maxSeq: 7,
    });
  });

  it("has no highest number until one side has one", () => {
    expect(mergeOutcomes(emptyOutcome(), emptyOutcome()).maxSeq).toBeNull();
    expect(mergeOutcomes(emptyOutcome(), outcome({ maxSeq: 3 })).maxSeq).toBe(3);
    expect(mergeOutcomes(outcome({ maxSeq: 3 }), emptyOutcome()).maxSeq).toBe(3);
  });
});

describe("firstPushRefs", () => {
  const bodyOf = (_store: string, value: unknown) => JSON.stringify(value);

  it("sends what the family's save did not hold, or held with another body, and never a record just received as it is", () => {
    const received = new Map<string, string | null>([
      [JSON.stringify(["__beasts", "b1"]), JSON.stringify({ id: "b1", name: "Family" })],
      [JSON.stringify(["__beasts", "b2"]), JSON.stringify({ id: "b2" })],
      [JSON.stringify(["__chat", "c1"]), null],
    ]);

    const refs = firstPushRefs(
      [
        { store: "__beasts", key: "b1", value: { id: "b1", name: "Family" } },
        { store: "__beasts", key: "b2", value: { id: "b2", name: "Changed here" } },
        { store: "__beasts", key: "b3", value: { id: "b3" } },
        { store: "__chat", key: "c1", value: { id: "c1" } },
        { store: "__questLog", key: "q1", value: { id: "q1", userId: "h-1" } },
      ],
      received,
      bodyOf
    );

    expect(refs).toEqual([
      { store: "__beasts", key: "b2", heroId: null },
      { store: "__beasts", key: "b3", heroId: null },
      { store: "__chat", key: "c1", heroId: null },
      { store: "__questLog", key: "q1", heroId: "h-1" },
    ]);
  });
});
