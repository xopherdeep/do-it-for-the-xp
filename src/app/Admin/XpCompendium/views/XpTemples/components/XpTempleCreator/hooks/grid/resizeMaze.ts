/**
 * Maze grids for the temple editor: the starting grid of walls with the entrance in place, and resizing a floor's
 * grid while keeping what it already holds.
 */
import { _00_ } from "@/lib/engine/dungeons/roomTypes";
import { blankGrid, floorKeysOf, type MazeData } from "./floorLayers";
import { roomSymbols } from "./roomSymbols";

export const isInsideGrid = (row: number, col: number, rows: number, cols: number): boolean =>
  row >= 0 && row < rows && col >= 0 && col < cols;

const placeFlatEntrance = (grid: string[][], parts: number[], rows: number, cols: number): void => {
  const [eRow, eCol] = parts;
  if (isInsideGrid(eRow, eCol, rows, cols)) {
    grid[eRow][eCol] = _00_;
  }
};

const placeFloorEntrance = (
  grid: string[][],
  parts: number[],
  rows: number,
  cols: number,
  maze: MazeData,
  currentLevelId: string
): void => {
  const floorKeys = floorKeysOf(maze);
  if (floorKeys[parts[0]] === currentLevelId) {
    if (isInsideGrid(parts[1], parts[2], rows, cols)) {
      grid[parts[1]][parts[2]] = _00_;
    }
  }
};

/**
 * A grid of walls for a "RxC" grid size with the entrance on it: `entrancePosition` is "row,col" (any floor) or
 * "floor index,row,col" (placed only when that floor is the current one).
 */
export const buildInitialMaze = (
  gridSize: string,
  entrancePosition: string,
  maze: MazeData,
  currentLevelId: string
): string[][] => {
  const [rows, cols] = gridSize.split("x").map(Number);
  const newGrid = blankGrid(rows, cols);

  const parts = entrancePosition.split(",").map(Number);
  if (parts.length === 2) {
    placeFlatEntrance(newGrid, parts, rows, cols);
  } else if (parts.length === 3) {
    placeFloorEntrance(newGrid, parts, rows, cols, maze, currentLevelId);
  }

  return newGrid;
};

export interface ResizedMaze {
  maze: string[][];
  /** True when the entrance fell outside the new grid: it was put back at 0,0 and the caller must say so */
  entranceOutsideGrid: boolean;
}

/**
 * A copy of `mazeData` at the new size: cells inside the old grid keep their symbol, the rest are walls. An old
 * entrance symbol that is not on the entrance cell becomes an empty room, and the entrance cell itself is placed
 * (or reset to 0,0 when it fell outside the new grid).
 */
export const resizeMaze = (
  mazeData: string[][],
  newRows: number,
  newCols: number,
  entrancePosition: string
): ResizedMaze => {
  const oldMaze: string[][] = JSON.parse(JSON.stringify(mazeData));
  const oldRows = oldMaze.length;
  const oldCols = oldMaze[0]?.length || 0;

  const newMaze = blankGrid(newRows, newCols);

  for (let i = 0; i < newRows; i++) {
    for (let j = 0; j < newCols; j++) {
      const isInsideOldMaze = i < oldRows && j < oldCols;
      if (isInsideOldMaze) {
        const oldSymbol = oldMaze[i][j];
        if (oldSymbol !== _00_) {
          newMaze[i][j] = oldSymbol;
        } else {
          const [entranceRow, entranceCol] = entrancePosition
            .split(",")
            .map(Number);
          const isNotEntranceCell = i !== entranceRow || j !== entranceCol;
          if (isNotEntranceCell) {
            newMaze[i][j] = roomSymbols["empty"];
          }
        }
      }
    }
  }

  const [entranceRow, entranceCol] = entrancePosition
    .split(",")
    .map(Number);
  const isEntranceInsideGrid = isInsideGrid(entranceRow, entranceCol, newRows, newCols);
  if (isEntranceInsideGrid) {
    newMaze[entranceRow][entranceCol] = _00_;
  } else {
    newMaze[0][0] = _00_;
  }

  return { maze: newMaze, entranceOutsideGrid: !isEntranceInsideGrid };
};
