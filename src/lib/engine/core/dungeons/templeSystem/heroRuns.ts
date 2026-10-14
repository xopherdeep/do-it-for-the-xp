/**
 * A hero's run tied to their saved progress (TempleProgressDb): opening a temple for a hero, putting a run away,
 * the snapshot that is saved, and the read that merges a save back into the run.
 * TempleSystem's run and progress methods delegate here; each public method documents its contract.
 */

import { getTempleProgressDb } from '@/lib/databases/TempleProgressDb';
import type { NewTempleProgress, TempleProgressEntry } from '@/lib/databases/TempleProgressDb';
import type { Dungeon } from '../types';
import { isBloodMoonDue, resetTempleProgress } from '../templeReset';
import { nextWeekly } from '../bloodMoonSchedule';
import { getTempleMetadata } from '@/lib/engine/temples/templeRegistry';
import { bloodMoon as notifyBloodMoon } from '@/lib/services/notifications/notify';
import { forgetVisits } from '@/lib/services/temples/roomInteractions/visitMemory';
import debug from '@/lib/utils/debug';
import { bloodMoonRisen, clearedRoomKey, createTempleState, isRoomCleared, parseRoomKey, visitRoom } from './runState';
import type { TempleRuns, TempleState } from './runState';
import { DOOR_DIRECTIONS, sealKey, sealRoom, unsealRoom } from './doors';
import type { DoorState } from './doors';
import { canStandAt, floorsOf, migrateVisitedRooms } from './floors';
import { readQuestBoard, refreshQuestRooms, syncWithKeptBoard } from './questRooms';

export function markRoomCleared(runs: TempleRuns, templeId: string, level: string, position: [number, number], userId?: string): void {
  // The hero stands in the room they just won, wherever the save says they were
  const { state, created } = openState(runs, templeId, userId, [position[0], position[1]], level, false);
  if (created) visitRoom(runs, templeId, position);

  if (!state.clearedRooms) state.clearedRooms = new Set<string>();
  state.clearedRooms.add(clearedRoomKey(level, position));
  unsealRoom(runs, templeId, level, position);
  runs.queueSave(templeId);
}

/** Where an entrance puts the hero: `[row, col]` on the first floor, or `[floorIndex, row, col]` */
export function startAt(temple: Dungeon, entrance: number[]): { level: string; position: [number, number] } {
  const isOnAFloor = entrance.length === 3;
  if (!isOnAFloor) return { level: '1F', position: [entrance[0], entrance[1]] };

  // The floor index is an index into the keys of the maze object
  const floors = floorsOf(temple);
  return { level: floors[entrance[0]] || floors[0], position: [entrance[1], entrance[2]] };
}

export function initTemple(runs: TempleRuns, templeId: string, startPosition?: number[], startLevel?: string, userId?: string): boolean {
  // Check if the dungeon exists
  const temple = runs.dungeonManager.getDungeon(templeId);
  if (!temple) {
    debug.error(`Temple ${templeId} not found`);
    return false;
  }

  // Determine starting position and level
  const floors = floorsOf(temple);
  const start = startAt(temple, startPosition || temple.entrance || [0, 0]);
  const finalPos = start.position;
  let finalLevel = start.level;

  // A floor named outright (the battle page hands back "2F", not an index) beats the guess above
  const isFloorNamed = startLevel && floors.includes(startLevel);
  if (isFloorNamed) finalLevel = startLevel;

  // Create temple state if it doesn't exist
  const { state } = openState(runs, templeId, userId, finalPos, finalLevel, true);

  // Migrate any previously visited rooms
  migrateVisitedRooms(runs, templeId);

  // Mark the room the hero stands in as visited (a run that was already going stays where it is)
  visitRoom(runs, templeId, state.currentPosition);

  // The quest rooms follow the hero's board: a run that just opened reads it with the save (loadProgress), a run
  // already going (the temple screen mounting again after a battle) reads it again here
  const hero = runs.heroByTemple.get(templeId);
  const isBoardOnItsWay = runs.reads.has(templeId);
  if (hero && !isBoardOnItsWay) void refreshQuestRooms(runs, templeId);
  return true;
}

/**
 * The state of a temple for a hero: the run already going in memory, or a fresh one starting at
 * `position` on `level`. A hero's saved progress is read back as soon as they are tied to the temple.
 * @param resume Whether a fresh run moves to where the saved progress left the hero, once it is read
 */
