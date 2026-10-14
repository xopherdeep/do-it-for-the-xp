/**
 * Maze grids for the temple editor: the starting grid of walls with the entrance in place, and resizing a floor's
 * grid while keeping what it already holds.
 */
import { _00_ } from "@/lib/engine/dungeons/roomTypes";
import { blankGrid, floorKeysOf, type MazeData } from "./floorLayers";
import { isWholeNumberAtLeastOne, readGridSize, STARTING_GRID } from "./gridSize";
import { roomSymbols } from "./roomSymbols";

export const isInsideGrid = (row: number, col: number, rows: number, cols: number): boolean =>
  row >= 0 && row < rows && col >= 0 && col < cols;

/** An entrance position read out: "row,col" names no floor, "floor index,row,col" names one by its place among the maze's floors */
export interface EntrancePosition {
  floorIndex: number | null;
  row: number;
  col: number;
}

/** Reads a "row,col" or "floor index,row,col" position; null for anything else (the numbers themselves may be NaN) */
export const readEntrancePosition = (entrancePosition: string): EntrancePosition | null => {
  const parts = entrancePosition.split(",").map(Number);
  if (parts.length === 2) return { floorIndex: null, row: parts[0], col: parts[1] };
  if (parts.length === 3) return { floorIndex: parts[0], row: parts[1], col: parts[2] };
  return null;
};

/**
 * Whether the position puts the entrance on `levelId`. "row,col" is a cell of the FIRST floor of the maze (the game's
 * startAt starts the hero there; it is not on every floor), "floor index,row,col" is on the floor at that place in the
 * maze's floor keys (the multi-floor temples the game ships store it this way)
 */
const isOnFloor = (position: EntrancePosition, maze: MazeData, levelId: string): boolean => {
  const floorKeys = floorKeysOf(maze);
  if (position.floorIndex === null) {
    // A maze that lists no floor yet has only the floor on show to put it on
    const hasNoFloorsListed = floorKeys.length === 0;
    return hasNoFloorsListed || floorKeys[0] === levelId;
  }
  return floorKeys[position.floorIndex] === levelId;
};

/** The entrance's cell on one floor; null when the position is not a position or names another floor */
export const entranceCellOnFloor = (
  entrancePosition: string,
  maze: MazeData,
  levelId: string
): { row: number; col: number } | null => {
  const position = readEntrancePosition(entrancePosition);
  if (!position || !isOnFloor(position, maze, levelId)) return null;
  return { row: position.row, col: position.col };
};

/**
 * A grid of walls for a "RxC" grid size with the entrance on it: `entrancePosition` is "row,col" (the first floor) or
 * "floor index,row,col" (placed only when that floor is the current one).
 */
export const buildInitialMaze = (
  gridSize: string,
  entrancePosition: string,
  maze: MazeData,
  currentLevelId: string
): string[][] => {
  const { rows, cols } = readGridSize(gridSize) ?? STARTING_GRID;
  const newGrid = blankGrid(rows, cols);

  const cell = entranceCellOnFloor(entrancePosition, maze, currentLevelId);
  if (cell && isInsideGrid(cell.row, cell.col, rows, cols)) {
    newGrid[cell.row][cell.col] = _00_;
  }

  return newGrid;
};

export interface ResizedMaze {
  maze: string[][];
  /** True when the entrance fell outside the new grid: it was put back at 0,0 and the caller must say so */
  entranceOutsideGrid: boolean;
  /** The entrance position afterwards: as given, but an entrance that fell outside is at 0,0 (of its own floor) */
  entrancePosition: string;
}

/**
 * A copy of `mazeData` (the grid of the floor `currentLevelId`) at the new size: cells inside the old grid keep their
 * symbol, the rest are walls. An old entrance symbol that is not on the entrance cell becomes an empty room, and the
 * entrance cell itself is placed (or reset to 0,0 when it fell outside the new grid). An entrance that is on another
 * floor places nothing here, and a "row,col" one is on the first floor only. `maze` is the whole temple, to tell which
 * floor a position names. A size that is not a grid (no rows or columns, a negative, NaN) changes nothing: the copy
 * comes back as it was.
 */
export const resizeMaze = (
  mazeData: string[][],
  newRows: number,
  newCols: number,
  entrancePosition: string,
  maze: MazeData = [],
  currentLevelId = "1F"
): ResizedMaze => {
  const oldMaze: string[][] = JSON.parse(JSON.stringify(mazeData));
  const oldRows = oldMaze.length;
  const oldCols = oldMaze[0]?.length || 0;

  const isSizeThatIsNotAGrid = !isWholeNumberAtLeastOne(newRows) || !isWholeNumberAtLeastOne(newCols);
  if (isSizeThatIsNotAGrid) {
    return { maze: oldMaze, entranceOutsideGrid: false, entrancePosition };
  }

  const position = readEntrancePosition(entrancePosition);
  const isOnOtherFloor = position !== null && !isOnFloor(position, maze, currentLevelId);
  const entranceCell = position !== null && !isOnOtherFloor ? position : null;

  const newMaze = blankGrid(newRows, newCols);

  for (let i = 0; i < newRows; i++) {
    for (let j = 0; j < newCols; j++) {
      const isInsideOldMaze = i < oldRows && j < oldCols;
      if (isInsideOldMaze) {
        const oldSymbol = oldMaze[i][j];
        if (oldSymbol !== _00_) {
          newMaze[i][j] = oldSymbol;
        } else {
          const isNotEntranceCell = !entranceCell || i !== entranceCell.row || j !== entranceCell.col;
          if (isNotEntranceCell) {
            newMaze[i][j] = roomSymbols["empty"];
          }
        }
      }
    }
  }

  if (isOnOtherFloor) {
    return { maze: newMaze, entranceOutsideGrid: false, entrancePosition };
  }

  if (entranceCell && isInsideGrid(entranceCell.row, entranceCell.col, newRows, newCols)) {
    newMaze[entranceCell.row][entranceCell.col] = _00_;
    return { maze: newMaze, entranceOutsideGrid: false, entrancePosition };
  }

  newMaze[0][0] = _00_;
  const origin = position?.floorIndex == null ? "0,0" : `${position.floorIndex},0,0`;
  return { maze: newMaze, entranceOutsideGrid: true, entrancePosition: origin };
};
