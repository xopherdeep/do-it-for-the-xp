/**
 * Choosing Entrance in the temple room editor (useTempleRoomEditor.selectType) makes that cell THE temple's entrance,
 * not a room called "entrance": the maze holds the entrance token on the cell, the saved entrance position points at
 * it (in the "floor index,row,col" form when the maze has floors), and the old entrance is an empty room again. Only
 * the browser's storage and Ionic's router and controllers are faked.
 */
import { createPinia, setActivePinia } from "pinia";
import { toastController } from "@ionic/vue";
import { useTempleRoomEditor } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/useTempleRoomEditor";
import { ENTRANCE_TOKEN, WALL_TOKEN } from "@/lib/store/stores/temple-creator";
import { isEntranceToken } from "@/lib/engine/dungeons/SpatialPalette";

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
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});

const W = WALL_TOKEN;
const E = ENTRANCE_TOKEN;

/** A floor four wide: the entrance at 1,1, an empty room at 1,2 and a monster room with beasts at 1,3 */
const floorWithEntrance = () => [
  [W, W, W, W],
  [W, E, "R0201", "M0301"],
  [W, W, W, W],
];

/** A floor with no entrance of its own */
const plainFloor = () => [
  [W, W, W],
  [W, "R0101", "R0201"],
  [W, W, W],
];

const baseRooms = () => ({
  [W]: { type: "wall" },
  [E]: { type: "entrance", visited: true },
  R0201: { type: "empty", content: {} },
  M0301: { type: "monster", content: { name: "Pantry", beasts: ["b3"], xp: 100 } },
  R0101: { type: "empty", content: {} },
});

type Maze = string[][] | Record<string, string[][]>;

const startEditor = async (maze: Maze, entrance: string, levelId: string, row: number, col: number) => {
  const editor = useTempleRoomEditor({ templeId: "old-house", row: String(row), col: String(col) });
  const { store } = editor;
  store.reset();
  store.templeId = "old-house";
  store.currentLevelId = levelId;
  store.templeMaze = maze;
  store.entrancePosition = entrance;
  store.roomsData = baseRooms();
  await editor.loadRoomData();
  return editor;
};

const entranceCells = (maze: Maze) => {
  const found: string[] = [];
  const floors = Array.isArray(maze) ? { "1F": maze } : maze;
  Object.entries(floors).forEach(([levelId, grid]) =>
    grid.forEach((cells, r) => cells.forEach((token, c) => isEntranceToken(token) && found.push(`${levelId}:${r},${c}`)))
  );
  return found;
};

beforeEach(() => {
  setActivePinia(createPinia());
  (toastController.create as jest.Mock).mockClear();
});

describe("choosing Entrance on a one-floor temple's room", () => {
  it("makes the room's cell the entrance and writes the entrance position", async () => {
    const editor = await startEditor(floorWithEntrance(), "1,1", "1F", 1, 3);
    await editor.selectType("entrance");

    const { store } = editor;
    const grid = store.templeMaze as string[][];
    expect(isEntranceToken(grid[1][3])).toBe(true);
    expect(grid[1][3]).toBe(ENTRANCE_TOKEN); // the key of the shared entrance record, with no help from the room editor
    expect(store.entrancePosition).toBe("1,3");
    expect(entranceCells(grid)).toEqual(["1F:1,3"]);
    expect(editor.roomData.value?.type).toBe("entrance");
  });

  it("turns the old entrance into an empty room and drops the monster the cell held", async () => {
    const editor = await startEditor(floorWithEntrance(), "1,1", "1F", 1, 3);
    await editor.selectType("entrance");

    const { store } = editor;
    const grid = store.templeMaze as string[][];
    expect(isEntranceToken(grid[1][1])).toBe(false);
    expect(store.roomsData[grid[1][1]]?.type).toBe("empty");
    expect(store.roomsData.M0301).toBeUndefined();
    expect(editor.roomData.value?.content?.beasts).toBeUndefined();
    expect(editor.roomData.value?.content?.xp).toBeUndefined();
  });

  it("keeps the cell the entrance, and the only one, after the room is saved", async () => {
    const editor = await startEditor(floorWithEntrance(), "1,1", "1F", 1, 3);
    await editor.selectType("entrance");
    await editor.saveToStore();

    const { store } = editor;
    const grid = store.templeMaze as string[][];
    expect(entranceCells(grid)).toEqual(["1F:1,3"]);
    expect(store.roomsData[grid[1][3]]?.type).toBe("entrance");
    expect(store.entrancePosition).toBe("1,3");
  });

  it("changes nothing when the room is already the entrance", async () => {
    const editor = await startEditor(floorWithEntrance(), "1,1", "1F", 1, 1);
    await editor.selectType("entrance");

    const grid = editor.store.templeMaze as string[][];
    expect(entranceCells(grid)).toEqual(["1F:1,1"]);
    expect(editor.store.entrancePosition).toBe("1,1");
  });
});

describe("choosing Entrance on a temple with floors", () => {
  it("puts the entrance on the edited cell in the floor index form and clears the old one", async () => {
    const maze = { "1F": floorWithEntrance(), "2F": plainFloor() };
    const editor = await startEditor(maze, "0,1,1", "1F", 1, 3);
    await editor.selectType("entrance");

    const floors = editor.store.templeMaze as Record<string, string[][]>;
    expect(entranceCells(floors)).toEqual(["1F:1,3"]);
    expect(editor.store.entrancePosition).toBe("0,1,3");
    expect(editor.store.roomsData[floors["1F"][1][1]]?.type).toBe("empty");
  });

  it("counts the floor's place among the maze's floors, not its name", async () => {
    const maze = { B1: plainFloor(), "1F": floorWithEntrance() };
    const editor = await startEditor(maze, "1,1,1", "1F", 1, 2);
    await editor.selectType("entrance");

    const floors = editor.store.templeMaze as Record<string, string[][]>;
    expect(entranceCells(floors)).toEqual(["1F:1,2"]);
    expect(editor.store.entrancePosition).toBe("1,1,2");
  });

  it("also clears a stray entrance left on another floor", async () => {
    const upstairs = plainFloor();
    upstairs[0][0] = E;
    const maze = { "1F": floorWithEntrance(), "2F": upstairs };
    const editor = await startEditor(maze, "0,1,1", "1F", 1, 3);
    await editor.selectType("entrance");

    const floors = editor.store.templeMaze as Record<string, string[][]>;
    expect(entranceCells(floors)).toEqual(["1F:1,3"]);
    expect(editor.store.roomsData[floors["2F"][0][0]]?.type).toBe("empty");
  });

  it("refuses an entrance on a floor above the entrance floor and changes nothing", async () => {
    const maze = { "1F": floorWithEntrance(), "2F": plainFloor() };
    const editor = await startEditor(maze, "0,1,1", "2F", 1, 2);
    await editor.selectType("entrance");

    const floors = editor.store.templeMaze as Record<string, string[][]>;
    expect(entranceCells(floors)).toEqual(["1F:1,1"]);
    expect(editor.store.entrancePosition).toBe("0,1,1");
    expect(floors["2F"][1][2]).toBe("R0201");
    expect(toastController.create).toHaveBeenCalled();
  });
});
