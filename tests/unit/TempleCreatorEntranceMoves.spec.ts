/**
 * Where the temple creator's entrance goes when the Game Master moves it (paints the entrance token on a cell) and when
 * the floor it is stored against changes (a floor is removed): hooks/grid/entranceMoves. An entrance stored as
 * "floor index,row,col" names its floor by place in the maze's floor keys, so removing a floor before it shifts it.
 */
import { _00_, ____ } from "@/lib/engine/dungeons/roomTypes";
import {
  entranceAfterFloorRemoval,
  entrancePositionAt,
  otherEntranceCells,
  placeEntrance,
  removeFloorFrom,
  type EntranceTemple,
} from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/entranceMoves";

/** A 2x3 floor of walls with the given tokens put at [row, col] */
const floor = (tokens: Record<string, string> = {}): string[][] => {
  const grid = [
    [____, ____, ____],
    [____, ____, ____],
  ];
  Object.entries(tokens).forEach(([cell, token]) => {
    const [row, col] = cell.split(",").map(Number);
    grid[row][col] = token;
  });
  return grid;
};

describe("entrancePositionAt", () => {
  it("is 'row,col' for a temple that is one grid", () => {
    expect(entrancePositionAt(floor(), "1F", 1, 2)).toBe("1,2");
  });

  it("is 'floor index,row,col' for a temple with floors, counting floors in the order the maze holds them", () => {
    const maze = { "1F": floor(), B1: floor(), "2F": floor() };
    expect(entrancePositionAt(maze, "1F", 0, 1)).toBe("0,0,1");
    expect(entrancePositionAt(maze, "B1", 1, 2)).toBe("1,1,2");
    expect(entrancePositionAt(maze, "2F", 1, 0)).toBe("2,1,0");
  });

  it("keeps the floor index of a temple whose only floor is 1F, as the shipped multi-floor temples store it", () => {
    expect(entrancePositionAt({ "1F": floor() }, "1F", 1, 1)).toBe("0,1,1");
  });

  it("is 'row,col' for a floor the maze does not have", () => {
    expect(entrancePositionAt({ "1F": floor() }, "9F", 1, 1)).toBe("1,1");
  });
});

describe("otherEntranceCells", () => {
  it("lists every entrance token in the maze except the cell given, floor by floor, row by row", () => {
    const maze = {
      "1F": floor({ "0,2": _00_, "1,1": _00_ }),
      "2F": floor({ "1,0": _00_ }),
    };
    expect(otherEntranceCells(maze, "1F", 1, 1)).toEqual([
      { levelId: "1F", row: 0, col: 2 },
      { levelId: "2F", row: 1, col: 0 },
    ]);
  });

  it("does not list the cell given, even when it is the same cell number on another floor", () => {
    const maze = { "1F": floor({ "0,0": _00_ }), "2F": floor({ "0,0": _00_ }) };
    expect(otherEntranceCells(maze, "1F", 0, 0)).toEqual([{ levelId: "2F", row: 0, col: 0 }]);
  });

  it("finds the entrance token however it is spelled: the editor's, the engine's and the saved 5-character one", () => {
    const maze = floor({ "0,0": "E", "0,1": "_00_", "0,2": "_00__" });
    expect(otherEntranceCells(maze, "1F", 1, 1)).toEqual([
      { levelId: "1F", row: 0, col: 0 },
      { levelId: "1F", row: 0, col: 1 },
      { levelId: "1F", row: 0, col: 2 },
    ]);
  });

  it("reads a temple that is one grid as the floor 1F", () => {
    expect(otherEntranceCells(floor({ "0,1": _00_ }), "1F", 1, 2)).toEqual([{ levelId: "1F", row: 0, col: 1 }]);
  });

  it("is empty when the cell given holds the only entrance, or the maze holds none", () => {
    expect(otherEntranceCells(floor({ "1,1": _00_ }), "1F", 1, 1)).toEqual([]);
    expect(otherEntranceCells(floor({ "0,0": "R0000", "0,1": "M0001" }), "1F", 1, 1)).toEqual([]);
  });
});

