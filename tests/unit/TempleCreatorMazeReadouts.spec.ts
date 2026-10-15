/**
 * Characterization of what the temple creator shows about a maze (hooks/grid/mazeReadouts): the entrance in words,
 * whether the maze has one, the rooms that own a symbol, the copyable temple source and the entrance as saved.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";
import type { TempleInterface } from "@/lib/databases/TempleDb";
import temples from "@/lib/engine/temples";
import { layoutSignature, planSeedSync, type ShippedTemple } from "@/lib/engine/core/dungeons/importAllTemples";
import type { MazeData } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/floorLayers";
import {
  buildTempleCode,
  collectUniqueRooms,
  describeEntrance,
  mazeHasEntrance,
  resolveEntranceCoordinates,
} from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/mazeReadouts";

describe("describeEntrance", () => {
  it("reads a 'row,col' position as 'colx rowy', counting from 1", () => {
    expect(describeEntrance("1,2", [["_"]])).toBe("3x 2y");
    expect(describeEntrance("0,0", [["_"]])).toBe("1x 1y");
  });

  it("reads a position that is not numbers as the first cell", () => {
    expect(describeEntrance("", [["_"]])).toBe("1x 1y");
    expect(describeEntrance("a,b", [["_"]])).toBe("1x 1y");
  });

  it("names the floor for a 'floor,row,col' position in a floor map by its index", () => {
    const maze = { "1F": [["_"]], "2F": [["_"]] };
    expect(describeEntrance("0,3,4", maze)).toBe("1F 5x 4y");
    expect(describeEntrance("1,0,0", maze)).toBe("2F 1x 1y");
  });

  it("names the floor 'Floor n' when the index is past the floors", () => {
    expect(describeEntrance("5,0,0", { "1F": [["_"]] })).toBe("Floor 5 1x 1y");
  });

  it("calls the floor 1F for a single grid whatever the floor index", () => {
    expect(describeEntrance("0,1,1", [["_"]])).toBe("1F 2x 2y");
    expect(describeEntrance("3,1,1", [["_"]])).toBe("1F 2x 2y");
  });
});

describe("mazeHasEntrance", () => {
  it("is true when a single grid has an entrance token", () => {
    expect(mazeHasEntrance([["_", "E"]])).toBe(true);
    expect(mazeHasEntrance([["_", "_00_"]])).toBe(true);
    expect(mazeHasEntrance([["EXIT"]])).toBe(true);
  });

  it("is false when no cell is an entrance token", () => {
    expect(mazeHasEntrance([["_", "R001"], ["M001", "_"]])).toBe(false);
    expect(mazeHasEntrance([])).toBe(false);
  });

  it("looks through every floor of a floor map", () => {
    expect(mazeHasEntrance({ "1F": [["_"]], "2F": [["_", "E"]] })).toBe(true);
    expect(mazeHasEntrance({ "1F": [["_"]], "2F": [["R001"]] })).toBe(false);
    expect(mazeHasEntrance({})).toBe(false);
  });
});

describe("collectUniqueRooms", () => {
  const rooms: Record<string, Room> = {
    R001: { type: "monster", content: { beasts: ["b1"] } },
    R002: { type: "loot" },
    E: { type: "entrance" },
  };

  it("lists each symbol that is not the wall or the entrance once, sorted, with its record", () => {
    const maze = [
      ["_", "E", "R002"],
      ["R001", "R002", "M001"],
    ];
    expect(collectUniqueRooms(maze, rooms)).toEqual([
      { key: "M001" },
      { key: "R001", type: "monster", content: { beasts: ["b1"] } },
      { key: "R002", type: "loot" },
    ]);
  });

  it("collects across every floor of a floor map", () => {
    const maze = { "1F": [["R002", "_"]], B1: [["R001", "R002"]] };
    expect(collectUniqueRooms(maze, rooms).map((r) => r.key)).toEqual(["R001", "R002"]);
  });

  it("includes an empty cell as a symbol of its own", () => {
    expect(collectUniqueRooms([["", "_"]], {})).toEqual([{ key: "" }]);
  });

  it("is empty for a maze of walls and entrances", () => {
    expect(collectUniqueRooms([["_", "E"]], rooms)).toEqual([]);
    expect(collectUniqueRooms([], rooms)).toEqual([]);
  });
});

describe("buildTempleCode", () => {
  const rooms: Record<string, Room> = { R001: { type: "monster" }, E: { type: "entrance" } };

  it("writes a single-grid temple as source text, with the id's dashes removed", () => {
    const code = buildTempleCode("fire-temple", "1,2", [["_", "E"], ["R001", "_"]], rooms);
    expect(code).toBe(
      [
        "const firetemple = {",
        "  entrance: [1, 2],",
        "  maze: [",
        "    [_, E], // y: 0",
        "    [R001, _], // y: 1",
        "  ],",
        "  rooms: {",
        '    [R001]: {"type":"monster"},',
        '    [E]: {"type":"entrance"}',
        "  },",
        "}",
        "",
        "export default firetemple",
      ].join("\n")
    );
  });

  it("writes a floor map one named grid per floor", () => {
    const code = buildTempleCode("a-b-c", "0,1,1", { "1F": [["_", "E"]], B1: [["R001"]] }, {});
    expect(code).toBe(
      [
        "const abc = {",
        "  entrance: [0, 1, 1],",
        "  maze: {",
        '    "1F": [',
        "      [_, E], // y: 0",
        "    ],",
        '    "B1": [',
        "      [R001], // y: 0",
        "    ],",
        "  },",
        "  rooms: {",
        "  },",
        "}",
        "",
        "export default abc",
      ].join("\n")
    );
  });

  it("writes a position that is not numbers as NaN", () => {
    expect(buildTempleCode("t", "a,b", [["_"]], {})).toContain("entrance: [NaN, NaN],");
  });
});

describe("resolveEntranceCoordinates", () => {
  const oneGrid = [["_"]];
  const twoFloors = { "1F": [["_"]], "2F": [["_"]] };

  it("keeps a [row, col] pair as it is", () => {
    const pair = [1, 2];
    expect(resolveEntranceCoordinates(pair, oneGrid)).toBe(pair);
  });

  it("keeps a [row, col] pair on a maze of floors too (the game reads it on '1F', as wind-temple ships it)", () => {
    expect(resolveEntranceCoordinates([5, 2], { "1F": [["_"]] })).toEqual([5, 2]);
    expect(resolveEntranceCoordinates([1, 2], twoFloors)).toEqual([1, 2]);
  });

  // Changed with #1218: the floor index was dropped on every save, so an entrance on a later floor came back as a
  // cell of the first floor. A single grid has one floor, so there the floor index is still dropped.
  it("drops the floor index from a [floor, row, col] triple when the maze is one grid", () => {
    expect(resolveEntranceCoordinates([4, 1, 2], oneGrid)).toEqual([1, 2]);
    expect(resolveEntranceCoordinates([0, 1, 2], oneGrid)).toEqual([1, 2]);
  });

  it("keeps the floor index of a [floor, row, col] triple when the maze has floors", () => {
    expect(resolveEntranceCoordinates([0, 3, 2], twoFloors)).toEqual([0, 3, 2]);
    expect(resolveEntranceCoordinates([1, 3, 2], twoFloors)).toEqual([1, 3, 2]);
    expect(resolveEntranceCoordinates([0, 0, 0], { "1F": [["_"]] })).toEqual([0, 0, 0]);
  });

  it("is [0, 0] for any other length", () => {
    expect(resolveEntranceCoordinates([], oneGrid)).toEqual([0, 0]);
    expect(resolveEntranceCoordinates([5], oneGrid)).toEqual([0, 0]);
    expect(resolveEntranceCoordinates([1, 2, 3, 4], oneGrid)).toEqual([0, 0]);
    expect(resolveEntranceCoordinates([1, 2, 3, 4], twoFloors)).toEqual([0, 0]);
  });
});

describe("saving a shipped temple's entrance (resolveEntranceCoordinates)", () => {
  const shippedTemples = temples as unknown as Record<string, ShippedTemple & { entrance: number[]; maze: MazeData }>;

  // The editor keeps the entrance as the "a,b,c" string it loaded and saves it back through the same split
  it.each(Object.keys(shippedTemples))("writes %s's entrance back as shipped", (id) => {
    const shipped = shippedTemples[id];
    const parts = shipped.entrance.join(",").split(",").map(Number);
    expect(resolveEntranceCoordinates(parts, shipped.maze)).toEqual(shipped.entrance);
  });

  it.each(Object.keys(shippedTemples))("leaves an unedited %s looking unedited to the temple import", (id) => {
    const shipped = shippedTemples[id];
    const parts = shipped.entrance.join(",").split(",").map(Number);
    const saved = { entrance: resolveEntranceCoordinates(parts, shipped.maze), maze: shipped.maze, rooms: shipped.rooms };
    const record = { id, dungeonLayout: saved, seedSignature: layoutSignature(shipped) } as unknown as TempleInterface;
    expect(planSeedSync(record, shipped).action).toBe("current");
  });
});
