/**
 * Temple System - Part of the Dungeon Engine
 *
 * Manages the temple-specific functionality including:
 * - Temple rooms and door states
 * - Special temple items (keys, maps, compasses)
 * - Player progression through temples, saved per hero in TempleProgressDb
 */

import { reactive } from 'vue';
import { DungeonManager } from './DungeonManager';
import { Dungeon, Room } from './types';
import { ChestSystem } from './ChestSystem';
import { getTempleProgressDb } from '@/lib/databases/TempleProgressDb';
import type { NewTempleProgress, TempleProgressEntry } from '@/lib/databases/TempleProgressDb';
import { TEMPLE_CLEARED_KEY } from './templeReset';
import type { BloodMoonCadence } from './bloodMoonSchedule';
import debug from '@/lib/utils/debug';
import * as runState from './templeSystem/runState';
import type { TempleRuns, TempleState } from './templeSystem/runState';
import * as doors from './templeSystem/doors';
import type { DoorKind, DoorState } from './templeSystem/doors';
import * as floors from './templeSystem/floors';
import * as chests from './templeSystem/chests';
import * as visibility from './templeSystem/visibility';
import { MapVisibility } from './templeSystem/visibility';
import * as heroRuns from './templeSystem/heroRuns';
import * as bloodMoons from './templeSystem/bloodMoons';
import * as questRooms from './templeSystem/questRooms';
import type { QuestRoomBoard, QuestRoomSync } from './templeSystem/questRooms';

export { TEMPLE_CLEARED_KEY };
export { bloodMoonRisen } from './templeSystem/runState';
export type { TempleState } from './templeSystem/runState';
export { BOSS_DOOR_LINE } from './templeSystem/doors';
export type { DoorKind, DoorState } from './templeSystem/doors';
export { MapVisibility } from './templeSystem/visibility';
export type { QuestRoomBoard, QuestRoomSync } from './templeSystem/questRooms';

export class TempleSystem {
  private static instance: TempleSystem;
  private dungeonManager: DungeonManager;
  private chestSystem: ChestSystem;

  // Track temple-specific state for each temple
  private templeStates: Record<string, TempleState> = reactive({});

  // How the layout authored the doors of each room moveToPosition has sealed, so clearing it can put them back
  private sealedRooms = new Map<string, NonNullable<Room['locked']>>();

  // The hero whose run each temple's state is. A temple opened without a hero lives in memory only.
  private heroByTemple = new Map<string, string>();

  // The hero's saved progress while it is being read back. Nothing is written for the temple meanwhile,
  // or the fresh run standing in until the read lands would overwrite the very record that is on its way.
  private reads = new Map<string, Promise<void>>();

  // Temples a blood moon reset, by the hero it reset them for, until the screen has shown it to that hero
  private risen = new Map<string, string>();

  // Saves waiting for the end of the tick, one per hero and temple (the newest wins), and the writes in flight
  private pendingSaves = new Map<string, NewTempleProgress>();
  private saveScheduled = false;
  private writes: Promise<void> = Promise.resolve();

  // The quest board each temple's quest rooms were last synced with, and a board read under way for a run already going
  private questBoards = new Map<string, QuestRoomBoard>();
  private boardReads = new Map<string, Promise<unknown>>();

  private constructor() {
    this.dungeonManager = DungeonManager.getInstance();
    this.chestSystem = ChestSystem.getInstance();
    debug.log('TempleSystem initialized');
  }
  
  public static getInstance(): TempleSystem {
    if (!TempleSystem.instance) {
      TempleSystem.instance = new TempleSystem();
    }
    return TempleSystem.instance;
  }

  /** The state above as the run rules in templeSystem/ reach into it: the same maps, shared by reference */
  private get runs(): TempleRuns {
    return {
      dungeonManager: this.dungeonManager,
      templeStates: this.templeStates,
      sealedRooms: this.sealedRooms,
      heroByTemple: this.heroByTemple,
      reads: this.reads,
      risen: this.risen,
      pendingSaves: this.pendingSaves,
      questBoards: this.questBoards,
      boardReads: this.boardReads,
      queueSave: (templeId) => this.queueSave(templeId),
      flushProgress: () => this.flushProgress()
    };
  }
  
  private clearedRoomKey(level: string, position: [number, number]): string {
    return runState.clearedRoomKey(level, position);
  }

