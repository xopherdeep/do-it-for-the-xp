/**
 * The Temple Creator hook (useTempleCreator) at two points the Game Master touches: pressing Save, which must write the
 * temple to the database once, and a temple whose entrance is stored as "floor index,row,col" (the multi-floor temples
 * the game ships, e.g. shadow-temple [0, 3, 2]), which the editor must read as a cell on one floor, not as row,col.
 * Only the browser's storage is faked (in memory).
 */
import { createPinia, setActivePinia } from "pinia";
import { useTempleCreator } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/useTempleCreator";
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { _00_ } from "@/lib/engine/dungeons/roomTypes";

jest.mock("@ionic/storage", () => {
  const rows = new Map<string, Map<string, unknown>>();
  class FakeStorage {
    private readonly mine: Map<string, unknown>;
    constructor(config: { name: string }) {
      if (!rows.has(config.name)) rows.set(config.name, new Map());
      this.mine = rows.get(config.name) as Map<string, unknown>;
    }
    async create() {
      return this;
    }
    async get(key: string) {
      return this.mine.has(key) ? JSON.parse(JSON.stringify(this.mine.get(key))) : null;
    }
    async set(key: string, value: unknown) {
      this.mine.set(key, JSON.parse(JSON.stringify(value)));
    }
    async remove(key: string) {
      this.mine.delete(key);
    }
    async clear() {
      this.mine.clear();
    }
    async keys() {
      return Array.from(this.mine.keys());
    }
  }
  return { Drivers: { IndexedDB: "indexeddb", LocalStorage: "localstorage" }, Storage: FakeStorage };
});
jest.mock("@ionic/vue", () => ({
  toastController: { create: jest.fn(() => Promise.resolve({ present: jest.fn() })) },
  alertController: { create: jest.fn() },
  createAnimation: jest.fn(),
  useIonRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("vue-router", () => ({ useRoute: () => ({ params: {}, query: {} }) }));
jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));

let counter = 0;
const nextId = () => `creator-hook-temple-${++counter}`;

beforeEach(() => {
  setActivePinia(createPinia());
});

/** A fresh creator on an empty store with a `rows`x`cols` first floor and the entrance at `entrance` */
const startTemple = (id: string, size: string, entrance: string) => {
  const creator = useTempleCreator({ templeId: id });
  creator.store.reset();
  creator.store.templeId = id;
  creator.gridSize.value = size;
  creator.entrancePosition.value = entrance;
  creator.initializeGrid();
  return creator;
};

const entranceCells = (grid: string[][]) => {
  const found: number[][] = [];
  grid.forEach((row, r) => row.forEach((cell, c) => cell === _00_ && found.push([r, c])));
  return found;
};

describe("saveTemple", () => {
  // Changed with #1155: the save wrote the same record twice in a row (a second write meant as a "snapshot" update
  // that store.updateDbSnapshot() already does)
  it("writes the temple to the database once", async () => {
    const id = nextId();
    const creator = startTemple(id, "2x2", "0,0");
    const setTemple = jest.spyOn(TempleDb.prototype, "setTemple");
    try {
      await creator.saveTemple();
      expect(setTemple).toHaveBeenCalledTimes(1);
      expect(setTemple.mock.calls[0][0]).toMatchObject({ id, dungeonLayout: { entrance: [0, 0] } });
    } finally {
      setTemple.mockRestore();
    }
    const stored = await new TempleDb(templeStorage).getTempleById(id);
    expect(stored?.dungeonLayout?.entrance).toEqual([0, 0]);
    expect(stored?.dungeonLayout?.maze).toEqual(creator.store.templeMaze);
  });

  it("writes an existing temple once too, keeping what else it holds", async () => {
    const id = nextId();
    await new TempleDb(templeStorage).setTemple({ id, categoryIds: ["dungeon"], customName: "Old Name" } as never);
    const creator = startTemple(id, "2x2", "1,1");
    const setTemple = jest.spyOn(TempleDb.prototype, "setTemple");
    try {
      await creator.saveTemple();
      expect(setTemple).toHaveBeenCalledTimes(1);
      expect(setTemple.mock.calls[0][0]).toMatchObject({ id, customName: "Old Name", dungeonLayout: { entrance: [1, 1] } });
    } finally {
      setTemple.mockRestore();
    }
  });
});

describe("a 'floor,row,col' entrance", () => {
  // Changed with #1155: the editor read "0,1,2" as row 0, col 1 on every floor
  it("starts the first floor with the entrance at its row and col", () => {
    const creator = startTemple(nextId(), "3x4", "0,1,2");
    expect(entranceCells(creator.templeMaze.value as string[][])).toEqual([[1, 2]]);
  });

  it("is the entrance cell on the floor it names and no cell on the other floors", () => {
    const creator = startTemple(nextId(), "3x4", "0,1,2");
    creator.addFloor("2F");

    creator.currentLevelId.value = "1F";
    expect(creator.isEntrancePosition(1, 2)).toBe(true);
    expect(creator.isEntrancePosition(0, 1)).toBe(false); // what "0,1,2" read as row,col pointed at
    expect(creator.entranceOnThisFloor.value).toBe("1,2");

    creator.currentLevelId.value = "2F";
    expect(creator.isEntrancePosition(1, 2)).toBe(false);
    expect(creator.isEntrancePosition(0, 1)).toBe(false);
    expect(creator.entranceOnThisFloor.value).toBe("-1,-1");
  });

  it("stays on its cell when the first floor grows, and leaves the other floors without one", () => {
    const creator = startTemple(nextId(), "3x4", "0,1,2");
    creator.addFloor("2F");

    creator.gridSize.value = "5x5";
    creator.currentLevelId.value = "1F";
    creator.resizeGrid();
    const floors = creator.templeMaze.value as Record<string, string[][]>;
    expect(floors["1F"]).toHaveLength(5);
    expect(entranceCells(floors["1F"])).toEqual([[1, 2]]);
    expect(creator.entrancePosition.value).toBe("0,1,2");

    creator.currentLevelId.value = "2F";
    creator.resizeGrid();
    expect(entranceCells((creator.templeMaze.value as Record<string, string[][]>)["2F"])).toEqual([]);
    expect(creator.entrancePosition.value).toBe("0,1,2");
  });

  it("goes back to 0,0 of its own floor when the first floor shrinks past it", () => {
    const creator = startTemple(nextId(), "3x4", "0,1,2");
    creator.addFloor("2F");

    creator.gridSize.value = "2x2";
    creator.currentLevelId.value = "1F";
    creator.resizeGrid();
    const floors = creator.templeMaze.value as Record<string, string[][]>;
    expect(entranceCells(floors["1F"])).toEqual([[0, 0]]);
    expect(creator.entrancePosition.value).toBe("0,0,0");
    expect(creator.isEntrancePosition(0, 0)).toBe(true);
  });

  it("is saved as the [row, col] the game reads on its first floor", async () => {
    const id = nextId();
    const creator = startTemple(id, "3x4", "0,1,2");
    await creator.saveTemple();
    const stored = await new TempleDb(templeStorage).getTempleById(id);
    expect(stored?.dungeonLayout?.entrance).toEqual([1, 2]);
  });
});

describe("a 'row,col' entrance", () => {
  it("is the entrance cell on every floor, as before", () => {
    const creator = startTemple(nextId(), "3x4", "1,2");
    creator.addFloor("2F");
    for (const floor of ["1F", "2F"]) {
      creator.currentLevelId.value = floor;
      expect(creator.isEntrancePosition(1, 2)).toBe(true);
      expect(creator.entranceOnThisFloor.value).toBe("1,2");
    }
  });
});