export function openState(
  runs: TempleRuns,
  templeId: string,
  userId: string | undefined,
  position: [number, number],
  level: string,
  resume: boolean
): { state: TempleState; created: boolean } {
  // Another hero's run: theirs is saved as it stands, then this hero gets the temple as the layout made it
  const bound = runs.heroByTemple.get(templeId);
  const isAnotherHeroRun = userId && bound && bound !== userId;
  if (isAnotherHeroRun) releaseTemple(runs, templeId);

  const created = !runs.templeStates[templeId];
  if (created) runs.templeStates[templeId] = createTempleState(position, level);

  // A run nobody owned yet (a win reported without a hero) is taken over, what it holds is merged with the save
  const isTakingOverRun = userId && runs.heroByTemple.get(templeId) !== userId;
  if (isTakingOverRun) {
    runs.heroByTemple.set(templeId, userId);
    loadProgress(runs, templeId, userId, created && resume);
  }

  return { state: runs.templeStates[templeId], created };
}

/** Put a temple's run away: the hero's last changes are queued for saving, then the state, seals and dungeon reset. */
export function releaseTemple(runs: TempleRuns, templeId: string): void {
  runs.queueSave(templeId);
  forgetRun(runs, templeId);
}

/**
 * Drop a temple's run from memory: the state, the seals and the dungeon as the hero left it.
 * @param unsaved Also drop a save of it still waiting for the end of the tick (the blood moon writes its own),
 * and what the hero's visit remembered: the run is started over from what is stored
 */
export function forgetRun(runs: TempleRuns, templeId: string, unsaved = false): void {
  const hero = runs.heroByTemple.get(templeId);
  const hasSaveToDrop = unsaved && hero;
  if (hasSaveToDrop) runs.pendingSaves.delete(`${hero}|${templeId}`);
  if (unsaved) forgetVisits(templeId, hero);

  delete runs.templeStates[templeId];
  runs.heroByTemple.delete(templeId);
  runs.reads.delete(templeId);
  // The next run reads its hero's board afresh
  runs.questBoards.delete(templeId);
  runs.boardReads.delete(templeId);
  for (const key of Array.from(runs.sealedRooms.keys())) {
    if (key.startsWith(`${templeId}|`)) runs.sealedRooms.delete(key);
  }
  // Chests full again and doors as the layout made them, for whoever plays next
  runs.dungeonManager.resetDungeon(templeId);
}

export function whenProgressReady(runs: TempleRuns, templeId: string): Promise<void> {
  return runs.reads.get(templeId) ?? Promise.resolve();
}

/** What the hero's save should say right now; nothing without a hero, or while their save is still being read. */
export function progressSnapshot(runs: TempleRuns, templeId: string): NewTempleProgress | undefined {
  const userId = runs.heroByTemple.get(templeId);
  const state = runs.templeStates[templeId];
  const hasNothingToSave = !userId || !state || runs.reads.has(templeId);
  if (hasNothingToSave) return undefined;

  return snapshotOf(userId, templeId, state);
}

/** A run as a progress record: what is saved, and what refreshRun puts back on a new layout */
function snapshotOf(userId: string, templeId: string, state: TempleState): NewTempleProgress {
  return {
    userId,
    templeId,
    currentLevel: state.currentLevel,
    currentPosition: [state.currentPosition[0], state.currentPosition[1]],
    hasMap: state.hasMap,
    hasCompass: state.hasCompass,
    playerKeys: state.playerKeys,
    visitedRooms: Array.from(state.visitedRooms),
    clearedRooms: Array.from(state.clearedRooms ?? []),
    hasMasterKey: Boolean(state.hasMasterKey),
    openedDoors: Array.from(state.openedDoors ?? []),
    openedChests: Array.from(state.openedChests ?? []),
    ...(state.takenFromChests?.size ? { takenFromChests: Array.from(state.takenFromChests) } : {}),
    keyItems: [...(state.keyItems ?? [])],
    timesCleared: state.timesCleared ?? 0,
    bloodMoons: state.bloodMoons ?? 0,
    ...(state.bloodMoonAt ? { bloodMoonAt: state.bloodMoonAt } : {}),
    ...(state.bloodMoonEvery ? { bloodMoonEvery: state.bloodMoonEvery } : {})
  };
}

/**
 * The layout of a temple changed (the Game Master saved it) while a hero's run in it is in memory: the engine now
 * holds the new rooms, fresh from the layout (chests full, doors as drawn, nothing visited). The run is kept:
 * the rooms visited and won, the chests emptied and the doors opened are put back on the new rooms, and the hero
 * stays where they stand if that is still a room they can stand in, else they are back at the entrance.
 * Nothing happens for a temple without a run in memory.
 */
