/**
 * Temple Adapter - Converts temple data from the legacy format to the engine format
 */

import { Dungeon, Room } from './types';
import { DungeonManager } from './DungeonManager';
import { TempleDb, templeStorage } from '@/lib/databases/TempleDb';
import { TempleHydrator } from './TempleHydrator';
import debug from '@/lib/utils/debug';

export interface RegisterTempleOptions {
  /**
   * Register the temple again even though the engine already runs this very layout. That puts every chest
   * back, closes the doors and drops the seals of a running temple, so ask for it only to reset one.
   * A layout that differs from the running one (the room editor saved a change) is registered without it.
   */
  force?: boolean;
}

// The layout (maze and rooms) each temple was last registered from here, to tell a repeat from an edit
const registeredLayouts = new Map<string, string>();

const layoutSignature = (templeData: any): string => JSON.stringify([templeData?.maze ?? [], templeData?.rooms ?? {}]);

/**
 * Convert a temple from the legacy format to the engine format and register it with the DungeonManager.
 * A layout the engine already runs is left alone (see RegisterTempleOptions.force), and that dungeon is returned.
 */
export function registerTemple(templeId: string, templeData: any, options: RegisterTempleOptions = {}): Dungeon {
  const dungeonManager = DungeonManager.getInstance();

  // Same layout, already registered: the hero may be halfway through it, registering again would wipe that
  const signature = layoutSignature(templeData);
  const running = dungeonManager.getDungeon(templeId);
  if (running && !options.force && registeredLayouts.get(templeId) === signature) return running;

  // Convert the temple data to a dungeon
  const dungeon: Dungeon = {
    id: templeId,
    name: templeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    maze: templeData.maze || [],
    rooms: {},
    visitedPositions: new Set<string>()
  };

  // Convert rooms
  if (templeData.rooms) {
    for (const [key, room] of Object.entries(templeData.rooms)) {
      // Content and doors are copied: play writes into them (chest ids, seals), and the layout it came
      // from must stay as it was authored, or the next registration would start from a played-in layout
      const engineRoom: Room = {
        type: (room as any).type || 'empty',
        content: (room as any).content ? JSON.parse(JSON.stringify((room as any).content)) : undefined,
        visited: (room as any).visited || false,
        locked: (room as any).locked ? { ...(room as any).locked } : undefined,
        isEmpty: (room as any).isEmpty || false
      };

      dungeon.rooms[key] = engineRoom;
    }
  }

  // Register the dungeon with the engine
  dungeonManager.registerDungeon(dungeon);
  registeredLayouts.set(templeId, signature);

  return dungeon;
}

/**
 * Register all temples in the provided temple registry.
 * These are the layouts shipped in code, the starting point: a temple the engine already holds
 * (a copy edited in the temple creator included) is newer, and a hero may be playing in it, so it is skipped.
 */
export function registerAllTemples(temples: Record<string, any>, options: RegisterTempleOptions = {}): void {
  const dungeonManager = DungeonManager.getInstance();

  for (const [templeId, templeData] of Object.entries(temples)) {
    if (!options.force && dungeonManager.getDungeon(templeId)) continue;
    registerTemple(templeId, templeData, options);
  }
}

/**
 * Register custom temples created with the temple creator
 * This loads temples from the TempleDb and registers them with the engine.
 * A temple whose stored layout is the one already running is skipped; a stored layout that differs
 * (the temple creator saved a change, or this is the first look at a temple shipped in code that was
 * edited) replaces the running one.
 */
export async function registerCustomTemples(options: RegisterTempleOptions = {}): Promise<void> {
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
        debug.log(`Registering custom temple: ${key}`);
        
        // Convert the temple data format for the engine
        const templeData = {
          maze: temple.dungeonLayout.maze,
          rooms: temple.dungeonLayout.rooms
        };
        
        // Register the temple with the engine
        registerTemple(key, templeData, options);
      }
    }
    debug.log('Custom temples registered successfully');
  } catch (error) {
    debug.error('Error registering custom temples:', error);
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
/**
 * Register a temple using the DSL format
 */
export function registerTempleFromDSL(templeId: string, dungeonName: string, blueprint: string): Dungeon {
  const dungeon = TempleHydrator.hydrate(blueprint, templeId, dungeonName);
  const dungeonManager = DungeonManager.getInstance();
  dungeonManager.registerDungeon(dungeon);
  return dungeon;
}

/**
 * Register a multi-floor temple using the DSL format
 */
export function registerMultiFloorTempleFromDSL(templeId: string, dungeonName: string, blueprints: Record<string, string>): Dungeon {
  const dungeon = TempleHydrator.hydrateMultiFloor(blueprints, templeId, dungeonName);
  const dungeonManager = DungeonManager.getInstance();
  dungeonManager.registerDungeon(dungeon);
  return dungeon;
}
