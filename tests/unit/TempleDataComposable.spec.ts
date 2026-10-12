/**
 * Characterization of useTempleData (XpTemples/hooks/useTempleData.ts), the Game Master temple screens' data
 * composable: it loads a temple, tallies its rooms, beasts and key items, saves it, and applies raw JSON with the
 * token migration to coordinate symbols. These specs drive the composable through a mounted component with the
 * temple, bestiary and category databases mocked, and pin what it returns today.
 */
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import {
  TempleDataInjectionKey,
  useTempleData,
} from "@/app/Admin/XpCompendium/views/XpTemples/hooks/useTempleData";
import { useTempleCreatorStore } from "@/lib/store/stores/temple-creator";
import debug from "@/lib/utils/debug";

const mockDb: {
  temples: Record<string, any>;
  saved: any[];
  beasts: any[];
  categories: any[];
  runs: Record<string, any>;
  failSave: boolean;
} = { temples: {}, saved: [], beasts: [], categories: [], runs: {}, failSave: false };
const mockToastCreate = jest.fn();

jest.mock("@/lib/databases/TempleDb", () => ({
  __esModule: true,
  templeStorage: {},
  TempleDb: class {
    getTempleById = async (id: string) =>
      mockDb.temples[id] ? JSON.parse(JSON.stringify(mockDb.temples[id])) : null;
    setTemple = async (temple: any) => {
      if (mockDb.failSave) throw new Error("disk full");
      mockDb.saved.push(JSON.parse(JSON.stringify(temple)));
      mockDb.temples[temple.id] = temple;
    };
  },
}));
jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  achievementCategoryStorage: {},
  AchievementCategoryDb: class {
    getAll = async () => mockDb.categories.slice();
  },
}));
jest.mock("@/lib/databases/BestiaryDb", () => ({
  __esModule: true,
  beastStorage: {},
  default: class {
    getBeasts = async () => mockDb.beasts.slice();
  },
}));
jest.mock("@/lib/engine/core/dungeons/importAllTemples", () => ({
  __esModule: true,
  ensureBuiltInTemples: async () => undefined,
}));
jest.mock(
  "@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/hooks/useAchievementForm",
  () => ({
    __esModule: true,
    sortCategoryByName: (a: any, b: any) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    },
  })
);
jest.mock("@/lib/engine/core/dungeons/TempleSystem", () => ({
  __esModule: true,
  TempleSystem: { getInstance: () => ({ getTempleState: (id: string) => mockDb.runs[id] }) },
}));
jest.mock("@ionic/vue", () => ({
  __esModule: true,
  toastController: { create: (options: unknown) => mockToastCreate(options) },
}));
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const W = "____";

// 6 x 5 floor: every kind of cell the tallies look at, a void ".", a token without a room record and a blank cell
const grid1F = () => [
  [W, W, W, W, W, W],
  [W, "_00_", "M0101", "L0201", "L0301", W],
  [W, "B0102", "m0202", "K0302", "S0402", W],
  [W, ".", "T0103", "R0203", "X0303", W],
  [W, "?ZZ0", "", "H0104", "C0204", W],
  [W, W, W, W, W, W],
];
const grid2F = () => [
  [W, W, W],
  [W, "L0101", W],
  [W, "M0201", W],
  [W, "D0301", W],
  [W, W, W],
];
const roomDefs = (): Record<string, any> => ({
  [W]: { type: "wall" },
  _00_: { type: "entrance", visited: true },
  M0101: { type: "monster", visited: true, content: { monsterType: "Medium", beasts: ["b1", "b2"] } },
  L0201: { type: "loot", content: { dungeon: "map" }, opened: true },
  L0301: { type: "loot", content: { dungeon: "compass" } },
  B0102: { type: "boss", content: { beasts: ["b3"] }, sides: { east: "locked" } },
  m0202: { type: "miniboss" },
  K0302: { type: "loot", content: { dungeon: "master-key" }, sides: { west: "locked", north: "door" } },
  S0402: { type: "shop" },
  T0103: { type: "teleport" },
  R0203: { type: "empty" },
  X0303: { type: "monster" },
  H0104: { type: "health" },
  C0204: { type: "chest", visited: true },
  L0101: { type: "loot", content: { dungeon: "key" }, sides: { south: "locked" } },
  M0201: { type: "monster", content: { monsterType: "LARGE", beasts: ["b9"] } },
});
const templeRecord = (id: string, maze: any, rooms: Record<string, any> = roomDefs()) => ({
  id,
  categoryIds: ["c1"],
  level: 3,
  customName: "Custom",
  hasBossKey: true,
  dungeonLayout: { entrance: [1, 1], maze, rooms },
});

