import { CastLogDb, lastCastsOf, type CastLogEntry, type NewCastLogEntry } from "@/lib/databases/CastLogDb";

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

const cast = (overrides: Partial<NewCastLogEntry> = {}): NewCastLogEntry => ({
  userId: "kid-1",
  abilityId: "storm",
  abilityName: "Storm",
  abilityType: "in-game",
  mpPaid: 10,
  ...overrides,
});

const entry = (overrides: Partial<CastLogEntry> = {}): CastLogEntry => ({
  id: "e",
  userId: "kid-1",
  abilityId: "storm",
  abilityName: "Storm",
  abilityType: "in-game",
  castAt: "2026-10-10T08:00:00.000Z",
  mpPaid: 10,
  ...overrides,
});

describe("CastLogDb", () => {
  let db: CastLogDb;
  beforeEach(() => {
    db = new CastLogDb(fakeStorage() as never);
  });

  it("logCast fills in the id and the cast time", async () => {
    const before = Date.now();
    const saved = await db.logCast(cast());
    expect(saved.id).toEqual(expect.any(String));
    expect(saved.id.length).toBeGreaterThan(0);
    expect(new Date(saved.castAt).getTime()).toBeGreaterThanOrEqual(before);
    expect(saved).toMatchObject({ userId: "kid-1", abilityId: "storm", abilityName: "Storm", abilityType: "in-game", mpPaid: 10 });
    expect(await db.getEntry(saved.id)).toEqual(saved);
  });

  it("logCast keeps a cast time it is given", async () => {
    const saved = await db.logCast(cast({ castAt: "2026-10-09T07:00:00.000Z" }));
    expect(saved.castAt).toBe("2026-10-09T07:00:00.000Z");
  });

  it("getEntry is null for an unknown id", async () => {
    expect(await db.getEntry("nope")).toBeNull();
  });

  it("getAll lists every cast newest first", async () => {
    await db.logCast(cast({ id: "old", castAt: "2026-10-08T08:00:00.000Z" }));
    await db.logCast(cast({ id: "new", userId: "kid-2", castAt: "2026-10-10T08:00:00.000Z" }));
    await db.logCast(cast({ id: "mid", castAt: "2026-10-09T08:00:00.000Z" }));
    expect((await db.getAll()).map((e) => e.id)).toEqual(["new", "mid", "old"]);
  });

  it("getForHero keeps only that hero's casts, newest first", async () => {
    await db.logCast(cast({ id: "a", castAt: "2026-10-08T08:00:00.000Z" }));
    await db.logCast(cast({ id: "b", userId: "kid-2", castAt: "2026-10-10T08:00:00.000Z" }));
    await db.logCast(cast({ id: "c", abilityId: "cure", castAt: "2026-10-09T08:00:00.000Z" }));
    expect((await db.getForHero("kid-1")).map((e) => e.id)).toEqual(["c", "a"]);
    expect((await db.getForHero("kid-2")).map((e) => e.id)).toEqual(["b"]);
    expect(await db.getForHero("kid-3")).toEqual([]);
  });

  it("getForHeroAndPower keeps one hero's casts of one Power, newest first", async () => {
    await db.logCast(cast({ id: "a", castAt: "2026-10-08T08:00:00.000Z" }));
    await db.logCast(cast({ id: "b", castAt: "2026-10-10T08:00:00.000Z" }));
    await db.logCast(cast({ id: "c", abilityId: "cure", castAt: "2026-10-09T08:00:00.000Z" }));
    await db.logCast(cast({ id: "d", userId: "kid-2", castAt: "2026-10-10T09:00:00.000Z" }));
    expect((await db.getForHeroAndPower("kid-1", "storm")).map((e) => e.id)).toEqual(["b", "a"]);
    expect((await db.getForHeroAndPower("kid-2", "storm")).map((e) => e.id)).toEqual(["d"]);
    expect(await db.getForHeroAndPower("kid-2", "cure")).toEqual([]);
  });
});

describe("lastCastsOf", () => {
  it("keeps the newest cast of each Power", () => {
    const casts = lastCastsOf([
      entry({ id: "1", abilityId: "storm", castAt: "2026-10-08T08:00:00.000Z" }),
      entry({ id: "2", abilityId: "storm", castAt: "2026-10-10T08:00:00.000Z" }),
      entry({ id: "3", abilityId: "storm", castAt: "2026-10-09T08:00:00.000Z" }),
      entry({ id: "4", abilityId: "cure", castAt: "2026-10-07T08:00:00.000Z" }),
    ]);
    expect(casts).toEqual({ storm: "2026-10-10T08:00:00.000Z", cure: "2026-10-07T08:00:00.000Z" });
  });

  it("skips a cast with an unreadable date", () => {
    const casts = lastCastsOf([
      entry({ id: "1", abilityId: "storm", castAt: "2026-10-08T08:00:00.000Z" }),
      entry({ id: "2", abilityId: "storm", castAt: "yesterday-ish" }),
      entry({ id: "3", abilityId: "cure", castAt: "" }),
    ]);
    expect(casts).toEqual({ storm: "2026-10-08T08:00:00.000Z" });
  });

  it("is empty when there are no casts", () => {
    expect(lastCastsOf([])).toEqual({});
  });
});
