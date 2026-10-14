/**
 * Where a hero starts in a temple: the entrance names it. A 2-part entrance [row, col] is on the first floor the
 * temple has (the editor allows floors named ['2F','3F']), a 3-part [floorIndex, row, col] indexes the floors. An
 * entrance that is not a room to stand in (a wall, outside the grid) falls back like the solver does: the first
 * entrance room, else the first cell with a floor. Without it the hero would be stranded in a room that is not there.
 *
 * The dungeon manager and the temple system are the real ones; the storage is faked (in memory).
 */
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import type { Room } from "@/lib/engine/core/dungeons/types";
import debug from "@/lib/utils/debug";

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

const dungeons = DungeonManager.getInstance();
const temples = TempleSystem.getInstance();

// The singletons outlive a test, so every test gets a temple of its own
let counter = 0;
const nextId = () => `entrance-temple-${++counter}`;

const ROOMS: Record<string, Room> = {
  ENT: { type: "entrance" },
  HALL: { type: "empty" },
  WALL: { type: "wall" },
};

type Maze = string[][] | Record<string, string[][]>;

/** Register a temple of the grids given; the entrance is left out when it is `undefined` */
const register = (id: string, maze: Maze, entrance?: number[]) => {
  dungeons.registerDungeon({
    id,
    name: id,
    maze,
    rooms: JSON.parse(JSON.stringify(ROOMS)),
    visitedPositions: new Set<string>(),
    ...(entrance ? { entrance } : {}),
  });
  return id;
};

/** A tower whose floors are not called 1F and 2F: the editor allows custom names */
const upperFloors = (): Maze => ({ "2F": [["ENT", "HALL"]], "3F": [["HALL", "ENT"]] });

describe("where the hero starts", () => {
  it("puts a 2-part entrance on the first floor of the temple, whatever it is called", () => {
    const id = register(nextId(), upperFloors(), [0, 0]);

    expect(temples.initTemple(id)).toBe(true);

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 0] });
    expect(temples.getCurrentRoom(id)?.type).toBe("entrance");
    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true); // the hero is somewhere they can walk from
  });

  it("starts a temple with no entrance at the top left of its first floor", () => {
    const id = register(nextId(), upperFloors());

    temples.initTemple(id);

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 0] });
  });

  it("reads a 3-part entrance as an index into the floors", () => {
    const id = register(nextId(), upperFloors(), [1, 0, 1]);

    temples.initTemple(id);

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "3F", currentPosition: [0, 1] });
    expect(temples.getCurrentRoom(id)?.type).toBe("entrance");
  });

  it("starts on the first floor when a 3-part entrance names a floor the temple does not have", () => {
    const id = register(nextId(), upperFloors(), [7, 0, 0]);

    temples.initTemple(id);

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 0] });
  });

  it("keeps 1F for a single grid", () => {
    const id = register(nextId(), [["HALL", "ENT"]], [0, 1]);

    temples.initTemple(id);

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 1] });
  });
});

describe("an entrance that is not a room to stand in", () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(debug, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  it("falls back to the first entrance room, and says so", () => {
    const id = register(nextId(), [["WALL", "HALL", "ENT"]], [0, 0]);

    temples.initTemple(id);

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 2] });
    expect(temples.getCurrentRoom(id)?.type).toBe("entrance");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(id));
  });

  it("finds the entrance room on another floor", () => {
    const id = register(nextId(), { "2F": [["WALL", "HALL"]], "3F": [["HALL", "ENT"]] }, [0, 0]);

    temples.initTemple(id);

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "3F", currentPosition: [0, 1] });
  });

  it("falls back to the first cell with a floor when the temple has no entrance room", () => {
    const id = register(nextId(), { "2F": [["WALL", "WALL"]], "3F": [["WALL", "HALL"]] }, [0, 1]);

    temples.initTemple(id);

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "3F", currentPosition: [0, 1] });
  });

  it("falls back when the entrance is outside the grid", () => {
    const id = register(nextId(), [["HALL", "ENT"]], [5, 5]);

    temples.initTemple(id);

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 1] });
  });

  it("does not move a hero whose run is already going, nor warn", () => {
    const id = register(nextId(), [["ENT", "HALL"]], [0, 0]);
    temples.initTemple(id);
    temples.moveToPosition(id, [0, 1], "east");
    warn.mockClear();

    temples.initTemple(id, [0, 0]);

    expect(temples.getTempleState(id)).toMatchObject({ currentPosition: [0, 1] });
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn for an entrance that is a room", () => {
    const id = register(nextId(), upperFloors(), [0, 0]);

    temples.initTemple(id);

    expect(warn).not.toHaveBeenCalled();
  });

  it("sends a hero back to a room they can stand in when the layout changes under them", () => {
    const id = register(nextId(), [["ENT", "HALL", "HALL"]], [0, 0]);
    temples.initTemple(id);
    temples.moveToPosition(id, [0, 1], "east");
    temples.moveToPosition(id, [0, 2], "east");

    // The Game Master turned the entrance and the hero's room into walls: the first entrance room left is the new start
    register(id, [["WALL", "HALL", "WALL", "ENT"]], [0, 0]);
    temples.refreshRun(id);

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 3] });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(id));
  });
});
