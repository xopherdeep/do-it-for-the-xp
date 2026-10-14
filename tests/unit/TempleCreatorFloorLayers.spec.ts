/**
 * Characterization of the floor and maze-slice helpers the temple editor composables use (hooks/grid/floorLayers):
 * floor names and their order, the entrance floor, the names "add floor" offers, blank layers, reading and writing
 * one floor's grid, and what a loaded layout implies for the grid size and the shown floor.
 */
import { ____ } from "@/lib/engine/dungeons/roomTypes";
import { neighbourFloorOf } from "@/lib/engine/core/dungeons/floorOrder";
import {
  blankFloorLayer,
  blankGrid,
  floorKeysOf,
  floorSlice,
  floorsAbove,
  floorsBelow,
  getEntranceFloor,
  getFloorValue,
  levelIdAfterLoad,
  measureGridSize,
  nextFloorOptions,
  sortedFloorKeys,
  writeMazeCell,
} from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/floorLayers";

describe("getFloorValue", () => {
  it("reads surface floors as positive, basements as negative, anything else as ground level", () => {
    expect(getFloorValue("1F")).toBe(1);
    expect(getFloorValue("12F")).toBe(12);
    expect(getFloorValue("B1")).toBe(-1);
    expect(getFloorValue("B3")).toBe(-3);
    expect(getFloorValue("Attic")).toBe(0);
    expect(getFloorValue("")).toBe(0);
  });
});

describe("floorKeysOf and sortedFloorKeys", () => {
  it("treats a single grid as the one floor 1F", () => {
    expect(floorKeysOf([["_"]])).toEqual(["1F"]);
    expect(sortedFloorKeys([["_"]])).toEqual(["1F"]);
  });

  it("keeps the map's own order in floorKeysOf", () => {
    expect(floorKeysOf({ "2F": [], B1: [], "1F": [] })).toEqual(["2F", "B1", "1F"]);
  });

  it("sorts a floor map from the deepest basement up", () => {
    expect(sortedFloorKeys({ "2F": [], "1F": [], B2: [], B1: [] })).toEqual(["B2", "B1", "1F", "2F"]);
  });

  it("puts a floor with an unrecognised name at ground level, which sorts below 1F", () => {
    expect(sortedFloorKeys({ "1F": [], Attic: [], B1: [] })).toEqual(["B1", "Attic", "1F"]);
  });

  it("puts a basement added after the floors above it below them, and reads floor numbers as numbers (task #1380)", () => {
    const drawn = { "1F": [], "2F": [], B1: [] }; // keys in the order the editor created the floors
    expect(sortedFloorKeys(drawn)).toEqual(["B1", "1F", "2F"]);
    expect(floorKeysOf(drawn)).toEqual(["1F", "2F", "B1"]); // the map's own order is what an entrance index counts in
    expect(sortedFloorKeys({ "10F": [], "2F": [], "1F": [] })).toEqual(["1F", "2F", "10F"]);
  });

  it("is the same order stairs and pits climb in: the next floor up from 1F is 2F and the next down is B1", () => {
    const floors = sortedFloorKeys({ "1F": [], "2F": [], B1: [] });
    expect(floorsAbove(floors, "1F")).toEqual(["2F"]);
    expect(floorsBelow(floors, "1F")).toEqual(["B1"]);
    expect(neighbourFloorOf(floors, "1F", -1)).toBe("B1");
    expect(neighbourFloorOf(floors, "B1", 1)).toBe("1F");
  });
});

describe("floorsAbove and floorsBelow", () => {
  const floors = ["B2", "B1", "1F", "2F", "3F"];

  it("lists floors above the current one, nearest first", () => {
    expect(floorsAbove(floors, "1F")).toEqual(["2F", "3F"]);
    expect(floorsAbove(floors, "B2")).toEqual(["B1", "1F", "2F", "3F"]);
    expect(floorsAbove(floors, "3F")).toEqual([]);
  });

  it("lists floors below the current one, nearest first", () => {
    expect(floorsBelow(floors, "3F")).toEqual(["2F", "1F", "B1", "B2"]);
    expect(floorsBelow(floors, "1F")).toEqual(["B1", "B2"]);
    expect(floorsBelow(floors, "B2")).toEqual([]);
  });

  it("does not list the current floor in either list", () => {
    expect(floorsAbove(floors, "2F")).not.toContain("2F");
    expect(floorsBelow(floors, "2F")).not.toContain("2F");
  });
});

describe("getEntranceFloor", () => {
  it("is the lowest surface floor when there is one", () => {
    expect(getEntranceFloor(["B1", "3F", "2F"])).toBe("2F");
  });

  it("is the shallowest basement when there is no surface floor", () => {
    expect(getEntranceFloor(["B3", "B1", "B2"])).toBe("B1");
  });

  it("is the first floor when the names are neither", () => {
    expect(getEntranceFloor(["Roof", "Attic"])).toBe("Roof");
  });

  it("falls back to 1F for no floors", () => {
    expect(getEntranceFloor([])).toBe("1F");
  });
});