const mountTempleData = async (id: string, record: any = null) => {
  setActivePinia(createPinia());
  mockDb.temples = record ? { [id]: record } : {};
  mockDb.saved = [];
  mockDb.failSave = false;
  mockDb.beasts = [
    { id: "b1", name: "One", checklist: [] },
    { id: "b3", name: "Three", checklist: [] },
    { id: "b9", name: "Nine", checklist: [] },
  ];
  mockDb.categories = [
    { id: "c2", name: "zeta", color: "danger" },
    { id: "c1", name: "Alpha" },
    { id: "c3", name: "beta", color: "tertiary" },
  ];
  let api!: ReturnType<typeof useTempleData>;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useTempleData(id);
        return () => null;
      },
    })
  );
  await flushPromises();
  return { api, wrapper, store: useTempleCreatorStore() };
};

const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

beforeEach(() => {
  mockDb.runs = {};
  mockToastCreate.mockReset();
  mockToastCreate.mockResolvedValue({ present: jest.fn(async () => undefined) });
  (debug.log as jest.Mock).mockClear();
  (debug.error as jest.Mock).mockClear();
});

describe("useTempleData API", () => {
  it("returns the same 27 members in the same order", async () => {
    const { api } = await mountTempleData("wind-temple");
    expect(Object.keys(api)).toEqual([
      "temple",
      "templeState",
      "categories",
      "dungeonStats",
      "composition",
      "previewMaze",
      "loadCategories",
      "loadTemple",
      "saveTemple",
      "calculatePowerRating",
      "getBeastsByTier",
      "getCategoryColor",
      "getCategoryName",
      "getTempleIcon",
      "getTempleColor",
      "getTempleBg",
      "getDisplayName",
      "isRoom",
      "getRoomTypeIcon",
      "getMonsterIcon",
      "templeBeastsWithDetails",
      "allBeasts",
      "getItemIcon",
      "dungeonAudit",
      "itemMapData",
      "isLoading",
      "applyRawJson",
    ]);
  });

  it("keeps the injection key the screens provide and inject", () => {
    expect(typeof TempleDataInjectionKey).toBe("symbol");
    expect(String(TempleDataInjectionKey)).toBe("Symbol(TempleData)");
  });
});

describe("a temple with nothing saved", () => {
  it("starts with an empty temple, empty tallies and a power of 10", async () => {
    const { api } = await mountTempleData("wind-temple");
    expect(plain(api.temple.value)).toEqual({ id: "wind-temple", categoryIds: [], level: 1 });
    expect(plain(api.dungeonStats.value)).toEqual({ totalRooms: 0, visitedRooms: 0, totalTreasures: 0, foundTreasures: 0 });
    expect(plain(api.templeState.value)).toEqual({
      hasMap: false,
      hasCompass: false,
      hasBossKey: false,
      playerKeys: 0,
      visitedPositions: {},
    });
    expect(plain(api.composition.value)).toEqual({ hasRooms: false, roomTypes: [], keyItems: [], monsters: [] });
    expect(api.previewMaze.value).toBeNull();
    expect(api.templeBeastsWithDetails.value).toEqual([]);
    expect(api.itemMapData.value).toEqual({});
    expect(api.calculatePowerRating()).toBe(10);
    expect([api.getBeastsByTier("boss"), api.getBeastsByTier("miniboss"), api.getBeastsByTier("other")]).toEqual([[], [], []]);
    expect(api.isLoading.value).toBe(false);
  });

  it("audits an empty temple as missing the five required checks", async () => {
    const { api } = await mountTempleData("wind-temple");
    const audit = api.dungeonAudit.value;
    expect(audit.passed).toBe(false);
    expect(audit.summary).toBe("0 of 7 checks passed");
    expect(audit.missing).toEqual(["Entrance", "Exit", "Boss", "Boss Key", "Master Room"]);
    expect([audit.hasMap, audit.hasCompass, audit.hasBossKey]).toEqual([false, false, false]);
    expect([audit.totalKeys, audit.totalLockedDoors, audit.keyBalance]).toEqual([0, 0, 0]);
  });

  it("loads categories sorted by name and the bestiary on mount", async () => {
    const { api } = await mountTempleData("wind-temple");
    expect(plain(api.categories.value).map((category: any) => category.id)).toEqual(["c1", "c3", "c2"]);
    expect(plain(api.allBeasts.value).map((beast: any) => beast.id)).toEqual(["b1", "b3", "b9"]);
  });

  it("does nothing for a missing temple or a blank id", async () => {
    const { api } = await mountTempleData("wind-temple");
    await api.loadTemple("");
    await api.loadTemple("nope");
    expect(plain(api.temple.value)).toEqual({ id: "wind-temple", categoryIds: [], level: 1 });
    expect(api.isLoading.value).toBe(false);
  });

  it("does not load anything on mount for an empty temple id", async () => {
    const { api, store } = await mountTempleData("", templeRecord("", grid1F()));
    expect(api.temple.value.dungeonLayout).toBeUndefined();
    expect(store.loadedTempleId).toBeNull();
  });
});