export function refreshRun(runs: TempleRuns, templeId: string): void {
  const state = runs.templeStates[templeId];
  const temple = runs.dungeonManager.getDungeon(templeId);
  const hasNothingToKeep = !state || !temple;
  if (hasNothingToKeep) return;

  // A fight the hero stood in the middle of seals its room again below; the seals of the old rooms are gone with them
  const wasInFight = runs.sealedRooms.has(sealKey(templeId, state.currentLevel, state.currentPosition));
  for (const key of Array.from(runs.sealedRooms.keys())) {
    if (key.startsWith(`${templeId}|`)) runs.sealedRooms.delete(key);
  }

  applyProgress(runs, templeId, snapshotOf(runs.heroByTemple.get(templeId) ?? '', templeId, state));

  const canStayPut = canStandAt(runs, templeId, state.currentLevel, state.currentPosition);
  if (!canStayPut) {
    const entrance = startAt(temple, temple.entrance || [0, 0]);
    state.currentLevel = entrance.level;
    state.currentPosition = entrance.position;
  }
  visitRoom(runs, templeId, state.currentPosition);

  const room = runs.dungeonManager.getRoom(templeId, state.currentPosition, state.currentLevel);
  const isFightRoom = Boolean(room?.content?.lockOnEnter) && !isRoomCleared(runs, templeId, state.currentLevel, state.currentPosition);
  const roomToSeal = wasInFight && canStayPut && isFightRoom ? room : undefined;
  if (roomToSeal) sealRoom(runs, templeId, state.currentLevel, state.currentPosition, roomToSeal);
}

/** A hero's saved progress in a temple: null when there is none, undefined when it could not be read. */
export async function readSavedProgress(userId: string, templeId: string): Promise<TempleProgressEntry | null | undefined> {
  try {
    return await getTempleProgressDb().getProgress(userId, templeId);
  } catch (error) {
    debug.error(`Failed to read temple progress of ${userId} in ${templeId}`, error);
    return undefined;
  }
}

/**
 * Read the hero's saved progress and their quest board, and merge the save into the run that stands in for it
 * meanwhile. The board comes with the save so the quest rooms are synced before the hero is put back in a room (a
 * lurking one holds them, a done one lets them walk out); a board that cannot be read leaves the saved rooms as they are.
 * @param resume Put the hero back where they stopped: for a run that has just started, not one already going
 */
export function loadProgress(runs: TempleRuns, templeId: string, userId: string, resume: boolean): void {
  const state = runs.templeStates[templeId];
  const start = { level: state.currentLevel, row: state.currentPosition[0], col: state.currentPosition[1] };

  const read: Promise<void> = Promise.all([readSavedProgress(userId, templeId), readQuestBoard(userId)]).then(([saved, board]) => {
    // Not when the temple went to another hero while the save was on its way
    if (runs.reads.get(templeId) !== read) return;
    if (board) runs.questBoards.set(templeId, board);

    let readable = saved !== undefined;
    if (saved) {
      try {
        // A blood moon the Game Master scheduled has risen since the last visit: the run starts over
        if (isBloodMoonDue(saved)) {
          const spent = saved.bloodMoonAt;
          saved = resetTempleProgress(saved);
          // A weekly moon rises again a week on from the one just spent (skipping weeks the hero was away)
          const shouldRescheduleWeekly = saved.bloodMoonEvery === 'weekly' && spent;
          if (shouldRescheduleWeekly) saved.bloodMoonAt = nextWeekly(spent);
          runs.risen.set(templeId, userId);
          bloodMoonRisen.value = true;
          notifyBloodMoon(userId, { id: templeId, name: getTempleMetadata(templeId).name });
          // The springs and camps the hero used up before the moon are back with the chests
          forgetVisits(templeId, userId);
        }
        applyProgress(runs, templeId, saved, resume ? start : undefined);
      } catch (error) {
        debug.error(`Failed to merge temple progress of ${userId} in ${templeId}`, error);
        readable = false;
      }
    }
    runs.reads.delete(templeId);

    if (!readable) {
      // Not knowing what is saved, the run must not be saved over it. The next visit tries the read again.
      runs.heroByTemple.delete(templeId);
      return;
    }
    // A hero with nothing saved starts from their board too (applyProgress synced a merged save already)
    syncWithKeptBoard(runs, templeId);
    // The merged run is the hero's progress from here on (for a hero with nothing saved: the start of it)
    runs.queueSave(templeId);
  });
  runs.reads.set(templeId, read);
}

