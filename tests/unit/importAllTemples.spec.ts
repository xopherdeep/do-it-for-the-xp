import { TempleDb, type TempleInterface } from "@/lib/databases/TempleDb";
import temples from "@/lib/engine/temples";
import { importAllTempleLayouts, layoutSignature, planSeedSync, type ShippedTemple } from "@/lib/engine/core/dungeons/importAllTemples";
import { auditTemple } from "@/lib/services/temples/templeAudit";
import { isQuestRoom } from "@/lib/services/temples/questRooms";
import debug from "@/lib/utils/debug";
import backup from "./importAllTemples.backup.json";

jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

/** An in-memory stand-in for the ionic Storage: the base class only calls create, get, set, remove, keys and clear. */
const fakeStorage = () => {
  const data = new Map<string, unknown>();
  const storage = {
    data,
    create: async () => storage,
    get: jest.fn(async (key: string) => (data.has(key) ? data.get(key) : null)),
    set: jest.fn(async (key: string, value: unknown) => {
      data.set(key, value);
    }),
    remove: jest.fn(async (key: string) => {
      data.delete(key);
    }),
    keys: async () => Array.from(data.keys()),
    clear: jest.fn(async () => data.clear()),
  };
  return storage;
};

/**
 * The nine temple records the owner's phone held on 2026-10-11 (do-it-for-the-xp-backup-2026-10-11.json, store
 * __temples), as exported: no seedSignature on any. Eight are the old single-floor shipped seeds, which the temple
 * audit fails (no Master Room; moon and storm also lack the Boss Key). wind-temple is the owner's hand-built copy.
 */
const ownerBackup = backup as unknown as Record<string, TempleInterface>;
const oldSeedIds = Object.keys(ownerBackup).filter((id) => id !== "wind-temple");

/** A tiny two-room temple as shipped in code */
const shippedTemple = (extraRoom = false): ShippedTemple => ({
  entrance: [1, 0, 0],
  maze: { "1F": [["R001", "R002"]] },
  rooms: {
    R001: { type: "empty" },
    R002: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    ...(extraRoom ? { MK__: { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } } } : {}),
  },
});

const layoutOf = (shipped: ShippedTemple): any => JSON.parse(JSON.stringify({ entrance: shipped.entrance, maze: shipped.maze, rooms: shipped.rooms }));