describe("a saved temple with two floors", () => {
  const load = () => {
    mockDb.runs = {
      "wind-temple": {
        hasMap: true,
        hasCompass: false,
        playerKeys: 2,
        visitedRooms: new Set(["1F:1,1"]),
        hasMasterKey: true,
        "hasPegasus whistle": true,
      },
    };
    return mountTempleData("wind-temple", templeRecord("wind-temple", { "1F": grid1F(), "2F": grid2F() }));
  };

  it("merges the saved record into the temple and loads the creator store from it", async () => {
    const { api, store } = await load();
    expect(api.temple.value.customName).toBe("Custom");
    expect(api.temple.value.level).toBe(3);
    expect(plain(store.templeMaze)).toEqual({ "1F": grid1F(), "2F": grid2F() });
    expect(plain(store.roomsData)).toEqual(roomDefs());
    expect(store.loadedTempleId).toBe("wind-temple");
  });

  it("reads the run state of the temple and the boss key off the record", async () => {
    const { api } = await load();
    expect(api.templeState.value.hasMap).toBe(true);
    expect(api.templeState.value.hasCompass).toBe(false);
    expect(api.templeState.value.hasBossKey).toBe(true);
    expect(api.templeState.value.playerKeys).toBe(2);
    expect([...api.templeState.value.visitedPositions]).toEqual(["1F:1,1"]);
  });

  it("counts the 1F rooms and the room records that were visited or hold treasure", async () => {
    const { api } = await load();
    expect(plain(api.dungeonStats.value)).toEqual({ totalRooms: 14, visitedRooms: 3, totalTreasures: 5, foundTreasures: 2 });
  });

  it("previews 1F", async () => {
    const { api } = await load();
    expect(plain(api.previewMaze.value)).toEqual(grid1F());
  });

  it("tallies the room types, key items and monsters of every floor", async () => {
    const { api } = await load();
    expect(plain(api.composition.value)).toEqual({
      hasRooms: true,
      roomTypes: [
        { type: "entrance", count: 1 },
        { type: "monster", count: 3 },
        { type: "loot", count: 4 },
        { type: "boss", count: 1 },
        { type: "miniboss", count: 1 },
        { type: "shop", count: 1 },
        { type: "teleport", count: 1 },
        { type: "health", count: 1 },
        { type: "chest", count: 1 },
      ],
      keyItems: [
        { name: "Map", icon: "fa-map", found: true },
        { name: "Compass", icon: "fa-compass", found: false },
        { name: "Boss Key", icon: "fa-key-skeleton", found: true },
        { name: "Key", icon: "fa-key", found: false },
      ],
      monsters: [
        { size: "medium", count: 1 },
        { size: "boss", count: 1 },
        { size: "miniboss", count: 1 },
        { size: "small", count: 1 },
        { size: "large", count: 1 },
      ],
    });
  });

  it("rates the power from the level and the monster sizes", async () => {
    const { api } = await load();
    // level 3 -> 30; 0.5 * (1 medium + 10 boss + 5 miniboss + 0.5 small + 2 large) = 9.25
    expect(api.calculatePowerRating()).toBe(39);
  });

  it("splits the monsters by tier", async () => {
    const { api } = await load();
    expect(api.getBeastsByTier("boss")).toEqual([{ size: "boss", count: 1 }]);
    expect(api.getBeastsByTier("miniboss")).toEqual([{ size: "miniboss", count: 1 }]);
    expect(api.getBeastsByTier("other")).toEqual([
      { size: "medium", count: 1 },
      { size: "small", count: 1 },
      { size: "large", count: 1 },
    ]);
  });

  it("lists the beasts of every battle room, bosses first, with the bestiary entry or null", async () => {
    const { api } = await load();
    expect(plain(api.templeBeastsWithDetails.value)).toEqual([
      { beast: { id: "b3", name: "Three", checklist: [] }, beastId: "b3", tier: "boss", roomSymbol: "B0102", floor: "1F", row: 2, col: 1 },
      { beast: null, beastId: "", tier: "miniboss", roomSymbol: "m0202", floor: "1F", row: 2, col: 2 },
      { beast: { id: "b1", name: "One", checklist: [] }, beastId: "b1", tier: "monster", roomSymbol: "M0101", floor: "1F", row: 1, col: 2 },
      { beast: null, beastId: "b2", tier: "monster", roomSymbol: "M0101", floor: "1F", row: 1, col: 2 },
      { beast: null, beastId: "", tier: "monster", roomSymbol: "X0303", floor: "1F", row: 3, col: 4 },
      { beast: { id: "b9", name: "Nine", checklist: [] }, beastId: "b9", tier: "monster", roomSymbol: "M0201", floor: "2F", row: 2, col: 1 },
    ]);
  });

  it("audits the temple and counts the keys and the locked doors once per door", async () => {
    const { api } = await load();
    const audit = api.dungeonAudit.value;
    expect(audit.passed).toBe(false);
    expect(audit.summary).toBe("6 of 7 checks passed");
    expect(audit.missing).toEqual(["Master Room"]);
    expect([audit.hasMap, audit.hasCompass, audit.hasBossKey]).toEqual([true, true, true]);
    // three room records hold a locked side: ceil(3 / 2) = 2 doors; one chest holds a key
    expect([audit.totalKeys, audit.totalLockedDoors, audit.keyBalance]).toEqual([1, 2, -1]);
    expect(audit.checks.map((check) => [check.id, check.ok])).toEqual([
      ["entrance", true],
      ["exit", true],
      ["boss", true],
      ["bossKey", true],
      ["masterRoom", false],
      ["map", true],
      ["compass", true],
    ]);
  });

  it("builds the item map of every floor", async () => {
    const { api } = await load();
    const itemMap = plain(api.itemMapData.value);
    expect(Object.keys(itemMap)).toEqual(["1F", "2F"]);
    expect(itemMap["1F"]).toHaveLength(6);
    expect(itemMap["1F"][0]).toEqual(Array(6).fill({ isRoom: false }));
    const none = { north: false, east: false, south: false, west: false };
    expect(itemMap["1F"][1][1]).toEqual({ isRoom: true, item: null, isBoss: false, isEntrance: true, lockedEdges: none });
    expect(itemMap["1F"][1][3]).toEqual({ isRoom: true, item: "map", isBoss: false, isEntrance: false, lockedEdges: none });
    expect(itemMap["1F"][1][4]).toEqual({ isRoom: true, item: "compass", isBoss: false, isEntrance: false, lockedEdges: none });
    expect(itemMap["1F"][2][1]).toEqual({
      isRoom: true,
      item: null,
      isBoss: true,
      isEntrance: false,
      lockedEdges: { north: false, east: true, south: false, west: false },
    });
    expect(itemMap["1F"][2][3]).toEqual({
      isRoom: true,
      item: "master-key",
      isBoss: false,
      isEntrance: false,
      lockedEdges: { north: false, east: false, south: false, west: true },
    });
    // a token with a room record missing still draws as a room; the void and the blank cell do not
    expect(itemMap["1F"][4].map((cell: any) => cell.isRoom)).toEqual([false, true, false, true, true, false]);
    expect(itemMap["1F"][4][1]).toEqual({ isRoom: true, item: null, isBoss: false, isEntrance: false, lockedEdges: none });
    expect(itemMap["1F"][3][1]).toEqual({ isRoom: false });
    expect(itemMap["2F"][1][1]).toEqual({
      isRoom: true,
      item: "key",
      isBoss: false,
      isEntrance: false,
      lockedEdges: { north: false, east: false, south: true, west: false },
    });
    expect(itemMap["2F"][3][1]).toEqual({ isRoom: true, item: null, isBoss: false, isEntrance: false, lockedEdges: none });
  });
});

