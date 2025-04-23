/**
 * Temple Adapter - Converts temple data from the legacy format to the engine format
 */

import { Dungeon } from './DungeonManager';
import { DungeonManager } from './DungeonManager';
import { ChestSystem } from './ChestSystem';
import { TempleDb, templeStorage } from '@/databases/TempleDb';

/**
 * Convert a temple from the legacy format to the engine format and register it with the DungeonManager
 */
export function registerTemple(templeId: string, templeData: any): Dungeon {
  const dungeonManager = DungeonManager.getInstance();
  
  // Convert the temple data to a dungeon
  const dungeon: Dungeon = {
    id: templeId,
    name: templeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    maze: templeData.maze || [],
    rooms: {}
  };
  
  // Convert rooms
  if (templeData.rooms) {
    for (const [key, room] of Object.entries(templeData.rooms)) {
      const engineRoom = {
        type: (room as any).type || 'empty',
        content: (room as any).content || undefined,
        visited: (room as any).visited || false,
        locked: (room as any).locked || undefined,
        isEmpty: (room as any).isEmpty || false
      };
      
      dungeon.rooms[key] = engineRoom;
    }
  }
  
  // Register the dungeon with the engine
  dungeonManager.registerDungeon(dungeon);
  
  return dungeon;
}

/**
 * Register all temples in the provided temple registry
 */
export function registerAllTemples(temples: Record<string, any>): void {
  for (const [templeId, templeData] of Object.entries(temples)) {
    registerTemple(templeId, templeData);
  }
}

/**
 * Register custom temples created with the temple creator
 * This loads temples from the TempleDb and registers them with the engine
 */
export async function registerCustomTemples(): Promise<void> {
  try {
    const templeDb = new TempleDb(templeStorage);
    // We need to initialize the storage before using it
    await templeStorage.create();
    
    // Get all keys in the temple storage
    const keys = await templeStorage.keys();
    
    for (const key of keys) {
      const temple = await templeDb.getTempleById(key);
      
      // Only process temples that have a dungeonLayout defined
      if (temple && temple.dungeonLayout) {
        console.log(`Registering custom temple: ${key}`);
        
        // Convert the temple data format for the engine
        const templeData = {
          maze: temple.dungeonLayout.maze,
          rooms: temple.dungeonLayout.rooms
        };
        
        // Register the temple with the engine
        registerTemple(key, templeData);
      }
    }
    console.log('Custom temples registered successfully');
  } catch (error) {
    console.error('Error registering custom temples:', error);
  }
}

/**
 * Convert specific room keys to their type and content
 * Useful for testing and debugging
 */
export function getRoomInfo(roomKey: string): { type: string; content?: any } {
  // This is a simplified example - you may need to adjust based on your data
  const specialRooms: Record<string, { type: string; content?: any }> = {
    'LMAP': { type: 'loot', content: { chest: 'dungeon', dungeon: 'map' } },
    'LCOM': { type: 'loot', content: { chest: 'dungeon', dungeon: 'compass' } },
    'K001': { type: 'loot', content: { chest: 'dungeon', dungeon: 'key' } },
    'MK__': { type: 'loot', content: { chest: 'dungeon', dungeon: 'master-key' } }
  };
  
  return specialRooms[roomKey] || { type: 'empty' };
}