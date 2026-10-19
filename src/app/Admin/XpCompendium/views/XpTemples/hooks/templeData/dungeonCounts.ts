/**
 * What a temple holds, counted from its maze and room records: the composition panel (room types, key items,
 * monsters), the dungeon stats, the power rating, the monster tiers and the key and lock totals the audit shows.
 */
import { isWallToken } from "@/lib/engine/dungeons/SpatialPalette";
import type { TempleState } from "@/lib/engine/core/dungeons/TempleSystem";
import { grantedDungeonItems, grantsBossKey, smallKeysGranted } from "@/lib/services/temples/roomGrants";
import { getItemIcon } from "./templeLookups";
import { isRoom, type DungeonLayout } from "./mazeFloors";

export const buildComposition = (layout: DungeonLayout, getRunState: () => TempleState | undefined) => {
  const result = {
    hasRooms: false,
    roomTypes: [] as { type: string, count: number }[],
    keyItems: [] as { name: string, icon: string, found: boolean }[],
    monsters: [] as { size: string, count: number }[]
  };

  const maze = layout?.maze;
  const roomDefs = layout?.rooms;
  const isMissingLayout = !maze || !roomDefs;
  if (isMissingLayout) return result;

  result.hasRooms = true;
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

        // Only what play hands out counts (roomGrants): a Dungeon Item chest, a fight room's drop, or the master's Key
        // room; a key written into a mini-boss room's chest is never given
        const dungeonItems = grantedDungeonItems(roomDef);
        const isMasterKeyRoom = grantsBossKey(roomDef) && !dungeonItems.includes('master-key');
        if (isMasterKeyRoom) dungeonItems.unshift('master-key');
        dungeonItems.forEach(dungeonItem => {
          // The key to the boss door is the Boss Key to a parent; its id stays `master-key` and the run state `hasMasterKey`
          const isBossKey = dungeonItem === 'master-key';
          const itemName = isBossKey ? 'Boss Key' : dungeonItem.charAt(0).toUpperCase() + dungeonItem.slice(1);

          const isFirstSighting = !seenKeyItems.has(itemName.toLowerCase());
          if (isFirstSighting) {
            seenKeyItems.add(itemName.toLowerCase());
            const found = sysState?.[isBossKey ? 'hasMasterKey' : `has${itemName}`] || false;
            result.keyItems.push({
              name: itemName,
              icon: getItemIcon(dungeonItem),
              found
            });
          }
        });
      });
    });
  });

  Object.entries(roomTypeCounts).forEach(([type, count]) => {
    const hasAnyRoom = count > 0;
    if (hasAnyRoom) result.roomTypes.push({ type, count });
  });

  Object.entries(monCounts).forEach(([size, count]) => {
    const hasAnyMonster = count > 0;
    if (hasAnyMonster) result.monsters.push({ size, count });
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

  const rooms = layout.rooms;
  if (rooms) {
    Object.values(rooms).forEach((room: any) => {
      const isVisited = Boolean(room.visited);
      if (isVisited) visitedRooms++;
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
  const isBossTier = tier === 'boss';
  const isMinibossTier = tier === 'miniboss';
  if (isBossTier) {
    return monsters.filter(m => m.size === 'boss');
  } else if (isMinibossTier) {
    return monsters.filter(m => m.size === 'miniboss');
  } else {
    return monsters.filter(m => !['boss', 'miniboss'].includes(m.size));
  }
};

/**
 * Small keys play hands out (roomGrants.smallKeysGranted: key chests, Key rooms, a loot room's "key" rows) and locked
 * doors among the room records; a locked door shows on both rooms that share the edge, so the lock count is halved.
 * A record drawn by several cells counts once.
 */
export const countKeysAndLocks = (rooms: Record<string, any>) => {
  let totalKeys = 0;
  let totalLockedDoors = 0;

  Object.values(rooms).forEach((room: any) => {
    totalKeys += smallKeysGranted(room);

    // Check locked doors
    const sides = room.sides;
    if (sides) {
      Object.values(sides).forEach(side => {
        const isLocked = side === 'locked';
        if (isLocked) totalLockedDoors++;
      });
    }
  });

  // Locked doors are counted twice (once per room sharing the edge)
  // Except for edges leading outside which shouldn't happen for 'locked' type usually
  const actualLocks = Math.ceil(totalLockedDoors / 2);

  return { totalKeys, actualLocks };
};
