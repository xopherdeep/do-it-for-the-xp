import { beastStorage } from "@/lib/databases/BestiaryDb";
import { profileStorage } from "@/lib/databases/profileStorage";
import { BACKUP_STORES } from "@/lib/services/core/BackupService";
import type { ReceivedRecord } from "@/lib/services/sync/familySyncClient";
import { applyRecords, rawTargetFor, refreshMirrors, type ApplyOutcome, type ApplyTarget } from "@/lib/services/sync/recordApply";
import { onRecordWritten, type RecordWrite } from "@/lib/services/sync/recordSignals";
import debug from "@/lib/utils/debug";

jest.mock("@/lib/utils/debug", () => ({ __esModule: true, default: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));

/** What the mirrors did, in order, so a spec can say which came first */
const calls: string[] = [];
const mockSaveProfiles = jest.fn();
const mockLoadUsers = jest.fn();
const mockLogout = jest.fn();
let mockSignedInId: string | null = null;

jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveProfiles: (...args: unknown[]) => mockSaveProfiles(...args) },
}));
jest.mock("@/lib/store/stores/user", () => ({
  __esModule: true,
  useUserStore: () => ({
    currentUser: { id: mockSignedInId },
    logoutUser: () => mockLogout(),
    loadUsers: () => mockLoadUsers(),
  }),
}));

const OWN = "device-own";
const OTHER = "device-other";
const HERO = "hero-1";

let nextSeq = 1;

const record = (store: string, key: string, extra: Partial<ReceivedRecord> = {}): ReceivedRecord => ({
  store,
  key,
  heroId: null,
  deleted: false,
  body: JSON.stringify({ id: key }),
  seq: nextSeq++,
  deviceId: OTHER,
  savedAt: "2026-10-22T10:00:00.000Z",
  ...extra,
});

const tombstone = (store: string, key: string, extra: Partial<ReceivedRecord> = {}): ReceivedRecord =>
  record(store, key, { deleted: true, body: undefined, ...extra });

/** In-memory stores: `data[store]` is what the store holds. A store named in `unknown` has no target at all. */
const memory = (unknown: string[] = [], failing: string[] = []) => {
  const data: Record<string, Record<string, unknown>> = {};
  const targetFor = (store: string): ApplyTarget | null => {
    if (unknown.includes(store)) return null;
    const held = (data[store] ??= {});
    return {
      set: async (key, value) => {
        if (failing.includes(key)) throw new Error(`disk full at ${key}`);
        held[key] = value;
      },
      remove: async (key) => {
        if (failing.includes(key)) throw new Error(`disk full at ${key}`);
        delete held[key];
      },
    };
  };
  return { data, targetFor };
};

const outcomeOf = (extra: Partial<ApplyOutcome> = {}): ApplyOutcome => ({
  applied: 0,
  skipped: 0,
  stores: [],
  heroes: [],
  removedProfiles: [],
  maxSeq: null,
  ...extra,
});

beforeEach(() => {
  nextSeq = 1;
  calls.length = 0;
  mockSignedInId = null;
  jest.clearAllMocks();
  mockSaveProfiles.mockImplementation(async () => {
    calls.push("saveProfiles");
  });
  mockLoadUsers.mockImplementation(async () => {
    calls.push("loadUsers");
  });
  mockLogout.mockImplementation(() => {
    calls.push("logoutUser");
  });
});