describe("entranceAfterFloorRemoval", () => {
  const floors = () => ({ "1F": floor(), B1: floor(), "2F": floor(), "3F": floor() });

  it("leaves a 'row,col' entrance alone: it names no floor", () => {
    expect(entranceAfterFloorRemoval("1,2", floors(), "2F")).toEqual({ entrancePosition: "1,2", resetTo: null });
  });

  it("leaves the entrance alone when the floor removed is after its floor", () => {
    expect(entranceAfterFloorRemoval("0,1,2", floors(), "3F")).toEqual({ entrancePosition: "0,1,2", resetTo: null });
    expect(entranceAfterFloorRemoval("2,1,2", floors(), "3F")).toEqual({ entrancePosition: "2,1,2", resetTo: null });
  });

  // The bug of #1219: deleting a maze key shifts the index of every later floor
  it("moves the floor index down one when a floor before the entrance's floor is removed", () => {
    expect(entranceAfterFloorRemoval("3,1,2", floors(), "B1")).toEqual({ entrancePosition: "2,1,2", resetTo: null });
    expect(entranceAfterFloorRemoval("3,1,2", floors(), "2F")).toEqual({ entrancePosition: "2,1,2", resetTo: null });
    expect(entranceAfterFloorRemoval("2,0,0", floors(), "B1")).toEqual({ entrancePosition: "1,0,0", resetTo: null });
  });

  it("puts the entrance back at 0,0 of the entrance floor when its own floor is removed, naming that cell", () => {
    expect(entranceAfterFloorRemoval("2,1,2", floors(), "2F")).toEqual({
      entrancePosition: "0,0,0",
      resetTo: { levelId: "1F", row: 0, col: 0 },
    });
  });

  it("counts the entrance floor's place among the floors that are left, not the ones it had", () => {
    const maze = { B1: floor(), "1F": floor(), "2F": floor() };
    expect(entranceAfterFloorRemoval("2,1,1", maze, "2F")).toEqual({
      entrancePosition: "1,0,0",
      resetTo: { levelId: "1F", row: 0, col: 0 },
    });
  });

  it("takes the shallowest basement for the entrance when no surface floor is left", () => {
    const maze = { B2: floor(), B1: floor(), "2F": floor() };
    // "2F" is a surface floor: removing it leaves only basements
    expect(entranceAfterFloorRemoval("2,0,1", maze, "2F")).toEqual({
      entrancePosition: "1,0,0",
      resetTo: { levelId: "B1", row: 0, col: 0 },
    });
  });

  it("leaves an entrance that names no floor, a floor the maze does not have, and a temple of one grid alone", () => {
    expect(entranceAfterFloorRemoval("9,1,2", floors(), "2F").entrancePosition).toBe("9,1,2");
    expect(entranceAfterFloorRemoval("2,1,2", floors(), "9F")).toEqual({ entrancePosition: "2,1,2", resetTo: null });
    expect(entranceAfterFloorRemoval("1,2", floor(), "2F")).toEqual({ entrancePosition: "1,2", resetTo: null });
    expect(entranceAfterFloorRemoval("0,1,2", floor(), "2F")).toEqual({ entrancePosition: "0,1,2", resetTo: null });
  });

  it("leaves a position that is not a position alone", () => {
    expect(entranceAfterFloorRemoval("", floors(), "2F")).toEqual({ entrancePosition: "", resetTo: null });
  });

  it("does not change the maze it is given", () => {
    const maze = floors();
    const before = JSON.stringify(maze);
    entranceAfterFloorRemoval("2,1,2", maze, "2F");
    expect(JSON.stringify(maze)).toBe(before);
  });
});

/** A temple to move the entrance in, and a symbol maker that numbers the empty rooms it is asked for */
const templeOf = (maze: EntranceTemple["maze"], rooms: EntranceTemple["rooms"] = {}, used: string[] = []): EntranceTemple => ({
  maze,
  rooms,
  usedSymbols: new Set(used),
});
const symbolMaker = () => jest.fn((row: number, col: number, type: string) => `${type}-${row}${col}`);

