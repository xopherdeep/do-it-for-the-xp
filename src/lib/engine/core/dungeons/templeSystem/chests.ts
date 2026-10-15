/**
 * The chests of a temple run: opening one, taking part of it, and remembering it emptied with the hero's progress.
 * TempleSystem's chest methods delegate here; each one documents its contract.
 */

import { roomPositionKey } from '../DungeonManager';
import type { TempleRuns } from './runState';

export function takeFromChest(runs: TempleRuns, templeId: string, level: string, position: [number, number], items: string[]): boolean {
  const emptied = runs.dungeonManager.removeItemsFromRoomChest(templeId, position, items, level);
  const templeState = runs.templeStates[templeId];
  if (templeState) {
    if (!templeState.takenFromChests) templeState.takenFromChests = new Set<string>();
    const room = roomPositionKey(level, position);
    for (const key of Array.from(templeState.takenFromChests)) {
      const isLeftoverOfEmptiedChest = emptied && key.startsWith(`${room}>`);
      if (isLeftoverOfEmptiedChest) templeState.takenFromChests.delete(key);
    }
    if (!emptied) items.forEach(item => templeState.takenFromChests?.add(`${room}>${item}`));
  }

  if (emptied) {
    runs.dungeonManager.updateRoom(templeId, position, { isEmpty: true }, level);
    markChestOpened(runs, templeId, level, position);
  } else {
    runs.queueSave(templeId);
  }
  return emptied;
}

export function markChestOpened(runs: TempleRuns, templeId: string, level: string, position: [number, number]): void {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return;

  if (!templeState.openedChests) templeState.openedChests = new Set<string>();
  templeState.openedChests.add(roomPositionKey(level, position));
  runs.queueSave(templeId);
}

interface ChestOpenResult {
  items?: string[];
  specialItem?: string;
  keyFound?: boolean;
  mapFound?: boolean;
  compassFound?: boolean;
}

export function openChest(runs: TempleRuns, templeId: string) {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return undefined;
  
  const chestContent = runs.dungeonManager.openChestInRoom(
    templeId,
    templeState.currentPosition,
    templeState.currentLevel
  );
  
  if (!chestContent) return undefined;
  
  const result: ChestOpenResult = {};
  
  // Process items
  if (chestContent.items?.length) {
    result.items = chestContent.items;
    
    // Check for special items
    chestContent.items.forEach(item => {
      if (item === 'key') {
        templeState.playerKeys++;
        result.keyFound = true;
      }
    });
    
    // Remove the items from the chest
    runs.dungeonManager.removeItemsFromRoomChest(
      templeId,
      templeState.currentPosition,
      chestContent.items,
      templeState.currentLevel
    );
  }
  
  // Process dungeon special item
  if (chestContent.dungeon) {
    if (chestContent.dungeon === 'map') {
      templeState.hasMap = true;
      result.mapFound = true;
    } else if (chestContent.dungeon === 'compass') {
      templeState.hasCompass = true;
      result.compassFound = true;
    } else {
      result.specialItem = chestContent.dungeon;
    }
    
    // Remove the dungeon item from the chest
    runs.dungeonManager.removeItemsFromRoomChest(
      templeId,
      templeState.currentPosition,
      [chestContent.dungeon],
      templeState.currentLevel
    );
  }

  // Keys, the map and the compass are part of the hero's progress
  runs.queueSave(templeId);

  return result;
}