  private floorsOf(temple: Dungeon): string[] {
    return floors.floorsOf(temple);
  }

  private canStandAt(templeId: string, level: string, position: [number, number]): boolean {
    return floors.canStandAt(this.runs, templeId, level, position);
  }

  private sealKey(templeId: string, level: string, position: [number, number]): string {
    return doors.sealKey(templeId, level, position);
  }

  private createTempleState(position: [number, number], level: string): TempleState {
    return runState.createTempleState(position, level);
  }

  private sealRoom(templeId: string, level: string, position: [number, number], room: Room): void {
    doors.sealRoom(this.runs, templeId, level, position, room);
  }

  private unsealRoom(templeId: string, level: string, position: [number, number]): void {
    doors.unsealRoom(this.runs, templeId, level, position);
  }

  /**
   * Remember that the beasts in a combat room were beaten and open the doors the fight sealed.
   * The win is saved with the hero's progress.
   *
   * The battle page calls this on a victory, and a hard reload there wipes every in-memory temple
   * (dungeons are registered when the temple screen mounts). So a missing state is created here, shaped
   * like initTemple's, with the hero standing in the room they just won.
   *
   * @param userId The hero who won. Without it the win lives in memory only, until the temple screen
   *               opens the temple for a hero (that hero takes the memory over and it is saved then).
   */
  public markRoomCleared(templeId: string, level: string, position: [number, number], userId?: string): void {
    heroRuns.markRoomCleared(this.runs, templeId, level, position, userId);
  }

  public isRoomCleared(templeId: string, level: string, position: [number, number]): boolean {
    return runState.isRoomCleared(this.runs, templeId, level, position);
  }

  /**
   * X's Invisibility: the doors a fight sealed open without the fight. The room is not cleared (and its quest room
   * state is not touched), so walking back in seals it again.
   */
  public slipOut(templeId: string, level: string, position: [number, number]): void {
    this.unsealRoom(templeId, level, position);
  }

  // --- Quest rooms follow the hero's quest board (docs/Quest-Rooms-Spec.md 7.1; templeSystem/questRooms.ts) ---

  /**
   * Bring the run's quest rooms in line with its hero's board: a quest room that is not lurking counts as cleared (no
   * fight, doors open), a lurking one does not (its doors seal on the next entry); dormant and classic rooms keep the
   * classic rules. The temple reads the board by itself when a run opens and when the screen opens a run already
   * going; call this to sync again without a read (a room entry), or with a board in hand.
   * @param board The hero's board (QuestEngine.getQuestBoardForUser) with every live quest and the effects it was
   *              read with. It is kept for the next sync. A board of anyone but the run's hero is ignored. Left
   *              out, the board kept last is used. A board read before a quest-room win was logged would put the
   *              beast back: after a win, refresh instead (refreshQuestRooms) once the log has the completion.
   * @returns The room keys that went in and came out of the cleared rooms
   */
  public syncQuestRooms(templeId: string, board?: QuestRoomBoard, now: Date = new Date()): QuestRoomSync {
    return board
      ? questRooms.keepBoardAndSync(this.runs, templeId, board, now)
      : questRooms.syncWithKeptBoard(this.runs, templeId, now);
  }

  /**
   * Read the board of the run's hero again (the QuestEngine, with their item effects) and sync with it: for the
   * return from a battle and the quest watch. Resolves to what changed, or null when nothing was synced (no hero, the
   * board could not be read, the run changed hands or a newer read took over).
   * @param now The moment the board is read for (the hero's day); now by default
   */
  public refreshQuestRooms(templeId: string, now?: Date): Promise<QuestRoomSync | null> {
    return questRooms.refreshQuestRooms(this.runs, templeId, now);
  }

  /** The board the run's quest rooms were last synced with, for the screen to word a room (roomQuestState). */
  public getQuestBoard(templeId: string): QuestRoomBoard | undefined {
    return this.questBoards.get(templeId);
  }

  /** Resolves once the reads under way for the temple (the hero's save with their board, a board refresh) are in. */
  public whenQuestRoomsReady(templeId: string): Promise<void> {
    return questRooms.whenQuestRoomsReady(this.runs, templeId);
  }

