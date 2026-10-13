import { BACKUP_STORES } from "@/lib/services/core/BackupService";
import { EMPTY_FAMILY_EVENTS, FamilyEventsDb, familyEventsStorage, type FamilyEventsState } from "@/lib/databases/FamilyEventsDb";

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

describe("FamilyEventsDb", () => {
  let storage: ReturnType<typeof fakeStorage>;
  let db: FamilyEventsDb;
  beforeEach(() => {
    storage = fakeStorage();
    db = new FamilyEventsDb(storage as never);
  });

  it("the empty state holds nothing and does not know the home", () => {
    expect(EMPTY_FAMILY_EVENTS).toEqual({ outbox: [], lastSeq: 0, paidRewards: [], lastCards: {}, ageGroupPicks: {}, home: "unknown" });
  });

  it("returns the empty state when nothing is stored", async () => {
    expect(await db.getState()).toEqual(EMPTY_FAMILY_EVENTS);
  });

  it("hands out a fresh empty state each time, so one caller's edit never reaches the next", async () => {
    const first = await db.getState();
    first.outbox.push({ id: "x" } as never);
    first.lastCards.h = "card";
    expect(await db.getState()).toEqual(EMPTY_FAMILY_EVENTS);
    expect(EMPTY_FAMILY_EVENTS.outbox).toEqual([]);
  });

  it("round-trips a state under the key `state`", async () => {
    const state: FamilyEventsState = {
      outbox: [{ id: "e1", heroId: "h-1", deviceId: "D1", kind: "quest.done", at: "2026-10-13T12:00:00.000Z", data: { xp: 1 }, status: "sending", tries: 2, nextTryAt: 5 }],
      lastSeq: 41,
      paidRewards: [{ id: "r1", at: "2026-10-13T12:00:00.000Z" }],
      lastCards: { "h-1": "{\"level\":4}" },
      ageGroupPicks: { "h-2": "teen" },
      home: "home",
    };
    await db.saveState(state);
    expect(await storage.get("state")).toEqual(state);
    expect(await db.getState()).toEqual(state);
  });

  it("fills in what an older saved state lacks", async () => {
    await storage.set("state", { outbox: [], lastSeq: 7 });
    expect(await db.getState()).toEqual({ ...EMPTY_FAMILY_EVENTS, lastSeq: 7 });
  });

  it("reads a stored value that is not an object as empty", async () => {
    await storage.set("state", "garbage");
    expect(await db.getState()).toEqual(EMPTY_FAMILY_EVENTS);
  });

  it("repairs fields of the wrong shape", async () => {
    await storage.set("state", { outbox: "nope", lastSeq: "x", paidRewards: null, lastCards: [], ageGroupPicks: 3, home: "somewhere" });
    expect(await db.getState()).toEqual(EMPTY_FAMILY_EVENTS);
  });
});

describe("what a backup carries", () => {
  it("never holds the family events (a restored queue would resend old events)", () => {
    expect(BACKUP_STORES.map((store) => store.name)).not.toContain("__xp_family_events");
    expect(BACKUP_STORES.map((store) => store.storage)).not.toContain(familyEventsStorage);
  });
});
