/**
 * Neighbour links for the temple editor: which of a room's four neighbours exist, the cell next to a room in a
 * direction, the order the room pages walk through, and keeping the two sides of a shared door the same.
 */
import { isWallToken } from "@/lib/engine/dungeons/SpatialPalette";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { defaultSides, type AdjacentRooms } from "./doorSides";
import { isCoordinateToken } from "./roomSymbols";

export const noAdjacentRooms = (): AdjacentRooms => ({
  north: false,
  east: false,
  south: false,
  west: false,
});

/** True when the maze has a grid and (r, c) is a cell inside it */
export const canLocateRoom = (maze: string[][], r: number, c: number): boolean => {
  const isMazeUnusable = !maze || !maze.length || !maze[0];
  const areCoordsInvalid = isNaN(r) || isNaN(c) || r < 0 || c < 0;
  const cannotLocateRoom = isMazeUnusable || areCoordsInvalid;
  if (cannotLocateRoom) {
    return false;
  }

  const rows = maze.length;
  const cols = maze[0]?.length || 0;

  const isOutsideMaze = r >= rows || c >= cols;
  if (isOutsideMaze) {
    return false;
  }

  return true;
};

/** Which neighbours of (r, c) exist; call only for a cell `canLocateRoom` accepts */
export const computeAdjacency = (maze: string[][], r: number, c: number): AdjacentRooms => {
  const rows = maze.length;
  const cols = maze[0]?.length || 0;

  return {
    north: r > 0 && !!maze[r - 1],
    east: c < cols - 1 && !!maze[r][c + 1],
    south: r < rows - 1 && !!maze[r + 1],
    west: c > 0 && !!maze[r][c - 1]
  };
};

/** Edge-to-wall normalization: a side with no neighbour must be a wall in the data */
export const wallOffMissingSides = (
  sides: Record<string, string>,
  adjacentRooms: AdjacentRooms
): void => {
  Object.keys(adjacentRooms).forEach(dir => {
    if (!adjacentRooms[dir as keyof AdjacentRooms]) {
      sides[dir] = 'wall';
    }
  });
};

/** The side of a neighbour that faces back at us */
export const getOppositeDirection = (dir: string): string => {
  const opposites: Record<string, string> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east'
  };
  return opposites[dir] || dir;
};

/** The cell next to (r, c) in a direction, or null at the edge of the grid */
export const getAdjacentCoords = (
  r: number,
  c: number,
  dir: string,
  rows: number,
  cols: number
): { row: number; col: number } | null => {
  switch (dir) {
    case 'north': return r > 0 ? { row: r - 1, col: c } : null;
    case 'south': return r < rows - 1 ? { row: r + 1, col: c } : null;
    case 'east': return c < cols - 1 ? { row: r, col: c + 1 } : null;
    case 'west': return c > 0 ? { row: r, col: c - 1 } : null;
    default: return null;
  }
};

/** True when the symbol is a room whose record says it is a wall */
export const isWallRoom = (
  symbol: string | null | undefined,
  roomsData: Record<string, Room>
): boolean => !!symbol && roomsData[symbol]?.type === 'wall';

/** Every cell that is a room (not a wall), in reading order: the order the prev and next buttons walk */
export const navigableCells = (
  maze: string[][],
  roomsData: Record<string, Room>
): { row: number; col: number }[] => {
  const coords: { row: number; col: number }[] = [];
  for (let r = 0; r < maze.length; r++) {
    for (let c = 0; c < (maze[r]?.length || 0); c++) {
      const symbol = maze[r][c];
      const isNavigableRoom = !!symbol && roomsData[symbol]?.type !== 'wall';
      if (isNavigableRoom) {
        coords.push({ row: r, col: c });
      }
    }
  }
  return coords;
};

/**
 * Bidirectional edge sync: if (r, c) sets north=locked, its northern neighbour's south side becomes locked too.
 * Walls and missing cells are skipped so they never turn into empty rooms, and a shared token without a record of
 * its own is skipped rather than given one. Writes into `roomsData` and returns nothing.
 */
const syncNeighbourSide = (
  maze: string[][],
  r: number,
  c: number,
  dir: string,
  edgeType: string,
  roomsData: Record<string, Room>
): void => {
  const rows = maze.length;
  const cols = maze[0]?.length || 0;

  const adjCoords = getAdjacentCoords(r, c, dir, rows, cols);
  if (!adjCoords) return;

  const neighborSymbol = maze[adjCoords.row]?.[adjCoords.col];
  const isNeighborWallOrMissing = !neighborSymbol || isWallToken(neighborSymbol);
  if (isNeighborWallOrMissing) return;

  if (!roomsData[neighborSymbol]) {
    if (!isCoordinateToken(neighborSymbol)) return;

    roomsData[neighborSymbol] = { type: 'empty' };
  }

  const neighborRoom = roomsData[neighborSymbol];
  if (!neighborRoom.sides) {
    neighborRoom.sides = defaultSides();
  }

  const oppositeDir = getOppositeDirection(dir);
  neighborRoom.sides[oppositeDir] = edgeType;
};

export const syncNeighbourSides = (
  maze: string[][],
  r: number,
  c: number,
  sides: Record<string, string>,
  roomsData: Record<string, Room>
): void => {
  const directions = ['north', 'south', 'east', 'west'] as const;

  for (const dir of directions) {
    const edgeType = sides[dir];
    if (!edgeType) continue;

    syncNeighbourSide(maze, r, c, dir, edgeType, roomsData);
  }
};