  /**
   * Initialize a temple
   * @param templeId The ID of the temple to initialize
   * @param startPosition Starting position [row, col] or [floorIndex, row, col]
   * @param startLevel Floor the start position is on, by name (e.g. "2F"). Wins over a floorIndex;
   *                   ignored when the temple has no such floor
   * @param userId The hero playing. Their saved progress in this temple (rooms visited and won, keys, map,
   *               compass, where they stand) is read back and from then on kept up to date. The start
   *               position only places a hero who has nothing saved: a saved run resumes where it stopped.
   *               Another hero's run still in memory is put away first. Without a hero nothing is saved.
   */
  public initTemple(templeId: string, startPosition?: number[], startLevel?: string, userId?: string): boolean {
    return heroRuns.initTemple(this.runs, templeId, startPosition, startLevel, userId);
  }

  /**
   * The temple's layout was replaced (the Game Master saved a change) while a hero's run in it is in memory: keep
   * the run. What the hero did (rooms visited and won, chests emptied, doors opened) is put back on the new rooms;
   * the hero stays where they stand if they can still stand there, else they are back at the entrance.
   * Does nothing for a temple without a run in memory.
   */
  public refreshRun(templeId: string): void {
    heroRuns.refreshRun(this.runs, templeId);
  }

  /** The hero whose run the temple's state is, if the temple was opened for one. */
  public getHeroId(templeId: string): string | undefined {
    return this.heroByTemple.get(templeId);
  }

  private openState(
    templeId: string,
    userId: string | undefined,
    position: [number, number],
    level: string,
    resume: boolean
  ): { state: TempleState; created: boolean } {
    return heroRuns.openState(this.runs, templeId, userId, position, level, resume);
  }

  private releaseTemple(templeId: string): void {
    heroRuns.releaseTemple(this.runs, templeId);
  }

  private forgetRun(templeId: string, unsaved = false): void {
    heroRuns.forgetRun(this.runs, templeId, unsaved);
  }

  /**
   * Drop the temple's run from memory without saving it, a save still waiting included, so the next visit starts from
   * what is stored. For a temple built again after the saved walks through it were cleared (the Moving House pack's
   * Old House): a run kept in memory would otherwise be put back on the new rooms (refreshRun) and saved over the clear.
   * Does nothing for a temple without a run in memory.
   */
  public forgetTempleRun(templeId: string): void {
    this.forgetRun(templeId, true);
  }

  /**
   * The hero leaves by the Portal Home item: their run is saved with the hero put back at the entrance, then put away,
   * so the next visit opens there (heroRuns.leaveByPortal). Everything else the run holds is kept.
   * Resolves once the save has reached storage.
   */
  public leaveByPortal(templeId: string): Promise<void> {
    heroRuns.leaveByPortal(this.runs, templeId);
    return this.flushSaves();
  }
  
  private migrateVisitedRooms(templeId: string): void {
    floors.migrateVisitedRooms(this.runs, templeId);
  }
  
  /**
   * Get the current state of a temple
   */
  public getTempleState(templeId: string): TempleState | undefined {
    return this.templeStates[templeId];
  }
  
  /**
   * Move to a new position in the temple
   * Returns false if movement is blocked
   */
  public moveToPosition(
    templeId: string, 
    newPosition: [number, number],
    direction: 'north' | 'south' | 'east' | 'west'
  ): boolean {
    return floors.moveToPosition(this.runs, templeId, newPosition, direction);
  }
  
  /**
   * Get the current room
   */
  public getCurrentRoom(templeId: string): Room | undefined {
    return runState.getCurrentRoom(this.runs, templeId);
  }
  
  /**
   * Mark a room as visited
   * @param level Floor the room is on; the floor the hero stands on when left out
   */
  public visitRoom(templeId: string, position: [number, number], level?: string): void {
    runState.visitRoom(this.runs, templeId, position, level);
  }

  /**
   * Take items out of the chest of a room. The chest counts as opened (and stays empty after a reload) only
   * once nothing is left in it; until then it keeps the rest, and a reload keeps out what was taken.
   * @param items Item names, the dungeon item, or `gold:<amount>`, as the chest reveal hands them back
   * @returns True when the chest is now empty
   */
  public takeFromChest(templeId: string, level: string, position: [number, number], items: string[]): boolean {
    return chests.takeFromChest(this.runs, templeId, level, position, items);
  }

  /**
   * Remember that the chest of a room was emptied, so a reload shows it empty instead of refilling it
   * @param level Floor the chest is on
   */
  public markChestOpened(templeId: string, level: string, position: [number, number]): void {
    chests.markChestOpened(this.runs, templeId, level, position);
  }