describe("a saved temple with one floor", () => {
  const load = () => mountTempleData("wind-temple", templeRecord("wind-temple", grid1F()));

  it("tallies the same rooms with nothing found while no run is in progress", async () => {
    const { api } = await load();
    expect(plain(api.templeState.value)).toEqual({ hasMap: false, hasCompass: false, hasBossKey: false, playerKeys: 0, visitedPositions: {} });
    expect(plain(api.dungeonStats.value)).toEqual({ totalRooms: 14, visitedRooms: 3, totalTreasures: 5, foundTreasures: 2 });
    expect(plain(api.composition.value).keyItems).toEqual([
      { name: "Map", icon: "fa-map", found: false },
      { name: "Compass", icon: "fa-compass", found: false },
      { name: "Boss Key", icon: "fa-key-skeleton", found: false },
    ]);
    expect(plain(api.composition.value).monsters).toEqual([
      { size: "medium", count: 1 },
      { size: "boss", count: 1 },
      { size: "miniboss", count: 1 },
      { size: "small", count: 1 },
    ]);
    expect(api.calculatePowerRating()).toBe(38);
  });

  it("lists the beasts on floor 1F and builds an item map for 1F only", async () => {
    const { api } = await load();
    expect(plain(api.templeBeastsWithDetails.value).map((beast: any) => [beast.tier, beast.roomSymbol, beast.floor])).toEqual([
      ["boss", "B0102", "1F"],
      ["miniboss", "m0202", "1F"],
      ["monster", "M0101", "1F"],
      ["monster", "M0101", "1F"],
      ["monster", "X0303", "1F"],
    ]);
    expect(Object.keys(api.itemMapData.value)).toEqual(["1F"]);
  });

  it("previews the grid itself", async () => {
    const { api } = await load();
    expect(plain(api.previewMaze.value)).toEqual(grid1F());
  });
});

