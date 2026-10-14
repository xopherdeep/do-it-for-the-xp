/**
 * DungeonManager - Part of the Dungeon Engine
 * 
 * Bridges between the game's dungeon system and the engine components.
 * Handles initialization of dungeons, rooms, and manages room content like chests.
 */

import { ChestSystem, ChestContent } from './ChestSystem';
import { Room, Dungeon } from './types';
import { asChestRoom } from '@/lib/services/temples/ChestLoot';
import { chestDungeonItem } from '@/lib/services/temples/roomGrants';
import { reactive } from 'vue';
import debug from '@/lib/utils/debug';

/**
 * Key of one room of a dungeon. The floor comes first, so the room at [0, 1] on 1F and the one
 * at [0, 1] on 2F are two different rooms (visited, cleared, ...).
 */
export const roomPositionKey = (level: string, position: readonly number[]): string =>
  `${level}:${position[0]},${position[1]}`;

/** A dungeon as its layout made it: nothing visited, no chest touched, no door opened or sealed. */
const copyLayout = (dungeon: Dungeon): Dungeon => {
  const copy: Dungeon = {
    ...dungeon,
    maze: JSON.parse(JSON.stringify(dungeon.maze)),
    rooms: JSON.parse(JSON.stringify(dungeon.rooms)),
    visitedPositions: new Set<string>()
  };
  if (dungeon.entrance) copy.entrance = [...dungeon.entrance];
  return copy;
};

export class DungeonManager {
  private static instance: DungeonManager;
  private dungeons: Record<string, Dungeon> = reactive({});
  // Each registered dungeon as it was handed in, for resetDungeon
  private layouts = new Map<string, Dungeon>();
  private chestSystem: ChestSystem;

  private constructor() {
    this.chestSystem = ChestSystem.getInstance();
    debug.log('DungeonManager initialized');
  }

  public static getInstance(): DungeonManager {
    if (!DungeonManager.instance) {
      DungeonManager.instance = new DungeonManager();
    }
    return DungeonManager.instance;
  }

  /**
   * Register a dungeon with the manager
   */
  public registerDungeon(dungeon: Dungeon): void {
    // Initialize visitedPositions if not already present
    if (!dungeon.visitedPositions) {
      dungeon.visitedPositions = new Set<string>();
    }
    // A Dragon Egg or `master` room is the Pegasus chest, and a Dungeon Item chest holds the ids the take path knows
    // (the editor's "small-key" is the small key): rooms are put right before their chests are made
    if (dungeon.rooms) {
      dungeon.rooms = Object.fromEntries(Object.entries(dungeon.rooms).map(([key, room]) => [key, asChestRoom(room, dungeon.id)]));
    }
    // Copied before initializeChests writes chest ids into the rooms and before anyone plays in them
    this.layouts.set(dungeon.id, copyLayout(dungeon));
    this.dungeons[dungeon.id] = reactive(dungeon);
    this.initializeChests(dungeon.id);
  }

  /**
   * Put a registered dungeon back the way it was registered: chests full again, doors as the layout
   * made them, nothing visited. Used when another hero takes over a temple.
   * @returns False when no such dungeon is registered
   */
  public resetDungeon(dungeonId: string): boolean {
    const layout = this.layouts.get(dungeonId);
    if (!layout) return false;

    this.registerDungeon(copyLayout(layout));
    return true;
  }
  
  /**
   * Get a dungeon by ID
   */
  public getDungeon(dungeonId: string): Dungeon | undefined {
    return this.dungeons[dungeonId];
  }
  
