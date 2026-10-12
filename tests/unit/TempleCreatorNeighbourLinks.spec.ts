/**
 * Characterization of the neighbour rules the room page uses (hooks/grid/neighbourLinks): which neighbours exist,
 * the cell next to a room, the reading order of rooms, and keeping both sides of a shared door the same.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";
import {
  canLocateRoom,
  computeAdjacency,
  getAdjacentCoords,
  getOppositeDirection,
  isWallRoom,
  navigableCells,
  noAdjacentRooms,
  syncNeighbourSides,
  wallOffMissingSides,
} from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/neighbourLinks";

const grid3 = () => [
  ["R0001", "R0002", "R0003"],
  ["R0004", "R0005", "R0006"],
  ["R0007", "R0008", "R0009"],
];

describe("noAdjacentRooms", () => {
  it("is four false sides, a fresh object each time", () => {
    const first = noAdjacentRooms();
    expect(first).toEqual({ north: false, east: false, south: false, west: false });
    first.north = true;
    expect(noAdjacentRooms().north).toBe(false);
  });
});

describe("canLocateRoom", () => {
  it("accepts a cell inside the grid", () => {
    expect(canLocateRoom(grid3(), 0, 0)).toBe(true);
    expect(canLocateRoom(grid3(), 2, 2)).toBe(true);
  });

  it("rejects a maze with no rows or no first row", () => {
    expect(canLocateRoom([], 0, 0)).toBe(false);
    expect(canLocateRoom([undefined as unknown as string[]], 0, 0)).toBe(false);
  });

  it("rejects a first row with no columns because every column is then outside it", () => {
    expect(canLocateRoom([[]], 0, 0)).toBe(false);
  });

  it("rejects NaN and negative coordinates", () => {
    expect(canLocateRoom(grid3(), NaN, 0)).toBe(false);
    expect(canLocateRoom(grid3(), 0, NaN)).toBe(false);
    expect(canLocateRoom(grid3(), -1, 0)).toBe(false);
    expect(canLocateRoom(grid3(), 0, -1)).toBe(false);
  });

  it("rejects coordinates past the last row or column", () => {
    expect(canLocateRoom(grid3(), 3, 0)).toBe(false);
    expect(canLocateRoom(grid3(), 0, 3)).toBe(false);
  });
});

describe("computeAdjacency", () => {
  it("has all four neighbours in the middle of a grid", () => {
    expect(computeAdjacency(grid3(), 1, 1)).toEqual({ north: true, east: true, south: true, west: true });
  });

  it("lacks the neighbours past the edges at the corners", () => {
    expect(computeAdjacency(grid3(), 0, 0)).toEqual({ north: false, east: true, south: true, west: false });
    expect(computeAdjacency(grid3(), 2, 2)).toEqual({ north: true, east: false, south: false, west: true });
  });

  it("has no neighbours in a one-cell grid", () => {
    expect(computeAdjacency([["R0001"]], 0, 0)).toEqual(noAdjacentRooms());
  });

  it("counts a neighbour to the east or west only when its symbol is not empty", () => {
    expect(computeAdjacency([["R0001", ""]], 0, 0).east).toBe(false);
    expect(computeAdjacency([["", "R0002"]], 0, 1).west).toBe(false);
  });

  it("counts a row to the north or south as soon as the row exists, even if that cell is missing", () => {
    const ragged = [["R0001", "R0002"], ["R0003"]];
    expect(computeAdjacency(ragged, 0, 1).south).toBe(true);
    expect(computeAdjacency(ragged, 1, 0).east).toBe(false);
  });
});

describe("wallOffMissingSides", () => {
  it("turns each side with no neighbour into a wall and leaves the others", () => {
    const sides: Record<string, string> = { north: "door", east: "locked", south: "bombable", west: "door" };
    wallOffMissingSides(sides, { north: false, east: true, south: true, west: false });
    expect(sides).toEqual({ north: "wall", east: "locked", south: "bombable", west: "wall" });
  });

  it("leaves every side alone when all neighbours exist", () => {
    const sides: Record<string, string> = { north: "door", east: "door", south: "door", west: "door" };
    wallOffMissingSides(sides, { north: true, east: true, south: true, west: true });
    expect(sides).toEqual({ north: "door", east: "door", south: "door", west: "door" });
  });

  it("adds a wall for a missing side the sides did not have", () => {
    const sides: Record<string, string> = {};
    wallOffMissingSides(sides, { north: false, east: true, south: true, west: true });
    expect(sides).toEqual({ north: "wall" });
  });
});

describe("getOppositeDirection", () => {
  it("is the side facing back", () => {
    expect(getOppositeDirection("north")).toBe("south");
    expect(getOppositeDirection("south")).toBe("north");
    expect(getOppositeDirection("east")).toBe("west");
    expect(getOppositeDirection("west")).toBe("east");
  });

  it("is the same word for anything else", () => {
    expect(getOppositeDirection("up")).toBe("up");
  });
});

describe("getAdjacentCoords", () => {
  it("is the cell one step in the direction", () => {
    expect(getAdjacentCoords(1, 1, "north", 3, 3)).toEqual({ row: 0, col: 1 });
    expect(getAdjacentCoords(1, 1, "south", 3, 3)).toEqual({ row: 2, col: 1 });
    expect(getAdjacentCoords(1, 1, "east", 3, 3)).toEqual({ row: 1, col: 2 });
    expect(getAdjacentCoords(1, 1, "west", 3, 3)).toEqual({ row: 1, col: 0 });
  });

  it("is null at the edge of the grid", () => {
    expect(getAdjacentCoords(0, 1, "north", 3, 3)).toBeNull();
    expect(getAdjacentCoords(2, 1, "south", 3, 3)).toBeNull();
    expect(getAdjacentCoords(1, 2, "east", 3, 3)).toBeNull();
    expect(getAdjacentCoords(1, 0, "west", 3, 3)).toBeNull();
  });

  it("is null for an unknown direction", () => {
    expect(getAdjacentCoords(1, 1, "up", 3, 3)).toBeNull();
  });
});

describe("isWallRoom", () => {
  const rooms: Record<string, Room> = { W001: { type: "wall" }, R0001: { type: "monster" } };

  it("is true only for a symbol whose record is a wall", () => {
    expect(isWallRoom("W001", rooms)).toBe(true);
    expect(isWallRoom("R0001", rooms)).toBe(false);
  });

  it("is false for a symbol with no record and for no symbol", () => {
    expect(isWallRoom("R0002", rooms)).toBe(false);
    expect(isWallRoom(null, rooms)).toBe(false);
    expect(isWallRoom(undefined, rooms)).toBe(false);
    expect(isWallRoom("", rooms)).toBe(false);
  });

  it("does not read the shared wall symbol as a wall unless its record says so", () => {
    expect(isWallRoom("_", {})).toBe(false);
    expect(isWallRoom("_", { _: { type: "wall" } })).toBe(true);
  });
});

describe("navigableCells", () => {
  it("lists every cell that is not a wall record, in reading order", () => {
    const maze = [
      ["R0001", "W001"],
      ["", "R0002"],
    ];
    const rooms: Record<string, Room> = { W001: { type: "wall" }, R0001: { type: "monster" } };
    expect(navigableCells(maze, rooms)).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ]);
  });

  it("counts a symbol with no record as a room", () => {
    expect(navigableCells([["M001"]], {})).toEqual([{ row: 0, col: 0 }]);
  });

  it("handles rows of different lengths", () => {
    expect(navigableCells([["a"], ["b", "c"]], {})).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);
  });

  it("is empty for an empty maze", () => {
    expect(navigableCells([], {})).toEqual([]);
  });
});

describe("syncNeighbourSides", () => {
  const doors = () => ({ north: "door", east: "door", south: "door", west: "door" });

  it("copies each side onto the matching opposite side of the neighbour", () => {
    const rooms: Record<string, Room> = {
      R0002: { type: "monster", sides: doors() },
      R0004: { type: "monster", sides: doors() },
      R0006: { type: "monster", sides: doors() },
      R0008: { type: "monster", sides: doors() },
    };
    syncNeighbourSides(grid3(), 1, 1, { north: "locked", east: "bombable", south: "wall", west: "masterlocked" }, rooms);
    expect(rooms.R0002.sides!.south).toBe("locked");
    expect(rooms.R0006.sides!.west).toBe("bombable");
    expect(rooms.R0008.sides!.north).toBe("wall");
    expect(rooms.R0004.sides!.east).toBe("masterlocked");
  });

  it("changes only the facing side of the neighbour", () => {
    const rooms: Record<string, Room> = { R0002: { type: "monster", sides: doors() } };
    syncNeighbourSides(grid3(), 1, 1, { north: "locked" }, rooms);
    expect(rooms.R0002.sides).toEqual({ north: "door", east: "door", south: "locked", west: "door" });
  });

  it("gives a neighbour with a record but no sides plain doors first", () => {
    const rooms: Record<string, Room> = { R0002: { type: "monster" } };
    syncNeighbourSides(grid3(), 1, 1, { north: "locked" }, rooms);
    expect(rooms.R0002.sides).toEqual({ north: "door", east: "door", south: "locked", west: "door" });
  });

  it("creates an empty room for a coordinate-token neighbour that has no record", () => {
    const rooms: Record<string, Room> = {};
    syncNeighbourSides(grid3(), 1, 1, { south: "bombable" }, rooms);
    expect(rooms).toEqual({
      R0008: { type: "empty", sides: { north: "bombable", east: "door", south: "door", west: "door" } },
    });
  });

  it("skips a shared-token neighbour that has no record", () => {
    const maze = [["M001", "R0001"]];
    const rooms: Record<string, Room> = {};
    syncNeighbourSides(maze, 0, 1, { west: "locked" }, rooms);
    expect(rooms).toEqual({});
  });

  it("syncs a shared-token neighbour that does have a record", () => {
    const maze = [["M001", "R0001"]];
    const rooms: Record<string, Room> = { M001: { type: "monster" } };
    syncNeighbourSides(maze, 0, 1, { west: "locked" }, rooms);
    expect(rooms.M001.sides).toEqual({ north: "door", east: "locked", south: "door", west: "door" });
  });

  it("skips walls and empty cells so they never become rooms", () => {
    const maze = [["_", "R0001", ""]];
    const rooms: Record<string, Room> = {};
    syncNeighbourSides(maze, 0, 1, { west: "locked", east: "locked" }, rooms);
    expect(rooms).toEqual({});
  });

  it("skips directions with no side set and directions past the edge of the grid", () => {
    const rooms: Record<string, Room> = {};
    syncNeighbourSides([["R0001"]], 0, 0, { north: "locked", east: "locked", south: "locked", west: "locked" }, rooms);
    syncNeighbourSides(grid3(), 1, 1, {}, rooms);
    expect(rooms).toEqual({});
  });

  it("leaves the room's own record alone", () => {
    const rooms: Record<string, Room> = { R0005: { type: "loot", sides: doors() } };
    syncNeighbourSides(grid3(), 1, 1, { north: "locked" }, rooms);
    expect(rooms.R0005.sides).toEqual(doors());
  });
});