describe("applyRecords", () => {
  it("writes records by key and removes tombstones", async () => {
    const { data, targetFor } = memory();
    data.__beasts = { gone: { id: "gone" } };
    const records = [
      record("__beasts", "b1", { body: JSON.stringify({ id: "b1", name: "Socktopus" }) }),
      record("__achievements", "q1", { body: JSON.stringify({ id: "q1" }) }),
      tombstone("__beasts", "gone"),
    ];

    const outcome = await applyRecords(records, OWN, targetFor);

    expect(data.__beasts).toEqual({ b1: { id: "b1", name: "Socktopus" } });
    expect(data.__achievements).toEqual({ q1: { id: "q1" } });
    expect(outcome).toEqual(outcomeOf({ applied: 3, stores: ["__beasts", "__achievements"], maxSeq: 3 }));
  });

  it("applies the records in the order given, so the later write wins", async () => {
    const { data, targetFor } = memory();

    await applyRecords(
      [
        record("__beasts", "b1", { body: JSON.stringify({ v: 1 }), seq: 5 }),
        record("__beasts", "b1", { body: JSON.stringify({ v: 2 }), seq: 6 }),
        tombstone("__beasts", "b2", { seq: 7 }),
        record("__beasts", "b2", { body: JSON.stringify({ v: 3 }), seq: 8 }),
      ],
      OWN,
      targetFor
    );

    expect(data.__beasts).toEqual({ b1: { v: 2 }, b2: { v: 3 } });
  });

  it("skips this device's own records and unknown stores", async () => {
    const { data, targetFor } = memory(["__nowhere"]);
    const records = [
      record("__beasts", "mine", { deviceId: OWN, seq: 4 }),
      record("__nowhere", "x", { seq: 9 }),
      record("__beasts", "theirs", { seq: 6 }),
    ];

    const outcome = await applyRecords(records, OWN, targetFor);

    expect(data.__beasts).toEqual({ theirs: { id: "theirs" } });
    expect(data.__nowhere).toBeUndefined();
    // a skipped record was still seen, so the cursor may move past it
    expect(outcome).toEqual(outcomeOf({ applied: 1, skipped: 2, stores: ["__beasts"], maxSeq: 9 }));
  });

  it("does not take a record with no device for this device's own when the device id is empty", async () => {
    const { data, targetFor } = memory();

    const outcome = await applyRecords([record("__beasts", "b1", { deviceId: "" })], "", targetFor);

    expect(data.__beasts).toEqual({ b1: { id: "b1" } });
    expect(outcome.applied).toBe(1);
  });

  it("a failing write is skipped and counted, and the rest carry on", async () => {
    const { data, targetFor } = memory([], ["bad", "badgone"]);
    data.__beasts = { badgone: { id: "badgone" } };
    const records = [
      record("__beasts", "bad", { heroId: HERO }),
      tombstone("__beasts", "badgone"),
      record("__beasts", "good", { heroId: HERO }),
    ];

    const outcome = await applyRecords(records, OWN, targetFor);

    expect(data.__beasts).toEqual({ badgone: { id: "badgone" }, good: { id: "good" } });
    expect(debug.warn).toHaveBeenCalledTimes(2);
    expect(outcome).toEqual(outcomeOf({ applied: 1, skipped: 2, stores: ["__beasts"], heroes: [HERO], maxSeq: 3 }));
  });

  it("skips a body that is missing, not JSON, or not an object, and counts it", async () => {
    const { data, targetFor } = memory();
    const records = [
      record("__beasts", "nobody", { body: undefined }),
      record("__beasts", "empty", { body: "" }),
      record("__beasts", "broken", { body: "{not json" }),
      record("__beasts", "number", { body: "42" }),
      record("__beasts", "text", { body: '"hello"' }),
      record("__beasts", "null", { body: "null" }),
      record("__beasts", "fine", { body: '{"id":"fine"}' }),
    ];

    const outcome = await applyRecords(records, OWN, targetFor);

    expect(data.__beasts).toEqual({ fine: { id: "fine" } });
    expect(outcome).toEqual(outcomeOf({ applied: 1, skipped: 6, stores: ["__beasts"], maxSeq: 7 }));
  });

  it("takes an array body: notifications and the added packs are lists", async () => {
    const { data, targetFor } = memory();

    const outcome = await applyRecords([record("__notifications", HERO, { heroId: HERO, body: '[{"id":"n1"}]' })], OWN, targetFor);

    expect(data.__notifications).toEqual({ [HERO]: [{ id: "n1" }] });
    expect(outcome.applied).toBe(1);
  });

  it("skips a record whose number is not finite and never lets it move the cursor", async () => {
    const { data, targetFor } = memory();
    const records = [
      record("__beasts", "a", { seq: 4 }),
      record("__beasts", "nan", { seq: Number.NaN }),
      record("__beasts", "inf", { seq: Number.POSITIVE_INFINITY }),
      record("__beasts", "b", { seq: 5 }),
    ];

    const outcome = await applyRecords(records, OWN, targetFor);

    expect(Object.keys(data.__beasts)).toEqual(["a", "b"]);
    expect(outcome).toEqual(outcomeOf({ applied: 2, skipped: 2, stores: ["__beasts"], maxSeq: 5 }));
  });

  it("has no highest number when no record has a finite one, nor when there are no records", async () => {
    const { targetFor } = memory();

    const none = await applyRecords([], OWN, targetFor);
    const bad = await applyRecords([record("__beasts", "nan", { seq: Number.NaN })], OWN, targetFor);

    expect(none).toEqual(outcomeOf());
    expect(bad).toEqual(outcomeOf({ skipped: 1 }));
  });

  it("names each store and hero once, and the profiles that were removed", async () => {
    const { data, targetFor } = memory();
    data.__profiles = { "hero-9": { id: "hero-9" } };
    const records = [
      record("__profiles", HERO, { heroId: HERO }),
      record("__questLog", "l1", { heroId: HERO }),
      record("__questLog", "l2", { heroId: "hero-2" }),
      record("__beasts", "b1", { heroId: null }),
      tombstone("__profiles", "hero-9", { heroId: "hero-9" }),
      // a tombstone in another store is not a removed profile
      tombstone("__questLog", "l0", { heroId: "hero-3" }),
    ];

    const outcome = await applyRecords(records, OWN, targetFor);

    expect(outcome.stores).toEqual(["__profiles", "__questLog", "__beasts"]);
    expect(outcome.heroes).toEqual([HERO, "hero-2", "hero-9", "hero-3"]);
    expect(outcome.removedProfiles).toEqual(["hero-9"]);
    expect(data.__profiles).toEqual({ [HERO]: { id: HERO } });
  });

  it("does not count a removed profile whose removal failed", async () => {
    const { targetFor } = memory([], ["hero-9"]);

    const outcome = await applyRecords([tombstone("__profiles", "hero-9", { heroId: "hero-9" })], OWN, targetFor);

    expect(outcome.removedProfiles).toEqual([]);
    expect(outcome.skipped).toBe(1);
  });
});

