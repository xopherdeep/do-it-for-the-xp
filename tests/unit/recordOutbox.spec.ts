import type { OutboxItem } from "@/lib/databases/SyncDb";
import type { PutResult } from "@/lib/services/sync/familySyncClient";
import { dropItems, dropWhere, enqueueKey, nextBatch, settlePut, type BatchRecord } from "@/lib/services/sync/recordOutbox";

const AT = "2026-10-22T10:00:00.000Z";

const item = (key: string, extra: Partial<OutboxItem> = {}): OutboxItem => ({ store: "__beasts", key, heroId: null, queuedAt: AT, ...extra });

/** A record as the sync store would build it from an item: the body is a JSON string and `bytes` is its UTF-8 length */
const recordOf = (queued: OutboxItem, bytes = 10): BatchRecord => ({
  store: queued.store,
  key: queued.key,
  heroId: queued.heroId,
  deleted: false,
  body: "x".repeat(bytes),
  item: queued,
  bytes,
});

const keys = (outbox: OutboxItem[]) => outbox.map((queued) => queued.key);

const answer = (accepted: OutboxItem[], refused: { item: OutboxItem; code: string }[] = []): PutResult => ({
  accepted: accepted.map((queued, index) => ({ store: queued.store, key: queued.key, seq: index + 1 })),
  refused: refused.map(({ item: queued, code }) => ({ store: queued.store, key: queued.key, code, message: `refused: ${code}` })),
});

describe("enqueueKey", () => {
  it("queues a store and key with the hero and the time", () => {
    const outbox = enqueueKey([], "__questLog", "log-1", "h-1", new Date(AT));
    expect(outbox).toEqual([{ store: "__questLog", key: "log-1", heroId: "h-1", queuedAt: AT }]);
  });

  it("queues a family record with no hero", () => {
    expect(enqueueKey([], "__beasts", "b1", null, new Date(AT))[0].heroId).toBeNull();
  });

  it("enqueueKey keeps one item per key and moves a repeat to the end", () => {
    const later = "2026-10-22T10:00:09.000Z";
    const first = enqueueKey([], "__questLog", "log-1", null, new Date(AT));
    const second = enqueueKey(first, "__beasts", "b1", null, new Date(AT));
    const repeated = enqueueKey(second, "__questLog", "log-1", "h-1", new Date(later));
    expect(repeated).toEqual([
      { store: "__beasts", key: "b1", heroId: null, queuedAt: AT },
      { store: "__questLog", key: "log-1", heroId: "h-1", queuedAt: later },
    ]);
  });

  it("the same key in two stores is two items", () => {
    const outbox = enqueueKey(enqueueKey([], "__beasts", "x", null, new Date(AT)), "__shops", "x", null, new Date(AT));
    expect(outbox.map((queued) => queued.store)).toEqual(["__beasts", "__shops"]);
  });

  it("does not change the outbox it was given", () => {
    const before = [item("a")];
    enqueueKey(before, "__beasts", "a", "h-1", new Date("2026-10-22T11:00:00.000Z"));
    enqueueKey(before, "__beasts", "b", null, new Date(AT));
    expect(before).toEqual([item("a")]);
  });
});

describe("dropItems", () => {
  it("removes the items named by store and key and keeps the rest in order", () => {
    const outbox = [item("a"), item("b"), item("c"), item("a", { store: "__shops" })];
    const kept = dropItems(outbox, [{ store: "__beasts", key: "a" }, { store: "__beasts", key: "c" }]);
    expect(kept).toEqual([item("b"), item("a", { store: "__shops" })]);
  });

  it("ignores an item that is not queued, and leaves the given outbox alone", () => {
    const outbox = [item("a")];
    expect(dropItems(outbox, [{ store: "__beasts", key: "zzz" }])).toEqual([item("a")]);
    dropItems(outbox, [{ store: "__beasts", key: "a" }]);
    expect(outbox).toEqual([item("a")]);
  });
});

describe("dropWhere", () => {
  it("removes the items the test picks and keeps the rest in order", () => {
    const outbox = [item("a", { heroId: "h-1" }), item("b"), item("c", { heroId: "h-1" }), item("d", { heroId: "h-2" })];
    expect(keys(dropWhere(outbox, (queued) => queued.heroId === "h-1"))).toEqual(["b", "d"]);
  });

  it("returns a new list, and an outbox where nothing matches comes back whole", () => {
    const outbox = [item("a")];
    const kept = dropWhere(outbox, () => false);
    expect(kept).toEqual(outbox);
    expect(kept).not.toBe(outbox);
  });
});

