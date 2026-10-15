/**
 * Test helper: builds a Dungeon from a Temple DSL string ("EXIT R000 M01!" is one row of three rooms), so a spec can
 * set up a small temple at a glance. The game no longer reads this format (the Temple Creator and the generator
 * author temples), so it lives with the specs that still use it.
 */
import { Dungeon, Room } from '@/lib/engine/core/dungeons/types';
import debug from '@/lib/utils/debug';

/**
 * Spatial Palette - The 4-character tokens for the Temple DSL
 * 
 * Rules:
 * - Tokens MUST be exactly 4 characters (standardized grid).
 * - EXIT handles both Entrance (first) and Exit (others).
 */
const SPATIAL_PALETTE: Record<string, Partial<Room>> = {
  // Structure & Navigation
  '____': { type: 'wall' },  // ____ is the standard Wall token
  'R000': { type: 'empty' }, // R000 is the standard Empty/Walkable token
  'EXIT': { type: 'entrance', visited: true }, // Hydrator handles flipping to 'exit' if needed
  'TELE': { type: 'teleport' },

  // Combat - Monster Configs (M001-M009 are shared, reusable configs)
  'M001': { type: 'monster', content: { difficulty: 'easy' } },
  'M002': { type: 'monster', content: { difficulty: 'normal' } },
  'M003': { type: 'monster', content: { difficulty: 'hard' } },
  'M004': { type: 'monster', content: { difficulty: 'easy' } },
  'M005': { type: 'monster', content: { difficulty: 'normal' } },
  'M006': { type: 'monster', content: { difficulty: 'hard' } },
  'M007': { type: 'monster', content: { difficulty: 'easy' } },
  'M008': { type: 'monster', content: { difficulty: 'normal' } },
  'M009': { type: 'monster', content: { difficulty: 'hard' } },
  'M01!': { type: 'monster', content: { difficulty: 'hard', lockOnEnter: true } },

  // Combat - Miniboss Configs (MINI, MIN1-MIN3 are shared, reusable configs)
  'MINI': { type: 'miniboss' },
  'MIN1': { type: 'miniboss' },
  'MIN2': { type: 'miniboss' },
  'MIN3': { type: 'miniboss' },

  // Combat - Boss (typically one per dungeon)
  'BOSS': { type: 'boss', content: { lockOnEnter: true } },
  'TRAP': { type: 'trap' },

  // Loot (Scalable $000-$999)
  '$001': { type: 'loot', content: { chest: 'gold' } }, // Example entry

  // Dungeon Items
  '$MAP': { type: 'dungeon_map' },
  'COMP': { type: 'compass' },

  // Dungeon Progression (Keys)
  'K001': { type: 'key', content: { keyId: 'key1' } }, // Example entry
  'MKEY': { type: 'key', content: { keyId: 'master' } },

  // Teleporters (Scalable T000-T999)
  'T001': { type: 'teleport', content: { linkId: '001' } }, // Example entry

  // Locked Doors (Encoded in Room definition)
  // Token format: D[KeyID][Direction]
  'D1_N': { type: 'empty', locked: { north: true }, content: { keyRequired: 'key1' } },
  'D1_S': { type: 'empty', locked: { south: true }, content: { keyRequired: 'key1' } },
  'D1_E': { type: 'empty', locked: { east: true }, content: { keyRequired: 'key1' } },
  'D1_W': { type: 'empty', locked: { west: true }, content: { keyRequired: 'key1' } },

  'D2_N': { type: 'empty', locked: { north: true }, content: { keyRequired: 'key2' } },
  'DMSN': { type: 'empty', locked: { north: true }, content: { keyRequired: 'master' } },

  // Recovery
  'HEAL': { type: 'health', content: { healthPoints: 20 } },
  'MANA': { type: 'mana', content: { magicPoints: 20 } },
  'SAVE': { type: 'savepoint' },

  // Level Traversal
  'ST_U': { type: 'stairs_up' },
  'ST_D': { type: 'stairs_down' },
};

/**
 * Helper to identify if a token is a monster room starting with M (M000-M999)
 */
const isMonsterToken = (token: string) => /^[MmB](\d{3,4}|\d{2}[_!])$/.test(token);

/**
 * Helper to identify if a token is a locked door room D...
 */
const isLockedDoorToken = (token: string) => token.startsWith('D') && (token.length === 4);

/**
 * TempleHydrator - Parses Temple DSL strings into Dungeon objects
 */
