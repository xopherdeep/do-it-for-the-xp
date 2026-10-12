/**
 * The boss door of a temple a Game Master drew in the Temple Creator. Every case draws a small temple with the
 * creator's own applyRoomChanges, presses its Save (saveTemple: token migration, the Boss Lock, TempleDb), registers
 * what was saved the way the temple screen does (registerCustomTemples) and walks it with the real TempleSystem.
 * Only the browser's storage is faked (in memory): whatever the editor writes is what the game reads.
 *
 * The rule under test: any door into a boss room is the Boss door (BOSS_DOOR_LINE). A small key never fits it,
 * only the Boss Key opens it, and the editor saves that side as the Boss Lock, never as a small lock.
 */
import { createPinia, setActivePinia } from "pinia";
import { useTempleCreator } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/useTempleCreator";
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { registerCustomTemples, registerTemple } from "@/lib/engine/core/dungeons/TempleAdapter";
import { BOSS_DOOR_LINE, TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import { bossDoorSides, effectiveSide, lockedFromSides, type DoorLayout, type DoorRoom } from "@/lib/services/temples/authoredDoors";
import { doorActions, readExits } from "@/lib/services/temples/RoomInteractions";
import { contextAt } from "./templeFixtures";

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
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(null),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
  }),
}));

const dungeons = DungeonManager.getInstance();
const temples = TempleSystem.getInstance();
const db = new TempleDb(templeStorage);

type Direction = "north" | "south" | "east" | "west";
const STEP: Record<Direction, [number, number]> = { north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1] };

/** One drawn room: its type, and the sides the Game Master changed from the plain door */
type Cell = [type: string, sides?: Partial<Record<Direction, string>>] | null;
type Floors = Record<string, Cell[][]>;

let counter = 0;
const nextId = () => `authored-temple-${++counter}`;

beforeEach(() => {
  setActivePinia(createPinia());
});

/**
 * A Game Master draws a temple in the creator and presses Save. The first floor is the grid the creator starts with
 * (its entrance at `entrance`, [row, col]); every other floor is added with "Add floor". A null cell stays a wall.
 */
const draw = async (id: string, floors: Floors, entrance: [number, number] = [0, 0]): Promise<void> => {
  const creator = useTempleCreator({ templeId: id });
  creator.store.reset();
  creator.store.templeId = id;

  const [firstName, ...others] = Object.keys(floors);
  const rows = floors[firstName].length;
  const cols = floors[firstName][0].length;
  creator.gridSize.value = `${rows}x${cols}`;
  creator.entrancePosition.value = entrance.join(",");
  creator.initializeGrid();

  const place = (grid: Cell[][]) =>
    grid.forEach((cells, row) =>
      cells.forEach((cell, col) => {
        if (!cell) return;
        creator.selectCell(row, col);
        creator.applyRoomChanges(cell[0], {}, { north: "door", east: "door", south: "door", west: "door", ...cell[1] });
      })
    );

  place(floors[firstName]);
  for (const name of others) {
    creator.addFloor(name);
    place(floors[name]);
  }
  await creator.saveTemple();
};

/** What the temple screen does on a mount: register what the creator saved. The hero stands at `position` on `level`. */
const play = async (id: string, position: [number, number], level?: string): Promise<void> => {
  await registerCustomTemples();
  temples.initTemple(id, position, level);
};

const saved = async (id: string) => (await db.getTempleById(id))!.dungeonLayout!;

/** The room definition of the cell, as the creator saved it */
const savedRoom = async (id: string, row: number, col: number, floor?: string) => {
  const layout = await saved(id);
  const grid = Array.isArray(layout.maze) ? layout.maze : (layout.maze as Record<string, string[][]>)[floor ?? "1F"];
  return layout.rooms[grid[row][col]];
};

const keys = (id: string, count: number) => {
  for (let i = 0; i < count; i++) temples.addKey(id);
};