  /**
   * Check if a room on the floor the hero stands on has been visited
   */
  public hasVisited(templeId: string, position: [number, number]): boolean {
    return runState.hasVisited(this.runs, templeId, position);
  }
  
  private doorKey(level: string, position: [number, number], direction: DoorState['direction']): string {
    return doors.doorKey(level, position, direction);
  }

  private isBossDoor(there: Room | undefined): boolean {
    return doors.isBossDoor(there);
  }

  /**
   * What stands between the room at `position` and the room in `direction`: an open way, a small lock, the
   * boss door, or what the Game Master drew instead of a door: a `wall` no one passes, a `bombable` cracked wall only
   * a Bomb opens (blowBombableSide). A boss door stays `master` until it is opened with the Boss Key, bar or no bar on
   * the room in front of it; a wall room or the edge of the floor is no door at all and reads as open.
   * @param level Floor the room is on; the floor the hero stands on when left out
   */
  public doorKind(
    templeId: string,
    position: [number, number],
    direction: DoorState['direction'],
    level?: string
  ): DoorKind {
    return doors.doorKind(this.runs, templeId, position, direction, level);
  }

  /**
   * Why the door in `direction` will not open for the hero right now, in the temple's voice; null when it is
   * open or the hero has what it takes.
   */
  public explainDoor(templeId: string, position: [number, number], direction: DoorState['direction']): string | null {
    return doors.explainDoor(this.runs, templeId, position, direction);
  }

  private openDoor(templeId: string, level: string, position: [number, number], direction: DoorState['direction']): void {
    doors.openDoor(this.runs, templeId, level, position, direction);
  }

  /**
   * Unlock the door in `direction` of the room at `position`: a small key is spent on a small lock; the boss
   * door opens for a hero holding the master key, which is not spent. A small key never fits the boss door
   * (explainDoor says why in the temple's voice).
   * @returns True if the door was locked and is open now
   */
  public unlockDoor(
    templeId: string, 
    position: [number, number],
    direction: 'north' | 'south' | 'east' | 'west'
  ): boolean {
    return doors.unlockDoor(this.runs, templeId, position, direction);
  }
  
  /**
   * Open one locked side of a room without a key (a bomb, a solved riddle).
   * @param level Floor the room is on; the floor the hero stands on when left out
   * @returns True if the side was locked and is open now
   */
  public openDoorSide(
    templeId: string,
    position: [number, number],
    direction: 'north' | 'south' | 'east' | 'west',
    level?: string
  ): boolean {
    return doors.openDoorSide(this.runs, templeId, position, direction, level);
  }

  /**
   * Blow open the cracked wall on one side of a room, from both rooms, remembered with the hero's progress. A key and
   * a riddle never open it (unlockDoor and openDoorSide refuse), and neither does a fight's seal let a Bomb through.
   * @param level Floor the room is on; the floor the hero stands on when left out
   * @returns True if a cracked wall with a room beyond it was there and is open now
   */
  public blowBombableSide(
    templeId: string,
    position: [number, number],
    direction: 'north' | 'south' | 'east' | 'west',
    level?: string
  ): boolean {
    return doors.blowBombableSide(this.runs, templeId, position, direction, level);
  }

  /**
   * Open every locked door of a room and the matching door of each room it leads to (the side
   * facing it), so the way is open both ways. A fight's seal is not a door and stays.
   * @returns How many doors opened
   */
  public openDoorsAround(templeId: string, position: [number, number], level?: string): number {
    return doors.openDoorsAround(this.runs, templeId, position, level);
  }

  private isSealedByFight(templeId: string, level: string, position: [number, number]): boolean {
    return doors.isSealedByFight(this.runs, templeId, level, position);
  }

  /** The live seal: the beast bars the doors of this room right now (isSealedByFight is the authored rule, a guard room not yet won). */
  public isRoomBarred(templeId: string, level: string, position: [number, number]): boolean {
    return doors.isRoomBarred(this.runs, templeId, level, position);
  }

  /** Floors of a temple in the order the layout lists them ("1F" for a single grid). */
  public getFloors(templeId: string): string[] {
    return floors.getFloors(this.runs, templeId);
  }

  /**
   * Put the hero on another floor.
   * @returns False when the temple has no such floor or the hero cannot stand at that spot
   */
  public changeLevel(templeId: string, level: string, position: [number, number]): boolean {
    return floors.changeLevel(this.runs, templeId, level, position);
  }

