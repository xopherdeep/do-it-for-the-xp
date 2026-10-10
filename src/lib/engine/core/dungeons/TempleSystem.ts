/**
 * Temple System - Part of the Dungeon Engine
 *
 * Manages the temple-specific functionality including:
 * - Temple rooms and door states
 * - Special temple items (keys, maps, compasses)
 * - Player progression through temples, saved per hero in TempleProgressDb
 */

import { reactive } from 'vue';
import { DungeonManager, roomPositionKey } from './DungeonManager';
import { Dungeon, Room } from './types';
import { ChestSystem } from './ChestSystem';
import { TempleHydrator } from './TempleHydrator';
import { getTempleProgressDb } from '@/lib/databases/TempleProgressDb';
import type { NewTempleProgress, TempleProgressEntry } from '@/lib/databases/TempleProgressDb';
import debug from '@/lib/utils/debug';

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
  /** The master key was picked up this run (kept in memory: the chests that hold it refill on a reload too) */
  hasMasterKey?: boolean;
}

/**
 * Stored in a hero's clearedRooms once they opened the temple's gate. It rides on the saved
 * clearedRooms list so the progress record keeps its documented fields; it is not a room, and
 * nothing parses it as one.
 */
export const TEMPLE_CLEARED_KEY = 'temple:cleared';

export interface DoorState {
  direction: 'north' | 'south' | 'east' | 'west';
  locked: boolean;
  requiresKey?: string;
}

// Map Visibility Types
export enum MapVisibility {
  NONE = 'none',           // Room not visible (no map)
  LAYOUT_ONLY = 'layout',  // Layout only visible (have map, no compass, not visited)
  FULL_DETAILS = 'full'    // Full details visible (visited or have compass)
}

// Every door of a room: a lockOnEnter fight seals all of them and winning opens them again
const DOOR_DIRECTIONS: DoorState['direction'][] = ['north', 'south', 'east', 'west'];

