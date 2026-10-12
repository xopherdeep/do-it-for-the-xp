/**
 * Reading a temple's maze for the Game Master screens: which floor the preview shows and which cells are rooms.
 * A maze is one grid (a single floor, called 1F) or a map of floor id to grid.
 */
import { VOID as ROOM_VOID } from "@/lib/engine/dungeons/roomTypes";
import { isWallToken } from "@/lib/engine/dungeons/SpatialPalette";
import type { TempleInterface } from "@/lib/databases/TempleDb";

export type DungeonLayout = TempleInterface["dungeonLayout"];

/** The grid the preview draws: the only grid, else floor 1F, else the first floor; null when there is no maze */
export const pickPreviewMaze = (layout: DungeonLayout) => {
  if (!layout || !layout.maze) return null;

  const maze = layout.maze;

  if (!Array.isArray(maze)) {
    if (maze['1F']) return maze['1F'];
    const floors = Object.keys(maze);
    if (floors.length > 0) return maze[floors[0]];
    return null;
  }

  return maze;
};

export const isRoom = (cell: string) => {
  const isNonRoomCell = !cell || isWallToken(cell) || cell === ROOM_VOID;
  if (isNonRoomCell) return false;
  // Anything that's not a wall or void is a room
  // This supports legacy single-char tokens (s, k, O, B, E, etc.)
  return true;
};