export function applyProgress(
  runs: TempleRuns,
  templeId: string,
  saved: NewTempleProgress,
  resumeFrom?: { level: string; row: number; col: number }
): void {
  const state = runs.templeStates[templeId];
  if (!state) return;

  // Merged, not replaced: the run standing in may already hold a win or a visit of its own
  state.hasMap = state.hasMap || saved.hasMap;
  state.hasCompass = state.hasCompass || saved.hasCompass;
  state.playerKeys = Math.max(state.playerKeys, saved.playerKeys);
  state.hasMasterKey = Boolean(state.hasMasterKey || saved.hasMasterKey);
  state.keyItems = Array.from(new Set([...(state.keyItems ?? []), ...saved.keyItems]));
  state.timesCleared = Math.max(state.timesCleared ?? 0, saved.timesCleared);
  state.bloodMoons = Math.max(state.bloodMoons ?? 0, saved.bloodMoons);
  if (saved.bloodMoonAt) state.bloodMoonAt = saved.bloodMoonAt;
  if (saved.bloodMoonEvery) state.bloodMoonEvery = saved.bloodMoonEvery;
  if (!state.openedChests) state.openedChests = new Set<string>();
  for (const key of saved.openedChests) {
    state.openedChests.add(key);
    // The chest was refilled with the layout: it is emptied again (the room and its chest)
    const at = parseRoomKey(key);
    if (!at) continue;
    if (runs.dungeonManager.getRoom(templeId, at.position, at.level)?.type === 'loot') {
      runs.dungeonManager.updateRoom(templeId, at.position, { isEmpty: true }, at.level);
    }
  }
  // Chests the hero took part of: what was taken stays out, the rest is still there
  if (!state.takenFromChests) state.takenFromChests = new Set<string>();
  for (const key of saved.takenFromChests ?? []) {
    const split = key.indexOf('>');
    const at = parseRoomKey(key.slice(0, split));
    const shouldSkipTake = split < 0 || !at || state.openedChests.has(key.slice(0, split));
    if (shouldSkipTake) continue;
    state.takenFromChests.add(key);
    runs.dungeonManager.removeItemsFromRoomChest(templeId, at.position, [key.slice(split + 1)], at.level);
  }
  if (!state.clearedRooms) state.clearedRooms = new Set<string>();
  for (const key of saved.clearedRooms) state.clearedRooms.add(key);
  // The keys of quest rooms are the board's to say, not the save's (a stale one does no harm): synced before the hero
  // is put back below, so a lurking room holds them and a done one does not
  syncWithKeptBoard(runs, templeId);

  // Doors opened stay open: the layout was registered again locked
  if (!state.openedDoors) state.openedDoors = new Set<string>();
  for (const key of saved.openedDoors) {
    state.openedDoors.add(key);
    const split = key.lastIndexOf('>');
    const at = parseRoomKey(key.slice(0, split));
    const direction = key.slice(split + 1) as DoorState['direction'];
    const isNotADoor = !at || !DOOR_DIRECTIONS.includes(direction);
    if (isNotADoor) continue;
    const room = runs.dungeonManager.getRoom(templeId, at.position, at.level);
    if (room?.locked?.[direction]) room.locked = { ...room.locked, [direction]: false };
  }
  for (const key of saved.visitedRooms) {
    state.visitedRooms.add(key);
    const visited = parseRoomKey(key);
    if (visited) runs.dungeonManager.visitRoom(templeId, visited.position, visited.level);
  }

  // Back to where the hero stopped, unless they already moved on or that room is gone from the layout
  const [row, col] = state.currentPosition;
  const atStart = resumeFrom && state.currentLevel === resumeFrom.level && row === resumeFrom.row && col === resumeFrom.col;
  const cannotResumeThere = !atStart || !canStandAt(runs, templeId, saved.currentLevel, saved.currentPosition);
  if (cannotResumeThere) return;

  state.currentLevel = saved.currentLevel;
  state.currentPosition = [saved.currentPosition[0], saved.currentPosition[1]];
  visitRoom(runs, templeId, state.currentPosition);

  // A fight left unfinished still holds the hero: a reload does not open the doors
  const room = runs.dungeonManager.getRoom(templeId, state.currentPosition, state.currentLevel);
  const isFightUnfinished = room?.content?.lockOnEnter && !isRoomCleared(runs, templeId, state.currentLevel, state.currentPosition);
  if (isFightUnfinished) {
    sealRoom(runs, templeId, state.currentLevel, state.currentPosition, room);
  }
}