/** The hero in `from` faces the boss door in `side`: nothing but the Boss Key gets through, and it is not spent. */
const expectBossDoor = (id: string, from: [number, number], side: Direction, level?: string) => {
  const beyond: [number, number] = [from[0] + STEP[side][0], from[1] + STEP[side][1]];
  expect(temples.doorKind(id, from, side, level)).toBe("master");
  expect(temples.explainDoor(id, from, side)).toBe(BOSS_DOOR_LINE);
  expect(readExits(id, level ?? "1F", from)[side].locked).toBe(false); // no small lock for a bomb to try

  keys(id, 3);
  expect(temples.unlockDoor(id, from, side)).toBe(false);
  expect(temples.openDoorSide(id, from, side)).toBe(false);
  expect(temples.moveToPosition(id, beyond, side)).toBe(false);
  expect(temples.getTempleState(id)?.playerKeys).toBe(3);

  const sheet = doorActions(contextAt(id, from), side);
  expect(sheet.header).toBe("The Boss Door");
  expect(sheet.subHeader).toBe(BOSS_DOOR_LINE);
  expect(sheet.actions).toEqual([]);

  temples.grantMasterKey(id);
  expect(temples.explainDoor(id, from, side)).toBeNull();
  expect(temples.unlockDoor(id, from, side)).toBe(true);
  expect(temples.getTempleState(id)?.playerKeys).toBe(3); // the Boss Key is not spent, nor is a small one
  expect(temples.doorKind(id, from, side, level)).toBe("open");
  expect(temples.moveToPosition(id, beyond, side)).toBe(true);
};

describe("a temple drawn in the Temple Creator: entrance, hall, boss, Master Room", () => {
  const ROW: Cell[][] = [[null, ["empty"], ["boss"], ["master"]]];

  it("saves the boss room as a boss room and the door into it as the Boss Lock", async () => {
    const id = nextId();
    await draw(id, { "1F": ROW });

    expect((await savedRoom(id, 0, 2))?.type).toBe("boss");
    expect((await savedRoom(id, 0, 1))?.sides).toMatchObject({ east: "masterlocked", west: "door" });
    expect((await savedRoom(id, 0, 2))?.sides).toMatchObject({ west: "masterlocked", east: "masterlocked" });
  });

  it("makes the door from the hall into the boss room the Boss door: no small key, the Boss Key opens it", async () => {
    const id = nextId();
    await draw(id, { "1F": ROW });
    await play(id, [0, 1]);

    expect(temples.doorKind(id, [0, 0], "east")).toBe("open"); // entrance to hall
    expectBossDoor(id, [0, 1], "east");

    // The boss room is behind it, the Master Room after it; out of the boss room is no boss door
    expect(temples.doorKind(id, [0, 2], "west")).toBe("open");
    expect(temples.doorKind(id, [0, 2], "east")).toBe("open");
    expect(temples.moveToPosition(id, [0, 3], "east")).toBe(true);
  });

  it("is the Boss door when the hall's side was drawn as a plain lock, and keeps small locks elsewhere", async () => {
    const id = nextId();
    await draw(id, { "1F": [[null, ["empty", { east: "locked", west: "locked" }], ["boss"], ["master"]]] });

    // The save draws the side facing the boss as the Boss Lock; the lock toward the entrance stays a small lock
    expect((await savedRoom(id, 0, 1))?.sides).toMatchObject({ east: "masterlocked", west: "locked" });

    await play(id, [0, 1]);
    expect(dungeons.getRoom(id, [0, 1])?.locked).toMatchObject({ west: true, master: true });
    expect(dungeons.getRoom(id, [0, 1])?.locked?.east).toBeUndefined();
    expect(temples.doorKind(id, [0, 1], "west")).toBe("locked");
    expect(temples.explainDoor(id, [0, 1], "west")).toBe("You need a key to unlock this door!");
    expectBossDoor(id, [0, 1], "east");
  });

  it("reads the plain lock as the Boss door even when a temple was saved before the Boss Lock existed", async () => {
    const id = nextId();
    await draw(id, { "1F": ROW });
    // The record as an older save left it: the hall's side toward the boss is a plain lock
    const record = (await db.getTempleById(id))!;
    record.dungeonLayout!.rooms[(record.dungeonLayout!.maze as string[][])[0][1]].sides = { north: "door", east: "locked", south: "door", west: "door" };
    await db.setTemple(record);

    await play(id, [0, 1]);
    expect(dungeons.getRoom(id, [0, 1])?.locked?.east).toBe(true); // the plain lock is on the room...
    expectBossDoor(id, [0, 1], "east"); // ...and the boss room makes it the Boss door
  });

  it("plays what was saved last without a reload: the hall that became a boss room is a Boss door at once", async () => {
    const id = nextId();
    await draw(id, { "1F": [[null, ["empty"], ["empty"], ["master"]]] });
    await play(id, [0, 1]);
    expect(temples.doorKind(id, [0, 1], "east")).toBe("open");

    // The Game Master edits the temple and saves; the hero is still in it, and the screen registers again
    await draw(id, { "1F": ROW });
    await registerCustomTemples();

    expect(dungeons.getRoom(id, [0, 2])?.type).toBe("boss");
    expect(temples.getTempleState(id)?.currentPosition).toEqual([0, 1]);
    expectBossDoor(id, [0, 1], "east");
  });
});

