/**
 * The Temple Creator hook (useTempleCreator) at two points the Game Master touches: pressing Save, which must write the
 * temple to the database once, and a temple whose entrance is stored as "floor index,row,col" (the multi-floor temples
 * the game ships, e.g. shadow-temple [0, 3, 2]), which the editor must read as a cell on one floor, not as row,col.
 * Only the browser's storage is faked (in memory).
 */
import { createPinia, setActivePinia } from "pinia";
import { toastController } from "@ionic/vue";
import { useTempleCreator } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/useTempleCreator";
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { _00_, ____ } from "@/lib/engine/dungeons/roomTypes";
import { writeMazeCell } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/floorLayers";

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
jest.mock("@/lib/engine/core/dungeons/importAllTemples", () => ({
  __esModule: true,
  ensureBuiltInTemples: async () => undefined,
}));
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
  (toastController.create as jest.Mock).mockClear();
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

  // Changed with #1218: this pinned "a 'floor,row,col' entrance is saved as [row, col]" for every temple, which sent a
  // multi-floor temple's hero to the first floor whatever floor the entrance was on. It now holds for a single grid
  // only (one floor, so the index says nothing); a temple with floors keeps its [floor, row, col] (next specs).
  it("is saved as the [row, col] the game reads on its first floor when the temple is one grid", async () => {
    const id = nextId();
    const creator = startTemple(id, "3x4", "0,1,2");
    await creator.saveTemple();
    const stored = await new TempleDb(templeStorage).getTempleById(id);
    expect(stored?.dungeonLayout?.entrance).toEqual([1, 2]);
  });

  it("keeps its floor index when the temple has floors: an entrance on the second floor is saved as [1, row, col]", async () => {
    const id = nextId();
    const creator = startTemple(id, "3x4", "1,1,2");
    creator.addFloor("2F");
    creator.currentLevelId.value = "2F";
    expect(creator.entranceOnThisFloor.value).toBe("1,2"); // the editor reads it as a cell of the second floor
    await creator.saveTemple();
    const stored = await new TempleDb(templeStorage).getTempleById(id);
    expect(stored?.dungeonLayout?.entrance).toEqual([1, 1, 2]);
  });

  it("keeps [0, row, col] for an entrance on the first floor of a temple with floors (shadow-temple's [0, 3, 2])", async () => {
    const id = nextId();
    const creator = startTemple(id, "5x5", "0,3,2");
    creator.addFloor("2F");
    await creator.saveTemple();
    const stored = await new TempleDb(templeStorage).getTempleById(id);
    expect(stored?.dungeonLayout?.entrance).toEqual([0, 3, 2]);
  });
});

