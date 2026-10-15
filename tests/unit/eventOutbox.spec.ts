import type { FamilyEvent } from "@/lib/services/multiplayer/familyEvents";
import {
  backoff,
  backoffMs,
  enqueue,
  markSending,
  nextBatch,
  resetSending,
  settle,
  type QueuedEvent,
} from "@/lib/services/multiplayer/eventOutbox";

const event = (id: string, at = "2026-10-13T12:00:00.000Z"): FamilyEvent => ({ id, heroId: "h-1", deviceId: "D1", kind: "quest.done", at, data: { xp: 1 } });
const queued = (id: string, extra: Partial<QueuedEvent> = {}): QueuedEvent => ({ ...event(id), status: "queued", tries: 0, ...extra });
const ids = (outbox: QueuedEvent[]) => outbox.map((e) => e.id);

describe("enqueue", () => {
  it("adds a queued event with no tries", () => {
    const outbox = enqueue([], event("a"));
    expect(outbox).toEqual([{ ...event("a"), status: "queued", tries: 0 }]);
  });

  it("does not change the outbox it was given", () => {
    const before: QueuedEvent[] = [queued("a")];
    enqueue(before, event("b"));
    expect(ids(before)).toEqual(["a"]);
  });

  it("an id already waiting is not queued twice", () => {
    expect(ids(enqueue([queued("a")], event("a")))).toEqual(["a"]);
  });
});

describe("nextBatch", () => {
  it("returns at most 50", () => {
    const outbox = Array.from({ length: 70 }, (_, i) => queued(`e${i}`, { at: new Date(Date.UTC(2026, 9, 13, 12, 0, i)).toISOString() }));
    expect(nextBatch(outbox, 0)).toHaveLength(50);
    expect(nextBatch(outbox, 0, 5)).toHaveLength(5);
  });

  it("skips events that are sending", () => {
    expect(ids(nextBatch([queued("a", { status: "sending" }), queued("b")], 0))).toEqual(["b"]);
  });

  it("skips events that are not due yet, and takes them when they are", () => {
    const outbox = [queued("a", { nextTryAt: 1000 }), queued("b")];
    expect(ids(nextBatch(outbox, 999))).toEqual(["b"]);
    expect(ids(nextBatch(outbox, 1000))).toEqual(["a", "b"]);
  });

  it("sends the oldest first", () => {
    const outbox = [queued("late", { at: "2026-10-13T12:00:09.000Z" }), queued("early", { at: "2026-10-13T12:00:01.000Z" }), queued("mid", { at: "2026-10-13T12:00:05.000Z" })];
    expect(ids(nextBatch(outbox, 0))).toEqual(["early", "mid", "late"]);
  });

  it("keeps the queue order for events from the same moment", () => {
    expect(ids(nextBatch([queued("a"), queued("b"), queued("c")], 0))).toEqual(["a", "b", "c"]);
  });

  it("an empty outbox has no batch", () => expect(nextBatch([], 0)).toEqual([]));
});

describe("markSending", () => {
  it("marks only the named events", () => {
    const outbox = markSending([queued("a"), queued("b")], ["b"]);
    expect(outbox.map((e) => e.status)).toEqual(["queued", "sending"]);
  });
});

describe("settle", () => {
  it("drops accepted, duplicate and rejected ids and keeps the rest", () => {
    const outbox = ["a", "b", "c", "d"].map((id) => queued(id, { status: "sending" }));
    const left = settle(outbox, { accepted: ["a"], duplicate: ["b"], rejected: [{ id: "c", code: "xp_family_event_invalid", message: "bad" }] });
    expect(ids(left)).toEqual(["d"]);
  });

  it("ids the outbox does not hold change nothing", () => {
    expect(ids(settle([queued("a")], { accepted: ["zzz"], duplicate: [], rejected: [] }))).toEqual(["a"]);
  });
});

describe("backoff", () => {
  it("puts the events back to queued with one more try and the next pause", () => {
    const outbox = [queued("a", { status: "sending", tries: 0 }), queued("b", { status: "sending", tries: 2 }), queued("c", { status: "sending" })];
    const left = backoff(outbox, ["a", "b"], 10_000);
    expect(left[0]).toMatchObject({ status: "queued", tries: 1, nextTryAt: 10_000 + 5000 });
    expect(left[1]).toMatchObject({ status: "queued", tries: 3, nextTryAt: 10_000 + 120_000 });
    expect(left[2]).toMatchObject({ status: "sending", tries: 0 });
    expect(left[2].nextTryAt).toBeUndefined();
  });

  it("waits as long as the server asked when it says how long", () => {
    const left = backoff([queued("a", { status: "sending" })], ["a"], 10_000, 600_000);
    expect(left[0]).toMatchObject({ status: "queued", tries: 1, nextTryAt: 610_000 });
  });
});

describe("backoffMs", () => {
  it("grows from 5 seconds to 30 minutes and stays there", () => {
    expect([1, 2, 3, 4, 5, 6].map(backoffMs)).toEqual([5000, 30000, 120000, 600000, 1800000, 1800000]);
    expect(backoffMs(50)).toBe(1800000);
  });

  it("a first try is 5 seconds even from a nonsense count", () => {
    expect(backoffMs(0)).toBe(5000);
    expect(backoffMs(-3)).toBe(5000);
  });
});

describe("resetSending", () => {
  it("turns every event that was sending when the app closed back into queued", () => {
    const outbox = resetSending([queued("a", { status: "sending" }), queued("b"), queued("c", { status: "sending", tries: 2 })]);
    expect(outbox.map((e) => e.status)).toEqual(["queued", "queued", "queued"]);
    expect(outbox[2].tries).toBe(2);
  });

  it("makes them due again, so the first send after a start is not held back", () => {
    const outbox = resetSending([queued("a", { status: "sending", nextTryAt: 9_999_999 })]);
    expect(ids(nextBatch(outbox, 0))).toEqual(["a"]);
  });
});
