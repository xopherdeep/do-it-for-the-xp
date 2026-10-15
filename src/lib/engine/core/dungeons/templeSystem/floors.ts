/**
 * Where the hero can go in a temple: its floors, walking from room to room, stairs and
 * teleport circles, and rooms marked visited by the old system carried into the coordinate-based record.
 * TempleSystem's movement methods delegate here; each public method documents its contract.
 */

import { roomPositionKey } from '../DungeonManager';
import type { Dungeon } from '../types';
import { teleportTargetFor } from '../teleportPairing';
import debug from '@/lib/utils/debug';
import { getCurrentRoom, isRoomCleared, visitRoom } from './runState';
import type { TempleRuns } from './runState';
import { doorKind, isBarrierKind, sealRoom } from './doors';

/** Floor names of a temple; a single grid is just "1F" */
export function floorsOf(temple: Dungeon): string[] {
  return Array.isArray(temple.maze) ? ["1F"] : Object.keys(temple.maze);
}

/** Room types no hero stands in: a wall, and a void (a gap on the map; only the Hook Shot swings over it). A pit is not one: it drops the hero. */
const IMPASSABLE_TYPES = ['wall', 'void'];

/** Whether a room is no floor to stand on (the solver's templeGraph IMPASSABLE says the same). No room at all is not this: it is simply not there. */
export function isImpassable(room: { type?: string } | undefined): boolean {
  return IMPASSABLE_TYPES.includes(room?.type ?? '');
}

/**
 * Whether a hero could step into a room: there is a room (a maze token with no record in the rooms table is no room) and
 * it is not a wall or a void. The one rule the engine's steps and the temple screen's arrows share.
 */
export function canEnter(room: { type?: string } | undefined): boolean {
  return Boolean(room) && !isImpassable(room);
}

/** True when the hero could stand there: the temple has that floor and the room is not a wall or a void */
export function canStandAt(runs: TempleRuns, templeId: string, level: string, position: [number, number]): boolean {
  const temple = runs.dungeonManager.getDungeon(templeId);
  const hasNoSuchFloor = !temple || !floorsOf(temple).includes(level);
  if (hasNoSuchFloor) return false;

  return canEnter(runs.dungeonManager.getRoom(templeId, position, level));
}

/**
 * Migrate visited room data from the old system to the new coordinate-based system
 * This ensures any rooms that were marked as visited before the system change
 * are still shown as visited in the map
 */
export function migrateVisitedRooms(runs: TempleRuns, templeId: string): void {
  const temple = runs.dungeonManager.getDungeon(templeId);
  if (!temple) return;
  
  // Scan the entire maze
  const maze = temple.maze;
  const floors = Array.isArray(maze) ? { "1F": maze } : maze;

  Object.entries(floors).forEach(([floorId, grid]) => {
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const roomKey = grid[row][col];
        const room = temple.rooms[roomKey];
      
      // Skip walls and non-existent rooms
      const isNotARoom = !room || room.type === 'wall';
      if (isNotARoom) continue;
      
        // Check if this room was marked as visited in the old system
        const isMarkedVisited = (room as any).visited === true;
        if (isMarkedVisited) {
          // Mark it as visited in the new coordinate-based system
          const posKey = roomPositionKey(floorId, [row, col]);
          temple.visitedPositions.add(posKey);
          
          // Also add it to TempleState's visitedRooms for complete consistency
          const templeState = runs.templeStates[templeId];
          if (templeState) {
            templeState.visitedRooms.add(posKey);
          }
        }
      }
    }
  });
}

export function moveToPosition(
  runs: TempleRuns,
  templeId: string, 
  newPosition: [number, number],
  direction: 'north' | 'south' | 'east' | 'west'
): boolean {
  const temple = runs.dungeonManager.getDungeon(templeId);
  const templeState = runs.templeStates[templeId];
  
  const isTempleNotOpen = !temple || !templeState;
  if (isTempleNotOpen) return false;
  
  const level = templeState.currentLevel;
  
  // Get current room and check if the door is locked
  const currentRoom = getCurrentRoom(runs, templeId);
  if (!currentRoom) return false;
  
  // Check if the door is locked in the direction of movement; the boss door counts as locked until it is opened, and a
  // wall or a cracked wall (until a Bomb blows it open) is no way through at all
  const kind = doorKind(runs, templeId, templeState.currentPosition, direction);
  const isDoorBlocked = currentRoom.locked?.[direction] || kind === 'master' || isBarrierKind(kind);
  if (isDoorBlocked) {
    return false;
  }
  
  // Check if the destination is a room at all, and not a wall or a void
  const isNotARoom = !canEnter(runs.dungeonManager.getRoom(templeId, newPosition, level));
  if (isNotARoom) return false;
  
  arrive(runs, templeId, level, newPosition);
  return true;
}

/**
 * The one way into a room, whatever brought the hero (a step, stairs, a fall down a pit, a teleport circle): the hero
 * stands there, a lockOnEnter room seals while its beast is not beaten (docs/Quest-Rooms-Spec.md 7.2), and the room
 * counts as visited. A won or done room lets the hero through, and a beast that is back (its quest due again, a blood
 * moon) seals it again on the next entry.
 */
function arrive(runs: TempleRuns, templeId: string, level: string, position: [number, number]): void {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return;

  templeState.currentLevel = level;
  templeState.currentPosition = [position[0], position[1]];

  const room = runs.dungeonManager.getRoom(templeId, position, level);
  const shouldSealOnEntry = room?.content?.lockOnEnter && !isRoomCleared(runs, templeId, level, position);
  if (shouldSealOnEntry) {
    // Lock all 4 directions (markRoomCleared opens them again after the fight)
    sealRoom(runs, templeId, level, position, room);

    debug.log(`Room at ${position} locked on enter!`);
  }

  visitRoom(runs, templeId, position, level);
}

export function getFloors(runs: TempleRuns, templeId: string): string[] {
  const temple = runs.dungeonManager.getDungeon(templeId);
  return temple ? floorsOf(temple) : [];
}

export function changeLevel(runs: TempleRuns, templeId: string, level: string, position: [number, number]): boolean {
  const templeState = runs.templeStates[templeId];
  const cannotChangeLevel = !templeState || !canStandAt(runs, templeId, level, position);
  if (cannotChangeLevel) return false;

  arrive(runs, templeId, level, position);
  return true;
}

export function isRoomType(runs: TempleRuns, templeId: string, position: [number, number], type: string): boolean {
  const templeState = runs.templeStates[templeId];
  const level = templeState?.currentLevel || "1F";
  const room = runs.dungeonManager.getRoom(templeId, position, level);
  return room?.type === type;
}

export function handleTeleport(runs: TempleRuns, templeId: string): [number, number] | undefined {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return undefined;

  const temple = runs.dungeonManager.getDungeon(templeId);
  if (!temple) return undefined;

  const destination = teleportTargetFor(temple, templeState.currentLevel, templeState.currentPosition);
  const stayedPut = !destination || !changeLevel(runs, templeId, destination.level, destination.position);
  if (stayedPut) return undefined;

  return destination.position;
}