describe("importAllTempleLayouts", () => {
  let storage: ReturnType<typeof fakeStorage>;
  let db: TempleDb;
  const sync = (shipped: Record<string, ShippedTemple>) => importAllTempleLayouts({ db, shipped });
  const stored = async (id: string) => (await db.getTempleById(id)) as TempleInterface;

  beforeEach(() => {
    storage = fakeStorage();
    db = new TempleDb(storage as never);
    (debug.log as jest.Mock).mockClear();
  });

  it("imports all nine shipped temples on a fresh device, each stamped with the signature of its layout", async () => {
    const report = await importAllTempleLayouts({ db });

    const ids = Object.keys(temples);
    expect(ids).toHaveLength(9);
    expect([...storage.data.keys()].sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const record = await stored(id);
      const shipped = (temples as Record<string, ShippedTemple>)[id];
      expect(report[id]).toBe("create");
      expect(record.seedSignature).toBe(layoutSignature(shipped));
      expect(layoutSignature(record.dungeonLayout)).toBe(layoutSignature(shipped));
      expect(record.customName).toEqual(expect.any(String));
    }
  });

  it("writes nothing when the shipped layout did not change", async () => {
    await sync({ "wind-temple": shippedTemple() });
    storage.set.mockClear();

    const report = await sync({ "wind-temple": shippedTemple() });

    expect(report).toEqual({ "wind-temple": "current" });
    expect(storage.set).not.toHaveBeenCalled();
  });

  it("refreshes an untouched copy when the shipped layout changes, and keeps its name", async () => {
    await sync({ "wind-temple": shippedTemple() });
    await db.setTemple({ ...(await stored("wind-temple")), customName: "Gale Tower" });
    storage.set.mockClear();

    const report = await sync({ "wind-temple": shippedTemple(true) });

    expect(report).toEqual({ "wind-temple": "refresh" });
    expect(storage.set).toHaveBeenCalledTimes(1);
    const record = await stored("wind-temple");
    expect(record.dungeonLayout).toEqual(layoutOf(shippedTemple(true)));
    expect(record.seedSignature).toBe(layoutSignature(shippedTemple(true)));
    expect(record.customName).toBe("Gale Tower");

    // and the next start has nothing left to do
    storage.set.mockClear();
    expect(await sync({ "wind-temple": shippedTemple(true) })).toEqual({ "wind-temple": "current" });
    expect(storage.set).not.toHaveBeenCalled();
  });

  it("stamps an unsigned copy that equals the shipped layout, then refreshes it when the shipped layout changes", async () => {
    await db.setTemple({ id: "wind-temple", categoryIds: ["dungeon"], dungeonLayout: layoutOf(shippedTemple()) });

    expect(await sync({ "wind-temple": shippedTemple() })).toEqual({ "wind-temple": "stamp" });
    expect((await stored("wind-temple")).seedSignature).toBe(layoutSignature(shippedTemple()));
    expect((await stored("wind-temple")).dungeonLayout).toEqual(layoutOf(shippedTemple()));

    expect(await sync({ "wind-temple": shippedTemple(true) })).toEqual({ "wind-temple": "refresh" });
    expect((await stored("wind-temple")).dungeonLayout).toEqual(layoutOf(shippedTemple(true)));
  });

  it("keeps the owner's hand-built wind temple (no signature, differs from the shipped layout, passes the audit), whatever the shipped layout does", async () => {
    const owner = ownerBackup["wind-temple"];
    expect(owner.seedSignature).toBeUndefined();
    expect(auditTemple(owner).passed).toBe(true);
    await storage.set("wind-temple", JSON.parse(JSON.stringify(owner)));
    storage.set.mockClear();

    for (const shipped of [shippedTemple(), shippedTemple(true), (temples as Record<string, ShippedTemple>)["wind-temple"]]) {
      expect(layoutSignature(shipped)).not.toBe(layoutSignature(owner.dungeonLayout));
      expect(await sync({ "wind-temple": shipped })).toEqual({ "wind-temple": "edited" });
    }

    expect(storage.set).not.toHaveBeenCalled();
    expect(await stored("wind-temple")).toEqual(owner);
  });

  it("refreshes the owner's eight old shipped seeds (no signature, differ, fail the audit) and stamps them", async () => {
    for (const id of oldSeedIds) {
      expect(auditTemple(ownerBackup[id]).passed).toBe(false);
      await storage.set(id, JSON.parse(JSON.stringify(ownerBackup[id])));
    }
    const shipped = Object.fromEntries(oldSeedIds.map((id) => [id, (temples as Record<string, ShippedTemple>)[id]]));
    expect(oldSeedIds).toHaveLength(8);

    const report = await sync(shipped);

    for (const id of oldSeedIds) {
      expect(report[id]).toBe("refresh");
      const record = await stored(id);
      expect(record.dungeonLayout).toEqual(layoutOf(shipped[id]));
      expect(record.seedSignature).toBe(layoutSignature(shipped[id]));
      expect(record.customName).toBe(ownerBackup[id].customName);
      expect(record.level).toBe(ownerBackup[id].level);
    }

    // the next start has nothing left to do
    storage.set.mockClear();
    expect(Object.values(await sync(shipped)).every((action) => action === "current")).toBe(true);
    expect(storage.set).not.toHaveBeenCalled();
  });

  it("syncs the owner's whole backup: eight stale seeds refresh, the hand-built wind temple stays as it is", async () => {
    for (const [id, record] of Object.entries(ownerBackup)) await storage.set(id, JSON.parse(JSON.stringify(record)));
    const shipped = { ...(temples as Record<string, ShippedTemple>), "wind-temple": shippedTemple(true) };

    const report = await sync(shipped);

    expect(report["wind-temple"]).toBe("edited");
    expect(await stored("wind-temple")).toEqual(ownerBackup["wind-temple"]);
    for (const id of oldSeedIds) expect(report[id]).toBe("refresh");
  });

  it("keeps an edited copy that has a signature, whatever the shipped layout does", async () => {
    await sync({ "wind-temple": shippedTemple() });
    const layout = layoutOf(shippedTemple());
    layout.rooms.R001 = { type: "shop" };
    await db.setTemple({ ...(await stored("wind-temple")), dungeonLayout: layout });
    storage.set.mockClear();

    expect(await sync({ "wind-temple": shippedTemple(true) })).toEqual({ "wind-temple": "edited" });
    expect(await sync({ "wind-temple": shippedTemple() })).toEqual({ "wind-temple": "edited" });

    expect(storage.set).not.toHaveBeenCalled();
    expect((await stored("wind-temple")).dungeonLayout?.rooms.R001).toEqual({ type: "shop" });
    expect((await stored("wind-temple")).seedSignature).toBe(layoutSignature(shippedTemple()));
  });

  it("adds the shipped layout to a record that only has settings", async () => {
    await db.setTemple({ id: "wind-temple", customName: "Gale Tower", categoryIds: ["dungeon"] });

    expect(await sync({ "wind-temple": shippedTemple() })).toEqual({ "wind-temple": "create" });

    const record = await stored("wind-temple");
    expect(record.customName).toBe("Gale Tower");
    expect(record.dungeonLayout).toEqual(layoutOf(shippedTemple()));
    expect(record.seedSignature).toBe(layoutSignature(shippedTemple()));
  });

  it("touches no hero progress but the runs of a temple whose layout it switched (ClassicTempleRefresh.spec)", async () => {
    const progress = fakeStorage();
    progress.data.set("kid-1:wind-temple", { looted: ["R002"], keys: 1 });
    const before = JSON.stringify([...progress.data.entries()]);

    await sync({ "wind-temple": shippedTemple(), "fire-temple": shippedTemple() }); // create
    await sync({ "wind-temple": shippedTemple(true), "fire-temple": shippedTemple() }); // refresh
    await db.setTemple({ ...(await stored("fire-temple")), dungeonLayout: layoutOf(shippedTemple(true)) });
    await sync({ "wind-temple": shippedTemple(true), "fire-temple": shippedTemple() }); // edited

    expect(JSON.stringify([...progress.data.entries()])).toBe(before);
    expect(progress.set).not.toHaveBeenCalled();
    expect(progress.remove).not.toHaveBeenCalled();
    expect(progress.clear).not.toHaveBeenCalled();
    // the temple store holds temple records only
    expect([...storage.data.keys()].sort()).toEqual(["fire-temple", "wind-temple"]);
  });

  it("keeps syncing the other temples when one record cannot be read", async () => {
    storage.get.mockImplementationOnce(async () => {
      throw new Error("broken record");
    });

    const report = await sync({ "wind-temple": shippedTemple(), "fire-temple": shippedTemple() });

    expect(report["fire-temple"]).toBe("create");
    expect((await stored("fire-temple")).seedSignature).toBe(layoutSignature(shippedTemple()));
  });

  it("says once that a copy is the Game Master's", async () => {
    const logged = () => (debug.log as jest.Mock).mock.calls.filter(([line]) => String(line).includes("quiet-temple"));
    await db.setTemple({ id: "quiet-temple", categoryIds: ["dungeon"], dungeonLayout: ownerBackup["wind-temple"].dungeonLayout });

    await sync({ "quiet-temple": shippedTemple() });
    await sync({ "quiet-temple": shippedTemple() });
    await sync({ "quiet-temple": shippedTemple(true) });

    expect(logged()).toHaveLength(1);
  });
});