describe("a 'row,col' entrance", () => {
  it("is saved as [row, col] on a temple with floors too: the game reads it on '1F'", async () => {
    const id = nextId();
    const creator = startTemple(id, "3x4", "1,2");
    creator.addFloor("2F");
    await creator.saveTemple();
    const stored = await new TempleDb(templeStorage).getTempleById(id);
    expect(stored?.dungeonLayout?.entrance).toEqual([1, 2]);
  });

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

// --- #1219: the entrance follows the Game Master's edits -------------------------------------------------------------

const doors = { north: "door", east: "door", south: "door", west: "door" };

/** The Game Master picks `type` for a cell in the quick-edit popover */
const paint = (creator: ReturnType<typeof useTempleCreator>, type: string, row: number, col: number) => {
  creator.selectCell(row, col);
  creator.applyRoomChanges(type, {}, doors);
};

const floorMap = (creator: ReturnType<typeof useTempleCreator>) =>
  creator.templeMaze.value as Record<string, string[][]>;

/** Every entrance token in a temple with floors, as "floor:row,col" */
const entranceTokens = (creator: ReturnType<typeof useTempleCreator>) =>
  Object.entries(floorMap(creator)).flatMap(([levelId, grid]) =>
    entranceCells(grid).map(([row, col]) => `${levelId}:${row},${col}`)
  );

const savedEntrance = async (id: string) =>
  (await new TempleDb(templeStorage).getTempleById(id))?.dungeonLayout?.entrance;

/** A temple of `floorNames` floors, 3x4 each, with the entrance token already on the cell its position names */
const startFloors = (floorNames: string[], entrance: string, tokenOn?: { levelId: string; row: number; col: number }) => {
  const id = nextId();
  const creator = startTemple(id, "3x4", entrance);
  floorNames.forEach((name) => creator.addFloor(name));
  if (tokenOn) writeMazeCell(creator.templeMaze.value, tokenOn.levelId, tokenOn.row, tokenOn.col, _00_);
  creator.currentLevelId.value = "1F";
  return { id, creator };
};

describe("painting the entrance on a cell", () => {
  // Added with #1219: the editor only set the entrance on load, resize or reset, so a painted token and the saved
  // entrance came apart (the game started the hero at the old place, or at a cell with no entrance token)
  it("makes that cell the saved entrance and turns the old entrance cell into an empty room", async () => {
    const id = nextId();
    const creator = startTemple(id, "3x4", "0,0");
    paint(creator, "entrance", 2, 3);

    expect(creator.entrancePosition.value).toBe("2,3");
    expect(entranceCells(creator.templeMaze.value as string[][])).toEqual([[2, 3]]);
    const oldCell = (creator.templeMaze.value as string[][])[0][0];
    expect(oldCell).not.toBe(_00_);
    expect(creator.roomsData.value[oldCell]).toMatchObject({ type: "empty" });
    expect(creator.isEntrancePosition(2, 3)).toBe(true);
    expect(creator.isEntrancePosition(0, 0)).toBe(false);

    await creator.saveTemple();
    expect(await savedEntrance(id)).toEqual([2, 3]);
  });

  it("keeps the floor index when the temple has floors: the entrance is 'floor index,row,col' of the floor painted on", async () => {
    const { id, creator } = startFloors(["2F"], "0,1,2");
    paint(creator, "entrance", 2, 0);

    expect(creator.entrancePosition.value).toBe("0,2,0");
    expect(entranceTokens(creator)).toEqual(["1F:2,0"]);
    expect(creator.entranceOnThisFloor.value).toBe("2,0");
    const oldCell = floorMap(creator)["1F"][1][2];
    expect(creator.roomsData.value[oldCell]).toMatchObject({ type: "empty" });

    await creator.saveTemple();
    expect(await savedEntrance(id)).toEqual([0, 2, 0]);
  });

  it("leaves one entrance when the old one was on another floor: that floor's token becomes an empty room", async () => {
    const { id, creator } = startFloors(["2F"], "1,1,2", { levelId: "2F", row: 1, col: 2 });
    expect(entranceTokens(creator)).toEqual(["2F:1,2"]);

    paint(creator, "entrance", 0, 1); // the entrance floor is the lowest surface floor, 1F

    expect(creator.entrancePosition.value).toBe("0,0,1");
    expect(entranceTokens(creator)).toEqual(["1F:0,1"]);
    const oldCell = floorMap(creator)["2F"][1][2];
    expect(creator.roomsData.value[oldCell]).toMatchObject({ type: "empty" });

    await creator.saveTemple();
    expect(await savedEntrance(id)).toEqual([0, 0, 1]);
  });

  it("finds the old entrance when it is saved as the 5-character token a reloaded temple holds", () => {
    const creator = startTemple(nextId(), "3x4", "0,0");
    (creator.templeMaze.value as string[][])[0][0] = "_00__";
    paint(creator, "entrance", 1, 1);

    expect(creator.entrancePosition.value).toBe("1,1");
    expect((creator.templeMaze.value as string[][])[0][0]).not.toBe("_00__");
    expect(entranceCells(creator.templeMaze.value as string[][])).toEqual([[1, 1]]);
  });

  it("changes nothing when the entrance is painted on the cell that already is the entrance", () => {
    const creator = startTemple(nextId(), "3x4", "1,2");
    paint(creator, "entrance", 1, 2);
    expect(creator.entrancePosition.value).toBe("1,2");
    expect(entranceCells(creator.templeMaze.value as string[][])).toEqual([[1, 2]]);
  });

  it("is refused off the entrance floor, with the toast, and the entrance stays where it was", () => {
    const { creator } = startFloors(["2F"], "0,1,2", { levelId: "1F", row: 1, col: 2 });
    creator.currentLevelId.value = "2F";
    paint(creator, "entrance", 0, 0);

    expect(creator.entrancePosition.value).toBe("0,1,2");
    expect(entranceTokens(creator)).toEqual(["1F:1,2"]);
    expect(toastController.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("lowest surface floor (1F)") })
    );
  });

  it("does not move the entrance when another kind of room is painted", () => {
    const creator = startTemple(nextId(), "3x4", "1,2");
    paint(creator, "monster", 0, 0);
    expect(creator.entrancePosition.value).toBe("1,2");
    expect(entranceCells(creator.templeMaze.value as string[][])).toEqual([[1, 2]]);
  });
});

