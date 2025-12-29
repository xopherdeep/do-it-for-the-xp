/**
 * Temple System - Part of the Dungeon Engine
 * 
 * Manages the temple-specific functionality including:
 * - Temple rooms and door states
 * - Special temple items (keys, maps, compasses)
 * - Player progression through temples
 */

import { reactive } from 'vue';
import { DungeonManager } from './DungeonManager';
import { Room } from './types';
import { ChestSystem } from './ChestSystem';
import { TempleHydrator } from './TempleHydrator';
import debug from '@/lib/utils/debug';

// Types
export interface TempleState {
  hasMap: boolean;
  hasCompass: boolean;
  playerKeys: number;
  currentPosition: [number, number];
  currentLevel: string;
  visitedRooms: Set<string>;
}

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

export class TempleSystem {
  private static instance: TempleSystem;
  private dungeonManager: DungeonManager;
  private chestSystem: ChestSystem;
  
  // Track temple-specific state for each temple
  private templeStates: Record<string, TempleState> = reactive({});
  
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
   */
  public initTemple(templeId: string, startPosition?: number[]): boolean {
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
    
    if (entrance.length === 3) {
      // If we have 3 coordinates, assume [floorIndex, row, col]
      // where floorIndex is an index into the keys of the maze object
      const maze = temple.maze;
      const floors = Array.isArray(maze) ? ["1F"] : Object.keys(maze);
      finalLevel = floors[entrance[0]] || floors[0];
      finalPos = [entrance[1], entrance[2]];
    } else {
      finalPos = [entrance[0], entrance[1]];
    }
    
    // Create temple state if it doesn't exist
    if (!this.templeStates[templeId]) {
      this.templeStates[templeId] = reactive({
        hasMap: false,
        hasCompass: false,
        playerKeys: 0,
        currentPosition: finalPos,
        currentLevel: finalLevel,
        visitedRooms: new Set<string>()
      });
    }
    
    // Migrate any previously visited rooms
    this.migrateVisitedRooms(templeId);
    
    // Mark the starting room as visited
    this.visitRoom(templeId, finalPos);
    return true;
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
            const posKey = `${floorId}:${row},${col}`;
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
      // Initialize locked state if it doesn't exist
      if (!destRoom.locked) {
        destRoom.locked = {};
      }
      
      // Lock all 4 directions
      destRoom.locked.north = true;
      destRoom.locked.south = true;
      destRoom.locked.east = true;
      destRoom.locked.west = true;
      
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
   */
  public visitRoom(templeId: string, position: [number, number]): void {
    const templeState = this.templeStates[templeId];
    if (!templeState) return;
    
    // Add to the set of visited rooms
    templeState.visitedRooms.add(`${templeState.currentLevel}:${position[0]},${position[1]}`);
    
    // Also mark it as visited in the dungeon manager
    this.dungeonManager.visitRoom(templeId, position);
  }
  
  /**
   * Check if a room has been visited
   */
  public hasVisited(templeId: string, position: [number, number]): boolean {
    const templeState = this.templeStates[templeId];
    if (!templeState) return false;
    
    // Check coordinate-based visited status in DungeonManager first
    if (this.dungeonManager.hasVisited(templeId, position)) {
      return true;
    }
    
    // Fall back to the TempleState's visitedRooms set (for backward compatibility)
    return templeState.visitedRooms.has(`${templeState.currentLevel}:${position[0]},${position[1]}`);
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
      templeState.currentPosition
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
        chestContent.items
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
        [chestContent.dungeon]
      );
    }
    
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
    
    return templeState.hasCompass || this.hasVisited(templeId, position);
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
    
    const room = this.dungeonManager.getRoom(templeId, position);
    if (!room) return 'fa-question';
    
    const isVisited = this.hasVisited(templeId, position);
    
    // If room hasn't been visited and player doesn't have compass
    if (!isVisited && !templeState.hasCompass) {
      return 'fa-question';
    }
    
    // Return appropriate icon based on room type
    return iconMap[room.type] || 'fa-dungeon';
  }
}