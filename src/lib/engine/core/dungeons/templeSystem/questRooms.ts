/**
 * Quest rooms in a hero's run (docs/Quest-Rooms-Spec.md 7.1, 7.10, 7.11): the hero's quest board says which quest
 * rooms hold a beast. A quest room that is not lurking (a claim waiting, done, not due, someone else's quest, an empty
 * lair) goes into the hero's clearedRooms: no fight, the doors open. A lurking one comes out, so its doors seal again
 * on the next entry (floors.ts). Dormant and classic rooms are left to the classic rules (a win clears them, a blood
 * moon brings them back). The keys of quest rooms are re-derived on every sync, so a stale saved key does no harm, and
 * TempleState gets no new field.
 *
 * Where the board comes from: it is async (the quests and the quest log live in storage), the sync is not.
 * - The engine reads it itself (readQuestBoard: the QuestEngine, with the hero's item effects from their profile):
 *   with the hero's saved progress when a run opens for them (heroRuns.loadProgress waits for both, so the save is
 *   merged and the hero resumed against the board), and on refreshQuestRooms, which initTemple calls for a run that
 *   is already going (the temple screen mounting again after a battle) and which the quest watch can call.
 * - The board is kept with the run (runs.questBoards) for a sync without a read (syncQuestRooms with no board).
 * - A caller holding a board can hand it over (TempleSystem.syncQuestRooms(templeId, board)).
 */
import { getActivePinia } from 'pinia';
import type { Achievement } from '@/lib/databases/AchievementDb';
import { getQuestEngine, type QuestBoardItem } from '@/lib/engine/quests/QuestEngine';
import type { HeroQuestEffects } from '@/lib/engine/quests/QuestSchedule';
import { isQuestRoom, roomQuestState, type RoomQuestOptions, type RoomQuestStatus } from '@/lib/services/temples/questRooms';
import { useUserStore } from '@/lib/store/stores/user';
import debug from '@/lib/utils/debug';
import type { Room } from '../types';
import { unsealRoom } from './doors';
import { clearedRoomKey } from './runState';
import type { TempleRuns } from './runState';

/** A hero's quest board as a sync reads it: their rows, every live quest of the family, and the effects it was read with */
export interface QuestRoomBoard {
  heroId: string;
  /** QuestEngine.getQuestBoardForUser for the hero */
  board: readonly QuestBoardItem[];
  /** QuestEngine.getAllQuests: tells a Game Master's pick that is not for this hero from a deleted one */
  liveQuests?: readonly Achievement[];
  /** The hero's item effects (snoozes, pull-ins, Gale's Wind) the board was read with */
  effects?: HeroQuestEffects;
}

/** What a sync changed, as `${level}:${row},${col}` keys */
export interface QuestRoomSync {
  /** Quest rooms that went into clearedRooms */
  added: string[];
  /** Quest rooms that came out of clearedRooms: their beasts lurk */
  removed: string[];
}

/** The statuses that leave a room to the classic rules */
const CLASSIC_RULES: readonly RoomQuestStatus[] = ['dormant', 'classic'];

const noChange = (): QuestRoomSync => ({ added: [], removed: [] });

/**
 * A quest room's status for the hero. Quests are the family's own data: one the rules cannot read leaves its room to
 * the classic rules (as dormant) instead of stopping the run from opening.
 */
const statusOf = (
  room: Room,
  heroId: string,
  board: readonly QuestBoardItem[],
  now: Date,
  opts: RoomQuestOptions,
  key: string
): RoomQuestStatus => {
  try {
    return roomQuestState(room, heroId, board, now, opts).status;
  } catch (error) {
    debug.warn(`[TempleSystem] could not read the quest of room ${key}; it keeps the classic rules`, error);
    return 'dormant';
  }
};

/**
 * Bring a hero's run in line with their board: every quest room that is not lurking into clearedRooms (its doors
 * opened if a fight had sealed them), every lurking one out. Dormant and classic rooms, and the temple's cleared
 * badge, are not touched. A room that turns lurking under the hero's feet is not sealed: rooms seal on entry.
 * Saves the run when anything changed. Does nothing unless the run is open for `heroId`.
 */
