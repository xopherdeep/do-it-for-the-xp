/**
 * One Room per cell. A layout may draw many cells with one token (the temple creator's palette does), but the engine
 * writes into a room as it is played: a fight seals its doors, a key door opens, a chest gets its id and is emptied.
 * Cells that shared a token would share all of that. So at registration every cell whose token another room cell
 * draws too takes a token of its own, the engine's own floor:row,col (roomPositionKey), and a copy of the room.
 * A token only one cell draws (the generator's, most of the shipped temples') is already its own and stays.
 */

import { roomPositionKey } from './DungeonManager';
import type { Room } from './types';

type Maze = string[][] | Record<string, string[][]>;

/** A wall and a void are never played in or written to, so every cell that draws one may keep the token it was drawn with. */
const isStructure = (room: Room): boolean => room.type === 'wall' || room.type === 'void';

const copyOf = (room: Room): Room => JSON.parse(JSON.stringify(room));

const gridsOf = (maze: Maze): string[][][] => (Array.isArray(maze) ? [maze] : Object.values(maze));

/**
 * @param maze One grid of room tokens ("1F"), or a grid per floor
 * @param rooms What each token is
 * @returns The same layout in which no two room cells share a token, so none share a Room. A wall, a void, a cell that
 *   names no room and a room no cell draws are as they were. The layout it was given is not touched.
 */
export function roomsPerCell(maze: Maze, rooms: Record<string, Room>): { maze: Maze; rooms: Record<string, Room> } {
  const isRoomToken = (token: string): boolean => Boolean(token) && rooms[token] !== undefined && !isStructure(rooms[token]);

  const cellsDrawing = new Map<string, number>();
  for (const grid of gridsOf(maze)) {
    for (const row of grid) {
      for (const token of row) if (isRoomToken(token)) cellsDrawing.set(token, (cellsDrawing.get(token) ?? 0) + 1);
    }
  }

  const perCell: Record<string, Room> = {};
  const replaced = new Set<string>();

  const rewrite = (floor: string, grid: string[][]): string[][] =>
    grid.map((row, r) =>
      row.map((token, c) => {
        const isShared = (cellsDrawing.get(token) ?? 0) > 1;
        if (!isShared) return token;

        const own = roomPositionKey(floor, [r, c]);
        perCell[own] = copyOf(rooms[token]);
        replaced.add(token);
        return own;
      })
    );

  const rewritten: Maze = Array.isArray(maze)
    ? rewrite('1F', maze)
    : Object.fromEntries(Object.entries(maze).map(([floor, grid]) => [floor, rewrite(floor, grid)]));

  // A token no cell draws any more has no one to be played by
  const kept = Object.fromEntries(Object.entries(rooms).filter(([token]) => !replaced.has(token)));
  return { maze: rewritten, rooms: { ...kept, ...perCell } };
}
