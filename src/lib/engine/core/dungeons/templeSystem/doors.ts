/**
 * The doors of a temple run: what stands between two rooms (an open way, a small lock, the boss door), opening
 * them with keys, bombs and riddles, the keys the hero carries, and the seal a lockOnEnter fight puts on a room.
 * TempleSystem's door methods delegate here; each public method documents its contract.
 */

import { roomPositionKey } from '../DungeonManager';
import type { Room } from '../types';
import { isBossRoom } from '@/lib/services/temples/authoredDoors';
import { clearedRoomKey, isRoomCleared } from './runState';
import type { TempleRuns } from './runState';

/** What stands between two rooms: nothing, a small lock, or the boss door (the big lock only the master key opens) */
export type DoorKind = 'open' | 'locked' | 'master';

/** What the temple says when a small key is tried on the boss door */
export const BOSS_DOOR_LINE = 'A big lock. This needs the Boss Key.';

export interface DoorState {
  direction: 'north' | 'south' | 'east' | 'west';
  locked: boolean;
  requiresKey?: string;
}

// Every door of a room: a lockOnEnter fight seals all of them and winning opens them again
export const DOOR_DIRECTIONS: DoorState['direction'][] = ['north', 'south', 'east', 'west'];

const STEP: Record<DoorState['direction'], [number, number]> = { north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1] };

/** The room one step away */
const stepFrom = (position: [number, number], direction: DoorState['direction']): [number, number] =>
  [position[0] + STEP[direction][0], position[1] + STEP[direction][1]];

export function sealKey(templeId: string, level: string, position: [number, number]): string {
  return `${templeId}|${clearedRoomKey(level, position)}`;
}

/**
 * Lock all 4 doors of a lockOnEnter room, the way moveToPosition does on first entry.
 * The doors as the layout authored them are remembered so unsealRoom can put them back.
 */
export function sealRoom(runs: TempleRuns, templeId: string, level: string, position: [number, number], room: Room): void {
  const key = sealKey(templeId, level, position);
  if (!runs.sealedRooms.has(key)) runs.sealedRooms.set(key, { ...room.locked });

  if (!room.locked) room.locked = {};
  for (const direction of DOOR_DIRECTIONS) room.locked[direction] = true;
}

/**
 * Undo sealRoom: every door goes back to how the layout authored it, so a key door stays a key door.
 * A room that was never sealed this session (a reload put the hero in it) has nothing to undo.
 */
export function unsealRoom(runs: TempleRuns, templeId: string, level: string, position: [number, number]): void {
  const key = sealKey(templeId, level, position);
  const authored = runs.sealedRooms.get(key);
  if (!authored) return;
  runs.sealedRooms.delete(key);

  const room = runs.dungeonManager.getRoom(templeId, position, level);
  if (!room?.locked) return;
  for (const direction of DOOR_DIRECTIONS) room.locked[direction] = authored[direction] ?? false;
}

/** `${level}:${row},${col}>${direction}`: how an opened door is remembered, by the room the hero stood in */
export function doorKey(level: string, position: [number, number], direction: DoorState['direction']): string {
  return `${roomPositionKey(level, position)}>${direction}`;
}

/** Every door into a boss room is the boss door, whatever the authored sides say: only the Boss Key opens it. */
export function isBossDoor(there: Room | undefined): boolean {
  return isBossRoom(there);
}

export function doorKind(
  runs: TempleRuns,
  templeId: string,
  position: [number, number],
  direction: DoorState['direction'],
  level?: string
): DoorKind {
  const templeState = runs.templeStates[templeId];
  const floor = level ?? templeState?.currentLevel ?? '1F';
  const here = runs.dungeonManager.getRoom(templeId, position, floor);
  if (!here) return 'open';

  const there = runs.dungeonManager.getRoom(templeId, stepFrom(position, direction), floor);
  const isUnopenedBossDoor = isBossDoor(there) && !templeState?.openedDoors?.has(doorKey(floor, position, direction));
  if (isUnopenedBossDoor) return 'master';
  return here.locked?.[direction] ? 'locked' : 'open';
}

