/**
 * Characterization of the maze grid builders the temple creator uses (hooks/grid/resizeMaze): the starting grid
 * with the entrance in place and resizing a floor's grid while keeping what it already holds.
 *
 * A "row,col" entrance is a cell of the FIRST floor of the maze, as the engine reads it (TempleSystem startAt): it is not
 * on every floor, so painting or resizing another floor never stamps or moves it.
 */
import { _00_, ____ } from "@/lib/engine/dungeons/roomTypes";
import { entranceAfterFloorRemoval } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/entranceMoves";
import {
  buildInitialMaze,
  entranceCellOnFloor,
  isInsideGrid,
  readEntrancePosition,
  resizeMaze,
} from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/resizeMaze";

describe("isInsideGrid", () => {
  it("accepts every cell of the grid and nothing past an edge", () => {
    expect(isInsideGrid(0, 0, 2, 3)).toBe(true);
    expect(isInsideGrid(1, 2, 2, 3)).toBe(true);
    expect(isInsideGrid(2, 0, 2, 3)).toBe(false);
    expect(isInsideGrid(0, 3, 2, 3)).toBe(false);
    expect(isInsideGrid(-1, 0, 2, 3)).toBe(false);
    expect(isInsideGrid(0, -1, 2, 3)).toBe(false);
  });
});

describe("readEntrancePosition", () => {
  it("reads 'row,col' as a position with no floor", () => {
    expect(readEntrancePosition("3,2")).toEqual({ floorIndex: null, row: 3, col: 2 });
  });

  // Added with #1155: the shipped multi-floor temples (shadow-temple, light-temple) store [floor index, row, col]
  it("reads 'floor,row,col' as a floor index, then row and col", () => {
    expect(readEntrancePosition("0,3,2")).toEqual({ floorIndex: 0, row: 3, col: 2 });
    expect(readEntrancePosition("1,0,4")).toEqual({ floorIndex: 1, row: 0, col: 4 });
  });

  it("reads anything that is not two or three numbers as no position", () => {
    expect(readEntrancePosition("")).toBeNull();
    expect(readEntrancePosition("1")).toBeNull();
    expect(readEntrancePosition("1,1,1,1")).toBeNull();
  });

  it("keeps a number that is not a number as NaN for the caller to find outside every grid", () => {
    expect(readEntrancePosition("a,b")).toEqual({ floorIndex: null, row: NaN, col: NaN });
  });
});

describe("entranceCellOnFloor", () => {
  const floors = { "1F": [], "2F": [], B1: [] };

  // Changed with #1359: the editor read this as "on every floor" while the engine starts the hero on the first floor
  it("is the cell of a 'row,col' position on the first floor of the maze, and on no other", () => {
    expect(entranceCellOnFloor("1,2", floors, "1F")).toEqual({ row: 1, col: 2 });
    expect(entranceCellOnFloor("1,2", floors, "2F")).toBeNull();
    expect(entranceCellOnFloor("1,2", floors, "B1")).toBeNull();
  });

  it("takes the first floor key as the first floor, whatever it is called", () => {
    const upper = { "2F": [], "3F": [] };
    expect(entranceCellOnFloor("1,2", upper, "2F")).toEqual({ row: 1, col: 2 });
    expect(entranceCellOnFloor("1,2", upper, "3F")).toBeNull();
    expect(entranceCellOnFloor("1,2", upper, "1F")).toBeNull();
    // The same floor a '0,row,col' position names
    expect(entranceCellOnFloor("0,1,2", upper, "2F")).toEqual({ row: 1, col: 2 });
  });

  it("puts a 'row,col' position on the floor on show when the maze lists no floor yet", () => {
    expect(entranceCellOnFloor("1,2", {}, "1F")).toEqual({ row: 1, col: 2 });
  });

  it("reads a single-grid maze's 'row,col' position as a cell of its one floor, 1F", () => {
    expect(entranceCellOnFloor("1,2", [["_"]], "1F")).toEqual({ row: 1, col: 2 });
    expect(entranceCellOnFloor("1,2", [["_"]], "2F")).toBeNull();
  });

  // Added with #1155: the editor read these as row,col and so drew the entrance at (floor, row) on every floor
  it("is the row and col of a 'floor,row,col' position on the floor at that index, and nowhere else", () => {
    expect(entranceCellOnFloor("0,3,2", floors, "1F")).toEqual({ row: 3, col: 2 });
    expect(entranceCellOnFloor("0,3,2", floors, "2F")).toBeNull();
    expect(entranceCellOnFloor("1,3,2", floors, "2F")).toEqual({ row: 3, col: 2 });
    expect(entranceCellOnFloor("1,3,2", floors, "1F")).toBeNull();
  });

  it("counts floors in the order the maze holds them, not sorted by height", () => {
    expect(entranceCellOnFloor("2,1,1", floors, "B1")).toEqual({ row: 1, col: 1 });
    expect(entranceCellOnFloor("2,1,1", floors, "2F")).toBeNull();
  });

  it("reads a single-grid maze as the one floor 1F", () => {
    expect(entranceCellOnFloor("0,1,1", [["_"]], "1F")).toEqual({ row: 1, col: 1 });
    expect(entranceCellOnFloor("1,1,1", [["_"]], "1F")).toBeNull();
  });

  it("is null for a floor index that names no floor and for a position that is not one", () => {
    expect(entranceCellOnFloor("5,1,1", floors, "1F")).toBeNull();
    expect(entranceCellOnFloor("-1,1,1", floors, "1F")).toBeNull();
    expect(entranceCellOnFloor("1", floors, "1F")).toBeNull();
  });
});

