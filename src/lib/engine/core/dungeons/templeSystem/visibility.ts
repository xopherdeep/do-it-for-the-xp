/**
 * What the temple map shows of a room: the map and the compass, how much of each room is visible, and its icon.
 * TempleSystem's map methods delegate here; each one documents its contract.
 */

import { hasVisited } from './runState';
import type { TempleRuns } from './runState';

// Map Visibility Types
export enum MapVisibility {
  NONE = 'none',           // Room not visible (no map)
  LAYOUT_ONLY = 'layout',  // Layout only visible (have map, no compass, not visited)
  FULL_DETAILS = 'full'    // Full details visible (visited or have compass)
}

export function grantMapAndCompass(runs: TempleRuns, templeId: string): boolean {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return false;

  templeState.hasMap = true;
  templeState.hasCompass = true;
  runs.queueSave(templeId);
  return true;
}

export function getRoomVisibility(runs: TempleRuns, templeId: string, position: [number, number]): MapVisibility {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return MapVisibility.NONE;
  
  // Room not shown if player doesn't have map
  if (!templeState.hasMap) return MapVisibility.NONE;
  
  // Get the room to check if it's a wall
  const room = runs.dungeonManager.getRoom(templeId, position, templeState.currentLevel);
  
  // Always show walls when the player has the map (even if not visited)
  if (room?.type === 'wall') {
    return MapVisibility.LAYOUT_ONLY;
  }
  
  // Check if room has been visited
  const isVisited = hasVisited(runs, templeId, position);

  // A secret chamber stays off the map, compass or not, until the hero has stood in it
  const isHiddenSecret = room?.type === 'secret' && !isVisited;
  if (isHiddenSecret) return MapVisibility.NONE;
  
  // Return full details if the room is visited or player has compass
  const canSeeDetails = isVisited || templeState.hasCompass;
  if (canSeeDetails) {
    return MapVisibility.FULL_DETAILS;
  }
  
  // If player has map but not compass and hasn't visited, show layout only
  return MapVisibility.LAYOUT_ONLY;
}

export function shouldShowRoomDetails(runs: TempleRuns, templeId: string, position: [number, number]): boolean {
  const templeState = runs.templeStates[templeId];
  const hasNoMap = !templeState || !templeState.hasMap;
  if (hasNoMap) return false;

  const visited = hasVisited(runs, templeId, position);
  const isHiddenSecret = !visited && runs.dungeonManager.getRoom(templeId, position, templeState.currentLevel)?.type === 'secret';
  if (isHiddenSecret) return false;
  
  return templeState.hasCompass || visited;
}

export function isCurrentPosition(runs: TempleRuns, templeId: string, position: [number, number]): boolean {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return false;
  
  const [currentRow, currentCol] = templeState.currentPosition;
  const [checkRow, checkCol] = position;
  
  return currentRow === checkRow && currentCol === checkCol;
}

export function getRoomIcon(
  runs: TempleRuns,
  templeId: string, 
  position: [number, number],
  iconMap: Record<string, string>
): string {
  const templeState = runs.templeStates[templeId];
  const hasNoMap = !templeState || !templeState.hasMap;
  if (hasNoMap) return 'fa-question';
  
  // Always show player's current position if player has map
  if (isCurrentPosition(runs, templeId, position)) {
    return 'fa-walking';
  }
  
  const room = runs.dungeonManager.getRoom(templeId, position, templeState.currentLevel);
  if (!room) return 'fa-question';
  
  const isVisited = hasVisited(runs, templeId, position);
  
  // If room hasn't been visited and player doesn't have compass
  const isStillUnknown = !isVisited && !templeState.hasCompass;
  if (isStillUnknown) {
    return 'fa-question';
  }
  
  // Return appropriate icon based on room type
  return iconMap[room.type] || 'fa-dungeon';
}