describe("removing a floor", () => {
  // Added with #1219: deleting a maze key shifts the index of every later floor, so "2,1,2" (the third floor) pointed
  // at nothing, or at another floor, once a floor before it was gone
  it("keeps an entrance on the same floor when a floor before it is removed: its floor index moves down one", async () => {
    const { id, creator } = startFloors(["2F", "3F"], "2,1,2", { levelId: "3F", row: 1, col: 2 });
    creator.removeFloor("2F");

    expect(Object.keys(floorMap(creator))).toEqual(["1F", "3F"]);
    expect(creator.entrancePosition.value).toBe("1,1,2");
    creator.currentLevelId.value = "3F";
    expect(creator.entranceOnThisFloor.value).toBe("1,2");
    creator.currentLevelId.value = "1F";
    expect(creator.entranceOnThisFloor.value).toBe("-1,-1");
    expect(entranceTokens(creator)).toEqual(["3F:1,2"]);
    expect(toastController.create).not.toHaveBeenCalled();

    await creator.saveTemple();
    expect(await savedEntrance(id)).toEqual([1, 1, 2]);
  });

  it("leaves the entrance alone when the floor removed comes after its floor", () => {
    const { creator } = startFloors(["2F", "3F"], "0,1,2", { levelId: "1F", row: 1, col: 2 });
    creator.removeFloor("3F");
    expect(creator.entrancePosition.value).toBe("0,1,2");
    expect(entranceTokens(creator)).toEqual(["1F:1,2"]);
  });

  it("leaves a 'row,col' entrance alone: it names no floor", () => {
    const { creator } = startFloors(["2F", "3F"], "1,2", { levelId: "1F", row: 1, col: 2 });
    creator.removeFloor("2F");
    expect(creator.entrancePosition.value).toBe("1,2");
    expect(entranceTokens(creator)).toEqual(["1F:1,2"]);
  });

  it("puts the entrance back at 0,0 of the entrance floor when its own floor is removed, and says so", async () => {
    const { id, creator } = startFloors(["2F", "3F"], "1,1,2", { levelId: "2F", row: 1, col: 2 });
    paint(creator, "monster", 0, 0); // the cell the entrance goes back to holds a room
    const monsterSymbol = floorMap(creator)["1F"][0][0];
    expect(creator.roomsData.value[monsterSymbol]).toMatchObject({ type: "monster" });

    creator.removeFloor("2F");

    expect(Object.keys(floorMap(creator))).toEqual(["1F", "3F"]);
    expect(creator.entrancePosition.value).toBe("0,0,0");
    expect(entranceTokens(creator)).toEqual(["1F:0,0"]);
    expect(creator.roomsData.value[monsterSymbol]).toBeUndefined(); // the room the entrance took the cell from is gone
    creator.currentLevelId.value = "1F";
    expect(creator.isEntrancePosition(0, 0)).toBe(true);
    expect(toastController.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/2F.*1F/) })
    );

    await creator.saveTemple();
    expect(await savedEntrance(id)).toEqual([0, 0, 0]);
  });

  it("counts the entrance floor's place among the floors left when its own floor is removed", () => {
    const { creator } = startFloors(["B1", "2F"], "2,0,0", { levelId: "2F", row: 0, col: 0 });
    // the maze holds its floors in the order 1F, B1, 2F; the entrance floor of 1F and 2F is 1F, the first
    creator.removeFloor("2F");
    expect(creator.entrancePosition.value).toBe("0,0,0");
    expect(entranceTokens(creator)).toEqual(["1F:0,0"]);
  });

  it("still refuses to remove 1F and leaves the entrance alone", () => {
    const { creator } = startFloors(["2F"], "1,1,2", { levelId: "2F", row: 1, col: 2 });
    creator.removeFloor("1F");
    expect(Object.keys(floorMap(creator))).toEqual(["1F", "2F"]);
    expect(creator.entrancePosition.value).toBe("1,1,2");
  });
});