describe("previewMaze", () => {
  const preview = async (maze: any) => {
    const { api } = await mountTempleData("wind-temple");
    api.temple.value.dungeonLayout = { entrance: [0, 0], maze, rooms: {} };
    return api.previewMaze.value;
  };

  it("is 1F of a floor map", async () => {
    expect(await preview({ "2F": [["b"]], "1F": [["a"]] })).toEqual([["a"]]);
  });

  it("is the first floor of a floor map without 1F", async () => {
    expect(await preview({ B1: [["b"]], B2: [["c"]] })).toEqual([["b"]]);
  });

  it("is null for a floor map with no floors", async () => {
    expect(await preview({})).toBeNull();
  });

  it("is the grid for a single grid", async () => {
    expect(await preview([["a", "b"]])).toEqual([["a", "b"]]);
  });
});

describe("dungeon stats of a temple whose preview is not a single grid", () => {
  it("counts the room records instead of the cells", async () => {
    const { api } = await mountTempleData("wind-temple", templeRecord("wind-temple", {}));
    expect(api.previewMaze.value).toBeNull();
    expect(plain(api.dungeonStats.value)).toEqual({ totalRooms: 16, visitedRooms: 3, totalTreasures: 5, foundTreasures: 2 });
    expect(plain(api.composition.value)).toEqual({ hasRooms: true, roomTypes: [], keyItems: [], monsters: [] });
  });
});

describe("isRoom", () => {
  it("is false for blank, wall and void cells and true for any other token", async () => {
    const { api } = await mountTempleData("wind-temple");
    expect(["", "____", "_____", "WALL", "_", "."].map(api.isRoom)).toEqual([false, false, false, false, false, false]);
    expect(["_00_", "M0101", "s", "k", "O", "unknown"].map(api.isRoom)).toEqual([true, true, true, true, true, true]);
  });
});

