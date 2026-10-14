/**
 * A hero's run through a temple, as TempleSystem keeps it: the TempleState, the parts of the system the run
 * rules in this folder reach into (TempleRuns), and the bookkeeping of the rooms visited and won.
 * TempleSystem holds the state and its methods delegate here; each public method documents its contract.
 */

import { reactive, ref } from 'vue';
import { roomPositionKey } from '../DungeonManager';
import type { DungeonManager } from '../DungeonManager';
import type { Room } from '../types';
import type { NewTempleProgress } from '@/lib/databases/TempleProgressDb';
import { TEMPLE_CLEARED_KEY } from '../templeReset';
import type { BloodMoonCadence } from '../bloodMoonSchedule';
import type { QuestRoomBoard } from './questRooms';

/**
 * True while a blood moon has risen over a temple and nobody has consumed it yet (set where the system
 * records one, cleared by bloodMoonRose() when it hands the last one over). A screen watches it to
 * call bloodMoonRose(temple) and toast the hero live, not only on mount.
 */
export const bloodMoonRisen = ref(false);

// Types
export interface TempleState {
  hasMap: boolean;
  hasCompass: boolean;
  playerKeys: number;
  currentPosition: [number, number];
  currentLevel: string;
  visitedRooms: Set<string>;
  /** Combat rooms whose beasts have been beaten, keyed `${level}:${row},${col}`. Also holds TEMPLE_CLEARED_KEY once the gate was opened. */
  clearedRooms?: Set<string>;
  /** The master key was picked up this run. It opens the boss door without being spent; a blood moon forgets it. */
  hasMasterKey?: boolean;
  /** Doors the hero opened (a key, the master key, a bomb, a riddle), as `${level}:${row},${col}>${direction}` of the room they stood in */
  openedDoors?: Set<string>;
  /**
   * Rooms whose one thing the hero took this run, as `${level}:${row},${col}`: a chest of consumables emptied, and
   * the keys, maps and compasses lying in a room, the secret chest, a hunt's find and a riddle solved. A blood moon
   * gives them all back (the map and compass the hero holds stay theirs).
   */
  openedChests?: Set<string>;
  /** Items taken from chests that still hold others, as `${level}:${row},${col}>${item}` */
  takenFromChests?: Set<string>;
  /** Key items the temple handed out; kept across blood moons */
  keyItems?: string[];
  /** Floors whose secret rooms Gaia's Quake put on the map (revealSecrets). Not saved: it lasts the visit */
  revealedSecretFloors?: Set<string>;
  timesCleared?: number;
  bloodMoons?: number;
  /** ISO time of the blood moon the Game Master scheduled next; carried so a save does not lose it */
  bloodMoonAt?: string;
  /** The Game Master's cadence: a due moon that fires re-schedules itself a week later */
  bloodMoonEvery?: BloodMoonCadence;
}

/**
 * The parts of the TempleSystem the run rules in this folder reach into: its private state, shared by
 * reference, and the save queue that stays on the class.
 */
export interface TempleRuns {
  dungeonManager: DungeonManager;
  /** Every temple's run, by temple id */
  templeStates: Record<string, TempleState>;
  /** How the layout authored the doors of each room a fight has sealed, so clearing it can put them back */
  sealedRooms: Map<string, NonNullable<Room['locked']>>;
  /** The hero whose run each temple's state is */
  heroByTemple: Map<string, string>;
  /** The hero's saved progress while it is being read back */
  reads: Map<string, Promise<void>>;
  /** Temples a blood moon reset, by the hero it reset them for */
  risen: Map<string, string>;
  /** Saves waiting for the end of the tick, one per hero and temple */
  pendingSaves: Map<string, NewTempleProgress>;
  /** The quest board each temple's quest rooms were last synced with (templeSystem/questRooms.ts), by temple id */
  questBoards: Map<string, QuestRoomBoard>;
  /** A read of the hero's quest board under way for a run already going (refreshQuestRooms), by temple id */
  boardReads: Map<string, Promise<unknown>>;
  queueSave: (templeId: string) => void;
  flushProgress: () => Promise<void>;
}