/** A `${level}:${row},${col}` key back into its parts (a floor name may hold a colon, the coordinates never do) */
const parseRoomKey = (key: string): { level: string; position: [number, number] } | null => {
  const split = key.lastIndexOf(':');
  const [row, col] = key.slice(split + 1).split(',').map(Number);
  if (split <= 0 || !Number.isInteger(row) || !Number.isInteger(col)) return null;
  return { level: key.slice(0, split), position: [row, col] };
};

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

  // Saves waiting for the end of the tick, one per hero and temple (the newest wins), and the writes in flight
  private pendingSaves = new Map<string, NewTempleProgress>();
  private saveScheduled = false;
  private writes: Promise<void> = Promise.resolve();

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
  
  private clearedRoomKey(level: string, position: [number, number]): string {
    return roomPositionKey(level, position);
  }

  /** Floor names of a temple; a single grid is just "1F" */
  private floorsOf(temple: Dungeon): string[] {
    return Array.isArray(temple.maze) ? ["1F"] : Object.keys(temple.maze);
  }

  /** True when the hero could stand there: the temple has that floor and the room is not a wall */
  private canStandAt(templeId: string, level: string, position: [number, number]): boolean {
    const temple = this.dungeonManager.getDungeon(templeId);
    if (!temple || !this.floorsOf(temple).includes(level)) return false;

    const room = this.dungeonManager.getRoom(templeId, position, level);
    return Boolean(room) && room?.type !== 'wall';
  }

  private sealKey(templeId: string, level: string, position: [number, number]): string {
    return `${templeId}|${this.clearedRoomKey(level, position)}`;
  }

  /** A fresh run through a temple: nothing found, nothing beaten, the hero standing at `position` on `level`. */
  private createTempleState(position: [number, number], level: string): TempleState {
    return reactive({
      hasMap: false,
      hasCompass: false,
      playerKeys: 0,
      currentPosition: position,
      currentLevel: level,
      visitedRooms: new Set<string>(),
      clearedRooms: new Set<string>()
    });
  }

  /**
   * Lock all 4 doors of a lockOnEnter room, the way moveToPosition does on first entry.
   * The doors as the layout authored them are remembered so unsealRoom can put them back.
   */
  private sealRoom(templeId: string, level: string, position: [number, number], room: Room): void {
    const key = this.sealKey(templeId, level, position);
    if (!this.sealedRooms.has(key)) this.sealedRooms.set(key, { ...room.locked });

    if (!room.locked) room.locked = {};
    for (const direction of DOOR_DIRECTIONS) room.locked[direction] = true;
  }

  /**
   * Undo sealRoom: every door goes back to how the layout authored it, so a key door stays a key door.
   * A room that was never sealed this session (a reload put the hero in it) has nothing to undo.
   */
  private unsealRoom(templeId: string, level: string, position: [number, number]): void {
    const key = this.sealKey(templeId, level, position);
    const authored = this.sealedRooms.get(key);
    if (!authored) return;
    this.sealedRooms.delete(key);

    const room = this.dungeonManager.getRoom(templeId, position, level);
    if (!room?.locked) return;
    for (const direction of DOOR_DIRECTIONS) room.locked[direction] = authored[direction] ?? false;
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
    // The hero stands in the room they just won, wherever the save says they were
    const { state, created } = this.openState(templeId, userId, [position[0], position[1]], level, false);
    if (created) this.visitRoom(templeId, position);

    if (!state.clearedRooms) state.clearedRooms = new Set<string>();
    state.clearedRooms.add(this.clearedRoomKey(level, position));
    this.unsealRoom(templeId, level, position);
    this.queueSave(templeId);
  }

  public isRoomCleared(templeId: string, level: string, position: [number, number]): boolean {
    return Boolean(this.templeStates[templeId]?.clearedRooms?.has(this.clearedRoomKey(level, position)));
  }

  /**
   * Register a dungeon from a DSL blueprint
   */
  public registerDungeonFromDSL(blueprint: string, dungeonId: string, dungeonName: string): boolean {
    try {
      const dungeon = TempleHydrator.hydrate(blueprint, dungeonId, dungeonName);
      this.dungeonManager.registerDungeon(dungeon);
      return true;
    } catch (error) {
      debug.error(`Failed to register dungeon from DSL: ${error}`);
      return false;
    }
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
    // Check if the dungeon exists
    const temple = this.dungeonManager.getDungeon(templeId);
    if (!temple) {
      debug.error(`Temple ${templeId} not found`);
      return false;
    }

    // Determine starting position and level
    let finalPos: [number, number] = [0, 0];
    let finalLevel = "1F";

    const entrance = startPosition || temple.entrance || [0, 0];
    const floors = this.floorsOf(temple);

    if (entrance.length === 3) {
      // If we have 3 coordinates, assume [floorIndex, row, col]
      // where floorIndex is an index into the keys of the maze object
      finalLevel = floors[entrance[0]] || floors[0];
      finalPos = [entrance[1], entrance[2]];
    } else {
      finalPos = [entrance[0], entrance[1]];
    }

    // A floor named outright (the battle page hands back "2F", not an index) beats the guess above
    if (startLevel && floors.includes(startLevel)) finalLevel = startLevel;

    // Create temple state if it doesn't exist
    const { state } = this.openState(templeId, userId, finalPos, finalLevel, true);

    // Migrate any previously visited rooms
    this.migrateVisitedRooms(templeId);

    // Mark the room the hero stands in as visited (a run that was already going stays where it is)
    this.visitRoom(templeId, state.currentPosition);
    return true;
  }

  /** The hero whose run the temple's state is, if the temple was opened for one. */
  public getHeroId(templeId: string): string | undefined {
    return this.heroByTemple.get(templeId);
  }

  /**
   * The state of a temple for a hero: the run already going in memory, or a fresh one starting at
   * `position` on `level`. A hero's saved progress is read back as soon as they are tied to the temple.
   * @param resume Whether a fresh run moves to where the saved progress left the hero, once it is read
   */
  private openState(
    templeId: string,
    userId: string | undefined,
    position: [number, number],
    level: string,
    resume: boolean
  ): { state: TempleState; created: boolean } {
    // Another hero's run: theirs is saved as it stands, then this hero gets the temple as the layout made it
    const bound = this.heroByTemple.get(templeId);
    if (userId && bound && bound !== userId) this.releaseTemple(templeId);

    const created = !this.templeStates[templeId];
    if (created) this.templeStates[templeId] = this.createTempleState(position, level);

    // A run nobody owned yet (a win reported without a hero) is taken over, what it holds is merged with the save
    if (userId && this.heroByTemple.get(templeId) !== userId) {
      this.heroByTemple.set(templeId, userId);
      this.loadProgress(templeId, userId, created && resume);
    }

    return { state: this.templeStates[templeId], created };
  }

  /** Put a temple's run away: the hero's last changes are queued for saving, then the state, seals and dungeon reset. */
  private releaseTemple(templeId: string): void {
    this.queueSave(templeId);

    delete this.templeStates[templeId];
    this.heroByTemple.delete(templeId);
    this.reads.delete(templeId);
    for (const key of Array.from(this.sealedRooms.keys())) {
      if (key.startsWith(`${templeId}|`)) this.sealedRooms.delete(key);
    }
    // Chests full again and doors as the layout made them, for whoever plays next
    this.dungeonManager.resetDungeon(templeId);
  }
  
  /**
   * Migrate visited room data from the old system to the new coordinate-based system
   * This ensures any rooms that were marked as visited before the system change
   * are still shown as visited in the map
   */
  private migrateVisitedRooms(templeId: string): void {
    const temple = this.dungeonManager.getDungeon(templeId);
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
        if (!room || room.type === 'wall') continue;
        
          // Check if this room was marked as visited in the old system
          if ((room as any).visited === true) {
            // Mark it as visited in the new coordinate-based system
            const posKey = roomPositionKey(floorId, [row, col]);
            temple.visitedPositions.add(posKey);
            
            // Also add it to TempleState's visitedRooms for complete consistency
            const templeState = this.templeStates[templeId];
            if (templeState) {
              templeState.visitedRooms.add(posKey);
            }
          }
        }
      }
    });
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
    const temple = this.dungeonManager.getDungeon(templeId);
    const templeState = this.templeStates[templeId];
    
    if (!temple || !templeState) return false;
    
    const level = templeState.currentLevel;
    
    // Get current room and check if the door is locked
    const currentRoom = this.getCurrentRoom(templeId);
    if (!currentRoom) return false;
    
    // Check if the door is locked in the direction of movement
    if (currentRoom.locked?.[direction]) {
      return false;
    }
    
    // Check if the destination is a wall
    const destRoom = this.dungeonManager.getRoom(templeId, newPosition, level);
    if (!destRoom || destRoom.type === 'wall') return false;
    
    // Move to the new position
    templeState.currentPosition = [...newPosition];
    
    // Check for lockOnEnter (combat rooms that lock doors on entry)
    // Only lock if the room hasn't been visited yet (to avoid re-locking on re-entry if cleared)
    if (destRoom.content?.lockOnEnter && !this.hasVisited(templeId, newPosition)) {
      // Lock all 4 directions (markRoomCleared opens them again after the fight)
      this.sealRoom(templeId, level, newPosition, destRoom);

      debug.log(`Room at ${newPosition} locked on enter!`);
    }

    // Mark the new room as visited
    this.visitRoom(templeId, newPosition);
    
    return true;
  }
  
  /**
   * Get the current room
   */
  public getCurrentRoom(templeId: string): Room | undefined {
    const templeState = this.templeStates[templeId];
    if (!templeState) return undefined;
    
    return this.dungeonManager.getRoom(templeId, templeState.currentPosition, templeState.currentLevel);
  }
  
  /**
   * Mark a room as visited
   * @param level Floor the room is on; the floor the hero stands on when left out
   */
  public visitRoom(templeId: string, position: [number, number], level?: string): void {
    const templeState = this.templeStates[templeId];
    if (!templeState) return;

    const floor = level ?? templeState.currentLevel;

    // Add to the set of visited rooms
    templeState.visitedRooms.add(roomPositionKey(floor, position));

    // Also mark it as visited in the dungeon manager
    this.dungeonManager.visitRoom(templeId, position, floor);

    // Every move, teleport and first visit ends up here: this is where the hero's new position is saved
    this.queueSave(templeId);
  }

  /**
   * Check if a room on the floor the hero stands on has been visited
   */
  public hasVisited(templeId: string, position: [number, number]): boolean {
    const templeState = this.templeStates[templeId];
    if (!templeState) return false;

    // Check coordinate-based visited status in DungeonManager first
    if (this.dungeonManager.hasVisited(templeId, position, templeState.currentLevel)) {
      return true;
    }

    // Fall back to the TempleState's visitedRooms set (for backward compatibility)
    return templeState.visitedRooms.has(roomPositionKey(templeState.currentLevel, position));
  }
  
  /**
   * Unlock a door in a specific direction
   * @returns True if door was successfully unlocked
   */
  public unlockDoor(
    templeId: string, 
    position: [number, number],
    direction: 'north' | 'south' | 'east' | 'west'
  ): boolean {
    const templeState = this.templeStates[templeId];
    if (!templeState || templeState.playerKeys <= 0) return false;
    
    const room = this.dungeonManager.getRoom(templeId, position, templeState.currentLevel);
    if (!room || !room.locked?.[direction]) return false;
    
    // Create a new locked state with the specific direction unlocked
    const newLocked = { ...room.locked, [direction]: false };
    
    // Update the room's locked state
    room.locked = newLocked;
    
    // Use a key
    templeState.playerKeys -= 1;
    this.queueSave(templeId);

    return true;
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
    const templeState = this.templeStates[templeId];
    if (!templeState) return false;

    const room = this.dungeonManager.getRoom(templeId, position, level ?? templeState.currentLevel);
    if (!room?.locked?.[direction]) return false;

    room.locked = { ...room.locked, [direction]: false };
    return true;
  }

  /**
   * Open every locked door of a room and the matching door of each room it leads to (the side
   * facing it), so the way is open both ways. A fight's seal is not a door and stays.
   * @returns How many doors opened
   */
  public openDoorsAround(templeId: string, position: [number, number], level?: string): number {
    const templeState = this.templeStates[templeId];
    if (!templeState) return 0;

    const floor = level ?? templeState.currentLevel;
    const opposite = { north: 'south', south: 'north', east: 'west', west: 'east' } as const;
    const step = { north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1] } as const;
    let opened = 0;

    const sealedHere = this.isSealedByFight(templeId, floor, position);
    for (const direction of DOOR_DIRECTIONS) {
      if (!sealedHere && this.openDoorSide(templeId, position, direction, floor)) opened++;

      const next: [number, number] = [position[0] + step[direction][0], position[1] + step[direction][1]];
      const neighbour = this.dungeonManager.getRoom(templeId, next, floor);
      if (!neighbour || neighbour.type === 'wall' || this.isSealedByFight(templeId, floor, next)) continue;
      if (this.openDoorSide(templeId, next, opposite[direction], floor)) opened++;
    }
    return opened;
  }

  /** A combat room that seals its doors on entry and has not been won yet. */
  private isSealedByFight(templeId: string, level: string, position: [number, number]): boolean {
    const room = this.dungeonManager.getRoom(templeId, position, level);
    return Boolean(room?.content?.lockOnEnter) && !this.isRoomCleared(templeId, level, position);
  }

  /** Floors of a temple in the order the layout lists them ("1F" for a single grid). */
  public getFloors(templeId: string): string[] {
    const temple = this.dungeonManager.getDungeon(templeId);
    return temple ? this.floorsOf(temple) : [];
  }

  /**
   * Put the hero on another floor.
   * @returns False when the temple has no such floor or the hero cannot stand at that spot
   */
  public changeLevel(templeId: string, level: string, position: [number, number]): boolean {
    const templeState = this.templeStates[templeId];
    if (!templeState || !this.canStandAt(templeId, level, position)) return false;

    templeState.currentLevel = level;
    templeState.currentPosition = [position[0], position[1]];
    this.visitRoom(templeId, templeState.currentPosition, level);
    return true;
  }

  /** Reveal the whole temple to the hero: the map and the compass. */
  public grantMapAndCompass(templeId: string): boolean {
    const templeState = this.templeStates[templeId];
    if (!templeState) return false;

    templeState.hasMap = true;
    templeState.hasCompass = true;
    this.queueSave(templeId);
    return true;
  }

  /** One more key in the hero's hand. */
  public addKey(templeId: string): boolean {
    const templeState = this.templeStates[templeId];
    if (!templeState) return false;
    templeState.playerKeys += 1;
    this.queueSave(templeId);
    return true;
  }

  /** The hero picked up the master key (it opens the gate without waking the beast that guards it). */
  public grantMasterKey(templeId: string): boolean {
    const templeState = this.templeStates[templeId];
    if (!templeState) return false;
    templeState.hasMasterKey = true;
    return true;
  }

  public hasMasterKey(templeId: string): boolean {
    return Boolean(this.templeStates[templeId]?.hasMasterKey);
  }

  /** The hero opened the temple's gate. The win is saved with their progress. */
  public markTempleCleared(templeId: string): boolean {
    const templeState = this.templeStates[templeId];
    if (!templeState) return false;

    if (!templeState.clearedRooms) templeState.clearedRooms = new Set<string>();
    templeState.clearedRooms.add(TEMPLE_CLEARED_KEY);
    this.queueSave(templeId);
    return true;
  }

  public isTempleCleared(templeId: string): boolean {
    return Boolean(this.templeStates[templeId]?.clearedRooms?.has(TEMPLE_CLEARED_KEY));
  }

  /** True once every boss room of the temple (on any floor) has been beaten. A temple without a boss room has nothing to beat. */
  public isBossBeaten(templeId: string): boolean {
    const temple = this.dungeonManager.getDungeon(templeId);
    if (!temple) return false;

    const floors = Array.isArray(temple.maze) ? { '1F': temple.maze } : temple.maze;
    for (const [floor, grid] of Object.entries(floors)) {
      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
          if (temple.rooms[grid[row][col]]?.type === 'boss' && !this.isRoomCleared(templeId, floor, [row, col])) {
            return false;
          }
        }
      }
    }
    return true;
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
    const templeState = this.templeStates[templeId];
    if (!templeState) return undefined;
    
    const chestContent = this.dungeonManager.openChestInRoom(
      templeId,
      templeState.currentPosition,
      templeState.currentLevel
    );
    
    if (!chestContent) return undefined;
    
    const result: {
      items?: string[];
      specialItem?: string;
      keyFound?: boolean;
      mapFound?: boolean;
      compassFound?: boolean;
    } = {};
    
    // Process items
    if (chestContent.items && chestContent.items.length > 0) {
      result.items = chestContent.items;
      
      // Check for special items
      chestContent.items.forEach(item => {
        if (item === 'key') {
          templeState.playerKeys++;
          result.keyFound = true;
        }
      });
      
      // Remove the items from the chest
      this.dungeonManager.removeItemsFromRoomChest(
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
      this.dungeonManager.removeItemsFromRoomChest(
        templeId,
        templeState.currentPosition,
        [chestContent.dungeon],
        templeState.currentLevel
      );
    }

    // Keys, the map and the compass are part of the hero's progress
    this.queueSave(templeId);

    return result;
  }
  
  /**
   * Check if a room is a specific type
   */
  public isRoomType(templeId: string, position: [number, number], type: string): boolean {
    const templeState = this.templeStates[templeId];
    const level = templeState?.currentLevel || "1F";
    const room = this.dungeonManager.getRoom(templeId, position, level);
    return room?.type === type;
  }
  
  /**
   * Handle teleport action between teleport rooms
   * @returns The new position after teleporting, or undefined if teleport failed
   */
  public handleTeleport(templeId: string): [number, number] | undefined {
    const templeState = this.templeStates[templeId];
    if (!templeState) return undefined;
    
    const temple = this.dungeonManager.getDungeon(templeId);
    if (!temple) return undefined;
    
    // Current position
    const [currentRow, currentCol] = templeState.currentPosition;
    
    // Find another teleport room
    let destPosition: [number, number] | undefined;
    
    // Search for other teleport rooms
    const mazeData = temple.maze;
    const floors = Array.isArray(mazeData) ? { "1F": mazeData } : mazeData;

    for (const [floorId, grid] of Object.entries(floors)) {
      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
          // Skip the current room
          if (floorId === templeState.currentLevel && row === currentRow && col === currentCol) continue;
          
          const roomKey = grid[row][col];
          const room = temple.rooms[roomKey];
          
          // If we find another teleport room, use it as destination
          if (room && room.type === 'teleport') {
            destPosition = [row, col];
            templeState.currentLevel = floorId;
            break;
          }
        }
        if (destPosition) break;
      }
      if (destPosition) break;
    }
    
    // If no other teleport room found, return undefined
    if (!destPosition) return undefined;
    
    // Update position and mark room as visited
    templeState.currentPosition = destPosition;
    this.visitRoom(templeId, destPosition);
    
    return destPosition;
  }

  /**
   * Get the visibility status for a room in the dungeon
   * @param templeId The temple ID
   * @param position Position [row, col] of the room to check
   * @returns MapVisibility enum indicating how the room should be displayed
   */
  public getRoomVisibility(templeId: string, position: [number, number]): MapVisibility {
    const templeState = this.templeStates[templeId];
    if (!templeState) return MapVisibility.NONE;
    
    // Room not shown if player doesn't have map
    if (!templeState.hasMap) return MapVisibility.NONE;
    
    // Get the room to check if it's a wall
    const room = this.dungeonManager.getRoom(templeId, position, templeState.currentLevel);
    
    // Always show walls when the player has the map (even if not visited)
    if (room?.type === 'wall') {
      return MapVisibility.LAYOUT_ONLY;
    }
    
    // Check if room has been visited
    const isVisited = this.hasVisited(templeId, position);

    // A secret chamber stays off the map, compass or not, until the hero has stood in it
    if (room?.type === 'secret' && !isVisited) return MapVisibility.NONE;
    
    // Return full details if the room is visited or player has compass
    if (isVisited || templeState.hasCompass) {
      return MapVisibility.FULL_DETAILS;
    }
    
    // If player has map but not compass and hasn't visited, show layout only
    return MapVisibility.LAYOUT_ONLY;
  }

  /**
   * Check if a room's details should be visible on the map
   * Details are visible if the room has been visited OR player has compass
   * @param templeId The temple ID
   * @param position Position [row, col] of the room
   * @returns boolean indicating if details should be shown
   */
  public shouldShowRoomDetails(templeId: string, position: [number, number]): boolean {
    const templeState = this.templeStates[templeId];
    if (!templeState || !templeState.hasMap) return false;

    const visited = this.hasVisited(templeId, position);
    if (!visited && this.dungeonManager.getRoom(templeId, position, templeState.currentLevel)?.type === 'secret') return false;
    
    return templeState.hasCompass || visited;
  }
  
  /**
   * Check if this position is the player's current position
   * @param templeId The temple ID
   * @param position Position [row, col] to check
   * @returns boolean indicating if this is the current position
   */
  public isCurrentPosition(templeId: string, position: [number, number]): boolean {
    const templeState = this.templeStates[templeId];
    if (!templeState) return false;
    
    const [currentRow, currentCol] = templeState.currentPosition;
    const [checkRow, checkCol] = position;
    
    return currentRow === checkRow && currentCol === checkCol;
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
    const templeState = this.templeStates[templeId];
    if (!templeState || !templeState.hasMap) return 'fa-question';
    
    // Always show player's current position if player has map
    if (this.isCurrentPosition(templeId, position)) {
      return 'fa-walking';
    }
    
    const room = this.dungeonManager.getRoom(templeId, position, templeState.currentLevel);
    if (!room) return 'fa-question';
    
    const isVisited = this.hasVisited(templeId, position);
    
    // If room hasn't been visited and player doesn't have compass
    if (!isVisited && !templeState.hasCompass) {
      return 'fa-question';
    }
    
    // Return appropriate icon based on room type
    return iconMap[room.type] || 'fa-dungeon';
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
    return this.reads.get(templeId) ?? Promise.resolve();
  }

  /** Resolves once every save queued so far has reached storage (a test, or code about to leave the page). */
  public flushProgress(): Promise<void> {
    return this.flushSaves();
  }

  /** What the hero's save should say right now; nothing without a hero, or while their save is still being read. */
  private progressSnapshot(templeId: string): NewTempleProgress | undefined {
    const userId = this.heroByTemple.get(templeId);
    const state = this.templeStates[templeId];
    if (!userId || !state || this.reads.has(templeId)) return undefined;

    return {
      userId,
      templeId,
      currentLevel: state.currentLevel,
      currentPosition: [state.currentPosition[0], state.currentPosition[1]],
      hasMap: state.hasMap,
      hasCompass: state.hasCompass,
      playerKeys: state.playerKeys,
      visitedRooms: Array.from(state.visitedRooms),
      clearedRooms: Array.from(state.clearedRooms ?? [])
    };
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

  /** A hero's saved progress in a temple: null when there is none, undefined when it could not be read. */
  private async readSavedProgress(userId: string, templeId: string): Promise<TempleProgressEntry | null | undefined> {
    try {
      return await getTempleProgressDb().getProgress(userId, templeId);
    } catch (error) {
      debug.error(`Failed to read temple progress of ${userId} in ${templeId}`, error);
      return undefined;
    }
  }

  /**
   * Read the hero's saved progress and merge it into the run that stands in for it meanwhile.
   * @param resume Put the hero back where they stopped: for a run that has just started, not one already going
   */
  private loadProgress(templeId: string, userId: string, resume: boolean): void {
    const state = this.templeStates[templeId];
    const start = { level: state.currentLevel, row: state.currentPosition[0], col: state.currentPosition[1] };

    const read: Promise<void> = this.readSavedProgress(userId, templeId).then(saved => {
      // Not when the temple went to another hero while the save was on its way
      if (this.reads.get(templeId) !== read) return;

      let readable = saved !== undefined;
      if (saved) {
        try {
          this.applyProgress(templeId, saved, resume ? start : undefined);
        } catch (error) {
          debug.error(`Failed to merge temple progress of ${userId} in ${templeId}`, error);
          readable = false;
        }
      }
      this.reads.delete(templeId);

      if (!readable) {
        // Not knowing what is saved, the run must not be saved over it. The next visit tries the read again.
        this.heroByTemple.delete(templeId);
        return;
      }
      // The merged run is the hero's progress from here on (for a hero with nothing saved: the start of it)
      this.queueSave(templeId);
    });
    this.reads.set(templeId, read);
  }

  private applyProgress(
    templeId: string,
    saved: TempleProgressEntry,
    resumeFrom?: { level: string; row: number; col: number }
  ): void {
    const state = this.templeStates[templeId];
    if (!state) return;

    // Merged, not replaced: the run standing in may already hold a win or a visit of its own
    state.hasMap = state.hasMap || saved.hasMap;
    state.hasCompass = state.hasCompass || saved.hasCompass;
    state.playerKeys = Math.max(state.playerKeys, saved.playerKeys);
    if (!state.clearedRooms) state.clearedRooms = new Set<string>();
    for (const key of saved.clearedRooms) state.clearedRooms.add(key);
    for (const key of saved.visitedRooms) {
      state.visitedRooms.add(key);
      const visited = parseRoomKey(key);
      if (visited) this.dungeonManager.visitRoom(templeId, visited.position, visited.level);
    }

    // Back to where the hero stopped, unless they already moved on or that room is gone from the layout
    const [row, col] = state.currentPosition;
    const atStart = resumeFrom && state.currentLevel === resumeFrom.level && row === resumeFrom.row && col === resumeFrom.col;
    if (!atStart || !this.canStandAt(templeId, saved.currentLevel, saved.currentPosition)) return;

    state.currentLevel = saved.currentLevel;
    state.currentPosition = [saved.currentPosition[0], saved.currentPosition[1]];
    this.visitRoom(templeId, state.currentPosition);

    // A fight left unfinished still holds the hero: a reload does not open the doors
    const room = this.dungeonManager.getRoom(templeId, state.currentPosition, state.currentLevel);
    if (room?.content?.lockOnEnter && !this.isRoomCleared(templeId, state.currentLevel, state.currentPosition)) {
      this.sealRoom(templeId, state.currentLevel, state.currentPosition, room);
    }
  }
}