/**
 * Quest Rooms (docs/Quest-Rooms-Spec.md section 12): the nine shipped temples were rebuilt with quest rooms. A device
 * that holds the classic layout it was given before gets the rebuilt one only when nobody edited it.
 */
describe("the quest room rebuild reaching a family's device", () => {
  let storage: ReturnType<typeof fakeStorage>;
  let db: TempleDb;
  const stored = async (id: string) => (await db.getTempleById(id)) as TempleInterface;
  const rebuilt = temples as Record<string, ShippedTemple>;
  const ids = Object.keys(rebuilt);

  /** A shipped temple as the app handed it out before the rebuild: the same maze, combat rooms with a beast type and room pay */
  const classicOf = (shipped: ShippedTemple): ShippedTemple => {
    const rooms = JSON.parse(JSON.stringify(shipped.rooms)) as Record<string, { type: string; content?: Record<string, any> }>;
    for (const room of Object.values(rooms)) {
      if (!room.content?.quest) continue;
      delete room.content.quest;
      Object.assign(room.content, { monsterType: "small", xp: 5, gp: 3, ap: 1 });
    }
    return { entrance: shipped.entrance, maze: shipped.maze, rooms };
  };

  /** A device that took the classic layouts in, signed, and has not touched them */
  const seedClassicDevice = async () => {
    const classic = Object.fromEntries(ids.map((id) => [id, classicOf(rebuilt[id])]));
    await importAllTempleLayouts({ db, shipped: classic });
    return classic;
  };

  beforeEach(() => {
    storage = fakeStorage();
    db = new TempleDb(storage as never);
  });

  it("really changed every temple: each shipped layout has quest rooms its classic version does not", () => {
    for (const id of ids) {
      const quests = Object.values((rebuilt[id].rooms ?? {}) as Record<string, any>).filter(isQuestRoom);
      expect(quests.length).toBeGreaterThanOrEqual(5);
      expect(layoutSignature(rebuilt[id])).not.toBe(layoutSignature(classicOf(rebuilt[id])));
      expect(Object.values((classicOf(rebuilt[id]).rooms ?? {}) as Record<string, any>).filter(isQuestRoom)).toHaveLength(0);
    }
  });

  it("refreshes the untouched classic copies to the quest rooms, keeping each name, and leaves the mazes where they were", async () => {
    const classic = await seedClassicDevice();
    for (const id of ids) await db.setTemple({ ...(await stored(id)), customName: `${id} of the family` });
    storage.set.mockClear();

    const report = await importAllTempleLayouts({ db, shipped: rebuilt });

    expect(Object.values(report)).toEqual(Array(9).fill("refresh"));
    for (const id of ids) {
      const record = await stored(id);
      expect(record.dungeonLayout).toEqual(layoutOf(rebuilt[id]));
      expect(record.dungeonLayout?.maze).toEqual(classic[id].maze);
      expect(record.dungeonLayout?.entrance).toEqual(classic[id].entrance);
      expect(record.seedSignature).toBe(layoutSignature(rebuilt[id]));
      expect(record.customName).toBe(`${id} of the family`);
    }
    expect([...storage.data.keys()].sort()).toEqual([...ids].sort());

    // and the next start has nothing left to do
    storage.set.mockClear();
    expect(Object.values(await importAllTempleLayouts({ db, shipped: rebuilt })).every((action) => action === "current")).toBe(true);
    expect(storage.set).not.toHaveBeenCalled();
  });

  it("keeps a temple the Game Master edited, whole, and refreshes the ones beside it", async () => {
    const classic = await seedClassicDevice();
    const edited = layoutOf(classic["shadow-temple"]);
    const monster = Object.values(edited.rooms as Record<string, any>).find((room) => room.type === "monster");
    monster.content.monsterType = "Gravy Ghoul";
    monster.content.xp = 40;
    await db.setTemple({ ...(await stored("shadow-temple")), dungeonLayout: edited, customName: "Mia's kitchen" });
    const before = JSON.stringify(await stored("shadow-temple"));

    const report = await importAllTempleLayouts({ db, shipped: rebuilt });

    expect(report["shadow-temple"]).toBe("edited");
    expect(JSON.stringify(await stored("shadow-temple"))).toBe(before);
    expect(Object.values((edited.rooms as Record<string, any>)).filter(isQuestRoom)).toHaveLength(0);
    for (const id of ids.filter((other) => other !== "shadow-temple")) expect(report[id]).toBe("refresh");
  });

  it("keeps an edited copy that already has quest rooms when the shipped quests change", async () => {
    await importAllTempleLayouts({ db, shipped: rebuilt });
    const mine = layoutOf(rebuilt["earth-temple"]);
    const room = Object.values(mine.rooms as Record<string, any>).find((candidate) => candidate.content?.quest);
    room.content.quest.difficulty = 3; // the Game Master made one quest harder
    await db.setTemple({ ...(await stored("earth-temple")), dungeonLayout: mine });
    storage.set.mockClear();

    const report = await importAllTempleLayouts({ db, shipped: { "earth-temple": classicOf(rebuilt["earth-temple"]) } });

    expect(report["earth-temple"]).toBe("edited");
    expect(storage.set).not.toHaveBeenCalled();
    expect((await stored("earth-temple")).dungeonLayout).toEqual(mine);
  });

  it("keeps an old copy with no signature that the Game Master finished themselves, and refreshes one that cannot be finished", async () => {
    const finished = layoutOf(classicOf(rebuilt["light-temple"]));
    const unfinished = layoutOf(classicOf(rebuilt["ice-temple"]));
    for (const room of Object.values(unfinished.rooms as Record<string, any>)) if (room.type === "boss") room.type = "monster";
    await db.setTemple({ id: "light-temple", categoryIds: ["dungeon"], dungeonLayout: finished });
    await db.setTemple({ id: "ice-temple", categoryIds: ["dungeon"], dungeonLayout: unfinished });
    expect(auditTemple({ dungeonLayout: finished }).passed).toBe(true);
    expect(auditTemple({ dungeonLayout: unfinished }).passed).toBe(false);

    const report = await importAllTempleLayouts({ db, shipped: { "light-temple": rebuilt["light-temple"], "ice-temple": rebuilt["ice-temple"] } });

    expect(report).toEqual({ "light-temple": "edited", "ice-temple": "refresh" });
    expect((await stored("light-temple")).dungeonLayout).toEqual(finished);
    expect((await stored("ice-temple")).dungeonLayout).toEqual(layoutOf(rebuilt["ice-temple"]));
  });
});