export class TempleHydrator {
  /**
   * Parse a DSL string into a Dungeon maze and rooms
   * @param blueprint The multiline DSL string
   * @param dungeonId The ID of the dungeon
   * @param dungeonName The name of the dungeon
   */
  public static hydrate(blueprint: string, dungeonId: string, dungeonName: string): Dungeon {
    const lines = blueprint.trim().split('\n');
    const maze: string[][] = [];
    const rooms: Record<string, Room> = {};
    let entrance: [number, number] | undefined;

    lines.forEach((line, row) => {
      const tokens = line.trim().split(/\s+/);
      const mazeRow: string[] = [];

      tokens.forEach((token, col) => {
        // Enforce character limit/rule if necessary, but palette handles the mapping
        const isLongToken = token.length > 5;
        if (isLongToken) {
          debug.warn(`Token "${token}" at [${row}, ${col}] exceeds recommended length.`);
        }

        const roomKey = `R${row}_${col}`;
        mazeRow.push(roomKey);

        // Get base configuration from palette
        let config = SPATIAL_PALETTE[token];

        // Handle dynamic tokens if not found directly in palette
        if (!config) {
          if (isMonsterToken(token)) {
            // M01_ or M01! (4 chars)
            const isHard = token.endsWith('!');
            const beastId = token.substring(1, 3);
            config = { 
              type: 'monster', 
              content: { 
                difficulty: isHard ? 'hard' : 'normal',
                beastId: beastId,
                lockOnEnter: isHard
              } 
            };
          } else if (/^[A-Za-z]\d{4}$/.test(token)) {
            // Coordinate-based token (TXXYY)
            const prefix = token.charAt(0);
            const prefixMap: Record<string, string> = {
              'M': 'monster', 'B': 'boss', 'm': 'miniboss', 'L': 'loot', '$': 'loot',
              'S': 'shop', 'H': 'health', 'A': 'mana', 'K': 'key', 'T': 'teleport',
              'P': 'puzzle', 'X': 'trap', 'V': 'savepoint', 'U': 'stairs_up', 'D': 'stairs_down'
            };
            config = { type: prefixMap[prefix] || 'empty' };
          } else if (isLockedDoorToken(token)) {
            // D[KeyID][Direction] e.g. D1_N
            const keyIdNum = token.substring(1, 2);
            const directionChar = token.substring(3, 4);
            const keyId = `key${keyIdNum}`;
            const dirMap: Record<string, string> = { 'N': 'north', 'S': 'south', 'E': 'east', 'W': 'west' };
            const direction = dirMap[directionChar] || 'north';

            config = { 
              type: 'empty', 
              locked: { [direction]: true }, 
              content: { keyRequired: keyId } 
            };
          } else {
            config = { type: 'empty' };
            debug.warn(`Unknown token "${token}" at [${row}, ${col}], defaulting to empty.`);
          }
        }

        // Deep clone the config
        const room: Room = JSON.parse(JSON.stringify(config));
        room.coords = { x: col, y: row };
        room.id = roomKey;

        // Special handling for EXIT (Entrance/Exit combo)
        const isExit = token === 'EXIT';
        if (isExit) {
          if (!entrance) {
            entrance = [row, col];
            room.type = 'entrance';
            room.visited = true;
          } else {
            room.type = 'exit';
          }
        }

        rooms[roomKey] = room;
      });

      maze.push(mazeRow);
    });

    return {
      id: dungeonId,
      name: dungeonName,
      maze,
      rooms,
      visitedPositions: new Set<string>(),
      entrance
    };
  }

  /**
   * Helper to parse multi-floor temples from a Record of strings
   */
  public static hydrateMultiFloor(blueprints: Record<string, string>, dungeonId: string, dungeonName: string): Dungeon {
    const floors: Record<string, string[][]> = {};
    const rooms: Record<string, Room> = {};
    let entrance: [number, number, string] | undefined;

    Object.entries(blueprints).forEach(([floorId, blueprint]) => {
      const floorDungeon = this.hydrate(blueprint, dungeonId, dungeonName);
      floors[floorId] = floorDungeon.maze as string[][];
      
      // Merge rooms
      Object.entries(floorDungeon.rooms).forEach(([key, room]) => {
        const newKey = `${floorId}:${key}`;
        room.id = newKey;
        const coords = room.coords;
        if (coords) coords.z = floorId;
        rooms[newKey] = room;
      });

      floors[floorId] = floors[floorId].map(row => row.map(key => `${floorId}:${key}`));

      const floorEntrance = floorDungeon.entrance;
      const isFirstEntrance = floorEntrance && !entrance;
      if (isFirstEntrance) {
        entrance = [floorEntrance[0], floorEntrance[1], floorId];
      }
    });

    return {
      id: dungeonId,
      name: dungeonName,
      maze: floors,
      rooms,
      visitedPositions: new Set<string>(),
      entrance: entrance ? [entrance[0], entrance[1]] : undefined
    };
  }
}
