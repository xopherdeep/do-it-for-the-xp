/**
 * Temple Adapter - Converts temple data from the legacy format to the engine format
 */

import { Dungeon, Room } from './types';
import { DungeonManager } from './DungeonManager';
import { TempleSystem } from './TempleSystem';
import { TempleDb, templeStorage } from '@/lib/databases/TempleDb';
import type { TempleInterface } from '@/lib/databases/TempleDb';
import { TempleHydrator } from './TempleHydrator';
import { lockedFromSides } from '@/lib/services/temples/authoredDoors';
import debug from '@/lib/utils/debug';

export interface RegisterTempleOptions {
  /**
   * Register the temple again even though the engine already runs this very layout. That puts every chest
   * back, closes the doors and drops the seals of a running temple, so ask for it only to reset one.
   * A layout that differs from the running one (the room editor saved a change) is registered without it.
   */
  force?: boolean;
}

// The layout (maze, rooms and entrance) each temple was last registered from here, to tell a repeat from an edit
const registeredLayouts = new Map<string, string>();

// A temple without an authored entrance starts at [0, 0] (TempleSystem.initTemple), so both read the same here
const entranceOf = (templeData: any): number[] =>
  Array.isArray(templeData?.entrance) && templeData.entrance.length ? templeData.entrance : [0, 0];

const layoutSignature = (templeData: any): string =>
  JSON.stringify([templeData?.maze ?? [], templeData?.rooms ?? {}, entranceOf(templeData)]);

/**
 * Convert a temple from the legacy format to the engine format and register it with the DungeonManager.
 * A layout the engine already runs is left alone (see RegisterTempleOptions.force), and that dungeon is returned.
 */
export function registerTemple(templeId: string, templeData: any, options: RegisterTempleOptions = {}): Dungeon {
  const dungeonManager = DungeonManager.getInstance();

  // Same layout, already registered: the hero may be halfway through it, registering again would wipe that
  const signature = layoutSignature(templeData);
  const running = dungeonManager.getDungeon(templeId);
  const hasSameLayoutRunning = running && !options.force && registeredLayouts.get(templeId) === signature;
  if (hasSameLayoutRunning) return running;

  // Convert the temple data to a dungeon
  const dungeon: Dungeon = {
    id: templeId,
    name: templeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    maze: templeData.maze || [],
    rooms: {},
    visitedPositions: new Set<string>()
  };
  // Where the hero starts ([row, col] or [floor, row, col]); without it TempleSystem starts at [0, 0]
  const hasAuthoredEntrance = Array.isArray(templeData.entrance) && templeData.entrance.length;
  if (hasAuthoredEntrance) dungeon.entrance = [...templeData.entrance];

  // Convert rooms
  if (templeData.rooms) {
    for (const [key, room] of Object.entries(templeData.rooms)) {
      // Content and doors are copied: play writes into them (chest ids, seals), and the layout it came
      // from must stay as it was authored, or the next registration would start from a played-in layout
      // The temple creator draws doors as `sides`; the engine plays them as `locked` (lockedFromSides)
      const authored = lockedFromSides(room as Room);
      const engineRoom: Room = {
        type: (room as any).type || 'empty',
        content: (room as any).content ? JSON.parse(JSON.stringify((room as any).content)) : undefined,
        visited: (room as any).visited || false,
        locked: authored.locked ? { ...authored.locked } : undefined,
        isEmpty: (room as any).isEmpty || false
      };

      dungeon.rooms[key] = engineRoom;
    }
  }

  // Register the dungeon with the engine
  const isReplacingLayout = Boolean(running) && !options.force;
  dungeonManager.registerDungeon(dungeon);
  registeredLayouts.set(templeId, signature);

  // A different layout replaced the one a hero may be halfway through: their run stays, on the new rooms. Done here, where
  // every registration passes, so no way of registering (the editor's save, the temple screen, a reload of all custom
  // temples) can leave a run standing in a room that is no longer there. A forced registration resets the temple instead.
  if (isReplacingLayout) TempleSystem.getInstance().refreshRun(templeId);

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
    const isAlreadyRegistered = !options.force && dungeonManager.getDungeon(templeId);
    if (isAlreadyRegistered) continue;
    registerTemple(templeId, templeData, options);
  }
}

/**
 * Register the layout a TempleDb record holds (the temple creator's, a generated one, or the copy of a temple
 * shipped in code). A record without a layout registers nothing. Registering follows registerTemple: the layout
 * the engine already runs is kept, a different one replaces it.
 * @returns The registered dungeon, or undefined when the record has no layout
 */
export function registerTempleRecord(
  templeId: string,
  record: TempleInterface | null | undefined,
  options: RegisterTempleOptions = {}
): Dungeon | undefined {
  // Only process temples that have a dungeonLayout defined
  const dungeonLayout = record?.dungeonLayout;
  if (!dungeonLayout) return undefined;

  // Convert the temple data format for the engine
  const templeData = {
    maze: dungeonLayout.maze,
    rooms: dungeonLayout.rooms,
    entrance: dungeonLayout.entrance
  };
  return registerTemple(templeId, templeData, options);
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
      if (temple?.dungeonLayout) debug.log(`Registering custom temple: ${key}`);
      registerTempleRecord(key, temple, options);
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