describe("placeEntrance", () => {
  it("puts the token on the cell, gives back its position and turns the old entrance into an empty room", () => {
    const temple = templeOf(floor({ "0,0": _00_ }));
    const makeSymbol = symbolMaker();

    const position = placeEntrance(temple, { levelId: "1F", row: 1, col: 2 }, makeSymbol);

    expect(position).toBe("1,2");
    expect(temple.maze).toEqual(floor({ "0,0": "empty-00", "1,2": _00_ }));
    expect(temple.rooms).toEqual({ "empty-00": { type: "empty" } });
    expect(makeSymbol).toHaveBeenCalledTimes(1);
    expect(makeSymbol).toHaveBeenCalledWith(0, 0, "empty");
  });

  it("names the floor in the position of a temple with floors and clears an old entrance on another floor", () => {
    const temple = templeOf({ "1F": floor(), "2F": floor({ "1,1": _00_ }) });

    expect(placeEntrance(temple, { levelId: "1F", row: 0, col: 2 }, symbolMaker())).toBe("0,0,2");
    expect(temple.maze).toEqual({ "1F": floor({ "0,2": _00_ }), "2F": floor({ "1,1": "empty-11" }) });
    expect(temple.rooms["empty-11"]).toEqual({ type: "empty" });
  });

  it("clears every old entrance token, whatever it is spelled like, so only one entrance is left", () => {
    const temple = templeOf(floor({ "0,0": "E", "0,1": "_00__" }));
    placeEntrance(temple, { levelId: "1F", row: 1, col: 1 }, symbolMaker());
    expect(temple.maze).toEqual(floor({ "0,0": "empty-00", "0,1": "empty-01", "1,1": _00_ }));
  });

  it("lets go of the room record and the used symbol of the room the entrance takes the cell from", () => {
    const temple = templeOf(floor({ "0,0": "M0000" }), { M0000: { type: "monster" }, M0001: { type: "monster" } }, [
      "M0000",
      "M0001",
    ]);
    placeEntrance(temple, { levelId: "1F", row: 0, col: 0 }, symbolMaker());

    expect(temple.rooms).toEqual({ M0001: { type: "monster" } });
    expect([...temple.usedSymbols]).toEqual(["M0001"]);
    expect(temple.maze).toEqual(floor({ "0,0": _00_ }));
  });

  it("keeps the wall record: the wall is shared by every wall cell", () => {
    const temple = templeOf(floor(), { [____]: { type: "wall" } });
    placeEntrance(temple, { levelId: "1F", row: 0, col: 0 }, symbolMaker());
    expect(temple.rooms[____]).toEqual({ type: "wall" });
  });

  it("changes nothing when the entrance is already on the cell", () => {
    const temple = templeOf(floor({ "1,2": _00_ }));
    const makeSymbol = symbolMaker();
    expect(placeEntrance(temple, { levelId: "1F", row: 1, col: 2 }, makeSymbol)).toBe("1,2");
    expect(temple.maze).toEqual(floor({ "1,2": _00_ }));
    expect(makeSymbol).not.toHaveBeenCalled();
  });

  it("does not overwrite a room that already has the new empty room's symbol", () => {
    const temple = templeOf(floor({ "0,0": _00_ }), { "empty-00": { type: "gate" } });
    placeEntrance(temple, { levelId: "1F", row: 1, col: 1 }, symbolMaker());
    expect(temple.rooms["empty-00"]).toEqual({ type: "gate" });
  });

  it("changes nothing for a cell the floor does not have", () => {
    const temple = templeOf(floor({ "0,0": _00_ }));
    expect(placeEntrance(temple, { levelId: "1F", row: 5, col: 5 }, symbolMaker())).toBe("5,5");
    expect(temple.maze).toEqual(floor({ "0,0": _00_ }));
  });
});

describe("removeFloorFrom", () => {
  const withFloors = (tokens: Record<string, [string, string]> = {}) => {
    const maze: Record<string, string[][]> = { "1F": floor(), "2F": floor(), "3F": floor() };
    Object.entries(tokens).forEach(([levelId, [cell, token]]) => {
      const [row, col] = cell.split(",").map(Number);
      maze[levelId][row][col] = token;
    });
    return templeOf(maze);
  };

  it("does nothing for 1F, for a temple that is one grid, for a floor it does not have, and for the last floor", () => {
    const temple = withFloors();
    expect(removeFloorFrom(temple, "0,0,0", "1F", symbolMaker())).toBeNull();
    expect(Object.keys(temple.maze)).toEqual(["1F", "2F", "3F"]);

    const grid = templeOf(floor());
    expect(removeFloorFrom(grid, "0,0", "2F", symbolMaker())).toBeNull();
    expect(grid.maze).toEqual(floor());

    const lonely = templeOf({ "1F": floor(), "2F": floor() });
    delete (lonely.maze as Record<string, string[][]>)["1F"];
    expect(removeFloorFrom(lonely, "0,0,0", "2F", symbolMaker())).toBeNull();
    expect(Object.keys(lonely.maze)).toEqual(["2F"]);
  });

  it("deletes the floor and shows the first floor left; the entrance moves down one when the floor was before it", () => {
    const temple = withFloors({ "3F": ["1,2", _00_] });
    const removal = removeFloorFrom(temple, "2,1,2", "2F", symbolMaker());

    expect(removal).toEqual({ entrancePosition: "1,1,2", nextLevelId: "1F", notice: null });
    expect(Object.keys(temple.maze)).toEqual(["1F", "3F"]);
    expect((temple.maze as Record<string, string[][]>)["3F"][1][2]).toBe(_00_);
  });

  it("leaves a 'row,col' entrance as it was", () => {
    const removal = removeFloorFrom(withFloors(), "1,2", "2F", symbolMaker());
    expect(removal?.entrancePosition).toBe("1,2");
    expect(removal?.notice).toBeNull();
  });

  it("puts the entrance back at 0,0 of the entrance floor when its own floor goes, and gives the notice", () => {
    const temple = withFloors({ "2F": ["1,2", _00_] });
    const removal = removeFloorFrom(temple, "1,1,2", "2F", symbolMaker());

    expect(removal).toEqual({
      entrancePosition: "0,0,0",
      nextLevelId: "1F",
      notice: "The entrance was on 2F, which is gone. It is back at 1F 1x 1y.",
    });
    expect(Object.keys(temple.maze)).toEqual(["1F", "3F"]);
    expect((temple.maze as Record<string, string[][]>)["1F"][0][0]).toBe(_00_);
  });
});