/** A `${level}:${row},${col}` key back into its parts (a floor name may hold a colon, the coordinates never do) */
export const parseRoomKey = (key: string): { level: string; position: [number, number] } | null => {
  const split = key.lastIndexOf(':');
  const [row, col] = key.slice(split + 1).split(',').map(Number);
  const isMalformedKey = split <= 0 || !Number.isInteger(row) || !Number.isInteger(col);
  if (isMalformedKey) return null;
  return { level: key.slice(0, split), position: [row, col] };
};

export function clearedRoomKey(level: string, position: [number, number]): string {
  return roomPositionKey(level, position);
}

/** A fresh run through a temple: nothing found, nothing beaten, the hero standing at `position` on `level`. */
export function createTempleState(position: [number, number], level: string): TempleState {
  return reactive({
    hasMap: false,
    hasCompass: false,
    playerKeys: 0,
    currentPosition: position,
    currentLevel: level,
    visitedRooms: new Set<string>(),
    clearedRooms: new Set<string>(),
    hasMasterKey: false,
    openedDoors: new Set<string>(),
    openedChests: new Set<string>(),
    takenFromChests: new Set<string>(),
    keyItems: [],
    timesCleared: 0,
    bloodMoons: 0
  });
}

export function isRoomCleared(runs: TempleRuns, templeId: string, level: string, position: [number, number]): boolean {
  return Boolean(runs.templeStates[templeId]?.clearedRooms?.has(clearedRoomKey(level, position)));
}

export function getCurrentRoom(runs: TempleRuns, templeId: string): Room | undefined {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return undefined;
  
  return runs.dungeonManager.getRoom(templeId, templeState.currentPosition, templeState.currentLevel);
}

export function visitRoom(runs: TempleRuns, templeId: string, position: [number, number], level?: string): void {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return;

  const floor = level ?? templeState.currentLevel;

  // Add to the set of visited rooms
  templeState.visitedRooms.add(roomPositionKey(floor, position));

  // Also mark it as visited in the dungeon manager
  runs.dungeonManager.visitRoom(templeId, position, floor);

  // Every move, teleport and first visit ends up here: this is where the hero's new position is saved
  runs.queueSave(templeId);
}

export function hasVisited(runs: TempleRuns, templeId: string, position: [number, number]): boolean {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return false;

  // Check coordinate-based visited status in DungeonManager first
  if (runs.dungeonManager.hasVisited(templeId, position, templeState.currentLevel)) {
    return true;
  }

  // Fall back to the TempleState's visitedRooms set (for backward compatibility)
  return templeState.visitedRooms.has(roomPositionKey(templeState.currentLevel, position));
}

export function markTempleCleared(runs: TempleRuns, templeId: string): boolean {
  const templeState = runs.templeStates[templeId];
  if (!templeState) return false;

  if (!templeState.clearedRooms) templeState.clearedRooms = new Set<string>();
  if (!templeState.clearedRooms.has(TEMPLE_CLEARED_KEY)) templeState.timesCleared = (templeState.timesCleared ?? 0) + 1;
  templeState.clearedRooms.add(TEMPLE_CLEARED_KEY);
  runs.queueSave(templeId);
  return true;
}

export function isBossBeaten(runs: TempleRuns, templeId: string): boolean {
  const temple = runs.dungeonManager.getDungeon(templeId);
  if (!temple) return false;

  const floors = Array.isArray(temple.maze) ? { '1F': temple.maze } : temple.maze;
  for (const [floor, grid] of Object.entries(floors)) {
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const isUnbeatenBoss = temple.rooms[grid[row][col]]?.type === 'boss' && !isRoomCleared(runs, templeId, floor, [row, col]);
        if (isUnbeatenBoss) {
          return false;
        }
      }
    }
  }
  return true;
}