describe("icons and names", () => {
  it("picks a room type icon, falling back to a square", async () => {
    const { api } = await mountTempleData("wind-temple");
    expect(api.getRoomTypeIcon("loot")).toBe("fa-treasure-chest");
    expect(api.getRoomTypeIcon("boss")).toBe("fa-dragon");
    expect(api.getRoomTypeIcon("zzz")).toBe("fa-square");
    expect(api.getRoomTypeIcon("")).toBe("fa-square");
  });

  it("picks a monster icon by size, falling back to a ghost", async () => {
    const { api } = await mountTempleData("wind-temple");
    expect(["boss", "miniboss", "large", "medium", "small", "tiny", ""].map(api.getMonsterIcon)).toEqual([
      "fa-crown",
      "fa-helmet-battle",
      "fa-dragon",
      "fa-skull",
      "fa-ghost",
      "fa-ghost",
      "fa-ghost",
    ]);
  });

  it("picks an item icon by name ignoring case, falling back to a chest", async () => {
    const { api } = await mountTempleData("wind-temple");
    expect(["map", "Compass", "KEY", "master", "master-key", "Pegasus Whistle", "bomb"].map(api.getItemIcon)).toEqual([
      "fa-map",
      "fa-compass",
      "fa-key",
      "fa-key-skeleton",
      "fa-key-skeleton",
      "fa-megaphone",
      "fa-treasure-chest",
    ]);
  });

  it.each([
    ["wind-temple", "fad fa-wind", "primary"],
    ["earth-temple", "fad fa-mountain", "success"],
    ["water-temple", "fad fa-water", "tertiary"],
    ["fire-temple", "fad fa-fire", "danger"],
    ["ice-temple", "fad fa-snowflake", "light"],
    ["light-temple", "fad fa-sun", "warning"],
    ["shadow-temple", "fad fa-moon", "dark"],
    ["custom-temple", "fad fa-place-of-worship", "medium"],
  ])("gives %s the icon %s and the colour %s", async (id, icon, color) => {
    const { api } = await mountTempleData(id);
    expect(api.getTempleIcon()).toBe(icon);
    expect(api.getTempleColor()).toBe(color);
    expect(api.getTempleBg()).toMatch(/^url\(/);
  });

  it("names the temple by its custom name, else its id", async () => {
    const { api } = await mountTempleData("wind-temple");
    expect(api.getDisplayName()).toBe("wind-temple");
    api.temple.value.customName = "Gale Keep";
    expect(api.getDisplayName()).toBe("Gale Keep");
  });

  it("reads a category colour and name, with 'medium' and 'Unknown' for a missing one", async () => {
    const { api } = await mountTempleData("wind-temple");
    expect(api.getCategoryColor("c3")).toBe("tertiary");
    expect(api.getCategoryColor("c1")).toBe("medium");
    expect(api.getCategoryColor("nope")).toBe("medium");
    expect(api.getCategoryName("c2")).toBe("zeta");
    expect(api.getCategoryName("nope")).toBe("Unknown");
  });
});

describe("loadTemple", () => {
  it("sanitizes the wall record before it reaches the creator store", async () => {
    const rooms = roomDefs();
    rooms[W] = { type: "wall", extra: true };
    const { api, store } = await mountTempleData("wind-temple", templeRecord("wind-temple", grid1F(), rooms));
    expect(store.roomsData[W]).toEqual({ type: "wall" });
    expect(api.temple.value.dungeonLayout?.rooms[W]).toEqual({ type: "wall" });
  });

  it("reuses the creator store layout when the temple is already loaded there", async () => {
    const { api, store } = await mountTempleData("wind-temple", templeRecord("wind-temple", grid1F()));
    store.roomsData = { ...store.roomsData, extra: { type: "empty" } };
    mockDb.temples["wind-temple"] = { ...templeRecord("wind-temple", grid1F()), customName: "Renamed" };
    await api.loadTemple("wind-temple");
    expect(api.temple.value.customName).toBe("Renamed");
    expect(api.temple.value.dungeonLayout?.maze).toBe(store.templeMaze);
    expect(api.temple.value.dungeonLayout?.rooms).toBe(store.roomsData);
    expect(Object.keys(store.roomsData)).toContain("extra");
  });

  it("reloads the creator store from the database when forced", async () => {
    const { api, store } = await mountTempleData("wind-temple", templeRecord("wind-temple", grid1F()));
    store.roomsData = { ...store.roomsData, extra: { type: "empty" } };
    await api.loadTemple("wind-temple", true);
    expect(Object.keys(store.roomsData)).not.toContain("extra");
  });

  it("merges a record without a layout and does not mark it loaded", async () => {
    const { api, store } = await mountTempleData("wind-temple", { id: "wind-temple", categoryIds: ["c1"], customName: "Bare" });
    expect(api.temple.value.customName).toBe("Bare");
    expect(store.loadedTempleId).toBeNull();
    expect(plain(api.dungeonStats.value)).toEqual({ totalRooms: 0, visitedRooms: 0, totalTreasures: 0, foundTreasures: 0 });
  });
});

describe("keeping the temple in step with the creator store", () => {
  it("copies room and maze changes of the loaded temple into the layout", async () => {
    const { api, store } = await mountTempleData("wind-temple", templeRecord("wind-temple", grid1F()));
    store.roomsData = { ...store.roomsData, Q9999: { type: "shop" } };
    store.templeMaze = [["Q9999"]];
    await nextTick();
    expect(api.temple.value.dungeonLayout?.rooms.Q9999).toEqual({ type: "shop" });
    expect(api.temple.value.dungeonLayout?.maze).toEqual([["Q9999"]]);
  });

  it("starts a layout for a loaded temple that has none", async () => {
    const { api, store } = await mountTempleData("wind-temple");
    store.markAsLoaded("wind-temple");
    store.roomsData = { Q9999: { type: "shop" } };
    await nextTick();
    expect(plain(api.temple.value.dungeonLayout)).toEqual({ entrance: [0, 0], maze: [], rooms: { Q9999: { type: "shop" } } });
  });

  it("ignores changes while another temple is loaded in the store", async () => {
    const { api, store } = await mountTempleData("wind-temple");
    store.markAsLoaded("earth-temple");
    store.roomsData = { Q9999: { type: "shop" } };
    store.templeMaze = [["Q9999"]];
    await nextTick();
    expect(api.temple.value.dungeonLayout).toBeUndefined();
  });
});

describe("saveTemple", () => {
  it("writes the temple with the creator store's maze and rooms and says so in a toast", async () => {
    const { api, store } = await mountTempleData("wind-temple", templeRecord("wind-temple", grid1F()));
    store.templeMaze = [[W, "_00_"]];
    await api.saveTemple();
    expect(mockDb.saved).toHaveLength(1);
    expect(mockDb.saved[0].id).toBe("wind-temple");
    expect(mockDb.saved[0].customName).toBe("Custom");
    expect(mockDb.saved[0].dungeonLayout.entrance).toEqual([1, 1]);
    expect(mockDb.saved[0].dungeonLayout.maze).toEqual([[W, "_00_"]]);
    expect(mockDb.saved[0].dungeonLayout.rooms).toEqual(plain(store.roomsData));
    expect(mockToastCreate).toHaveBeenCalledWith({
      message: "Temple settings saved!",
      duration: 2000,
      position: "bottom",
      color: "success",
      icon: expect.any(String),
    });
  });

  it("saves the entrance as [0, 0] for a temple without a layout", async () => {
    const { api } = await mountTempleData("wind-temple");
    await api.saveTemple();
    expect(mockDb.saved[0].dungeonLayout.entrance).toEqual([0, 0]);
    expect(mockDb.saved[0].dungeonLayout.maze).toEqual([]);
  });

  it("marks the temple loaded and counts the rooms again", async () => {
    const { api, store } = await mountTempleData("wind-temple");
    api.temple.value.dungeonLayout = { entrance: [0, 0], maze: [["O__O", W]], rooms: { O__O: { type: "empty", visited: true } } };
    await api.saveTemple();
    expect(store.loadedTempleId).toBe("wind-temple");
    expect(plain(api.dungeonStats.value)).toEqual({ totalRooms: 1, visitedRooms: 1, totalTreasures: 0, foundTreasures: 0 });
  });
});

describe("applyRawJson", () => {
  it("refuses JSON that cannot be parsed", async () => {
    const { api } = await mountTempleData("wind-temple");
    const result: any = await api.applyRawJson("{not json");
    expect(result.success).toBe(false);
    expect(typeof result.error).toBe("string");
    expect(debug.error).toHaveBeenCalledWith("applyRawJson failed", expect.any(Error));
    expect(mockDb.saved).toEqual([]);
  });

  it("refuses JSON without an id", async () => {
    const { api } = await mountTempleData("wind-temple");
    expect(await api.applyRawJson(JSON.stringify({ customName: "x" }))).toEqual({
      success: false,
      error: "Invalid JSON: templeId is required",
    });
    expect(mockDb.saved).toEqual([]);
  });

  it("reports a failed save", async () => {
    const { api } = await mountTempleData("wind-temple");
    mockDb.failSave = true;
    expect(await api.applyRawJson(JSON.stringify({ id: "wind-temple" }))).toEqual({ success: false, error: "disk full" });
  });

  it("applies a temple without a layout and saves it", async () => {
    const { api } = await mountTempleData("wind-temple");
    expect(await api.applyRawJson(JSON.stringify({ id: "wind-temple", customName: "Hello", level: 7 }))).toEqual({ success: true });
    expect(api.temple.value.customName).toBe("Hello");
    expect(api.temple.value.level).toBe(7);
    expect(mockDb.saved).toHaveLength(1);
    expect(mockDb.saved[0].customName).toBe("Hello");
    expect(debug.log).not.toHaveBeenCalledWith(expect.stringContaining("Normalized"));
  });

  it("moves legacy tokens to coordinate tokens and renames the room records to match", async () => {
    const { api, store } = await mountTempleData("wind-temple");
    const maze = [
      ["WALL", "_", "____", "EXIT"],
      ["$12", "L123", "M12", "H"],
      ["M", "V", "K", "P"],
      [".", "0", "ABCD", "xyz"],
      ["A1234", "Z", "?", ""],
    ];
    const rooms = {
      [W]: { type: "wall", note: "kept apart" },
      L123: { type: "loot" },
      HEAL: { type: "health" },
      MANA: { type: "mana" },
      SAVE: { type: "savepoint" },
      MKEY: { type: "key" },
      R000: { type: "empty", label: "shared" },
      A1234: { type: "trap" },
    };
    const result = await api.applyRawJson(
      JSON.stringify({ id: "wind-temple", dungeonLayout: { entrance: [1, 1], maze, rooms } })
    );
    expect(result).toEqual({ success: true });

    const migratedMaze = [
      [W, W, W, "_00_"],
      ["L12", "L0101", "M12", "H0301"],
      ["A0002", "V0102", "K0202", "R0302"],
      ["R0003", "R0103", "R0203", W],
      ["A1234", "R0104", "R0204", W],
    ];
    expect(plain(store.templeMaze)).toEqual(migratedMaze);
    // the shared R000 record follows the last cell that mapped to it (R0103); the cell migrated first (R0003) has no record
    expect(plain(store.roomsData)).toEqual({
      [W]: { type: "wall" },
      L0101: { type: "loot" },
      H0301: { type: "health" },
      A0002: { type: "mana" },
      V0102: { type: "savepoint" },
      K0202: { type: "key" },
      R0103: { type: "empty", label: "shared" },
      A1234: { type: "trap" },
    });
    expect(debug.log).toHaveBeenCalledWith("Normalized 10 room tokens in layout import.");

    expect(mockDb.saved).toHaveLength(1);
    expect(mockDb.saved[0].dungeonLayout.maze).toEqual(migratedMaze);
    expect(Object.keys(mockDb.saved[0].dungeonLayout.rooms).sort()).toEqual(Object.keys(plain(store.roomsData)).sort());
    expect(mockDb.saved[0].dungeonLayout.entrance).toEqual([1, 1]);
    expect(plain(api.temple.value.dungeonLayout?.maze)).toEqual(migratedMaze);
  });

  it("normalizes every floor of a floor map and keeps tokens it need not rename", async () => {
    const { api, store } = await mountTempleData("wind-temple");
    const maze = { "1F": [["WALL", "O1234", "T123"]], "2F": [["EXIT", "_", "xy"]] };
    const rooms = { T123: { type: "teleport" }, O1234: { type: "empty" } };
    expect(await api.applyRawJson(JSON.stringify({ id: "wind-temple", dungeonLayout: { entrance: [0, 0], maze, rooms } }))).toEqual({
      success: true,
    });
    expect(plain(store.templeMaze)).toEqual({ "1F": [[W, "O1234", "T0200"]], "2F": [["_00_", W, W]] });
    expect(plain(store.roomsData)).toEqual({ T0200: { type: "teleport" }, O1234: { type: "empty" } });
    expect(debug.log).toHaveBeenCalledWith("Normalized 1 room tokens in layout import.");
  });

  it("leaves the room records alone when no token needed renaming", async () => {
    const { api, store } = await mountTempleData("wind-temple");
    const maze = [[W, "M0101"]];
    const rooms = { M0101: { type: "monster" }, [W]: { type: "wall", x: 1 } };
    await api.applyRawJson(JSON.stringify({ id: "wind-temple", dungeonLayout: { entrance: [0, 0], maze, rooms } }));
    expect(plain(store.templeMaze)).toEqual(maze);
    expect(plain(store.roomsData)).toEqual({ M0101: { type: "monster" }, [W]: { type: "wall" } });
    expect(debug.log).not.toHaveBeenCalledWith(expect.stringContaining("Normalized"));
  });
});