describe("rawTargetFor", () => {
  it("has no target for an unknown store, a store that does not sync, or a name that is only on the prototype", () => {
    expect(rawTargetFor("__nowhere")).toBeNull();
    expect(rawTargetFor("__localSettings")).toBeNull();
    expect(rawTargetFor("constructor")).toBeNull();
    expect(rawTargetFor("__proto__")).toBeNull();
  });

  it("has a target for every store the sync carries", () => {
    const synced = BACKUP_STORES.map((def) => def.name).filter((name) => name !== "__localSettings");
    expect(synced.filter((name) => rawTargetFor(name) === null)).toEqual([]);
  });

  it("writes and removes through the raw store and announces nothing", async () => {
    const writes: RecordWrite[] = [];
    const stop = onRecordWritten((write) => writes.push(write));
    const target = rawTargetFor("__beasts");

    // the target creates the store itself: a store nothing has opened yet is still written
    await target!.set("b1", { id: "b1", name: "Socktopus" });
    const written = await beastStorage.get("b1");
    await target!.remove("b1");
    const removed = await beastStorage.get("b1");
    stop();

    expect(written).toEqual({ id: "b1", name: "Socktopus" });
    expect(removed).toBeNull();
    expect(writes).toEqual([]);
  });
});

describe("refreshMirrors", () => {
  /** The profiles the raw `__profiles` store holds, replaced wholesale */
  const holdProfiles = async (profiles: { id: string }[]) => {
    await profileStorage.create();
    await profileStorage.clear();
    for (const profile of profiles) await profileStorage.set(profile.id, profile);
  };

  it("does nothing when no profile arrived", async () => {
    await refreshMirrors(outcomeOf({ applied: 2, stores: ["__beasts", "__questLog"] }));

    expect(mockSaveProfiles).not.toHaveBeenCalled();
    expect(mockLoadUsers).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("mirrors every profile the device holds, then reloads the users", async () => {
    await holdProfiles([{ id: HERO }, { id: "hero-2" }]);

    await refreshMirrors(outcomeOf({ applied: 1, stores: ["__profiles"], heroes: [HERO] }));

    expect(mockSaveProfiles).toHaveBeenCalledTimes(1);
    const mirrored = mockSaveProfiles.mock.calls[0][0] as { id: string }[];
    expect(mirrored.map((profile) => profile.id).sort()).toEqual([HERO, "hero-2"]);
    expect(calls).toEqual(["saveProfiles", "loadUsers"]);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("reloads users for profiles and signs out a removed current hero", async () => {
    await holdProfiles([{ id: "hero-2" }]);
    mockSignedInId = HERO;

    await refreshMirrors(outcomeOf({ applied: 1, stores: ["__profiles"], removedProfiles: [HERO] }));

    expect(calls).toEqual(["saveProfiles", "logoutUser", "loadUsers"]);
  });

  it("keeps the signed-in hero signed in when another profile was removed, or nobody is signed in", async () => {
    await holdProfiles([{ id: HERO }]);
    mockSignedInId = HERO;
    await refreshMirrors(outcomeOf({ applied: 1, stores: ["__profiles"], removedProfiles: ["hero-2"] }));
    mockSignedInId = null;
    await refreshMirrors(outcomeOf({ applied: 1, stores: ["__profiles"], removedProfiles: ["hero-2"] }));

    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockLoadUsers).toHaveBeenCalledTimes(2);
  });

  it("still reloads the users when the mirror cannot be saved", async () => {
    await holdProfiles([{ id: HERO }]);
    mockSaveProfiles.mockRejectedValueOnce(new Error("preferences are full"));

    await refreshMirrors(outcomeOf({ applied: 1, stores: ["__profiles"] }));

    expect(debug.warn).toHaveBeenCalled();
    expect(mockLoadUsers).toHaveBeenCalledTimes(1);
  });
});
