/**
 * Characterization of the maze grid builders the temple creator uses (hooks/grid/resizeMaze): the starting grid
 * with the entrance in place and resizing a floor's grid while keeping what it already holds.
 */
import { _00_, ____ } from "@/lib/engine/dungeons/roomTypes";
import {
  buildInitialMaze,
  isInsideGrid,
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

  it("reads the first two numbers of a 'floor,row,col' position as row and col", () => {
    const old = [
      ["R001", "R002", "R003"],
      ["R004", "R005", "R006"],
    ];
    const { maze, entranceOutsideGrid } = resizeMaze(old, 2, 3, "0,1,2");
    expect(maze[0][1]).toBe(_00_);
    expect(entranceOutsideGrid).toBe(false);
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
