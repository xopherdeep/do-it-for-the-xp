import { BACKUP_STORES } from "@/lib/services/core/BackupService";
import { SyncDb, emptySyncState, readSyncState, syncStorage, type SyncState } from "@/lib/databases/SyncDb";

/** An in-memory stand-in for the ionic Storage: the base class only calls create, get, set, remove, keys and clear. */
const fakeStorage = () => {
  const data = new Map<string, unknown>();
  const storage = {
    create: async () => storage,
    get: async (key: string) => (data.has(key) ? data.get(key) : null),
    set: async (key: string, value: unknown) => {
      data.set(key, value);
    },
    remove: async (key: string) => {
      data.delete(key);
    },
    keys: async () => Array.from(data.keys()),
    clear: async () => data.clear(),
  };
  return storage;
};

const SETTLED = { claimId: "c1", questId: "q1", status: "approved" as const, note: "Well done", xp: 20, gp: 5, ap: 1, heroId: "h-1", seq: 12 };

describe("emptySyncState", () => {
  it("holds nothing and has done no first sync", () => {
    expect(emptySyncState()).toEqual({ outbox: [], lastSeq: 0, firstPushDone: false, firstPullDone: false, turns: {}, verdictsSent: {}, pendingVerdicts: {} });
  });

  it("hands out a fresh state each time, so one caller's edit never reaches the next", () => {
    const first = emptySyncState();
    first.outbox.push({ store: "__achievements", key: "a1", heroId: null, queuedAt: "2026-10-22T10:00:00.000Z" });
    first.turns["h-1"] = "held";
    expect(emptySyncState()).toEqual(readSyncState(null));
    expect(emptySyncState().outbox).toEqual([]);
    expect(emptySyncState().turns).toEqual({});
  });
});

describe("SyncDb", () => {
  let storage: ReturnType<typeof fakeStorage>;
  let db: SyncDb;
  beforeEach(() => {
    storage = fakeStorage();
    db = new SyncDb(storage as never);
  });

  it("reads a missing or partial state as empty", async () => {
    expect(await db.getState()).toEqual(emptySyncState());
    await storage.set("state", { lastSeq: 7, firstPushDone: true });
    expect(await db.getState()).toEqual({ ...emptySyncState(), lastSeq: 7, firstPushDone: true });
  });

  it("round-trips a state under the key `state`", async () => {
    const state: SyncState = {
      outbox: [{ store: "__questLog", key: "log-1", heroId: "h-1", queuedAt: "2026-10-22T10:00:00.000Z" }],
      lastSeq: 41,
      firstPushDone: true,
      firstPullDone: true,
      turns: { "h-1": "held", "h-2": "resting" },
      verdictsSent: { "log-1": { approved: true, at: "2026-10-22T10:05:00.000Z" } },
      pendingVerdicts: { c1: SETTLED },
    };
    await db.saveState(state);
    expect(await storage.get("state")).toEqual(state);
    expect(await db.getState()).toEqual(state);
  });

  it("clears the state, so the next read is empty", async () => {
    await db.saveState({ ...emptySyncState(), lastSeq: 9 });
    await db.clearState();
    expect(await storage.get("state")).toBeNull();
    expect(await db.getState()).toEqual(emptySyncState());
  });
});

describe("readSyncState", () => {
  it("reads a stored value that is not an object as empty", () => {
    ["garbage", 3, true, null, undefined, []].forEach((stored) => expect(readSyncState(stored)).toEqual(emptySyncState()));
  });

  it("repairs fields of the wrong shape", () => {
    const stored = { outbox: "nope", lastSeq: "x", firstPushDone: 1, firstPullDone: "yes", turns: [], verdictsSent: 3, pendingVerdicts: null };
    expect(readSyncState(stored)).toEqual(emptySyncState());
  });

  it("drops list and map entries of the wrong shape and keeps the good ones", () => {
    const goodItem = { store: "__achievements", key: "a1", heroId: null, queuedAt: "2026-10-22T10:00:00.000Z" };
    const stored = {
      outbox: [goodItem, { store: "__achievements" }, "x", null],
      turns: { "h-1": "held", "h-2": "busy", "h-3": 4, "h-4": "resting" },
      verdictsSent: { ok: { approved: false, at: "2026-10-22T10:05:00.000Z" }, bad: { approved: "yes", at: 5 }, worse: "x" },
      pendingVerdicts: { c1: SETTLED, c2: { claimId: "c2" }, c3: "x" },
    };
    expect(readSyncState(stored)).toEqual({
      ...emptySyncState(),
      outbox: [goodItem],
      turns: { "h-1": "held", "h-4": "resting" },
      verdictsSent: { ok: { approved: false, at: "2026-10-22T10:05:00.000Z" } },
      pendingVerdicts: { c1: SETTLED },
    });
  });

  it("reads an outbox item saved before it named a hero as a record of no hero, and one with a bad hero the same", () => {
    const at = "2026-10-22T10:00:00.000Z";
    const stored = {
      outbox: [
        { store: "__beasts", key: "b1", queuedAt: at },
        { store: "__questLog", key: "log-1", heroId: "h-1", queuedAt: at },
        { store: "__questLog", key: "log-2", heroId: 5, queuedAt: at },
      ],
    };
    expect(readSyncState(stored).outbox).toEqual([
      { store: "__beasts", key: "b1", heroId: null, queuedAt: at },
      { store: "__questLog", key: "log-1", heroId: "h-1", queuedAt: at },
      { store: "__questLog", key: "log-2", heroId: null, queuedAt: at },
    ]);
  });

  it("does not hand back the stored objects themselves", () => {
    const stored = { outbox: [], turns: { "h-1": "held" } };
    const state = readSyncState(stored);
    state.outbox.push({ store: "s", key: "k", heroId: null, queuedAt: "t" });
    expect(stored.outbox).toEqual([]);
  });
});

describe("what a backup carries", () => {
  it("never holds the sync state (a restored queue would resend, and the turns belong to this device)", () => {
    expect(BACKUP_STORES.map((store) => store.storage)).not.toContain(syncStorage);
  });
});
