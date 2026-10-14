/**
 * Where the temple's one entrance goes when the Game Master moves it: painting the entrance token on a cell makes that
 * cell the saved entrance (and every other entrance token an empty room), and removing a floor shifts the floor index
 * of an entrance stored as "floor index,row,col" (the index is the floor's place among the maze's floor keys).
 */
import { _00_ } from "@/lib/engine/dungeons/roomTypes";
import { isEntranceToken } from "@/lib/engine/dungeons/SpatialPalette";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { floorKeysOf, floorSlice, getEntranceFloor, writeMazeCell, type MazeData } from "./floorLayers";
import { describeEntrance } from "./mazeReadouts";
import { readEntrancePosition } from "./resizeMaze";
import { isClearableRoomSymbol } from "./roomSymbols";

/** One cell of one floor */
export interface EntranceCell {
  levelId: string;
  row: number;
  col: number;
}

/**
 * The entrance position to save for a cell: "row,col" for a temple that is one grid, else "floor index,row,col" with
 * the floor's place among the maze's floor keys (a floor the maze does not have falls back to "row,col")
 */
export const entrancePositionAt = (maze: MazeData, levelId: string, row: number, col: number): string => {
  if (Array.isArray(maze)) return `${row},${col}`;
  const floorIndex = floorKeysOf(maze).indexOf(levelId);
  return floorIndex < 0 ? `${row},${col}` : `${floorIndex},${row},${col}`;
};

/** Every entrance token in the maze except the one on `row`,`col` of `levelId`, floor by floor, row by row */
export const otherEntranceCells = (maze: MazeData, levelId: string, row: number, col: number): EntranceCell[] => {
  const found: EntranceCell[] = [];
  floorKeysOf(maze).forEach((floorId) => {
    const grid = Array.isArray(maze) ? maze : maze[floorId];
    grid.forEach((cells, r) =>
      cells.forEach((token, c) => {
        const isTheGivenCell = floorId === levelId && r === row && c === col;
        const isAnotherEntrance = isEntranceToken(token) && !isTheGivenCell;
        if (isAnotherEntrance) found.push({ levelId: floorId, row: r, col: c });
      })
    );
  });
  return found;
};

export interface EntranceAfterFloorRemoval {
  /** The entrance position once the floor is gone */
  entrancePosition: string;
  /** Set when the entrance's own floor was the one removed: the cell it went back to, for the caller to put the token on and say so */
  resetTo: EntranceCell | null;
}

/**
 * The entrance position after the floor `removedLevelId` is deleted from `maze` (given as it is before). A "row,col"
 * entrance is a cell of the first floor, floor index 0. A floor removed before the entrance's floor shifts its index down
 * one, and if its own floor is removed it goes back to 0,0 of the entrance floor (the lowest surface floor) of the
 * floors left, the same place a resize puts an entrance that fell outside the grid.
 */
export const entranceAfterFloorRemoval = (
  entrancePosition: string,
  maze: MazeData,
  removedLevelId: string
): EntranceAfterFloorRemoval => {
  const unchanged = { entrancePosition, resetTo: null };
  const position = readEntrancePosition(entrancePosition);
  const floorIndex = position === null ? null : position.floorIndex ?? 0;
  const row = position?.row ?? 0;
  const col = position?.col ?? 0;
  const keys = floorKeysOf(maze);
  const removedIndex = keys.indexOf(removedLevelId);
  const namesNoFloorOfTheMaze = floorIndex === null || removedIndex < 0;
  if (namesNoFloorOfTheMaze) return unchanged;

  const isLaterFloor = floorIndex > removedIndex && floorIndex < keys.length;
  if (isLaterFloor) {
    return { entrancePosition: `${floorIndex - 1},${row},${col}`, resetTo: null };
  }
  const isRemovedFloor = floorIndex === removedIndex;
  if (!isRemovedFloor) return unchanged;

  const floorsLeft = keys.filter((key) => key !== removedLevelId);
  const levelId = getEntranceFloor(floorsLeft);
  const resetFloorIndex = Math.max(floorsLeft.indexOf(levelId), 0);
  return { entrancePosition: `${resetFloorIndex},0,0`, resetTo: { levelId, row: 0, col: 0 } };
};

/** What the entrance moves read and change, in place: the maze, the room records, and the room symbols in use */
export interface EntranceTemple {
  maze: MazeData;
  rooms: Record<string, Room>;
  usedSymbols: Set<string>;
}

/** Makes a new room symbol for a cell of the given type (the temple creator store's generateUniqueSymbol) */
type SymbolMaker = (row: number, col: number, type: string) => string;

/**
 * Puts the entrance token on a cell, replacing the room it held (that room's record goes with it), and makes it the one
 * entrance: every other entrance token, on any floor, becomes an empty room with a new symbol and record. Changes the
 * maze and the room records in place and gives the entrance position to save for the cell.
 */
export const placeEntrance = (temple: EntranceTemple, cell: EntranceCell, makeSymbol: SymbolMaker): string => {
  const { maze, rooms, usedSymbols } = temple;
  const { levelId, row, col } = cell;
  const position = entrancePositionAt(maze, levelId, row, col);
  const held = floorSlice(maze, levelId)[row]?.[col];
  const floorHasNoSuchCell = held === undefined;
  if (floorHasNoSuchCell) return position;

  if (isClearableRoomSymbol(held)) {
    delete rooms[held];
    usedSymbols.delete(held);
  }
  writeMazeCell(maze, levelId, row, col, _00_);

  otherEntranceCells(maze, levelId, row, col).forEach((old) => {
    const symbol = makeSymbol(old.row, old.col, "empty");
    writeMazeCell(maze, old.levelId, old.row, old.col, symbol);
    const symbolIsTaken = Boolean(rooms[symbol]);
    if (!symbolIsTaken) rooms[symbol] = { type: "empty" };
  });
  return position;
};

export interface FloorRemoval {
  /** The entrance position once the floor is gone */
  entrancePosition: string;
  /** The floor to show next: the first one the maze has left */
  nextLevelId: string;
  /** What to tell the Game Master when the entrance had to move, else null */
  notice: string | null;
}

/**
 * Deletes a floor from the temple's maze in place and keeps the entrance true to it: see entranceAfterFloorRemoval.
 * An entrance whose own floor went is put back at 0,0 of the entrance floor (see placeEntrance) and the notice says
 * so. Null, and nothing changed, when the floor cannot go: "1F", a temple that is one grid, or its last floor.
 */
export const removeFloorFrom = (
  temple: EntranceTemple,
  entrancePosition: string,
  levelId: string,
  makeSymbol: SymbolMaker
): FloorRemoval | null => {
  const { maze } = temple;
  const isProtectedFloor = levelId === "1F";
  const isOneGrid = Array.isArray(maze);
  const cannotRemove = isProtectedFloor || isOneGrid;
  if (cannotRemove) return null;
  const isLastFloor = Object.keys(maze).length <= 1;
  if (isLastFloor) return null;

  const after = entranceAfterFloorRemoval(entrancePosition, maze, levelId);
  const { resetTo } = after;
  delete maze[levelId];
  const nextLevelId = Object.keys(maze)[0] || "1F";
  const entranceStayed = resetTo === null;
  if (entranceStayed) return { entrancePosition: after.entrancePosition, nextLevelId, notice: null };

  const moved = placeEntrance(temple, resetTo, makeSymbol);
  const notice = `The entrance was on ${levelId}, which is gone. It is back at ${describeEntrance(moved, maze)}.`;
  return { entrancePosition: moved, nextLevelId, notice };
};