describe("a boss room on every side of the hall, on a grid that is not square", () => {
  const SIDES: Direction[] = ["north", "east", "south", "west"];

  it.each(SIDES)("reads the door to the boss room in the %s as the Boss door", async (side) => {
    const id = nextId();
    const grid: Cell[][] = [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const hall: [number, number] = [1, 2];
    const boss: [number, number] = [hall[0] + STEP[side][0], hall[1] + STEP[side][1]];
    grid[hall[0]][hall[1]] = ["empty", { [side]: "locked" }];
    grid[boss[0]][boss[1]] = ["boss"];
    await draw(id, { "1F": grid }, [0, 0]);

    expect((await savedRoom(id, hall[0], hall[1]))?.sides).toMatchObject({ [side]: "masterlocked" });
    await play(id, hall);
    expectBossDoor(id, hall, side);
  });
});

describe("a boss room on the second floor", () => {
  const FLOORS: Floors = {
    "1F": [[null, ["stairs-up"], null, null]],
    "2F": [[null, ["empty", { east: "locked" }], ["boss"], ["master"]]],
  };

  it("makes the door in the second floor's hall the Boss door, and only there", async () => {
    const id = nextId();
    await draw(id, FLOORS);
    expect(Object.keys((await saved(id)).maze)).toEqual(["1F", "2F"]);
    expect((await savedRoom(id, 0, 2, "2F"))?.type).toBe("boss");

    await play(id, [0, 1], "2F");
    expect(temples.getTempleState(id)?.currentLevel).toBe("2F");
    expect(temples.doorKind(id, [0, 1], "east", "1F")).toBe("open"); // the first floor has no boss at [0, 2]
    expectBossDoor(id, [0, 1], "east", "2F");
  });
});

describe("the doors the creator draws, as the engine plays them", () => {
  it("plays a side drawn as a lock as a small lock, spends a key on it, and no other side", async () => {
    const id = nextId();
    await draw(id, { "1F": [[null, ["empty", { east: "locked" }], ["empty"], ["master"]]] });
    await play(id, [0, 1]);

    expect(temples.doorKind(id, [0, 1], "east")).toBe("locked");
    expect(temples.doorKind(id, [0, 1], "west")).toBe("open");
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(false);
    expect(temples.unlockDoor(id, [0, 1], "east")).toBe(false); // no key yet

    keys(id, 1);
    expect(temples.unlockDoor(id, [0, 1], "east")).toBe(true);
    expect(temples.getTempleState(id)?.playerKeys).toBe(0);
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);
  });

  it("leaves a Boss Lock drawn on a room that is not facing a boss room as no lock at all", async () => {
    const id = nextId();
    await draw(id, { "1F": [[null, ["empty", { east: "masterlocked" }], ["empty"], null]] });
    await play(id, [0, 1]);

    expect(temples.doorKind(id, [0, 1], "east")).toBe("open");
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);
  });

  it("keeps the doors a shipped room carries in `locked` when the creator drew no sides", () => {
    const id = nextId();
    registerTemple(id, {
      maze: [["E", "A", "B"]],
      rooms: { E: { type: "entrance" }, A: { type: "empty", locked: { east: true } }, B: { type: "empty" } },
      entrance: [0, 0],
    });
    temples.initTemple(id, [0, 1]);

    expect(temples.doorKind(id, [0, 1], "east")).toBe("locked");
  });

  it("reads a boss room however its type is spelled", () => {
    const id = nextId();
    registerTemple(id, { maze: [["E", "A", "B"]], rooms: { E: { type: "entrance" }, A: { type: "empty" }, B: { type: " Boss" } }, entrance: [0, 0] });
    temples.initTemple(id, [0, 1]);

    expect(temples.doorKind(id, [0, 1], "east")).toBe("master");
  });
});

