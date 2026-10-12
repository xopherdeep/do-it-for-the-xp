/**
 * Characterization of the pure modules split out of useTempleData (XpTemples/hooks/templeData/): the maze floor
 * readers, the icon and colour lookups, the room and monster tallies, the beast and item map builders and the
 * raw JSON token migration. Each is called directly and its output pinned as it is today.
 */
import {
  isRoom,
  pickPreviewMaze,
} from "@/app/Admin/XpCompendium/views/XpTemples/hooks/templeData/mazeFloors";
import {
  getItemIcon,
  getMonsterIcon,
  getRoomTypeIcon,
  getTempleBgFor,
  getTempleColorFor,
  getTempleIconFor,
} from "@/app/Admin/XpCompendium/views/XpTemples/hooks/templeData/templeLookups";
import {
  buildComposition,
  countDungeonStats,
  countKeysAndLocks,
  filterMonstersByTier,
  rateTemplePower,
} from "@/app/Admin/XpCompendium/views/XpTemples/hooks/templeData/dungeonCounts";
import {
  buildItemMapData,
  listTempleBeasts,
} from "@/app/Admin/XpCompendium/views/XpTemples/hooks/templeData/mazeContents";
import {
  createTokenNormalizer,
  normalizeImportedLayout,
  parseTempleJson,
} from "@/app/Admin/XpCompendium/views/XpTemples/hooks/templeData/tokenMigration";
import debug from "@/lib/utils/debug";

jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const W = "____";
const entrance = [0, 0];

describe("mazeFloors", () => {
  describe("pickPreviewMaze", () => {
    it("is null without a layout or without a maze", () => {
      expect(pickPreviewMaze(undefined)).toBeNull();
      expect(pickPreviewMaze({ entrance, maze: undefined as any, rooms: {} })).toBeNull();
    });

    it("is the grid of a single floor maze", () => {
      const grid = [["a", "b"]];
      expect(pickPreviewMaze({ entrance, maze: grid, rooms: {} })).toBe(grid);
    });

    it("is floor 1F of a floor map, whatever comes first", () => {
      const maze = { "2F": [["b"]], "1F": [["a"]] };
      expect(pickPreviewMaze({ entrance, maze, rooms: {} })).toBe(maze["1F"]);
    });

    it("is the first floor of a floor map without 1F", () => {
      const maze = { B1: [["b"]], B2: [["c"]] };
      expect(pickPreviewMaze({ entrance, maze, rooms: {} })).toBe(maze.B1);
    });

    it("is null for a floor map with no floors", () => {
      expect(pickPreviewMaze({ entrance, maze: {}, rooms: {} })).toBeNull();
    });
  });

  describe("isRoom", () => {
    it("is false for a blank, a wall token or the void", () => {
      expect(["", W, "_____", "WALL", "_", "."].map(isRoom)).toEqual([false, false, false, false, false, false]);
    });

    it("is true for any other token, even one without a record", () => {
      expect(["_00_", "M0101", "s", "k", "O", "unknown"].map(isRoom)).toEqual([true, true, true, true, true, true]);
    });
  });
});