  /** Reveal the whole temple to the hero: the map and the compass. */
  public grantMapAndCompass(templeId: string): boolean {
    return visibility.grantMapAndCompass(this.runs, templeId);
  }

  /**
   * Gaia's Quake: the secret rooms of `level` the hero has not stood in go on the map for the rest of the visit (not
   * saved); they show once the hero holds the map.
   * @returns How many it revealed: 0 when the floor hides none, or was revealed already
   */
  public revealSecrets(templeId: string, level: string): number {
    return visibility.revealSecrets(this.runs, templeId, level);
  }

  /** One more key in the hero's hand. */
  public addKey(templeId: string): boolean {
    return doors.addKey(this.runs, templeId);
  }

  /** The hero picked up the master key: it opens the boss door and the gate without waking the beast that guards it. */
  public grantMasterKey(templeId: string): boolean {
    return doors.grantMasterKey(this.runs, templeId);
  }

  public hasMasterKey(templeId: string): boolean {
    return doors.hasMasterKey(this.runs, templeId);
  }

  /** The hero opened the temple's gate. The win is saved with their progress. */
  public markTempleCleared(templeId: string): boolean {
    return runState.markTempleCleared(this.runs, templeId);
  }

  public isTempleCleared(templeId: string): boolean {
    return Boolean(this.templeStates[templeId]?.clearedRooms?.has(TEMPLE_CLEARED_KEY));
  }

  /** True once every boss room of the temple (on any floor) has been beaten. A temple without a boss room has nothing to beat. */
  public isBossBeaten(templeId: string): boolean {
    return runState.isBossBeaten(this.runs, templeId);
  }

  /**
   * Open a chest and collect its contents
   * @returns Object with collected items
   */
  public openChest(templeId: string): {
    items?: string[];
    specialItem?: string;
    keyFound?: boolean;
    mapFound?: boolean;
    compassFound?: boolean;
  } | undefined {
    return chests.openChest(this.runs, templeId);
  }
  
  /**
   * Check if a room is a specific type
   */
  public isRoomType(templeId: string, position: [number, number], type: string): boolean {
    return floors.isRoomType(this.runs, templeId, position, type);
  }
  
  /**
   * Step through the teleport circle the hero stands on. Where it leads is teleportPairing's business: the
   * author's target, else the next circle on the floor. Another floor is entered the way stairs do it.
   * @returns The new position after teleporting, or undefined when the circle leads nowhere
   */
  public handleTeleport(templeId: string): [number, number] | undefined {
    return floors.handleTeleport(this.runs, templeId);
  }

  /**
   * Get the visibility status for a room in the dungeon
   * @param templeId The temple ID
   * @param position Position [row, col] of the room to check
   * @returns MapVisibility enum indicating how the room should be displayed
   */
  public getRoomVisibility(templeId: string, position: [number, number]): MapVisibility {
    return visibility.getRoomVisibility(this.runs, templeId, position);
  }

  /**
   * Check if a room's details should be visible on the map
   * Details are visible if the room has been visited OR player has compass
   * @param templeId The temple ID
   * @param position Position [row, col] of the room
   * @returns boolean indicating if details should be shown
   */
  public shouldShowRoomDetails(templeId: string, position: [number, number]): boolean {
    return visibility.shouldShowRoomDetails(this.runs, templeId, position);
  }
  
  /**
   * Check if this position is the player's current position
   * @param templeId The temple ID
   * @param position Position [row, col] to check
   * @returns boolean indicating if this is the current position
   */
  public isCurrentPosition(templeId: string, position: [number, number]): boolean {
    return visibility.isCurrentPosition(this.runs, templeId, position);
  }
  
  /**
   * Get appropriate icon for a room based on its type and visibility state
   * @param position Position [row, col] of the room
   * @param iconMap Map of room types to icon classes
   * @returns Icon class to use for this room
   */
  public getRoomIcon(
    templeId: string, 
    position: [number, number],
    iconMap: Record<string, string>
  ): string {
    return visibility.getRoomIcon(this.runs, templeId, position, iconMap);
  }

  // --- Progress persistence (TempleProgressDb) ---

  /**
   * Save the hero's progress in a temple at the end of this tick. For code that changes the TempleState
   * directly (the chest dialog hands out keys, the map and the compass that way); every change made in
   * here saves itself.
   */
  public saveProgress(templeId: string): void {
    this.queueSave(templeId);
  }