describe("nextFloorOptions", () => {
  it("offers 2F and B1 for a temple that has only 1F", () => {
    expect(nextFloorOptions(["1F"])).toEqual({ surface: "2F", basement: "B1" });
  });

  it("offers 2F and B1 for no floors", () => {
    expect(nextFloorOptions([])).toEqual({ surface: "2F", basement: "B1" });
  });

  it("offers the floor after the highest surface floor and the deepest basement", () => {
    expect(nextFloorOptions(["B2", "B1", "1F", "2F", "3F"])).toEqual({ surface: "4F", basement: "B3" });
  });

  it("ignores floors that are neither surface nor basement", () => {
    expect(nextFloorOptions(["1F", "Attic"])).toEqual({ surface: "2F", basement: "B1" });
  });
});

describe("blankGrid and blankFloorLayer", () => {
  it("builds rows by cols walls with independent rows", () => {
    const grid = blankGrid(2, 3);
    expect(grid).toEqual([
      [____, ____, ____],
      [____, ____, ____],
    ]);
    grid[0][0] = "X";
    expect(grid[1][0]).toBe(____);
  });

  it("builds nothing for zero rows", () => {
    expect(blankGrid(0, 5)).toEqual([]);
  });

  it("builds empty rows for zero columns", () => {
    expect(blankGrid(2, 0)).toEqual([[], []]);
  });

  it("reads a grid size as rows x cols", () => {
    const layer = blankFloorLayer("2x4");
    expect(layer).toHaveLength(2);
    expect(layer[0]).toHaveLength(4);
    expect(layer.every((row) => row.every((cell) => cell === ____))).toBe(true);
  });
});

describe("floorSlice", () => {
  const ground = [["a"]];
  const upper = [["b"]];

  it("is the whole maze for a single-floor temple, whatever the level id", () => {
    expect(floorSlice(ground, "1F")).toBe(ground);
    expect(floorSlice(ground, "2F")).toBe(ground);
  });

  it("is the named floor of a floor map", () => {
    const maze = { "1F": ground, "2F": upper };
    expect(floorSlice(maze, "2F")).toBe(upper);
  });

  it("is an empty grid for a floor the map does not have", () => {
    expect(floorSlice({ "1F": ground }, "B1")).toEqual([]);
  });
});

describe("writeMazeCell", () => {
  it("writes into a single-floor maze in place", () => {
    const maze = [["a", "b"], ["c", "d"]];
    writeMazeCell(maze, "ignored", 1, 0, "Z");
    expect(maze).toEqual([["a", "b"], ["Z", "d"]]);
  });

  it("writes into the named floor of a floor map in place", () => {
    const maze = { "1F": [["a"]], "2F": [["b", "c"]] };
    writeMazeCell(maze, "2F", 0, 1, "Z");
    expect(maze).toEqual({ "1F": [["a"]], "2F": [["b", "Z"]] });
  });

  it("throws for a floor the map does not have", () => {
    expect(() => writeMazeCell({ "1F": [["a"]] }, "2F", 0, 0, "Z")).toThrow();
  });
});

describe("measureGridSize", () => {
  it("is the rows x cols of a single grid", () => {
    expect(measureGridSize([["a", "b", "c"], ["d", "e", "f"]])).toBe("2x3");
  });

  it("is the size of the first floor of a floor map", () => {
    expect(measureGridSize({ "1F": [["a", "b"]], "2F": [["a"], ["b"], ["c"]] })).toBe("1x2");
  });

  it("is null when the first floor has no rows", () => {
    expect(measureGridSize([])).toBeNull();
    expect(measureGridSize({ "1F": [] })).toBeNull();
    expect(measureGridSize({})).toBeNull();
  });
});

describe("levelIdAfterLoad", () => {
  it("is always 1F for a single grid", () => {
    expect(levelIdAfterLoad([["a"]], "2F")).toBe("1F");
  });

  it("keeps the current floor when the map has it", () => {
    expect(levelIdAfterLoad({ "1F": [], "2F": [] }, "2F")).toBe("2F");
  });

  it("moves to 1F when the current floor is not in the map and 1F is", () => {
    expect(levelIdAfterLoad({ "1F": [], "2F": [] }, "B1")).toBe("1F");
  });

  it("moves to the first floor when neither the current floor nor 1F is in the map", () => {
    expect(levelIdAfterLoad({ B1: [], B2: [] }, "1F")).toBe("B1");
  });

  it("keeps the current floor for a map with no floors", () => {
    expect(levelIdAfterLoad({}, "3F")).toBe("3F");
  });
});