describe("layoutSignature", () => {
  it("is the same for equal layouts whatever the key order or undefined fields", () => {
    const a = { entrance: [1, 0, 0], maze: { "1F": [["R001"]] }, rooms: { R001: { type: "empty", content: { a: 1, b: 2 } } } };
    const b = { rooms: { R001: { content: { b: 2, a: 1 }, type: "empty", visited: undefined } }, maze: { "1F": [["R001"]] }, entrance: [1, 0, 0] };
    expect(layoutSignature(a)).toBe(layoutSignature(b));
  });

  it("changes with a room, the maze or the entrance", () => {
    const base = shippedTemple();
    const signatures = new Set([
      layoutSignature(base),
      layoutSignature(shippedTemple(true)),
      layoutSignature({ ...base, entrance: [1, 0, 1] }),
      layoutSignature({ ...base, maze: { "1F": [["R002", "R001"]] } }),
    ]);
    expect(signatures.size).toBe(4);
  });
});

describe("planSeedSync", () => {
  const unsigned = (dungeonLayout: unknown): TempleInterface => ({ id: "x", categoryIds: [], dungeonLayout } as TempleInterface);

  it("creates when there is no stored layout", () => {
    expect(planSeedSync(null, shippedTemple()).action).toBe("create");
    expect(planSeedSync({ id: "x", categoryIds: [] }, shippedTemple()).action).toBe("create");
  });

  it("stamps an unsigned copy that is the shipped layout", () => {
    expect(planSeedSync(unsigned(layoutOf(shippedTemple())), shippedTemple()).action).toBe("stamp");
  });

  it("refreshes an unsigned copy that differs and fails the audit: a stale seed or an unfinished draft", () => {
    const draft = layoutOf(shippedTemple(true)); // no entrance, no boss, no Boss Key, no Master Room
    expect(auditTemple({ dungeonLayout: draft }).passed).toBe(false);
    expect(planSeedSync(unsigned(draft), shippedTemple()).action).toBe("refresh");
  });

  it("keeps an unsigned copy that differs and passes the audit", () => {
    const finished = ownerBackup["wind-temple"].dungeonLayout;
    expect(planSeedSync(unsigned(finished), shippedTemple()).action).toBe("edited");
  });

  it("keeps a signed copy that differs even when it fails the audit", () => {
    const record = { ...unsigned(layoutOf(shippedTemple(true))), seedSignature: layoutSignature(shippedTemple()) };
    expect(auditTemple(record).passed).toBe(false);
    expect(planSeedSync(record, shippedTemple(true)).action).toBe("edited");
  });
});
