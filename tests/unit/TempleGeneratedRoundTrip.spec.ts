/**
 * A generated temple saved by the Temple Creator comes back out of TempleDb, is registered by
 * registerCustomTemples under its "gen-<seed>" id, and the registered dungeon is still the solvable layout the
 * generator made, entrance included. Only the browser's storage is faked (in memory).
 */
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { registerCustomTemples } from "@/lib/engine/core/dungeons/TempleAdapter";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import {
  generateTemple,
  solveTemple,
  toTempleRecord,
  generatedTempleId,
  floorsOf,
  uniqueGeneratedTempleId,
  recordToSave,
} from "@/lib/engine/dungeons/generator";

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

describe("uniqueGeneratedTempleId", () => {
  it("gives the id as it is when it is free", () => {
    expect(uniqueGeneratedTempleId([], "gen-attic-417")).toBe("gen-attic-417");
    expect(uniqueGeneratedTempleId(["gen-attic-418", "wind-temple"], "gen-attic-417")).toBe("gen-attic-417");
  });

  it("gives -2 when the id is taken, then -3 when -2 is taken too", () => {
    expect(uniqueGeneratedTempleId(["gen-attic-417"], "gen-attic-417")).toBe("gen-attic-417-2");
    expect(uniqueGeneratedTempleId(["gen-attic-417", "gen-attic-417-2"], "gen-attic-417")).toBe("gen-attic-417-3");
  });

  it("takes the first free number, not the one after the highest", () => {
    expect(uniqueGeneratedTempleId(["gen-attic-417", "gen-attic-417-3"], "gen-attic-417")).toBe("gen-attic-417-2");
  });
});

// #1390: Save wrote gen-<seed> over whatever the id held, so a generated temple the GM had edited in the Temple Creator
// was lost when the same seed was saved again
describe("recordToSave", () => {
  const db = new TempleDb(templeStorage);
  const generate = (seed: string, size: "small" | "medium" = "small") =>
    toTempleRecord(generateTemple(seed, { theme: "Attic", size, floors: 1, locks: 1, element: "wind" }));
  const ask = jest.fn();

  beforeEach(async () => {
    await templeStorage.clear();
    ask.mockReset();
  });

  it("saves as it is, without asking, when the id is free", async () => {
    const record = generate("attic-417");
    expect(await recordToSave(record, db, ask)).toEqual(record);
    expect(ask).not.toHaveBeenCalled();
  });

  it("saves as it is, without asking, when the id already holds exactly this generation", async () => {
    const record = generate("attic-417");
    await db.setTemple(record);
    expect(await recordToSave(generate("attic-417"), db, ask)).toEqual(record);
    expect(ask).not.toHaveBeenCalled();
  });

  describe("when the id holds a temple the GM has edited", () => {
    const edited = () => {
      const record = generate("attic-417");
      const room = Object.values(record.dungeonLayout!.rooms)[0];
      room.content = { ...room.content, questId: "quest-the-gm-picked" };
      return record;
    };

    it("asks about the id and writes nothing itself", async () => {
      await db.setTemple(edited());
      ask.mockResolvedValue("cancel");
      await recordToSave(generate("attic-417"), db, ask);
      expect(ask).toHaveBeenCalledWith("gen-attic-417");
      expect(await db.getTempleById("gen-attic-417")).toEqual(edited());
    });

    it("gives the fresh generation under the same id for Replace", async () => {
      await db.setTemple(edited());
      ask.mockResolvedValue("replace");
      const fresh = generate("attic-417");
      expect(await recordToSave(fresh, db, ask)).toEqual(fresh);
    });

    it("gives the fresh generation under the first free copy id for Save as a copy", async () => {
      await db.setTemple(edited());
      ask.mockResolvedValue("copy");
      const fresh = generate("attic-417");
      expect(await recordToSave(fresh, db, ask)).toEqual({ ...fresh, id: "gen-attic-417-2" });

      await db.setTemple({ ...edited(), id: "gen-attic-417-2" });
      expect((await recordToSave(fresh, db, ask))!.id).toBe("gen-attic-417-3");
    });

    it("gives nothing to save for Cancel", async () => {
      await db.setTemple(edited());
      ask.mockResolvedValue("cancel");
      expect(await recordToSave(generate("attic-417"), db, ask)).toBeNull();
    });
  });

  it("asks when the same seed comes back with another size, as the id ignores the options", async () => {
    await db.setTemple(generate("attic-417", "small"));
    ask.mockResolvedValue("cancel");
    await recordToSave(generate("attic-417", "medium"), db, ask);
    expect(ask).toHaveBeenCalledWith("gen-attic-417");
  });
});