describe("nextBatch", () => {
  const readAll = (bytes = 10) => jest.fn(async (queued: OutboxItem) => recordOf(queued, bytes));

  it("takes the items in queue order, each read once", async () => {
    const read = readAll();
    const { records, oversize } = await nextBatch([item("c"), item("a"), item("b")], read);
    expect(records.map((record) => record.key)).toEqual(["c", "a", "b"]);
    expect(oversize).toEqual([]);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("an empty outbox has no batch and reads nothing", async () => {
    const read = readAll();
    expect(await nextBatch([], read)).toEqual({ records: [], oversize: [] });
    expect(read).not.toHaveBeenCalled();
  });

  it("nextBatch stops at 50 records or 1 MB and sets oversize aside", async () => {
    const many = Array.from({ length: 70 }, (_, i) => item(`k${i}`));
    const read = readAll();
    const byCount = await nextBatch(many, read);
    expect(byCount.records).toHaveLength(50);
    expect(byCount.records[49].key).toBe("k49");
    expect(read).toHaveBeenCalledTimes(50);

    const sizes: Record<string, number> = { big1: 400_000, big2: 400_000, big3: 400_000, small: 10 };
    const bySize = await nextBatch(Object.keys(sizes).map((key) => item(key)), async (queued) => recordOf(queued, sizes[queued.key]));
    expect(bySize.records.map((record) => record.key)).toEqual(["big1", "big2"]);

    const huge = item("huge");
    const mixed = await nextBatch([item("a"), huge, item("b")], async (queued) => recordOf(queued, queued.key === "huge" ? 524_289 : 10));
    expect(mixed.records.map((record) => record.key)).toEqual(["a", "b"]);
    expect(mixed.oversize).toEqual([huge]);
  });

  it("a total of exactly 1 MB fits, and one byte more does not", async () => {
    const two = [item("a"), item("b")];
    const exact = await nextBatch(two, async (queued) => recordOf(queued, 500_000));
    expect(exact.records).toHaveLength(2);
    const over = await nextBatch(two, async (queued) => recordOf(queued, queued.key === "a" ? 500_000 : 500_001));
    expect(over.records.map((record) => record.key)).toEqual(["a"]);
  });

  it("a record of exactly 512 KB is sent; one byte more is set aside", async () => {
    const atCap = await nextBatch([item("a")], async (queued) => recordOf(queued, 524_288));
    expect(atCap.records).toHaveLength(1);
    expect(atCap.oversize).toEqual([]);
    const over = await nextBatch([item("a")], async (queued) => recordOf(queued, 524_289));
    expect(over.records).toEqual([]);
    expect(over.oversize).toEqual([item("a")]);
  });

  it("an oversize record counts for neither the record limit nor the byte total", async () => {
    const outbox = [item("huge1"), item("huge2"), ...Array.from({ length: 50 }, (_, i) => item(`k${i}`))];
    const { records, oversize } = await nextBatch(outbox, async (queued) => recordOf(queued, queued.key.startsWith("huge") ? 600_000 : 10));
    expect(records).toHaveLength(50);
    expect(oversize.map((queued) => queued.key)).toEqual(["huge1", "huge2"]);
  });

  it("stops before the record that would not fit and does not skip ahead to smaller ones", async () => {
    const sizes: Record<string, number> = { a: 500_000, b: 524_288, c: 10 };
    const { records } = await nextBatch(Object.keys(sizes).map((key) => item(key)), async (queued) => recordOf(queued, sizes[queued.key]));
    expect(records.map((record) => record.key)).toEqual(["a"]);
  });

  it("sends a record that no longer exists as a tombstone with the hero the item holds", async () => {
    const gone = item("log-1", { store: "__questLog", heroId: "h-1" });
    const { records, oversize } = await nextBatch([gone], async () => null);
    expect(records).toEqual([{ store: "__questLog", key: "log-1", heroId: "h-1", deleted: true, item: gone, bytes: 0 }]);
    expect(records[0].body).toBeUndefined();
    expect(oversize).toEqual([]);
  });

  it("a tombstone counts toward the record limit but adds no bytes", async () => {
    const outbox = Array.from({ length: 60 }, (_, i) => item(`k${i}`));
    const { records } = await nextBatch(outbox, async () => null);
    expect(records).toHaveLength(50);
  });

  it("takes limits from the caller", async () => {
    const outbox = [item("a"), item("b"), item("c"), item("d")];
    const byCount = await nextBatch(outbox, async (queued) => recordOf(queued, 10), { count: 2, bytes: 1000, record: 500 });
    expect(keys(byCount.records.map((record) => record.item))).toEqual(["a", "b"]);
    const byBytes = await nextBatch(outbox, async (queued) => recordOf(queued, 40), { count: 10, bytes: 100, record: 50 });
    expect(byBytes.records).toHaveLength(2);
    const byRecord = await nextBatch(outbox, async (queued) => recordOf(queued, 60), { count: 10, bytes: 1000, record: 50 });
    expect(byRecord.records).toEqual([]);
    expect(byRecord.oversize).toHaveLength(4);
  });

  it("does not change the outbox, and a read that fails rejects the batch", async () => {
    const outbox = [item("a"), item("b")];
    await nextBatch(outbox, async (queued) => recordOf(queued));
    expect(outbox).toEqual([item("a"), item("b")]);
    await expect(nextBatch(outbox, async () => Promise.reject(new Error("disk gone")))).rejects.toThrow("disk gone");
  });
});

describe("settlePut", () => {
  const mine = item("log-1", { store: "__questLog", heroId: "h-1" });
  const other = item("log-2", { store: "__questLog", heroId: "h-2" });
  const family = item("b1");

  it("settlePut drops accepted and refused and names the heroes taken over", () => {
    const second = item("log-3", { store: "__questLog", heroId: "h-1" });
    const untouched = item("log-9", { store: "__questLog", heroId: "h-1" });
    const sent = [mine, other, family, second].map((queued) => recordOf(queued));
    const result = answer([family], [
      { item: mine, code: "xp_family_turn" },
      { item: other, code: "xp_family_turn" },
      { item: second, code: "xp_family_turn" },
    ]);

    const settled = settlePut([mine, other, family, second, untouched], sent, result);

    expect(settled.outbox).toEqual([untouched]);
    expect(settled.takenOver).toEqual(["h-1", "h-2"]);
  });

  it("a key refused as invalid is not queued again by settlePut", () => {
    const sent = [recordOf(family)];
    const settled = settlePut([family], sent, answer([], [{ item: family, code: "xp_family_invalid" }]));
    expect(settled.outbox).toEqual([]);
    expect(settled.takenOver).toEqual([]);
  });

  it("only a turn refusal names a hero", () => {
    const sent = [mine, other].map((queued) => recordOf(queued));
    const settled = settlePut([mine, other], sent, answer([], [{ item: mine, code: "xp_family_invalid" }, { item: other, code: "xp_family_turn" }]));
    expect(settled.takenOver).toEqual(["h-2"]);
  });

  it("hands back each refused record with its code, in the order the site listed them", () => {
    const sent = [mine, other, family].map((queued) => recordOf(queued));
    const settled = settlePut([mine, other, family], sent, answer([family], [{ item: other, code: "xp_family_turn" }, { item: mine, code: "xp_family_invalid" }]));
    expect(settled.refusedRecords).toEqual([
      { ...recordOf(other), code: "xp_family_turn" },
      { ...recordOf(mine), code: "xp_family_invalid" },
    ]);
  });

  it("a refused tombstone is handed back as the tombstone it was", () => {
    const tombstone: BatchRecord = { store: "__questLog", key: "log-1", heroId: "h-1", deleted: true, item: mine, bytes: 0 };
    const settled = settlePut([mine], [tombstone], answer([], [{ item: mine, code: "xp_family_turn" }]));
    expect(settled.refusedRecords).toEqual([{ ...tombstone, code: "xp_family_turn" }]);
    expect(settled.takenOver).toEqual(["h-1"]);
  });

  it("a refusal for a record with no hero names no hero", () => {
    const settled = settlePut([family], [recordOf(family)], answer([], [{ item: family, code: "xp_family_turn" }]));
    expect(settled.takenOver).toEqual([]);
    expect(settled.outbox).toEqual([]);
  });

  it("a record the site did not answer stays queued to go again", () => {
    const sent = [mine, family].map((queued) => recordOf(queued));
    const settled = settlePut([mine, family], sent, answer([family]));
    expect(settled.outbox).toEqual([mine]);
    expect(settled.refusedRecords).toEqual([]);
  });

  it("a key changed again while its put was out stays queued, with the newer change", () => {
    const sent = [recordOf(family)];
    const changedAgain = item("b1", { queuedAt: "2026-10-22T10:00:07.000Z" });
    const settled = settlePut([item("z"), changedAgain], sent, answer([family]));
    expect(settled.outbox).toEqual([item("z"), changedAgain]);

    const refused = settlePut([changedAgain], sent, answer([], [{ item: family, code: "xp_family_turn" }]));
    expect(refused.outbox).toEqual([changedAgain]);
  });

  it("an answer about a record that was not in this put changes nothing", () => {
    const stranger = item("ghost");
    const settled = settlePut([mine, stranger], [recordOf(mine)], answer([stranger], [{ item: stranger, code: "xp_family_turn" }]));
    expect(settled.outbox).toEqual([mine, stranger]);
    expect(settled.takenOver).toEqual([]);
    expect(settled.refusedRecords).toEqual([]);
  });

  it("does not change the outbox or the records it was given", () => {
    const outbox = [mine, family];
    const sent = [recordOf(mine), recordOf(family)];
    settlePut(outbox, sent, answer([family], [{ item: mine, code: "xp_family_turn" }]));
    expect(outbox).toEqual([mine, family]);
    expect(sent).toEqual([recordOf(mine), recordOf(family)]);
  });
});