  /** Resolves once the hero's saved progress in this temple has been read back and merged into the run. */
  public whenProgressReady(templeId: string): Promise<void> {
    return heroRuns.whenProgressReady(this.runs, templeId);
  }

  /** Resolves once every save queued so far has reached storage (a test, or code about to leave the page). */
  public flushProgress(): Promise<void> {
    return this.flushSaves();
  }

  private progressSnapshot(templeId: string): NewTempleProgress | undefined {
    return heroRuns.progressSnapshot(this.runs, templeId);
  }

  /**
   * Game Master action: the blood moon rises over a temple for a hero at `whenISO` (null takes it back). The
   * reset fires when the hero next enters after that time; a run open in memory learns the date too.
   * @returns The progress as saved, or null when the hero has none in that temple
   */
  public scheduleBloodMoon(templeId: string, userId: string, whenISO: string | null): Promise<TempleProgressEntry | null> {
    return bloodMoons.scheduleBloodMoon(this.runs, templeId, userId, whenISO);
  }

  /**
   * Game Master action: put the blood moon over a temple on a cadence for a hero (null takes it off). Weekly
   * without a date in hand schedules the first moon a week from now; after that each due moon that fires
   * re-schedules itself a week later (loadProgress), as does "rise now" (bloodMoon).
   * @returns The progress as saved, or null when the hero has none in that temple
   */
  public setBloodMoonEvery(templeId: string, userId: string, every: BloodMoonCadence | null): Promise<TempleProgressEntry | null> {
    return bloodMoons.setBloodMoonEvery(this.runs, templeId, userId, every);
  }

  /**
   * The blood moon rises over a temple now: the hero's saved progress is reset (templeReset.ts) and saved, and
   * a run of theirs in memory starts over from that record (beasts back, chests full, doors re-locked), with
   * the hero where they stood. For the Game Master's "reset now"; a scheduled moon (bloodMoonAt) fires by
   * itself when the hero next enters.
   * @returns The progress as saved, or null when the hero has none in that temple or it could not be read
   */
  public bloodMoon(templeId: string, userId: string): Promise<TempleProgressEntry | null> {
    return bloodMoons.bloodMoon(this.runs, templeId, userId);
  }

  /**
   * True once, for the hero the temple is open for, after a blood moon reset it: a scheduled one that fired
   * when their progress was read back, or one the Game Master raised at once. A moon raised over another
   * hero's run is kept for that hero's next visit.
   */
  public bloodMoonRose(templeId: string): boolean {
    return bloodMoons.bloodMoonRose(this.runs, templeId);
  }

  /**
   * Save the hero's progress at the end of the tick, the way userStore.persistUser does: changes made in
   * the same tick (a move marks the room visited and seals it, a win clears it and opens the doors) are one write.
   */
  private queueSave(templeId: string): void {
    const progress = this.progressSnapshot(templeId);
    if (!progress) return;

    this.pendingSaves.set(`${progress.userId}|${templeId}`, progress);
    if (this.saveScheduled) return;
    this.saveScheduled = true;
    queueMicrotask(() => void this.flushSaves());
  }

  private flushSaves(): Promise<void> {
    this.saveScheduled = false;
    const batch = Array.from(this.pendingSaves.values());
    this.pendingSaves.clear();
    if (batch.length === 0) return this.writes;

    // One batch after the other, so an older snapshot never lands after a newer one
    this.writes = this.writes.then(async () => {
      for (const progress of batch) {
        try {
          await getTempleProgressDb().saveProgress(progress);
        } catch (error) {
          debug.error(`Failed to save temple progress of ${progress.userId} in ${progress.templeId}`, error);
        }
      }
    });
    return this.writes;
  }

  private readSavedProgress(userId: string, templeId: string): Promise<TempleProgressEntry | null | undefined> {
    return heroRuns.readSavedProgress(userId, templeId);
  }

  private loadProgress(templeId: string, userId: string, resume: boolean): void {
    heroRuns.loadProgress(this.runs, templeId, userId, resume);
  }

  private applyProgress(
    templeId: string,
    saved: TempleProgressEntry,
    resumeFrom?: { level: string; row: number; col: number }
  ): void {
    heroRuns.applyProgress(this.runs, templeId, saved, resumeFrom);
  }
}
