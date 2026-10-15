/**
 * What is placed in a temple's maze, cell by cell: every battle room with its beasts for the Beasts tab, and the
 * item map (rooms, key items, the boss, the entrance and locked edges) for the Layout tab.
 */
import type { Beast } from "@/lib/databases/BestiaryDb";
import { isRoom, type DungeonLayout } from "./mazeFloors";

export interface TempleBeast {
  beast: Beast | null;
  beastId: string;
  tier: 'boss' | 'miniboss' | 'monster';
  roomSymbol: string;
  floor: string;
  row: number;
  col: number;
}

// Get beasts with full details for this temple
export const listTempleBeasts = (layout: DungeonLayout, allBeasts: Beast[]): TempleBeast[] => {
  const result: TempleBeast[] = [];

  const maze = layout?.maze;
  const roomDefs = layout?.rooms;
  const isMissingLayout = !maze || !roomDefs;
  if (isMissingLayout) {
    return result;
  }

  const processFloor = (grid: string[][], floorId: string) => {
    grid.forEach((row, rowIndex) => {
      row.forEach((cellSymbol, colIndex) => {
        if (!isRoom(cellSymbol)) return;

        const roomData = (roomDefs as any)[cellSymbol];
        if (!roomData) return;

        const type = roomData.type;
        let tier: 'boss' | 'miniboss' | 'monster' | null = null;

        if (type === 'boss') tier = 'boss';
        else if (type === 'miniboss') tier = 'miniboss';
        else if (type === 'monster') tier = 'monster';

        if (!tier) return;

        // Get beast IDs from room content
        const beastIds = roomData.content?.beasts || [];

        beastIds.forEach((beastId: string) => {
          const beast = allBeasts.find(b => b.id === beastId) || null;
          result.push({
            beast,
            beastId,
            tier,
            roomSymbol: cellSymbol,
            floor: floorId,
            row: rowIndex,
            col: colIndex
          });
        });

        // If no specific beasts but room is a battle type, add placeholder
        const shouldAddPlaceholder = beastIds.length === 0 && !!tier;
        if (shouldAddPlaceholder) {
          result.push({
            beast: null,
            beastId: '',
            tier,
            roomSymbol: cellSymbol,
            floor: floorId,
            row: rowIndex,
            col: colIndex
          });
        }
      });
    });
  };

  if (Array.isArray(maze)) {
    processFloor(maze, '1F');
  } else {
    Object.entries(maze).forEach(([floorId, grid]) => {
      processFloor(grid as string[][], floorId);
    });
  }

  // Sort: bosses first, then minibosses, then monsters
  const tierOrder = { boss: 0, miniboss: 1, monster: 2 };
  return result.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
};

export const buildItemMapData = (layout: DungeonLayout) => {
  const maze = layout?.maze;
  const roomDefs = layout?.rooms;
  const isMissingLayout = !maze || !roomDefs;
  if (isMissingLayout) return {};

  const result: Record<string, any[][]> = {};

  const processGrid = (grid: string[][]) => {
    return grid.map((row) => row.map((cellSymbol) => {
      if (!isRoom(cellSymbol)) {
        return { isRoom: false };
      }

      const room = (roomDefs as any)[cellSymbol];
      const lockedEdges = {
        north: room?.sides?.north === 'locked',
        east: room?.sides?.east === 'locked',
        south: room?.sides?.south === 'locked',
        west: room?.sides?.west === 'locked'
      };

      return {
        isRoom: true,
        item: room?.type === 'loot' ? (room.content?.dungeon || null) : null,
        isBoss: room?.type === 'boss',
        isEntrance: room?.type === 'entrance',
        lockedEdges: lockedEdges
      };
    }));
  };

  if (Array.isArray(maze)) {
    result['1F'] = processGrid(maze);
  } else {
    Object.entries(maze).forEach(([floorId, grid]) => {
      result[floorId] = processGrid(grid as string[][]);
    });
  }

  return result;
};
