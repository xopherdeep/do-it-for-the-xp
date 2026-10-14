/**
 * What a temple holds, counted from its maze and room records: the composition panel (room types, key items,
 * monsters), the dungeon stats, the power rating, the monster tiers and the key and lock totals the audit shows.
 */
import { isWallToken } from "@/lib/engine/dungeons/SpatialPalette";
import type { TempleState } from "@/lib/engine/core/dungeons/TempleSystem";
import { chestDungeonItem, grantsBossKey } from "@/lib/services/temples/roomGrants";
import { getItemIcon } from "./templeLookups";
import { isRoom, type DungeonLayout } from "./mazeFloors";

export const buildComposition = (layout: DungeonLayout, getRunState: () => TempleState | undefined) => {
  const result = {
    hasRooms: false,
    roomTypes: [] as { type: string, count: number }[],
    keyItems: [] as { name: string, icon: string, found: boolean }[],
    monsters: [] as { size: string, count: number }[]
  };

  if (!layout?.maze || !layout?.rooms) return result;

  result.hasRooms = true;
  const maze = layout.maze;
  const roomDefs = layout.rooms;
  const sysState = getRunState();

  const monCounts: Record<string, number> = {};
  const roomTypeCounts: Record<string, number> = {};
  const seenKeyItems = new Set<string>();

  const allFloors: string[][][] = [];
  if (Array.isArray(maze)) {
    allFloors.push(maze);
  } else {
    Object.values(maze).forEach(floor => {
      if (Array.isArray(floor)) allFloors.push(floor);
    });
  }

  allFloors.forEach(floor => {
    floor.forEach(row => {
      row.forEach(cellCode => {
        const isWallOrBlankCell = !cellCode || isWallToken(cellCode);
        if (isWallOrBlankCell) return;

        const roomDef = (roomDefs as any)[cellCode];
        if (!roomDef) return;

        const type = roomDef.type;
        const isBlankRoomType = !type || type === 'wall' || type === 'empty';
        if (isBlankRoomType) return;

        roomTypeCounts[type] = (roomTypeCounts[type] || 0) + 1;

        if (type === 'monster') {
          const size = (roomDef.content?.monsterType || 'small').toLowerCase();
          monCounts[size] = (monCounts[size] || 0) + 1;
        } else if (type === 'boss') {
          monCounts['boss'] = (monCounts['boss'] || 0) + 1;
        } else if (type === 'miniboss') {
          monCounts['miniboss'] = (monCounts['miniboss'] || 0) + 1;
        }

        // Only what play hands out counts (roomGrants): a Dungeon Item chest, or the master's Key room; a key written
        // into a mini-boss room's chest is never given
        const dungeonItem = grantsBossKey(roomDef) ? 'master-key' : chestDungeonItem(roomDef);
        if (dungeonItem) {
          // The key to the boss door is the Boss Key to a parent; its id stays `master-key` and the run state `hasMasterKey`
          const isBossKey = dungeonItem === 'master-key';
          const itemName = isBossKey ? 'Boss Key' : dungeonItem.charAt(0).toUpperCase() + dungeonItem.slice(1);

          if (!seenKeyItems.has(itemName.toLowerCase())) {
            seenKeyItems.add(itemName.toLowerCase());
            const found = sysState?.[isBossKey ? 'hasMasterKey' : `has${itemName}`] || false;
            result.keyItems.push({
              name: itemName,
              icon: getItemIcon(dungeonItem),
              found
            });
          }
        }
      });
    });
  });

  Object.entries(roomTypeCounts).forEach(([type, count]) => {
    if (count > 0) result.roomTypes.push({ type, count });
  });

  Object.entries(monCounts).forEach(([size, count]) => {
    if (count > 0) result.monsters.push({ size, count });
  });

  return result;
};

/** Rooms, visited rooms and treasures of a layout; `maze` is the grid the preview draws */
export const countDungeonStats = (layout: NonNullable<DungeonLayout>, maze: string[][] | null) => {
  let totalRooms = 0;
  let visitedRooms = 0;
  let totalTreasures = 0;
  let foundTreasures = 0;

  const hasSingleFloorMaze = !!maze && Array.isArray(maze);
  if (hasSingleFloorMaze) {
    maze.forEach(row => {
      row.forEach(cell => {
        if (isRoom(cell)) totalRooms++;
      });
    });
  }

  if (layout.rooms) {
    Object.values(layout.rooms).forEach((room: any) => {
      if (room.visited) visitedRooms++;
      const isTreasureRoom = room.type === 'chest' || room.type === 'treasure' || room.type === 'loot';
      if (isTreasureRoom) {
        totalTreasures++;
        const isTreasureFound = !!(room.opened || room.visited);
        if (isTreasureFound) foundTreasures++;
      }
    });
  }

  return {
    totalRooms: totalRooms || (layout.rooms ? Object.keys(layout.rooms).length : 0),
    visitedRooms,
    totalTreasures,
    foundTreasures
  };
};

export const rateTemplePower = (level: number, monResult: { size: string, count: number }[]) => {
  let monsterStrength = 0;
  monResult.forEach(m => {
    const size = m.size;
    const count = m.count;
    if (size === 'small') monsterStrength += count * 0.5;
    else if (size === 'medium') monsterStrength += count * 1;
    else if (size === 'large') monsterStrength += count * 2;
    else if (size === 'miniboss') monsterStrength += count * 5;
    else if (size === 'boss') monsterStrength += count * 10;
  });
  return Math.min(100, Math.round(level * 10 + monsterStrength * 0.5));
};

export const filterMonstersByTier = (monsters: { size: string, count: number }[], tier: 'boss' | 'miniboss' | 'other') => {
  if (tier === 'boss') {
    return monsters.filter(m => m.size === 'boss');
  } else if (tier === 'miniboss') {
    return monsters.filter(m => m.size === 'miniboss');
  } else {
    return monsters.filter(m => !['boss', 'miniboss'].includes(m.size));
  }
};

/** Key chests and locked doors among the room records; a locked door shows on both rooms that share the edge, so the lock count is halved */
export const countKeysAndLocks = (rooms: Record<string, any>) => {
  let totalKeys = 0;
  let totalLockedDoors = 0;

  Object.values(rooms).forEach((room: any) => {
    const isKeyChest = chestDungeonItem(room) === 'key';
    if (isKeyChest) totalKeys++;

    // Check locked doors
    if (room.sides) {
      Object.values(room.sides).forEach(side => {
        if (side === 'locked') totalLockedDoors++;
      });
    }
  });

  // Locked doors are counted twice (once per room sharing the edge)
  // Except for edges leading outside which shouldn't happen for 'locked' type usually
  const actualLocks = Math.ceil(totalLockedDoors / 2);

  return { totalKeys, actualLocks };
};