describe("buildInitialMaze", () => {
  const entranceCells = (grid: string[][]) => {
    const found: number[][] = [];
    grid.forEach((row, r) => row.forEach((cell, c) => cell === _00_ && found.push([r, c])));
    return found;
  };

  it("builds rows x cols walls with the entrance at a 'row,col' position", () => {
    const grid = buildInitialMaze("3x4", "1,2", [], "1F");
    expect(grid).toHaveLength(3);
    expect(grid.every((row) => row.length === 4)).toBe(true);
    expect(entranceCells(grid)).toEqual([[1, 2]]);
    expect(grid[0][0]).toBe(____);
  });

  it("leaves the grid all walls when the entrance is outside it", () => {
    expect(entranceCells(buildInitialMaze("3x3", "3,0", [], "1F"))).toEqual([]);
    expect(entranceCells(buildInitialMaze("3x3", "0,3", [], "1F"))).toEqual([]);
    expect(entranceCells(buildInitialMaze("3x3", "-1,0", [], "1F"))).toEqual([]);
  });

  it("leaves the grid all walls for a position that is not two or three numbers", () => {
    expect(entranceCells(buildInitialMaze("3x3", "1", [], "1F"))).toEqual([]);
    expect(entranceCells(buildInitialMaze("3x3", "1,1,1,1", [], "1F"))).toEqual([]);
  });

  it("places a 'floor,row,col' entrance only when that floor index is the current floor", () => {
    const maze = { "1F": [], "2F": [] };
    expect(entranceCells(buildInitialMaze("3x3", "1,0,2", maze, "2F"))).toEqual([[0, 2]]);
    expect(entranceCells(buildInitialMaze("3x3", "1,0,2", maze, "1F"))).toEqual([]);
  });

  it("places a 'row,col' entrance only on the first floor of a maze of floors", () => {
    const maze = { "1F": [], "2F": [] };
    expect(entranceCells(buildInitialMaze("3x3", "1,2", maze, "1F"))).toEqual([[1, 2]]);
    expect(entranceCells(buildInitialMaze("3x3", "1,2", maze, "2F"))).toEqual([]);
  });

  it("reads a single-grid maze as the one floor 1F for a 'floor,row,col' entrance", () => {
    expect(entranceCells(buildInitialMaze("3x3", "0,1,1", [["_"]], "1F"))).toEqual([[1, 1]]);
    expect(entranceCells(buildInitialMaze("3x3", "1,1,1", [["_"]], "1F"))).toEqual([]);
  });

  it("does not place a 'floor,row,col' entrance outside the grid", () => {
    expect(entranceCells(buildInitialMaze("3x3", "0,5,0", [["_"]], "1F"))).toEqual([]);
  });

  it("builds a new grid each time", () => {
    const first = buildInitialMaze("2x2", "0,0", [], "1F");
    const second = buildInitialMaze("2x2", "0,0", [], "1F");
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });
});