// --- #1358: a temple another screen already loaded into the store -------------------------------------------------

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** A stored temple of two 5x4 floors with the entrance on 1F, cell 2,1: the shape of earth-temple's [0, 2, 1] */
const earthTemple = (id: string) => {
  const floor = () => Array.from({ length: 5 }, () => Array(4).fill(____));
  const first = floor();
  first[2][1] = _00_;
  return {
    id,
    categoryIds: ["dungeon"],
    customName: "Earth",
    dungeonLayout: {
      entrance: [0, 2, 1],
      maze: { "1F": first, "2F": floor() },
      rooms: { [____]: { type: "wall" }, [_00_]: { type: "entrance", visited: true } },
    },
  };
};

/** The creator on a store that useTempleData.loadTemple filled the way it once did: the maze and the rooms, nothing else */
const startOnHalfLoadedStore = async (record: ReturnType<typeof earthTemple>) => {
  await new TempleDb(templeStorage).setTemple(record as never);
  const creator = useTempleCreator({ templeId: record.id });
  creator.store.reset();
  creator.store.templeMaze = clone(record.dungeonLayout.maze);
  creator.store.roomsData = clone(record.dungeonLayout.rooms);
  creator.store.markAsLoaded(record.id);
  return creator;
};

describe("a temple another screen already marked loaded", () => {
  it("adopts the stored entrance when useTempleData already marked the temple loaded", async () => {
    const creator = await startOnHalfLoadedStore(earthTemple(nextId()));
    expect(creator.entrancePosition.value).toBe("5,2"); // the store default, until the creator looks at the record

    await creator.loadTempleLayout();

    expect(creator.entrancePosition.value).toBe("0,2,1");
    expect(creator.gridSize.value).toBe("5x4");
    expect(creator.currentLevelId.value).toBe("1F");
  });

  it("keeps the stored entrance through an edit and a save", async () => {
    const record = earthTemple(nextId());
    const creator = await startOnHalfLoadedStore(record);
    await creator.loadTempleLayout();

    paint(creator, "monster", 0, 0);
    await creator.saveTemple();

    expect(await savedEntrance(record.id)).toEqual([0, 2, 1]);
    const stored = await new TempleDb(templeStorage).getTempleById(record.id);
    const maze = stored?.dungeonLayout?.maze as Record<string, string[][]>;
    expect(Object.keys(maze)).toEqual(["1F", "2F"]);
    expect(maze["1F"]).toHaveLength(5); // the entrance row 2 sits inside a 5-row grid, not off it
  });

  it("puts a floor the maze does not have back on one it has", async () => {
    const creator = await startOnHalfLoadedStore(earthTemple(nextId()));
    creator.store.currentLevelId = "9F";
    await creator.loadTempleLayout();
    expect(creator.currentLevelId.value).toBe("1F");
  });

  it("keeps what the Game Master changed since: a temple the creator already tracks is not read again", async () => {
    const creator = await startOnHalfLoadedStore(earthTemple(nextId()));
    await creator.loadTempleLayout();

    paint(creator, "entrance", 4, 3);
    expect(creator.entrancePosition.value).toBe("0,4,3");
    await creator.loadTempleLayout(); // coming back from the room editor

    expect(creator.entrancePosition.value).toBe("0,4,3");
    expect(creator.hasUnsavedChanges.value).toBe(true);
  });

  it("reads the entrance, grid and floor of a temple the store does not hold yet", async () => {
    const record = earthTemple(nextId());
    await new TempleDb(templeStorage).setTemple(record as never);
    const creator = useTempleCreator({ templeId: record.id });
    await creator.loadTempleLayout();
    expect(creator.entrancePosition.value).toBe("0,2,1");
    expect(creator.gridSize.value).toBe("5x4");
    expect(creator.hasUnsavedChanges.value).toBe(false);
  });
});

describe("initializeGrid on a temple with floors", () => {
  it("never replaces the floors when the floor on show is not one of them", async () => {
    const creator = await startOnHalfLoadedStore(earthTemple(nextId()));
    creator.currentLevelId.value = "9F";
    creator.initializeGrid();
    expect(Object.keys(floorMap(creator))).toEqual(["1F", "2F"]);
    expect(creator.currentLevelId.value).toBe("1F");
  });

  it("starts over only the floor on show", async () => {
    const creator = await startOnHalfLoadedStore(earthTemple(nextId()));
    creator.gridSize.value = "3x3";
    creator.currentLevelId.value = "2F";
    creator.initializeGrid();
    expect(floorMap(creator)["2F"]).toHaveLength(3);
    expect(floorMap(creator)["1F"]).toHaveLength(5);
  });
});
