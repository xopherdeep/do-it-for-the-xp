/**
 * A generated temple saved by the Temple Creator comes back out of TempleDb, is registered by
 * registerCustomTemples under its "gen-<seed>" id, and the registered dungeon is still the solvable layout the
 * generator made, entrance included. Only the browser's storage is faked (in memory).
 */
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { registerCustomTemples } from "@/lib/engine/core/dungeons/TempleAdapter";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { generateTemple, solveTemple, toTempleRecord, generatedTempleId, floorsOf } from "@/lib/engine/dungeons/generator";

jest.mock("@ionic/storage", () => {
  class Storage {
    private rows = new Map<string, unknown>();
    constructor(public readonly config: unknown) {}
    async create() {
      return this;
    }
    async get(key: string) {
      return this.rows.has(key) ? JSON.parse(JSON.stringify(this.rows.get(key))) : null;
    }
    async set(key: string, value: unknown) {
      this.rows.set(key, value);
    }
    async remove(key: string) {
      this.rows.delete(key);
    }
    async clear() {
      this.rows.clear();
    }
    async keys() {
      return [...this.rows.keys()];
    }
  }
  return { Storage, Drivers: { IndexedDB: "indexeddb", LocalStorage: "localstorage" } };
});

describe("generated temples round-trip through TempleDb and registerCustomTemples", () => {
  const db = new TempleDb(templeStorage);

  beforeEach(async () => {
    await templeStorage.clear();
  });

  it("saves under gen-<seed-slug>, reloads as the same record and registers a solvable dungeon with its entrance", async () => {
    const temple = generateTemple("Pantry 31", { theme: "Pantry", size: "medium", floors: 2, locks: 2, element: "earth" });
    const record = toTempleRecord(temple);
    expect(record.id).toBe("gen-pantry-31");
    expect(generatedTempleId(temple.seed)).toBe(record.id);

    await db.setTemple(record);
    const stored = await db.getTempleById("gen-pantry-31");
    expect(stored).toEqual(record);
    expect(await db.getTempleByName("Pantry Temple")).toEqual(record);

    await registerCustomTemples({ force: true });
    const dungeon = DungeonManager.getInstance().getDungeon("gen-pantry-31");
    expect(dungeon).toBeDefined();
    expect(dungeon!.id).toBe("gen-pantry-31");
    expect(dungeon!.maze).toEqual(temple.maze);
    expect(Object.keys(dungeon!.rooms).sort()).toEqual(Object.keys(temple.rooms).sort());
    expect(dungeon!.entrance).toEqual(temple.entrance);

    // the entrance points at the entrance room on the first floor, so TempleGrounds starts the hero there
    const [floor, row, col] = dungeon!.entrance!;
    const grids = floorsOf(dungeon!.maze);
    expect(dungeon!.rooms[grids[Object.keys(grids)[floor]][row][col]].type).toBe("entrance");

    // the registered copy is a layout the solver still clears
    const verdict = solveTemple({ maze: dungeon!.maze, rooms: dungeon!.rooms, entrance: dungeon!.entrance });
    expect(verdict.solvable).toBe(true);
    expect(verdict.reasons).toEqual([]);
    expect(verdict.criticalPath.length).toBe(temple.criticalPath.length);
  });

  it("keeps the generator's locks and chests through storage", async () => {
    const temple = generateTemple(1234, { theme: "Yard", size: "small", locks: 1 });
    await db.setTemple(toTempleRecord(temple));
    await registerCustomTemples({ force: true });
    const dungeon = DungeonManager.getInstance().getDungeon("gen-1234")!;

    const boss = Object.values(dungeon.rooms).find((room) => room.type === "boss")!;
    expect(boss.locked).toEqual({ master: true });
    expect(boss.content?.lockOnEnter).toBe(true);
    const pegasus = Object.values(dungeon.rooms).filter((room) => room.content?.pegasus);
    expect(pegasus).toHaveLength(1);
    const keys = Object.values(dungeon.rooms).filter((room) => room.content?.dungeon === "key");
    expect(keys.length).toBeGreaterThanOrEqual(1);
  });

  it("leaves a stored record without a layout alone", async () => {
    await db.setTemple({ id: "gen-empty", categoryIds: [] });
    await registerCustomTemples({ force: true });
    expect(DungeonManager.getInstance().getDungeon("gen-empty")).toBeUndefined();
  });
});
