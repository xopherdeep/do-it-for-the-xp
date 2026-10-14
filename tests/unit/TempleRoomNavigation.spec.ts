/**
 * Walking out of the temple room editor (useTempleRoomNavigation over the real editor and the real creator store):
 * tapping a neighbour saves the room the way Apply does, so a cell on a shared token (the wall, the entrance) gets its
 * own symbol instead of writing onto every cell that shares it; every way out of the room carries the floor in the
 * address; and the floor the address names becomes the floor the editor works on. Only the browser's storage and
 * Ionic's router and controllers are faked.
 */
import { nextTick, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useTempleRoomEditor } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/useTempleRoomEditor";
import {
  floorForAddress,
  useTempleRoomNavigation,
} from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/useTempleRoomNavigation";
import type { Room } from "@/lib/engine/core/dungeons/types";

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
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock("@ionic/vue", () => ({
  toastController: { create: jest.fn(() => Promise.resolve({ present: jest.fn() })) },
  alertController: { create: jest.fn() },
  createAnimation: jest.fn(),
  useIonRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock("vue-router", () => ({ useRoute: () => ({ params: {}, query: {} }) }));
jest.mock("@/hooks/useBack", () => ({ useBack: () => ({ back: mockBack }) }));
jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});

// What a saved temple holds: the five-character tokens the creator store writes
const WALL = "_____";
const ENTRANCE = "_00__";

type Maze = string[][] | Record<string, string[][]>;

/** The editor open on one cell of a maze, with the navigation over it, the way the room page wires them */
const openRoom = async (
  maze: Maze,
  rooms: Record<string, Room>,
  cell: [number, number],
  options: { level?: string; floor?: string } = {}
) => {
  const editor = useTempleRoomEditor({ templeId: "t1", row: String(cell[0]), col: String(cell[1]) });
  const { store } = editor;
  store.reset();
  store.templeId = "t1";
  store.templeMaze = maze;
  store.roomsData = {
    [WALL]: { type: "wall" },
    [ENTRANCE]: { type: "entrance", visited: true },
    ...rooms,
  };
  store.currentLevelId = options.level ?? "1F";
  const floor = ref<string | undefined>(options.floor);
  const navigation = useTempleRoomNavigation({
    templeId: "t1",
    rowIdx: editor.rowIdx,
    colIdx: editor.colIdx,
    roomData: editor.roomData,
    saveToStore: editor.saveToStore,
    floor,
  });
  await editor.loadRoomData();
  navigation.calculateAdjacency();
  return { editor, navigation, store, floor };
};

const flatMaze = (store: { templeMaze: Maze }) => store.templeMaze as string[][];

beforeEach(() => {
  setActivePinia(createPinia());
  mockPush.mockClear();
  mockReplace.mockClear();
  mockBack.mockClear();
});

describe("tapping a neighbour from the room editor", () => {
  it("gives a retyped wall its own symbol instead of writing onto the shared wall", async () => {
    const { editor, navigation, store } = await openRoom([[WALL, "R0001"]], { R0001: { type: "empty" } }, [0, 0]);
    editor.roomData.value = { type: "empty", content: {} };

    navigation.handleDoorClick("east");

    const symbol = flatMaze(store)[0][0];
    expect(symbol).not.toBe(WALL);
    expect(symbol).toMatch(/^R\d{4}$/);
    expect(store.roomsData[symbol]).toMatchObject({ type: "empty" });
    // every other wall is still a wall (opening any cell adds editing defaults to its record, so only the type is pinned)
    expect(store.roomsData[WALL].type).toBe("wall");
    expect(flatMaze(store)[0][1]).toBe("R0001");
  });

  it("gives a retyped config-token room its own symbol and leaves the shared record to the other cells", async () => {
    const { editor, navigation, store } = await openRoom(
      [["M001", "M001"]],
      { M001: { type: "monster", content: { beasts: ["b1"] } } },
      [0, 0]
    );
    editor.roomData.value = { type: "monster", content: { beasts: ["b2"] } };

    navigation.handleDoorClick("east");

    const [mine, theirs] = flatMaze(store)[0];
    expect(mine).not.toBe("M001");
    expect(store.roomsData[mine].content?.beasts).toEqual(["b2"]);
    expect(theirs).toBe("M001");
    expect(store.roomsData.M001.content?.beasts).toEqual(["b1"]);
  });

  it("keeps the entrance on its shared token and its record an entrance", async () => {
    const { navigation, store } = await openRoom([[ENTRANCE, "R0001"]], { R0001: { type: "empty" } }, [0, 0]);

    navigation.handleDoorClick("east");

    expect(flatMaze(store)[0][0]).toBe(ENTRANCE);
    expect(store.roomsData[ENTRANCE]).toMatchObject({ type: "entrance" });
    expect(Object.keys(store.roomsData).sort()).toEqual([ENTRANCE, "R0001", WALL].sort());
  });

  it("saves a room that has its own symbol under that symbol", async () => {
    const { editor, navigation, store } = await openRoom(
      [["R0000", "R0001"]],
      { R0000: { type: "empty" }, R0001: { type: "empty" } },
      [0, 0]
    );
    editor.roomData.value = { type: "empty", content: { name: "Kitchen" } };

    navigation.handleDoorClick("east");

    expect(flatMaze(store)[0]).toEqual(["R0000", "R0001"]);
    expect(store.roomsData.R0000.content).toEqual({ name: "Kitchen" });
  });

  it("walks through a wall nobody changed without giving it a record of its own", async () => {
    const { navigation, store } = await openRoom([[WALL, "R0001"]], { R0001: { type: "empty" } }, [0, 0]);

    navigation.handleDoorClick("east");

    expect(flatMaze(store)[0][0]).toBe(WALL);
    expect(Object.keys(store.roomsData).sort()).toEqual([ENTRANCE, "R0001", WALL].sort());
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it("does nothing for a side with no neighbour", async () => {
    const { navigation, store } = await openRoom([["R0000"]], { R0000: { type: "empty" } }, [0, 0]);

    navigation.handleDoorClick("east");

    expect(mockReplace).not.toHaveBeenCalled();
    expect(flatMaze(store)).toEqual([["R0000"]]);
  });
});

describe("the address of the next room", () => {
  const twoFloors = (): Maze => ({
    "1F": [[WALL, WALL]],
    "2F": [["R0000", "R0001"]],
  });
  const rooms = (): Record<string, Room> => ({ R0000: { type: "empty" }, R0001: { type: "empty" } });

  it("names the floor when walking through a door", async () => {
    const { navigation } = await openRoom(twoFloors(), rooms(), [0, 0], { level: "2F" });

    navigation.handleDoorClick("east");

    expect(mockReplace).toHaveBeenCalledWith(
      { name: "xp-temple-room-editor", params: { templeId: "t1", floor: "2F", row: "0", col: "1" } },
      expect.any(Function)
    );
  });

  it("names the floor when stepping to the next room", async () => {
    const { navigation } = await openRoom(twoFloors(), rooms(), [0, 0], { level: "2F" });

    navigation.navigateRoom("next");

    expect(mockReplace).toHaveBeenCalledWith(
      { name: "xp-temple-room-editor", params: { templeId: "t1", floor: "2F", row: "0", col: "1" } },
      expect.any(Function)
    );
  });

  it("names the floor when jumping from the mini-map", async () => {
    const { navigation } = await openRoom(twoFloors(), rooms(), [0, 0], { level: "2F" });

    navigation.goToCell(0, 1);

    expect(mockReplace).toHaveBeenCalledWith(
      { name: "xp-room-editor", params: { templeId: "t1", floor: "2F", row: "0", col: "1" } },
      expect.any(Function)
    );
  });
});

describe("the floor the address names", () => {
  const twoFloors = (): Maze => ({
    "1F": [[WALL, WALL]],
    "2F": [["R0000", "R0001"]],
  });
  const rooms = (): Record<string, Room> => ({ R0000: { type: "empty" }, R0001: { type: "empty" } });

  it("becomes the floor the editor works on, so a 2F room opens its own cell", async () => {
    const { editor, store } = await openRoom(twoFloors(), rooms(), [0, 1], { level: "1F", floor: "2F" });

    expect(store.currentLevelId).toBe("2F");
    expect(editor.roomData.value?.type).toBe("empty");
  });

  it("follows the address when it changes while the page stays", async () => {
    const { store, floor } = await openRoom(twoFloors(), rooms(), [0, 0], { level: "1F", floor: "1F" });

    floor.value = "2F";
    await nextTick();

    expect(store.currentLevelId).toBe("2F");
  });

  it("leaves the floor the creator was on when the address names none (an old two-part link)", async () => {
    const { store } = await openRoom(twoFloors(), rooms(), [0, 0], { level: "2F" });
    expect(store.currentLevelId).toBe("2F");

    const { store: other } = await openRoom(twoFloors(), rooms(), [0, 0], { level: "2F", floor: "" });
    expect(other.currentLevelId).toBe("2F");
  });
});

describe("floorForAddress", () => {
  const twoFloors = { "1F": [["a"]], "2F": [["b"]] };

  it("keeps the current floor when the address names none", () => {
    expect(floorForAddress(twoFloors, undefined, "2F")).toBe("2F");
    expect(floorForAddress(twoFloors, "", "1F")).toBe("1F");
  });

  it("takes the named floor when the maze has it", () => {
    expect(floorForAddress(twoFloors, "2F", "1F")).toBe("2F");
  });

  it("corrects a named floor the loaded maze lacks, like any loaded floor", () => {
    expect(floorForAddress(twoFloors, "9F", "2F")).toBe("1F");
    expect(floorForAddress([["a"]], "2F", "1F")).toBe("1F");
  });

  it("takes the named floor while the maze is still loading, since it cannot be checked yet", () => {
    expect(floorForAddress([], "2F", "1F")).toBe("2F");
    expect(floorForAddress({}, "B1", "1F")).toBe("B1");
  });
});
