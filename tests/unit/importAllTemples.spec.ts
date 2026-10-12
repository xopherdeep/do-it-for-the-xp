import { TempleDb, type TempleInterface } from "@/lib/databases/TempleDb";
import temples from "@/lib/engine/temples";
import { importAllTempleLayouts, layoutSignature, planSeedSync, type ShippedTemple } from "@/lib/engine/core/dungeons/importAllTemples";
import debug from "@/lib/utils/debug";

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

  it("keeps an edited copy that has no signature (a hand-built temple), whatever the shipped layout does", async () => {
    const handBuilt = layoutOf(shippedTemple(true));
    handBuilt.rooms.R001 = { type: "boss", content: { boss: "wind-lord" } };
    await db.setTemple({ id: "wind-temple", customName: "My Wind Temple", categoryIds: ["dungeon"], dungeonLayout: handBuilt });
    storage.set.mockClear();

    for (const shipped of [shippedTemple(), shippedTemple(true)]) {
      expect(await sync({ "wind-temple": shipped })).toEqual({ "wind-temple": "edited" });
    }

    expect(storage.set).not.toHaveBeenCalled();
    const record = await stored("wind-temple");
    expect(record.dungeonLayout).toEqual(handBuilt);
    expect(record.seedSignature).toBeUndefined();
    expect(record.customName).toBe("My Wind Temple");
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

  it("never touches hero progress", async () => {
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
    await db.setTemple({ id: "quiet-temple", categoryIds: ["dungeon"], dungeonLayout: layoutOf(shippedTemple(true)) });

    await sync({ "quiet-temple": shippedTemple() });
    await sync({ "quiet-temple": shippedTemple() });
    await sync({ "quiet-temple": shippedTemple(true) });

    expect(logged()).toHaveLength(1);
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
  it("creates when there is no stored layout", () => {
    expect(planSeedSync(null, shippedTemple()).action).toBe("create");
    expect(planSeedSync({ id: "x", categoryIds: [] }, shippedTemple()).action).toBe("create");
  });
});