describe("the doors the editor drew, as the engine registers them", () => {
  const registered = (rooms: Record<string, DoorRoom>) => {
    const id = nextId();
    registerTemple(id, { maze: [["E", "A", "B"]], rooms: { E: { type: "entrance" }, A: { type: "empty" }, B: { type: "empty" }, ...rooms }, entrance: [0, 0] });
    return id;
  };

  it("plays a 'locked' side as a small lock on that side only", () => {
    const id = registered({ A: { type: "empty", sides: { north: "door", east: "locked", south: "door", west: "door" } } });

    expect(dungeons.getRoom(id, [0, 1])?.locked).toEqual({ east: true });
  });

  it("plays a 'masterlocked' side as the Boss Lock flag and locks no side", () => {
    const id = registered({ A: { type: "empty", sides: { north: "door", east: "masterlocked", south: "door", west: "door" } } });

    expect(dungeons.getRoom(id, [0, 1])?.locked).toEqual({ master: true });
    temples.initTemple(id, [0, 1]);
    expect(temples.doorKind(id, [0, 1], "east")).toBe("open"); // the flag alone is no door: the room beyond decides
  });

  it("plays a 'door' side, a wall and a bombable side as no lock", () => {
    const id = registered({ A: { type: "empty", sides: { north: "wall", east: "door", south: "bombable", west: "door" } } });

    expect(dungeons.getRoom(id, [0, 1])?.locked).toBeUndefined();
  });

  it("still reads a plain 'locked' side into a boss room as the Boss door", () => {
    const id = registered({ A: { type: "empty", sides: { north: "door", east: "locked", south: "door", west: "door" } }, B: { type: "boss" } });
    temples.initTemple(id, [0, 1]);

    expect(dungeons.getRoom(id, [0, 1])?.locked).toEqual({ east: true });
    expect(temples.doorKind(id, [0, 1], "east")).toBe("master");
    expect(temples.explainDoor(id, [0, 1], "east")).toBe(BOSS_DOOR_LINE);
  });
});