describe("resizeMaze", () => {
  it("grows the grid, keeping every old symbol and filling the new cells with walls", () => {
    const old = [
      [_00_, "R001"],
      [____, "R002"],
    ];
    const { maze, entranceOutsideGrid } = resizeMaze(old, 3, 3, "0,0");
    expect(maze).toEqual([
      [_00_, "R001", ____],
      [____, "R002", ____],
      [____, ____, ____],
    ]);
    expect(entranceOutsideGrid).toBe(false);
  });

  it("shrinks the grid, dropping the cells outside it", () => {
    const old = [
      [_00_, "R001", "R002"],
      ["R003", "R004", "R005"],
      ["R006", "R007", "R008"],
    ];
    const { maze, entranceOutsideGrid } = resizeMaze(old, 2, 2, "0,0");
    expect(maze).toEqual([
      [_00_, "R001"],
      ["R003", "R004"],
    ]);
    expect(entranceOutsideGrid).toBe(false);
  });

  it("does not change the grid it is given", () => {
    const old = [[_00_, "R001"], ["R002", "R003"]];
    const copy = JSON.parse(JSON.stringify(old));
    resizeMaze(old, 3, 3, "0,0");
    expect(old).toEqual(copy);
  });

  it("turns an old entrance symbol that is not on the entrance cell into an empty room", () => {
    const old = [
      [____, ____],
      [____, _00_],
    ];
    const { maze } = resizeMaze(old, 2, 2, "0,0");
    expect(maze).toEqual([
      [_00_, ____],
      [____, "O__O"],
    ]);
  });

  it("moves the entrance to the entrance position, replacing whatever the cell held", () => {
    const old = [
      ["R001", "R002"],
      ["R003", "R004"],
    ];
    const { maze } = resizeMaze(old, 2, 2, "1,0");
    expect(maze).toEqual([
      ["R001", "R002"],
      [_00_, "R004"],
    ]);
  });

  it("puts the entrance back at 0,0 when it falls outside the new grid and says so", () => {
    const old = [
      ["R001", "R002", "R003"],
      ["R004", "R005", "R006"],
      ["R007", "R008", _00_],
    ];
    const { maze, entranceOutsideGrid } = resizeMaze(old, 2, 2, "2,2");
    expect(maze).toEqual([
      [_00_, "R002"],
      ["R004", "R005"],
    ]);
    expect(entranceOutsideGrid).toBe(true);
  });

  // Changed with #1155: the first two numbers used to be read as row and col whatever the position said, so
  // "0,1,2" put the entrance at row 0, col 1 and turned the real one (row 1, col 2) into an empty room
  it("places a 'floor,row,col' entrance at its row and col when that floor is the one resized", () => {
    const floors = { "1F": [], "2F": [] };
    const old = [
      ["R001", "R002", "R003"],
      ["R004", "R005", _00_],
    ];
    const { maze, entranceOutsideGrid, entrancePosition } = resizeMaze(old, 2, 3, "0,1,2", floors, "1F");
    expect(maze).toEqual([
      ["R001", "R002", "R003"],
      ["R004", "R005", _00_],
    ]);
    expect(entranceOutsideGrid).toBe(false);
    expect(entrancePosition).toBe("0,1,2");
  });

  it("places no entrance on a floor a 'floor,row,col' entrance is not on, and turns a stray entrance symbol into an empty room", () => {
    const floors = { "1F": [], "2F": [] };
    const old = [
      ["R001", _00_],
      ["R002", "R003"],
    ];
    const { maze, entranceOutsideGrid, entrancePosition } = resizeMaze(old, 3, 3, "0,1,1", floors, "2F");
    expect(maze).toEqual([
      ["R001", "O__O", ____],
      ["R002", "R003", ____],
      [____, ____, ____],
    ]);
    expect(entranceOutsideGrid).toBe(false);
    expect(entrancePosition).toBe("0,1,1");
  });

  it("puts a 'floor,row,col' entrance that falls outside the grid back at 0,0 of the same floor", () => {
    const floors = { "1F": [], "2F": [] };
    const old = [
      ["R001", "R002", "R003"],
      ["R004", "R005", "R006"],
      ["R007", "R008", _00_],
    ];
    const { maze, entranceOutsideGrid, entrancePosition } = resizeMaze(old, 2, 2, "1,2,2", floors, "2F");
    expect(maze).toEqual([
      [_00_, "R002"],
      ["R004", "R005"],
    ]);
    expect(entranceOutsideGrid).toBe(true);
    expect(entrancePosition).toBe("1,0,0");
  });

  // The report of #1359: wind-temple has its entrance at (5,2) on a single grid; adding 2F and resizing it stamped a
  // second entrance on 2F and moved the saved entrance to 0,0 while 1F kept its entrance at (5,2)
  describe("a 'row,col' entrance, with a floor added", () => {
    const floors = { "1F": [], "2F": [] };

    it("leaves the entrance and the position alone when another floor is resized and the cell falls outside it", () => {
      const old = [
        ["R001", "R002"],
        ["R003", "R004"],
      ];
      const { maze, entranceOutsideGrid, entrancePosition } = resizeMaze(old, 3, 3, "5,2", floors, "2F");
      expect(maze).toEqual([
        ["R001", "R002", ____],
        ["R003", "R004", ____],
        [____, ____, ____],
      ]);
      expect(maze.flat()).not.toContain(_00_); // no second entrance on 2F
      expect(entranceOutsideGrid).toBe(false);
      expect(entrancePosition).toBe("5,2");
    });

    it("does not stamp the entrance over a real room of another floor when the cell falls inside it", () => {
      const old = [
        ["R001", "R002", "R003"],
        ["R004", "R005", "R006"],
      ];
      const { maze, entrancePosition } = resizeMaze(old, 2, 3, "1,1", floors, "2F");
      expect(maze).toEqual(old);
      expect(entrancePosition).toBe("1,1");
    });

    it("turns a stray entrance symbol of another floor into an empty room", () => {
      const old = [
        ["R001", _00_],
        ["R002", "R003"],
      ];
      const { maze } = resizeMaze(old, 2, 2, "0,0", floors, "2F");
      expect(maze).toEqual([
        ["R001", "O__O"],
        ["R002", "R003"],
      ]);
    });

    it("still places the entrance on the first floor, and moves it to 0,0 there when it falls outside", () => {
      const old = [
        ["R001", "R002", "R003"],
        ["R004", "R005", "R006"],
        ["R007", "R008", _00_],
      ];
      const inside = resizeMaze(old, 3, 3, "2,2", floors, "1F");
      expect(inside.maze[2][2]).toBe(_00_);
      expect(inside.entrancePosition).toBe("2,2");

      const outside = resizeMaze(old, 2, 2, "2,2", floors, "1F");
      expect(outside.maze).toEqual([
        [_00_, "R002"],
        ["R004", "R005"],
      ]);
      expect(outside.entranceOutsideGrid).toBe(true);
      expect(outside.entrancePosition).toBe("0,0");
    });

    it("counts the first floor key as the first floor, so floors named 2F and 3F put it on 2F", () => {
      const upper = { "2F": [], "3F": [] };
      const old = [["R001", "R002"]];
      expect(resizeMaze(old, 1, 2, "0,1", upper, "2F").maze[0][1]).toBe(_00_);
      expect(resizeMaze(old, 1, 2, "0,1", upper, "3F").maze).toEqual(old);
    });
  });

  it("reads a single-grid maze as the one floor 1F for a 'floor,row,col' entrance, with no maze given too", () => {
    const old = [["R001", "R002"], ["R003", "R004"]];
    expect(resizeMaze(old, 2, 2, "0,1,0", [["_"]], "1F").maze[1][0]).toBe(_00_);
    expect(resizeMaze(old, 2, 2, "0,1,0").maze[1][0]).toBe(_00_);
  });

  it("leaves a 'row,col' position as it was when the entrance fits and gives it back as 0,0 when it does not", () => {
    expect(resizeMaze([["R001", "R002"]], 1, 2, "0,1").entrancePosition).toBe("0,1");
    expect(resizeMaze([["R001", "R002"]], 1, 1, "0,1").entrancePosition).toBe("0,0");
  });

  it("treats a position of one or four numbers as outside the grid", () => {
    expect(resizeMaze([["R001", "R002"]], 1, 2, "1").entranceOutsideGrid).toBe(true);
    expect(resizeMaze([["R001", "R002"]], 1, 2, "0,0,1,1").entranceOutsideGrid).toBe(true);
  });

  it("treats a position that is not numbers as outside the grid", () => {
    const { maze, entranceOutsideGrid } = resizeMaze([["R001"]], 1, 1, "a,b");
    expect(maze).toEqual([[_00_]]);
    expect(entranceOutsideGrid).toBe(true);
  });

  it("grows an empty grid into walls with the entrance on it", () => {
    const { maze, entranceOutsideGrid } = resizeMaze([], 2, 2, "1,1");
    expect(maze).toEqual([
      [____, ____],
      [____, _00_],
    ]);
    expect(entranceOutsideGrid).toBe(false);
  });

  it("throws for a grid with no rows because the entrance has no cell to go back to", () => {
    expect(() => resizeMaze([["R001"]], 0, 0, "0,0")).toThrow(TypeError);
  });
});

describe("a 'row,col' entrance in the floor moves", () => {
  const grid: string[][] = [["R001"]];

  it("goes back to 0,0 of the entrance floor when the first floor is the one removed", () => {
    const upper = { "2F": grid, "3F": grid };
    expect(entranceAfterFloorRemoval("1,2", upper, "2F")).toEqual({
      entrancePosition: "0,0,0",
      resetTo: { levelId: "3F", row: 0, col: 0 },
    });
  });

  it("is left alone when another floor is removed", () => {
    const upper = { "2F": grid, "3F": grid };
    expect(entranceAfterFloorRemoval("1,2", upper, "3F")).toEqual({ entrancePosition: "1,2", resetTo: null });
  });
});