export function explainDoor(runs: TempleRuns, templeId: string, position: [number, number], direction: DoorState['direction']): string | null {
  switch (doorKind(runs, templeId, position, direction)) {
    case 'master':
      return hasMasterKey(runs, templeId) ? null : BOSS_DOOR_LINE;
    case 'locked':
      return (runs.templeStates[templeId]?.playerKeys ?? 0) > 0 ? null : 'You need a key to unlock this door!';
    default:
      return null;
  }
}

/** Open one side of a room and remember it with the hero's progress, so a reload finds it open. */
export function openDoor(runs: TempleRuns, templeId: string, level: string, position: [number, number], direction: DoorState['direction']): void {
  const room = runs.dungeonManager.getRoom(templeId, position, level);
  if (room?.locked?.[direction]) room.locked = { ...room.locked, [direction]: false };

  const templeState = runs.templeStates[templeId];
  if (!templeState) return;
  if (!templeState.openedDoors) templeState.openedDoors = new Set<string>();
  templeState.openedDoors.add(doorKey(level, position, direction));
  runs.queueSave(templeId);
}

export function unlockDoor(
  runs: TempleRuns,
  templeId: string, 
  position: [number, number],
  direction: 'north' | 'south' | 'east' | 'west'
): boolean {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return false;

  switch (doorKind(runs, templeId, position, direction)) {
    case 'master':
      if (!templeState.hasMasterKey) return false;
      break;
    case 'locked':
      if (templeState.playerKeys <= 0) return false;
      templeState.playerKeys -= 1;
      break;
    default:
      return false;
  }

  openDoor(runs, templeId, templeState.currentLevel, position, direction);
  return true;
}

export function openDoorSide(
  runs: TempleRuns,
  templeId: string,
  position: [number, number],
  direction: 'north' | 'south' | 'east' | 'west',
  level?: string
): boolean {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return false;

  const floor = level ?? templeState.currentLevel;
  const room = runs.dungeonManager.getRoom(templeId, position, floor);
  // The boss door is beyond a bomb or a riddle: only the master key opens it
  const isSideUnopenable = !room?.locked?.[direction] || doorKind(runs, templeId, position, direction, floor) === 'master';
  if (isSideUnopenable) return false;

  openDoor(runs, templeId, floor, position, direction);
  return true;
}

export function openDoorsAround(runs: TempleRuns, templeId: string, position: [number, number], level?: string): number {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return 0;

  const floor = level ?? templeState.currentLevel;
  const opposite = { north: 'south', south: 'north', east: 'west', west: 'east' } as const;
  const step = { north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1] } as const;
  let opened = 0;

  const sealedHere = isSealedByFight(runs, templeId, floor, position);
  for (const direction of DOOR_DIRECTIONS) {
    const openedOwnSide = !sealedHere && openDoorSide(runs, templeId, position, direction, floor);
    if (openedOwnSide) opened++;

    const next: [number, number] = [position[0] + step[direction][0], position[1] + step[direction][1]];
    const neighbour = runs.dungeonManager.getRoom(templeId, next, floor);
    const isNeighbourClosedOff = !neighbour || neighbour.type === 'wall' || isSealedByFight(runs, templeId, floor, next);
    if (isNeighbourClosedOff) continue;
    if (openDoorSide(runs, templeId, next, opposite[direction], floor)) opened++;
  }
  return opened;
}

/** A combat room that seals its doors on entry and has not been won yet. */
export function isSealedByFight(runs: TempleRuns, templeId: string, level: string, position: [number, number]): boolean {
  const room = runs.dungeonManager.getRoom(templeId, position, level);
  return Boolean(room?.content?.lockOnEnter) && !isRoomCleared(runs, templeId, level, position);
}

export function addKey(runs: TempleRuns, templeId: string): boolean {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return false;
  templeState.playerKeys += 1;
  runs.queueSave(templeId);
  return true;
}

export function grantMasterKey(runs: TempleRuns, templeId: string): boolean {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return false;
  templeState.hasMasterKey = true;
  runs.queueSave(templeId);
  return true;
}

export function hasMasterKey(runs: TempleRuns, templeId: string): boolean {
  return Boolean(runs.templeStates[templeId]?.hasMasterKey);
}