describe("effectiveSide: the editor shows every door into a boss room as the Boss Lock", () => {
  // Hall (H) between the entrance (E) and the boss room (B), a closet (C) below the hall, walls (W) around
  const layout: DoorLayout = {
    maze: [["E", "H", "B"], ["W", "C", "W"]],
    rooms: {
      E: { type: "entrance" },
      H: { type: "empty", sides: { north: "wall", east: "locked", south: "door", west: "locked" } },
      B: { type: "boss", sides: { north: "wall", east: "wall", south: "wall", west: "door" } },
      C: { type: "empty" },
      W: { type: "wall" },
    },
  };

  it("reads a neighbour's plain lock toward the boss room as the Boss Lock", () => {
    expect(effectiveSide(layout, "1F", [0, 1], "east")).toBe("masterlocked");
  });

  it("reads a neighbour's plain door, and a side with nothing stored, toward the boss room as the Boss Lock", () => {
    const plain: DoorLayout = { ...layout, rooms: { ...layout.rooms, H: { type: "empty" } } };

    expect(effectiveSide(plain, "1F", [0, 1], "east")).toBe("masterlocked");
  });

  it("reads the boss room's own side toward the hall as the Boss Lock too", () => {
    expect(effectiveSide(layout, "1F", [0, 2], "west")).toBe("masterlocked");
  });

  it("leaves the sides that do not touch a boss room as they are stored", () => {
    expect(effectiveSide(layout, "1F", [0, 1], "west")).toBe("locked"); // toward the entrance
    expect(effectiveSide(layout, "1F", [0, 1], "south")).toBe("door"); // toward the closet
    expect(effectiveSide(layout, "1F", [0, 1], "north")).toBe("wall");
    expect(effectiveSide(layout, "1F", [1, 1], "north")).toBe("door"); // the closet: nothing stored
    expect(effectiveSide(layout, "1F", [0, 0], "east")).toBe("door"); // the entrance
  });

  it("keeps a boss room's walls walls and a stored Boss Lock a Boss Lock", () => {
    expect(effectiveSide(layout, "1F", [0, 2], "north")).toBe("wall");
    expect(effectiveSide(layout, "1F", [0, 2], "east")).toBe("wall"); // the edge of the floor
    const stale: DoorLayout = { ...layout, rooms: { ...layout.rooms, C: { type: "empty", sides: { north: "masterlocked" } } } };
    expect(effectiveSide(stale, "1F", [1, 1], "north")).toBe("masterlocked");
  });

  it("reads the floor it is asked about", () => {
    const tower: DoorLayout = { maze: { "1F": [["E", "H"]], "2F": [["H", "B"]] }, rooms: layout.rooms };

    expect(effectiveSide(tower, "1F", [0, 1], "east")).toBe("locked"); // nothing beside the hall on the first floor
    expect(effectiveSide(tower, "2F", [0, 0], "east")).toBe("masterlocked");
  });
});

describe("bossDoorSides and lockedFromSides", () => {
  const rooms: Record<string, DoorRoom> = {
    E: { type: "entrance" },
    H: { type: "empty", sides: { north: "wall", east: "locked", south: "bombable", west: "locked" } },
    B1: { type: "boss" },
    B2: { type: "boss" },
    B3: { type: "boss" },
    W: { type: "wall" },
  };

  it("writes the Boss Lock on both ends of every door into or out of a boss room and leaves walls and bombable sides alone", () => {
    const result = bossDoorSides([["W", "E", "W"], ["B1", "H", "B2"], ["W", "B3", "W"]], rooms);

    expect(result.H.sides).toEqual({ north: "wall", east: "masterlocked", south: "bombable", west: "masterlocked" });
    expect(result.B1.sides).toEqual({ north: "door", east: "masterlocked", south: "door", west: "door" }); // a wall above and below: untouched
    expect(result.B3.sides).toMatchObject({ north: "masterlocked" });
    expect(result.E).toBe(rooms.E); // nothing beside the entrance is a boss room
    expect(result.W).toBe(rooms.W);
  });

  it("starts a room drawn without sides from plain doors", () => {
    const result = bossDoorSides([["E", "B1"]], rooms);

    expect(result.E.sides).toEqual({ north: "door", east: "masterlocked", south: "door", west: "door" });
  });

  it("returns the same rooms when nothing touches a boss room, and is idempotent", () => {
    const maze = [["E", "H", "W"]];
    expect(bossDoorSides(maze, rooms)).toEqual(rooms);
    expect(bossDoorSides(maze, rooms).H).toBe(rooms.H);

    const once = bossDoorSides([["B1", "H"]], rooms);
    expect(bossDoorSides([["B1", "H"]], once)).toEqual(once);
  });

  it("reads every floor of a tower", () => {
    const result = bossDoorSides({ "1F": [["E", "H"]], "2F": [["H", "B1"]] }, rooms);

    expect(result.H.sides?.east).toBe("masterlocked");
  });

  it("plays locks from sides and keeps what `locked` already says", () => {
    const played = (room: DoorRoom): DoorRoom => lockedFromSides(room);

    expect(played({ type: "empty" })).toEqual({ type: "empty" });
    expect(played({ type: "empty", sides: { east: "door" } }).locked).toBeUndefined();
    expect(played({ type: "empty", sides: { east: "locked", north: "masterlocked" }, locked: { west: true } }).locked).toEqual({
      west: true,
      east: true,
      master: true,
    });
  });
});