export function syncQuestRooms(
  runs: TempleRuns,
  templeId: string,
  heroId: string,
  board: readonly QuestBoardItem[],
  now: Date,
  opts: RoomQuestOptions = {}
): QuestRoomSync {
  const sync = noChange();
  const state = runs.templeStates[templeId];
  const temple = runs.dungeonManager.getDungeon(templeId);
  const isNotTheHerosRun = !state || !temple || runs.heroByTemple.get(templeId) !== String(heroId);
  if (isNotTheHerosRun) return sync;

  if (!state.clearedRooms) state.clearedRooms = new Set<string>();
  const won = state.clearedRooms;
  const floors = Array.isArray(temple.maze) ? { '1F': temple.maze } : temple.maze;
  for (const [level, grid] of Object.entries(floors)) {
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const room = temple.rooms[grid[row][col]];
        const isLeftToClassicRules = !room || !isQuestRoom(room);
        if (isLeftToClassicRules) continue;

        const position: [number, number] = [row, col];
        const key = clearedRoomKey(level, position);
        const status = statusOf(room, String(heroId), board, now, opts, key);
        const isKeptToClassicRules = CLASSIC_RULES.includes(status);
        if (isKeptToClassicRules) continue;

        const isLurking = status === 'lurking';
        if (isLurking) {
          const wasCleared = won.delete(key);
          if (wasCleared) sync.removed.push(key);
          continue;
        }
        const isNewlyCleared = !won.has(key);
        if (isNewlyCleared) {
          won.add(key);
          sync.added.push(key);
        }
        unsealRoom(runs, templeId, level, position);
      }
    }
  }

  const hasChanged = sync.added.length > 0 || sync.removed.length > 0;
  if (hasChanged) runs.queueSave(templeId);
  return sync;
}

/**
 * Sync with the board kept for the run: the hero's own, read last (readQuestBoard) or handed over. Nothing happens
 * when no board of the run's hero is kept yet.
 */
export function syncWithKeptBoard(runs: TempleRuns, templeId: string, now: Date = new Date()): QuestRoomSync {
  const kept = runs.questBoards.get(templeId);
  const heroId = runs.heroByTemple.get(templeId);
  const isNoBoardForThisRun = !kept || !heroId || kept.heroId !== heroId;
  if (isNoBoardForThisRun) return noChange();
  return syncQuestRooms(runs, templeId, heroId, kept.board, now, { effects: kept.effects, liveQuests: kept.liveQuests });
}

/**
 * Keep a hero's board with the run and sync with it. A board of anyone but the run's hero is ignored.
 */
export function keepBoardAndSync(runs: TempleRuns, templeId: string, board: QuestRoomBoard, now: Date = new Date()): QuestRoomSync {
  const isRunHero = runs.heroByTemple.get(templeId) === String(board.heroId);
  if (!isRunHero) return noChange();
  runs.questBoards.set(templeId, board);
  return syncWithKeptBoard(runs, templeId, now);
}

/** The hero's item effects, from their profile. None where no store is running (a spec, a worker). */
const heroQuestEffects = (heroId: string): HeroQuestEffects | undefined => {
  const hasStore = Boolean(getActivePinia());
  if (!hasStore) return undefined;
  return useUserStore().getUserById(heroId)?.questEffects as HeroQuestEffects | undefined;
};

/**
 * Read a hero's quest board the way the board screen does (QuestEngine, with the hero's item effects). Never throws:
 * a board that cannot be read is null, and the run keeps what it knew of its quest rooms.
 */
export async function readQuestBoard(heroId: string, now: Date = new Date()): Promise<QuestRoomBoard | null> {
  try {
    const effects = heroQuestEffects(heroId);
    const engine = getQuestEngine();
    const [board, liveQuests] = await Promise.all([
      engine.getQuestBoardForUser(heroId, now, undefined, effects),
      engine.getAllQuests(),
    ]);
    return { heroId, board, liveQuests, effects };
  } catch (error) {
    debug.warn(`[TempleSystem] could not read the quest board of ${heroId}; the quest rooms stay as they were`, error);
    return null;
  }
}

/**
 * Read the board of the run's hero again and sync with it. Resolves to what changed, or null when nothing was synced:
 * no hero, the board could not be read, the run went to another hero or a newer read took over meanwhile.
 */
export function refreshQuestRooms(runs: TempleRuns, templeId: string, now: Date = new Date()): Promise<QuestRoomSync | null> {
  const heroId = runs.heroByTemple.get(templeId);
  if (!heroId) return Promise.resolve(null);

  const read: Promise<QuestRoomSync | null> = readQuestBoard(heroId, now).then((board) => {
    const isLatest = runs.boardReads.get(templeId) === read;
    if (isLatest) runs.boardReads.delete(templeId);
    const isStillThisRun = isLatest && board && runs.heroByTemple.get(templeId) === heroId;
    if (!isStillThisRun) return null;
    return keepBoardAndSync(runs, templeId, board, now);
  });
  runs.boardReads.set(templeId, read);
  return read;
}

/** Resolves once the reads under way for the temple (the hero's save with their board, a board refresh) are in. */
export async function whenQuestRoomsReady(runs: TempleRuns, templeId: string): Promise<void> {
  await runs.reads.get(templeId);
  await runs.boardReads.get(templeId);
}
