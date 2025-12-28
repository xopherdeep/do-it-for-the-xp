/**
 * DungeonManager - Part of the Dungeon Engine
 * 
 * Bridges between the game's dungeon system and the engine components.
 * Handles initialization of dungeons, rooms, and manages room content like chests.
 */

import { ChestSystem, ChestContent } from './ChestSystem';
import { Room, Dungeon } from './types';
import { reactive } from 'vue';
import debug from '@/lib/utils/debug';

// Type definitions


export class DungeonManager {
  private static instance: DungeonManager;
  private dungeons: Record<string, Dungeon> = reactive({});
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
    this.dungeons[dungeon.id] = reactive(dungeon);
    this.initializeChests(dungeon.id);
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
            
            // Map room content to chest content
            if (room.content.chest === 'loot' && room.content.items) {
              chestContent.items = room.content.items;
            } else if (room.content.chest === 'dungeon' && room.content.dungeon) {
              chestContent.dungeon = room.content.dungeon;
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
    
    if (!grid[row] || !grid[row][col]) return undefined;
    
    const roomKey = grid[row][col];
    return dungeon.rooms[roomKey];
  }
  
  /**
   * Open a chest in a room
   * @returns The chest contents or undefined if no chest exists or it's empty
   */
  public openChestInRoom(dungeonId: string, position: [number, number]): ChestContent | undefined {
    const chest = this.chestSystem.getChestByPosition(position, dungeonId);
    if (!chest) return undefined;
    
    // Update the room to show the chest has been opened
    const room = this.getRoom(dungeonId, position);
    if (room?.content?.chestId) {
      return this.chestSystem.openChest(room.content.chestId);
    }
    
    return undefined;
  }
  
  /**
   * Remove items from a chest in a room
   */
  public removeItemsFromRoomChest(dungeonId: string, position: [number, number], items: string[]): void {
    const room = this.getRoom(dungeonId, position);
    if (room?.content?.chestId) {
      this.chestSystem.removeItemsFromChest(room.content.chestId, items);
    }
  }
  
  /**
   * Mark a room as visited
   */
  public visitRoom(dungeonId: string, position: [number, number]): void {
    const dungeon = this.dungeons[dungeonId];
    if (!dungeon) return;
    
    // Add the position to the visited positions set
    const posKey = `${position[0]},${position[1]}`;
    dungeon.visitedPositions.add(posKey);
  }
  
  /**
   * Check if a room has been visited
   */
  public hasVisited(dungeonId: string, position: [number, number]): boolean {
    const dungeon = this.dungeons[dungeonId];
    if (!dungeon) return false;
    
    const posKey = `${position[0]},${position[1]}`;
    return dungeon.visitedPositions.has(posKey);
  }
  
  /**
   * Check if a room has a chest that contains a specific item
   */
  public roomHasItem(dungeonId: string, position: [number, number], itemId: string): boolean {
    const room = this.getRoom(dungeonId, position);
    if (!room?.content?.chestId) return false;
    
    const chest = this.chestSystem.getChest(room.content.chestId);
    if (!chest || chest.isEmpty) return false;
    
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
      if (updates.isEmpty && room.content?.chestId) {
        this.chestSystem.markChestEmpty(room.content.chestId);
      }
      
      return true;
    }
    
    // Method 2: Room lookup by dungeon/position approach (fallback)
    const dungeon = this.dungeons[dungeonId];
    if (!dungeon) return false;
    
    // Get the room key for this position
    const grid = this.getMazeGrid(dungeonId, level);
    const roomKey = grid[position[0]]?.[position[1]];
    if (!roomKey || !dungeon.rooms[roomKey]) return false;
    
    // Update the room with the new data
    dungeon.rooms[roomKey] = { ...dungeon.rooms[roomKey], ...updates };
    
    debug.log(`Room at [${position}] in level ${level} of dungeon ${dungeonId} updated:`, dungeon.rooms[roomKey]);
    return true;
  }
}