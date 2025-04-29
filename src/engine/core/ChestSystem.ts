/**
 * Chest System - Part of the Dungeon Engine
 * 
 * Handles the logic for chests in the dungeon system.
 * Responsible for tracking chest state (empty, locked, open)
 * and contents across the game.
 */

import { reactive } from 'vue';
import debug from '@/lib/utils/debug';

// Types
export interface ChestContent {
  items?: string[];        // Array of item IDs
  dungeon?: string;        // Special dungeon item (map, compass, etc.)
  gold?: number;           // Gold amount
  experience?: number;     // XP amount
  isEmpty?: boolean;       // Whether the chest has been emptied
}

export interface Chest {
  id: string;              // Unique identifier for the chest
  type: 'common' | 'rare' | 'legendary' | 'dungeon'; // Chest type
  content: ChestContent;   // The contents of the chest
  isEmpty: boolean;        // Whether the chest has been emptied
  isLocked: boolean;       // Whether the chest requires a key
  requiresKey?: string;    // The type of key required (if locked)
  position?: [number, number]; // Position in the dungeon [row, col]
}

// Singleton pattern for the ChestSystem
export class ChestSystem {
  private static instance: ChestSystem;
  
  // Track all chests in the game
  private chests: Record<string, Chest> = reactive({});
  
  // Private constructor prevents direct instantiation
  private constructor() {
    debug.log('ChestSystem initialized');
  }
  
  /**
   * Get the ChestSystem instance
   */
  public static getInstance(): ChestSystem {
    if (!ChestSystem.instance) {
      ChestSystem.instance = new ChestSystem();
    }
    return ChestSystem.instance;
  }
  
  /**
   * Register a chest with the system
   * @param chest The chest to register
   */
  public registerChest(chest: Chest): void {
    this.chests[chest.id] = reactive(chest);
  }
  
  /**
   * Get a chest by ID
   * @param chestId The ID of the chest to retrieve
   */
  public getChest(chestId: string): Chest | undefined {
    return this.chests[chestId];
  }
  
  /**
   * Get a chest by its position in a dungeon
   * @param position [row, col] position in the dungeon
   * @param dungeonId Optional dungeon ID if needed to disambiguate
   */
  public getChestByPosition(position: [number, number], dungeonId?: string): Chest | undefined {
    return Object.values(this.chests).find(chest => {
      if (!chest.position) return false;
      
      const samePosition = chest.position[0] === position[0] && chest.position[1] === position[1];
      if (dungeonId) {
        return samePosition && chest.id.startsWith(dungeonId);
      }
      return samePosition;
    });
  }
  
  /**
   * Open a chest and get its contents
   * @param chestId The ID of the chest to open
   * @returns The contents of the chest, or undefined if not found or already empty
   */
  public openChest(chestId: string): ChestContent | undefined {
    const chest = this.chests[chestId];
    
    if (!chest || chest.isEmpty) {
      return undefined;
    }
    
    if (chest.isLocked) {
      // Can't open a locked chest without a key
      return undefined;
    }
    
    return chest.content;
  }
  
  /**
   * Remove specified items from a chest's contents
   * @param chestId The ID of the chest
   * @param items Array of item IDs to remove
   */
  public removeItemsFromChest(chestId: string, items: string[]): void {
    const chest = this.chests[chestId];
    if (!chest || chest.isEmpty) return;
    
    let allItemsRemoved = true;
    
    // Handle standard items
    if (chest.content.items) {
      // Remove the selected items
      chest.content.items = chest.content.items.filter(item => !items.includes(item));
      
      // If there are still items left, not all items are removed
      if (chest.content.items.length > 0) {
        allItemsRemoved = false;
      }
    }
    
    // Handle dungeon items like map or compass
    if (chest.content.dungeon && items.includes(chest.content.dungeon)) {
      delete chest.content.dungeon;
    } else if (chest.content.dungeon) {
      allItemsRemoved = false;
    }
    
    // Handle gold
    items.forEach(item => {
      if (item.startsWith('gold:')) {
        delete chest.content.gold;
      }
    });
    
    // If all items are gone, mark the chest as empty
    if (allItemsRemoved) {
      chest.isEmpty = true;
      debug.log(`Chest ${chestId} is now empty:`, chest);
    }
  }
  
  /**
   * Mark a chest as empty
   * @param chestId The ID of the chest
   */
  public emptyChest(chestId: string): void {
    const chest = this.chests[chestId];
    if (!chest) return;
    
    chest.isEmpty = true;
  }
  
  /**
   * Unlock a chest with a key
   * @param chestId The ID of the chest to unlock
   * @param keyType The type of key to use
   * @returns True if the chest was successfully unlocked
   */
  public unlockChest(chestId: string, keyType: string): boolean {
    const chest = this.chests[chestId];
    
    if (!chest || !chest.isLocked) {
      return false;
    }
    
    // Check if the key matches the required key type
    if (chest.requiresKey && chest.requiresKey !== keyType) {
      return false;
    }
    
    // Unlock the chest
    chest.isLocked = false;
    return true;
  }
  
  /**
   * Create a new chest with the given parameters and register it
   */
  public createChest(
    id: string,
    type: 'common' | 'rare' | 'legendary' | 'dungeon',
    content: ChestContent,
    position?: [number, number],
    isLocked = false,
    requiresKey?: string
  ): Chest {
    const chest: Chest = {
      id,
      type,
      content,
      isEmpty: false,
      isLocked,
      requiresKey,
      position
    };
    
    this.registerChest(chest);
    return chest;
  }
  
  /**
   * Get all chests in a specific dungeon
   * @param dungeonId The ID of the dungeon
   */
  public getChestsInDungeon(dungeonId: string): Chest[] {
    return Object.values(this.chests).filter(chest => chest.id.startsWith(`${dungeonId}:`));
  }

  /**
   * Mark a chest as empty
   * @param chestId The ID of the chest
   * @returns True if the chest was successfully marked as empty
   */
  public markChestEmpty(chestId: string): boolean {
    const chest = this.chests[chestId];
    if (!chest) return false;
    
    // Clear contents and mark as empty
    chest.content.items = [];
    chest.content.dungeon = undefined;
    chest.isEmpty = true;
    
    return true;
  }
}