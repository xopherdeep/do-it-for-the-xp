import { Dungeon, Room } from '@/lib/engine/core/dungeons/types';
import { SPATIAL_PALETTE, isMonsterToken, isLockedDoorToken } from '@/lib/engine/dungeons/SpatialPalette';
import debug from '@/lib/utils/debug';

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
        if (token.length > 5) {
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
        if (token === 'EXIT') {
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
        if (room.coords) room.coords.z = floorId;
        rooms[newKey] = room;
      });

      floors[floorId] = floors[floorId].map(row => row.map(key => `${floorId}:${key}`));

      if (floorDungeon.entrance && !entrance) {
        entrance = [floorDungeon.entrance[0], floorDungeon.entrance[1], floorId];
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