  /**
   * Initialize chests for a dungeon based on room content
   */
  private initializeChests(dungeonId: string): void {
    const dungeon = this.dungeons[dungeonId];
    if (!dungeon) return;
    
    // Scan the maze to find chest locations
    const maze = dungeon.maze;
    const floors = Array.isArray(maze) ? { "1F": maze } : maze;

    Object.entries(floors).forEach(([floorId, grid]) => {
      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row]?.length || 0; col++) {
          const roomKey = grid[row][col];
          const room = dungeon.rooms[roomKey];
        
          // If this room has a chest, create a chest in the chest system
          if (room && room.type === 'loot' && room.content) {
            const chestContent: ChestContent = {};
            
            // Map room content to chest content: the items whatever the chest is called ("loot", "random"...),
            // copied so the chest and the room each keep their own list
            if (room.content.items?.length) {
              chestContent.items = [...room.content.items];
            }
            // The dungeon item is the one the audit and the solver count too (roomGrants): only a Dungeon Item chest holds one
            const dungeonItem = chestDungeonItem(room);
            if (dungeonItem) {
              chestContent.dungeon = dungeonItem;
            }
            const gold = Math.floor(Number(room.content.gold) || 0);
            if (gold > 0) {
              chestContent.gold = gold;
            }
            
            // Create a chest with position information
            const chestId = `${dungeonId}:chest:${floorId}:${row}:${col}`;
            const isLocked = !!room.content.locked;
            const requiresKey = room.content.requiresKey || undefined;
            
            this.chestSystem.createChest(
              chestId,
              room.content.rarity || 'common',
              chestContent,
              [row, col],
              isLocked,
              requiresKey
            );
            
            // Link the chest ID back to the room content for reference
            room.content.chestId = chestId;
          }
        }
      }
    });
  }
  
  /**
   * Helper to get a normalized 2D grid for a specific level
   */
  public getMazeGrid(dungeonId: string, level: string = "1F"): string[][] {
    const dungeon = this.dungeons[dungeonId];
    if (!dungeon) return [];
    
    if (Array.isArray(dungeon.maze)) {
      return dungeon.maze;
    }
    
    return dungeon.maze[level] || [];
  }
  
  /**
   * Get a room at a specific position in a dungeon
   */
  public getRoom(dungeonId: string, position: [number, number], level: string = "1F"): Room | undefined {
    const dungeon = this.dungeons[dungeonId];
    if (!dungeon) return undefined;
    
    const [row, col] = position;
    const grid = this.getMazeGrid(dungeonId, level);
    
    const hasNoRoomThere = !grid[row] || !grid[row][col];
    if (hasNoRoomThere) return undefined;
    
    const roomKey = grid[row][col];
    return dungeon.rooms[roomKey];
  }
  
  /**
   * Open a chest in a room
   * @param level Floor the room is on
   * @returns The chest contents or undefined if no chest exists or it's empty
   */
  public openChestInRoom(dungeonId: string, position: [number, number], level: string = "1F"): ChestContent | undefined {
    // The room knows its chest: looking one up by [row, col] alone would find the chest of another floor
    const room = this.getRoom(dungeonId, position, level);
    if (room?.content?.chestId) {
      return this.chestSystem.openChest(room.content.chestId);
    }

    return undefined;
  }

  /**
   * Remove items from a chest in a room. The room's own content follows, so whoever shows the chest sees
   * only what is left in it.
   * @param items Item names, the dungeon item, or `gold:<amount>`
   * @returns True when nothing is left in the chest
   */
  public removeItemsFromRoomChest(dungeonId: string, position: [number, number], items: string[], level: string = "1F"): boolean {
    const room = this.getRoom(dungeonId, position, level);
    const content = room?.content;
    if (!content) return true;

    if (content.items) content.items = content.items.filter(item => !items.includes(item));
    const isDungeonItemTaken = content.chest === 'dungeon' && content.dungeon && items.includes(content.dungeon);
    if (isDungeonItemTaken) delete content.dungeon;
    if (items.some(item => item.startsWith('gold:'))) delete content.gold;

    if (content.chestId) {
      this.chestSystem.removeItemsFromChest(content.chestId, items);
      const chest = this.chestSystem.getChest(content.chestId);
      if (chest) return chest.isEmpty;
    }
    return !content.items?.length && !(content.chest === 'dungeon' && content.dungeon) && !(Number(content.gold) > 0);
  }

  /**
   * Mark a room as visited
   * @param level Floor the room is on: a visit on 1F says nothing about the same coordinates on 2F
   */
  public visitRoom(dungeonId: string, position: [number, number], level: string = "1F"): void {
    const dungeon = this.dungeons[dungeonId];
    if (!dungeon) return;

    // Add the position to the visited positions set
    dungeon.visitedPositions.add(roomPositionKey(level, position));
  }

  /**
   * Check if a room has been visited
   * @param level Floor the room is on
   */
  public hasVisited(dungeonId: string, position: [number, number], level: string = "1F"): boolean {
    const dungeon = this.dungeons[dungeonId];
    if (!dungeon) return false;

    return dungeon.visitedPositions.has(roomPositionKey(level, position));
  }

  /**
   * Check if a room has a chest that contains a specific item
   */
  public roomHasItem(dungeonId: string, position: [number, number], itemId: string, level: string = "1F"): boolean {
    const room = this.getRoom(dungeonId, position, level);
    if (!room?.content?.chestId) return false;
    
    const chest = this.chestSystem.getChest(room.content.chestId);
    const hasNothingInside = !chest || chest.isEmpty;
    if (hasNothingInside) return false;
    
    return (
      (chest.content.items && chest.content.items.includes(itemId)) ||
      chest.content.dungeon === itemId
    );
  }

  /**
   * Update a room's properties in a dungeon
   * 
   * @param dungeonId The ID of the dungeon
   * @param position The position of the room [row, col]
   * @param updates The updated room data (can be a Partial<Room> or any other properties)
   * @returns Whether the room was successfully updated
   */
  public updateRoom(dungeonId: string, position: [number, number], updates: Partial<Room> | any, level: string = "1F"): boolean {
    // Method 1: Direct room reference approach
    const room = this.getRoom(dungeonId, position, level);
    if (room) {
      // Apply updates to the room
      Object.assign(room, updates);
      
      // If the room has a chest and we're marking it as empty, update the chest system too
      const chestId = room.content?.chestId;
      const isMarkingChestEmpty = updates.isEmpty && chestId;
      if (isMarkingChestEmpty) {
        this.chestSystem.markChestEmpty(chestId);
      }
      
      return true;
    }
    
    // Method 2: Room lookup by dungeon/position approach (fallback)
    const dungeon = this.dungeons[dungeonId];
    if (!dungeon) return false;
    
    // Get the room key for this position
    const grid = this.getMazeGrid(dungeonId, level);
    const roomKey = grid[position[0]]?.[position[1]];
    const hasNoRoomThere = !roomKey || !dungeon.rooms[roomKey];
    if (hasNoRoomThere) return false;
    
    // Update the room with the new data
    dungeon.rooms[roomKey] = { ...dungeon.rooms[roomKey], ...updates };
    
    debug.log(`Room at [${position}] in level ${level} of dungeon ${dungeonId} updated:`, dungeon.rooms[roomKey]);
    return true;
  }
}