describe("templeLookups", () => {
  it("picks a room type icon, falling back to a square", () => {
    expect(getRoomTypeIcon("loot")).toBe("fa-treasure-chest");
    expect(getRoomTypeIcon("boss")).toBe("fa-dragon");
    expect(getRoomTypeIcon("zzz")).toBe("fa-square");
  });

  it("picks a monster icon by size, falling back to a ghost", () => {
    expect(["boss", "miniboss", "large", "medium", "small", "tiny"].map(getMonsterIcon)).toEqual([
      "fa-crown",
      "fa-helmet-battle",
      "fa-dragon",
      "fa-skull",
      "fa-ghost",
      "fa-ghost",
    ]);
  });

  it("picks an item icon by name ignoring case, falling back to a chest", () => {
    expect(["map", "COMPASS", "key", "Master", "master-key", "Pegasus Whistle", "bomb"].map(getItemIcon)).toEqual([
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
    ["other", "fad fa-place-of-worship", "medium"],
  ])("gives %s the icon %s and the colour %s", (id, icon, color) => {
    expect(getTempleIconFor(id)).toBe(icon);
    expect(getTempleColorFor(id)).toBe(color);
  });

  it("gives every temple a background url, an unknown one the plains", () => {
    for (const id of ["wind-temple", "earth-temple", "water-temple", "fire-temple", "ice-temple", "light-temple", "shadow-temple", "other"]) {
      expect(getTempleBgFor(id)).toMatch(/^url\(/);
    }
  });
});

describe("dungeonCounts", () => {
  const sizes = (list: [string, number][]) => list.map(([size, count]) => ({ size, count }));

  describe("buildComposition", () => {
    const layout = () => ({
      entrance,
      maze: [
        [W, "_00_", "M1", "M2", "B1", "m1"],
        ["L1", "L2", "L3", "L4", "L5", "E1"],
        ["", "X1", "?", ".", "W1", "C1"],
      ],
      rooms: {
        [W]: { type: "wall" },
        _00_: { type: "entrance" },
        M1: { type: "monster", content: { monsterType: "Medium" } },
        M2: { type: "monster" },
        B1: { type: "boss" },
        m1: { type: "miniboss" },
        L1: { type: "loot", content: { dungeon: "map" } },
        L2: { type: "loot", content: { dungeon: "map" } },
        L3: { type: "loot", content: { dungeon: "master-key" } },
        L4: { type: "loot", content: { dungeon: "pegasus whistle" } },
        L5: { type: "loot", content: { gold: 5 } },
        E1: { type: "empty" },
        W1: { type: "wall" },
        C1: { type: "chest" },
      },
    });

    it("is empty and never reads the run state without a maze and rooms", () => {
      const getRunState = jest.fn();
      const empty = { hasRooms: false, roomTypes: [], keyItems: [], monsters: [] };
      expect(buildComposition(undefined, getRunState)).toEqual(empty);
      expect(buildComposition({ entrance, maze: [[W]], rooms: undefined as any }, getRunState)).toEqual(empty);
      expect(buildComposition({ entrance, maze: undefined as any, rooms: {} }, getRunState)).toEqual(empty);
      expect(getRunState).not.toHaveBeenCalled();
    });

    it("counts room types (not walls or empty rooms), monsters by size, and each key item once", () => {
      const result = buildComposition(layout(), () => undefined);
      expect(result.hasRooms).toBe(true);
      expect(result.roomTypes).toEqual([
        { type: "entrance", count: 1 },
        { type: "monster", count: 2 },
        { type: "boss", count: 1 },
        { type: "miniboss", count: 1 },
        { type: "loot", count: 5 },
        { type: "chest", count: 1 },
      ]);
      expect(result.monsters).toEqual(sizes([["medium", 1], ["small", 1], ["boss", 1], ["miniboss", 1]]));
      expect(result.keyItems).toEqual([
        { name: "Map", icon: "fa-map", found: false },
        { name: "Boss Key", icon: "fa-key-skeleton", found: false },
        { name: "Pegasus whistle", icon: "fa-megaphone", found: false },
      ]);
    });

    it("reads the run state once and marks the items found by the flags it carries", () => {
      const getRunState = jest.fn(() => ({ hasMap: true, hasMasterKey: false, "hasPegasus whistle": true } as any));
      const result = buildComposition(layout(), getRunState);
      expect(getRunState).toHaveBeenCalledTimes(1);
      expect(result.keyItems.map((item) => [item.name, item.found])).toEqual([
        ["Map", true],
        ["Boss Key", false],
        ["Pegasus whistle", true],
      ]);
    });

    it("reads every floor of a floor map and skips a floor that is not a grid", () => {
      const result = buildComposition(
        { entrance, maze: { "1F": [["M1"]], "2F": [["M1", "M1"]], bad: "no" as any }, rooms: { M1: { type: "monster", content: { monsterType: "LARGE" } } } },
        () => undefined
      );
      expect(result.roomTypes).toEqual([{ type: "monster", count: 3 }]);
      expect(result.monsters).toEqual(sizes([["large", 3]]));
    });
  });

  describe("countDungeonStats", () => {
    const rooms = {
      a: { type: "empty", visited: true },
      b: { type: "chest" },
      c: { type: "treasure", opened: true },
      d: { type: "loot", visited: true },
      e: { type: "boss" },
    };

    it("counts the cells of the grid that are rooms", () => {
      expect(countDungeonStats({ entrance, maze: [], rooms }, [[W, "a", "b"], [".", "", "c"]])).toEqual({
        totalRooms: 3,
        visitedRooms: 2,
        totalTreasures: 3,
        foundTreasures: 2,
      });
    });

    it("counts the room records when there is no single grid to count", () => {
      expect(countDungeonStats({ entrance, maze: {}, rooms }, null)).toEqual({
        totalRooms: 5,
        visitedRooms: 2,
        totalTreasures: 3,
        foundTreasures: 2,
      });
    });

    it("counts the room records when the grid holds no rooms", () => {
      expect(countDungeonStats({ entrance, maze: [[W]], rooms }, [[W]]).totalRooms).toBe(5);
    });

    it("is all zeros for a layout without rooms", () => {
      expect(countDungeonStats({ entrance, maze: [[W]], rooms: undefined as any }, [[W]])).toEqual({
        totalRooms: 0,
        visitedRooms: 0,
        totalTreasures: 0,
        foundTreasures: 0,
      });
    });
  });

  describe("rateTemplePower", () => {
    it("is level * 10 with no monsters", () => {
      expect(rateTemplePower(1, [])).toBe(10);
      expect(rateTemplePower(7, [])).toBe(70);
    });

    it("adds half the weighted monster count: small 0.5, medium 1, large 2, miniboss 5, boss 10", () => {
      expect(rateTemplePower(3, sizes([["medium", 1], ["boss", 1], ["miniboss", 1], ["small", 1], ["large", 1]]))).toBe(39);
      expect(rateTemplePower(1, sizes([["small", 3]]))).toBe(11);
    });

    it("counts a size it does not know as nothing and tops out at 100", () => {
      expect(rateTemplePower(1, sizes([["tiny", 40]]))).toBe(10);
      expect(rateTemplePower(10, sizes([["boss", 20]]))).toBe(100);
    });
  });

  describe("filterMonstersByTier", () => {
    const monsters = sizes([["medium", 1], ["boss", 2], ["miniboss", 3], ["small", 4]]);

    it("keeps the boss, the miniboss, or everything else", () => {
      expect(filterMonstersByTier(monsters, "boss")).toEqual(sizes([["boss", 2]]));
      expect(filterMonstersByTier(monsters, "miniboss")).toEqual(sizes([["miniboss", 3]]));
      expect(filterMonstersByTier(monsters, "other")).toEqual(sizes([["medium", 1], ["small", 4]]));
    });
  });

  describe("countKeysAndLocks", () => {
    it("is zero for no rooms", () => {
      expect(countKeysAndLocks({})).toEqual({ totalKeys: 0, actualLocks: 0 });
    });

    it("counts key chests (loot holding a key) and halves the locked sides, rounding up", () => {
      const rooms = {
        a: { type: "loot", content: { dungeon: "key" }, sides: { south: "locked" } },
        b: { type: "loot", content: { dungeon: "map" } },
        c: { type: "chest", content: { dungeon: "key" } },
        d: { type: "empty", sides: { north: "locked", east: "locked", west: "door" } },
      };
      expect(countKeysAndLocks(rooms)).toEqual({ totalKeys: 1, actualLocks: 2 });
      expect(countKeysAndLocks({ d: rooms.d })).toEqual({ totalKeys: 0, actualLocks: 1 });
    });
  });
});

describe("mazeContents", () => {
  const beasts = [
    { id: "b1", name: "One", checklist: [] },
    { id: "b3", name: "Three", checklist: [] },
  ];

  describe("listTempleBeasts", () => {
    const rooms = {
      M1: { type: "monster", content: { beasts: ["b1", "b2"] } },
      M2: { type: "monster" },
      B1: { type: "boss", content: { beasts: ["b3"] } },
      m1: { type: "miniboss", content: { beasts: [] } },
      L1: { type: "loot", content: { beasts: ["b1"] } },
    };

    it("is empty without a maze and rooms", () => {
      expect(listTempleBeasts(undefined, beasts)).toEqual([]);
      expect(listTempleBeasts({ entrance, maze: [[W]], rooms: undefined as any }, beasts)).toEqual([]);
    });

    it("lists each beast of a battle room by cell, with a placeholder for a room with none, bosses first", () => {
      const list = listTempleBeasts({ entrance, maze: [["M1", "M2", W], ["B1", "m1", "L1"]], rooms }, beasts);
      expect(list).toEqual([
        { beast: beasts[1], beastId: "b3", tier: "boss", roomSymbol: "B1", floor: "1F", row: 1, col: 0 },
        { beast: null, beastId: "", tier: "miniboss", roomSymbol: "m1", floor: "1F", row: 1, col: 1 },
        { beast: beasts[0], beastId: "b1", tier: "monster", roomSymbol: "M1", floor: "1F", row: 0, col: 0 },
        { beast: null, beastId: "b2", tier: "monster", roomSymbol: "M1", floor: "1F", row: 0, col: 0 },
        { beast: null, beastId: "", tier: "monster", roomSymbol: "M2", floor: "1F", row: 0, col: 1 },
      ]);
    });

    it("names each floor of a floor map", () => {
      const list = listTempleBeasts({ entrance, maze: { "1F": [["M2"]], B1: [["B1"]] }, rooms }, beasts);
      expect(list.map((entry) => [entry.tier, entry.floor])).toEqual([
        ["boss", "B1"],
        ["monster", "1F"],
      ]);
    });
  });

  describe("buildItemMapData", () => {
    const rooms = {
      _00_: { type: "entrance" },
      B1: { type: "boss", sides: { east: "locked" } },
      L1: { type: "loot", content: { dungeon: "compass" } },
      L2: { type: "loot", content: { gold: 1 } },
    };
    const none = { north: false, east: false, south: false, west: false };

    it("is empty without a maze and rooms", () => {
      expect(buildItemMapData(undefined)).toEqual({});
      expect(buildItemMapData({ entrance, maze: [[W]], rooms: undefined as any })).toEqual({});
    });

    it("describes every cell of a single grid as floor 1F", () => {
      expect(buildItemMapData({ entrance, maze: [[W, "_00_", "B1"], ["L1", "L2", "?"]], rooms })).toEqual({
        "1F": [
          [
            { isRoom: false },
            { isRoom: true, item: null, isBoss: false, isEntrance: true, lockedEdges: none },
            { isRoom: true, item: null, isBoss: true, isEntrance: false, lockedEdges: { ...none, east: true } },
          ],
          [
            { isRoom: true, item: "compass", isBoss: false, isEntrance: false, lockedEdges: none },
            { isRoom: true, item: null, isBoss: false, isEntrance: false, lockedEdges: none },
            { isRoom: true, item: null, isBoss: false, isEntrance: false, lockedEdges: none },
          ],
        ],
      });
    });

    it("describes each floor of a floor map under its own name", () => {
      const result = buildItemMapData({ entrance, maze: { A: [["L1"]], B: [["."]] }, rooms });
      expect(Object.keys(result)).toEqual(["A", "B"]);
      expect(result.B).toEqual([[{ isRoom: false }]]);
    });
  });
});

describe("tokenMigration", () => {
  describe("parseTempleJson", () => {
    it("returns the parsed temple", () => {
      expect(parseTempleJson('{"id":"x","level":2}')).toEqual({ id: "x", level: 2 });
    });

    it("refuses a temple without an id", () => {
      expect(() => parseTempleJson('{"level":2}')).toThrow("Invalid JSON: templeId is required");
    });

    it("refuses text that is not JSON", () => {
      expect(() => parseTempleJson("{nope")).toThrow(SyntaxError);
    });
  });

  describe("createTokenNormalizer", () => {
    const parsed = {
      dungeonLayout: {
        rooms: { L123: { type: "loot" }, HEAL: { type: "health" }, MKEY: { type: "key" }, T123: { type: "teleport" } },
      },
    };
    const run = (token: string, row?: number, col?: number) => {
      const mapping = new Map<string, string>();
      const result = createTokenNormalizer(parsed, mapping)(token, row, col);
      return { result, mapping: Object.fromEntries(mapping) };
    };

    it("keeps a letter and four digits as it is", () => {
      expect(run("A1234", 0, 0)).toEqual({ result: "A1234", mapping: {} });
      expect(run("m0101", 2, 2)).toEqual({ result: "m0101", mapping: {} });
    });

    it("turns the wall and entrance names into the shared tokens and never migrates them", () => {
      expect(["WALL", "_", W, ""].map((token) => run(token, 1, 1).result)).toEqual([W, W, W, W]);
      expect(["EXIT", "_00_"].map((token) => run(token, 1, 1).result)).toEqual(["_00_", "_00_"]);
      expect(run("WALL", 1, 1).mapping).toEqual({});
    });

    it("reads a $ loot token as L", () => {
      expect(run("$12", 1, 0)).toEqual({ result: "L12", mapping: {} });
    });

    it("moves a four-character token to a coordinate token of its room type: prefix, column, row", () => {
      expect(run("L123", 1, 1)).toEqual({ result: "L0101", mapping: { L123: "L0101" } });
      expect(run("T123", 0, 2)).toEqual({ result: "T0200", mapping: { T123: "T0200" } });
      expect(run("ABCD", 3, 2)).toEqual({ result: "R0203", mapping: { ABCD: "R0203" } });
    });

    it("names a single-letter token, then moves it to a coordinate token", () => {
      expect(run("H", 1, 3)).toEqual({ result: "H0301", mapping: { HEAL: "H0301" } });
      expect(run("MSTK", 1, 1)).toEqual({ result: "K0101", mapping: { MKEY: "K0101" } });
      expect(run("v", 2, 5)).toEqual({ result: "R0502", mapping: { PIT_: "R0502" } });
      expect(run("COMP", 0, 0)).toEqual({ result: "R0000", mapping: { COMP: "R0000" } });
    });

    it("keeps a short or long unknown token as it is and turns a 2 or 3 character one into the wall", () => {
      expect(run("M12", 1, 1)).toEqual({ result: "M12", mapping: {} });
      expect(run("12345", 0, 0)).toEqual({ result: "12345", mapping: {} });
      expect(run("xyz", 3, 3)).toEqual({ result: W, mapping: {} });
    });

    it("renames but does not migrate a token when the cell is not known", () => {
      expect(run(".")).toEqual({ result: "R000", mapping: {} });
      expect(run("L123", 1)).toEqual({ result: "L123", mapping: {} });
    });
  });

  describe("normalizeImportedLayout", () => {
    beforeEach(() => (debug.log as jest.Mock).mockClear());

    it("leaves a temple without a layout alone", () => {
      const parsed = { id: "x" };
      normalizeImportedLayout(parsed);
      expect(parsed).toEqual({ id: "x" });
      expect(debug.log).not.toHaveBeenCalled();
    });

    it("rewrites a single grid and renames the room records", () => {
      const parsed = {
        id: "x",
        dungeonLayout: { maze: [["WALL", "L123"], ["H", "xyz"]], rooms: { L123: { type: "loot" }, HEAL: { type: "health" }, [W]: { type: "wall" } } },
      };
      normalizeImportedLayout(parsed);
      expect(parsed.dungeonLayout.maze).toEqual([[W, "L0100"], ["H0001", W]]);
      expect(parsed.dungeonLayout.rooms).toEqual({ L0100: { type: "loot" }, H0001: { type: "health" }, [W]: { type: "wall" } });
      expect(debug.log).toHaveBeenCalledWith("Normalized 2 room tokens in layout import.");
    });

    it("rewrites every floor of a floor map in place", () => {
      const parsed = { id: "x", dungeonLayout: { maze: { "1F": [["EXIT", "T123"]], "2F": [["_", "?"]] }, rooms: {} } };
      const floors = parsed.dungeonLayout.maze;
      normalizeImportedLayout(parsed);
      expect(parsed.dungeonLayout.maze).toBe(floors);
      expect(floors).toEqual({ "1F": [["_00_", "R0100"]], "2F": [[W, "R0100"]] });
    });

    it("keeps the room records and says nothing when no token was renamed", () => {
      const rooms = { M0101: { type: "monster" } };
      const parsed = { id: "x", dungeonLayout: { maze: [[W, "M0101"]], rooms } };
      normalizeImportedLayout(parsed);
      expect(parsed.dungeonLayout.rooms).toBe(rooms);
      expect(debug.log).not.toHaveBeenCalled();
    });

    it("lets the first record win when two tokens map to the same new one", () => {
      const parsed = {
        id: "x",
        dungeonLayout: { maze: [["L123"]], rooms: { L123: { type: "loot", n: 1 }, L0000: { type: "empty", n: 2 } } },
      };
      normalizeImportedLayout(parsed);
      expect(parsed.dungeonLayout.maze).toEqual([["L0000"]]);
      expect(parsed.dungeonLayout.rooms).toEqual({ L0000: { type: "loot", n: 1 } });
    });
  });
});
