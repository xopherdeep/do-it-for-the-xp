/**
 * The doors of a temple run: what stands between two rooms (an open way, a small lock, the boss door, a wall, a
 * cracked wall), opening them with keys, bombs and riddles, the keys the hero carries, and the seal a lockOnEnter
 * fight puts on a room.
 * TempleSystem's door methods delegate here; each public method documents its contract.
 */

import { roomPositionKey } from '../DungeonManager';
import type { Room } from '../types';
import { barrierBetween, isBossRoom } from '@/lib/services/temples/authoredDoors';
import { clearedRoomKey, isRoomCleared } from './runState';
import type { TempleRuns } from './runState';

/**
 * What stands between two rooms: nothing, a small lock, the boss door (the big lock only the master key opens), a wall
 * no one passes, or a cracked wall only a Bomb opens (blowBombableSide). A wall and a cracked wall are no doors: no key
 * and no riddle opens them.
 */
export type DoorKind = 'open' | 'locked' | 'master' | 'wall' | 'bombable';

/** What the temple says of a wall side */
export const SOLID_WALL_LINE = 'Solid rock.';

/** What the temple says of a cracked wall */
export const CRACKED_WALL_LINE = 'The wall is cracked. Bombs might do it.';

/** Whether a side is barred by what the Game Master drew (a wall, a cracked wall) rather than by a lock */
export const isBarrierKind = (kind: DoorKind): boolean => kind === 'wall' || kind === 'bombable';

/** What the temple says when a small key is tried on the boss door */
export const BOSS_DOOR_LINE = 'A big lock. This needs the Boss Key.';

/** What the temple says when any door of a fight-sealed room is tried: no key leaves a fight */
export const SEALED_DOOR_LINE = 'The beast bars the door. Win the fight first.';

export interface DoorState {
  direction: 'north' | 'south' | 'east' | 'west';
  locked: boolean;
  requiresKey?: string;
}

// Every door of a room: a lockOnEnter fight seals all of them and winning opens them again
export const DOOR_DIRECTIONS: DoorState['direction'][] = ['north', 'south', 'east', 'west'];

const STEP: Record<DoorState['direction'], [number, number]> = { north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1] };

const OPPOSITE: Record<DoorState['direction'], DoorState['direction']> = { north: 'south', south: 'north', east: 'west', west: 'east' };

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

/**
 * What stands between the room at `position` and the room in `direction` (see DoorKind). A wall room or the edge of
 * the floor beyond is no door at all and reads as open, unless the room draws a wall or a cracked wall on that side.
 */
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

  const beyond = stepFrom(position, direction);
  const there = runs.dungeonManager.getRoom(templeId, beyond, floor);

  // What the Game Master drew first: a wall is a wall (not the boss door either), a cracked wall is one until a Bomb
  // blew it open (both ends are remembered, so a reload finds it open)
  const barrier = barrierBetween(here, there, direction);
  if (barrier === 'wall') return 'wall';
  const hasOpened = (key: string): boolean => Boolean(templeState?.openedDoors?.has(key));
  const isBlownOpen = hasOpened(doorKey(floor, position, direction)) || hasOpened(doorKey(floor, beyond, OPPOSITE[direction]));
  if (barrier === 'bombable' && !isBlownOpen) return 'bombable';

  const isUnopenedBossDoor = isBossDoor(there) && !templeState?.openedDoors?.has(doorKey(floor, position, direction));
  if (isUnopenedBossDoor) return 'master';
  return here.locked?.[direction] ? 'locked' : 'open';
}

export function explainDoor(runs: TempleRuns, templeId: string, position: [number, number], direction: DoorState['direction']): string | null {
  const kind = doorKind(runs, templeId, position, direction);
  // A beast bars every shut side of its room, whatever lock is on it; a wall is no side of its doing
  const isBarredByBeast = kind !== 'open' && kind !== 'wall' && isRoomBarred(runs, templeId, runs.templeStates[templeId]?.currentLevel ?? '1F', position);
  if (isBarredByBeast) return SEALED_DOOR_LINE;

  switch (kind) {
    case 'wall':
      return SOLID_WALL_LINE;
    case 'bombable':
      return CRACKED_WALL_LINE;
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

  // No key, small or Boss, walks the hero out of a fight: refused before anything is spent
  if (isRoomBarred(runs, templeId, templeState.currentLevel, position)) return false;

  switch (doorKind(runs, templeId, position, direction)) {
    case 'master':
      if (!templeState.hasMasterKey) return false;
      break;
    case 'locked':
      if (templeState.playerKeys <= 0) return false;
      templeState.playerKeys -= 1;
      break;
    default:
      // An open way has nothing to unlock; a wall and a cracked wall are no doors, so no key fits them
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
  // The boss door is beyond a bomb or a riddle: only the master key opens it; a fight's seal is no door at all, and
  // neither is a wall or a cracked wall (only blowBombableSide opens that one)
  const isBarred = isRoomBarred(runs, templeId, floor, position);
  const kind = doorKind(runs, templeId, position, direction, floor);
  const isSideUnopenable = isBarred || !room?.locked?.[direction] || kind === 'master' || isBarrierKind(kind);
  if (isSideUnopenable) return false;

  openDoor(runs, templeId, floor, position, direction);
  return true;
}

/**
 * Blow open the cracked wall on one side of a room: it is one wall, so it opens from both rooms, and both ends are
 * remembered with the hero's progress (a reload finds it open). Only a cracked wall with a room beyond it opens, never
 * from inside a fight the beast has sealed. A key and a riddle do not do this (unlockDoor, openDoorSide refuse it).
 * @returns True if a cracked wall was there and is open now
 */
export function blowBombableSide(
  runs: TempleRuns,
  templeId: string,
  position: [number, number],
  direction: DoorState['direction'],
  level?: string
): boolean {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return false;

  const floor = level ?? templeState.currentLevel;
  if (isRoomBarred(runs, templeId, floor, position)) return false;
  if (doorKind(runs, templeId, position, direction, floor) !== 'bombable') return false;

  const beyond = stepFrom(position, direction);
  if (!runs.dungeonManager.getRoom(templeId, beyond, floor)) return false;

  openDoor(runs, templeId, floor, position, direction);
  openDoor(runs, templeId, floor, beyond, OPPOSITE[direction]);
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

/**
 * The beast bars the doors of this room right now: the room is sealed in this run. sealRoom sets it; winning, a quest
 * room falling asleep and X's Invisibility (slipOut) clear it, and a reload inside an unfinished fight seals again.
 * Not the same as isSealedByFight: a hero who slipped out of an uncleared fight room has doors that are theirs to open.
 */
export function isRoomBarred(runs: TempleRuns, templeId: string, level: string, position: [number, number]): boolean {
  return runs.sealedRooms.has(sealKey(templeId, level, position));
}

/** A combat room that seals its doors on entry and has not been won yet (sealed or not: a room not entered yet counts). */
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
