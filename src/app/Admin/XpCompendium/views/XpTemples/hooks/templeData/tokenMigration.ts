/**
 * Raw temple JSON the Game Master pastes in: the check that it names a temple, and the migration of every legacy
 * or short maze token to the coordinate format (a letter for the room type, then column and row, e.g. M0201), with
 * the room records renamed to match.
 */
import debug from "@/lib/utils/debug";

export const parseTempleJson = (jsonStr: string) => {
  const parsedData = JSON.parse(jsonStr);

  // Basic validation
  if (!parsedData.id) throw new Error('Invalid JSON: templeId is required');

  return parsedData;
};

/**
 * Maps one maze token to its standard form; a legacy token at a known cell becomes a coordinate token and is noted in
 * `tokenMapping`, which lists every coordinate token an old token became (one per cell that held it)
 */
export const createTokenNormalizer = (parsedData: any, tokenMapping: Map<string, string[]>) => {
  return (token: string, rowIdx?: number, colIdx?: number): string => {
    // 1. Preserve specialized tokens that already match the 5-char coordinate format
    if (/^[A-Za-z]\d{4}$/.test(token)) return token;

    let result = token;

    // 2. Map legacy/short tokens to standard formats
    if (['____', '_', 'WALL'].includes(token)) {
      result = '____';
    } else if (token === '_00_' || token === 'EXIT') {
      result = '_00_';
    } else if (/^[L$]\d{2,4}$/.test(token)) {
      // Loot
      result = token.startsWith('$') ? token.replace('$', 'L') : token;
    } else if (/^[MmB]\d{2,4}$/.test(token)) {
      // Monsters
      result = token;
    } else if (/^K\d{2,4}$/.test(token)) {
      // Keys
      result = token;
    } else if (/^T\d{2,4}$/.test(token)) {
      // Teleporters
      result = token;
    } else {
      // 3. Static Mapping for single characters
      const mapping: Record<string, string> = {
        'H': 'HEAL', 'M': 'MANA', 'V': 'SAVE',
        'K': 'MKEY', 'MSTK': 'MKEY',
        'P': 'SHOP', 'T': 'TRAP',
        'Z': 'PUZL', 'v': 'PIT_', '.': 'R000', 'U': 'ST_U', 'D': 'ST_D',
        '?': 'SCRT', 'C': 'CAMP', '0': 'R000',
        'COMP': 'COMP', '$MAP': '$MAP'
      };
      result = mapping[token] || (
        // Last resort: If 4 or 5 chars, keep it. Otherwise map to Wall (____)
        (token.length === 4 || token.length === 5) ? token : '____'
      );
    }

    // 4. Force migrate R-style or legacy tokens to coordinate format if possible (Standardization)
    // This ensures the current maze matches the TXXYY format we are moving towards.
    const isLegacyToken = result.startsWith('R') || result.length === 4;
    const isSharedToken = result === '____' || result === '_00_';
    const shouldMigrateToCoordToken = isLegacyToken && rowIdx !== undefined && colIdx !== undefined && !isSharedToken;
    if (shouldMigrateToCoordToken) {
      const type = parsedData.dungeonLayout?.rooms?.[result]?.type || 'empty';
      const typePrefixes: Record<string, string> = {
        monster: 'M', boss: 'B', miniboss: 'm', loot: 'L', shop: 'S',
        health: 'H', mana: 'A', key: 'K', teleport: 'T', puzzle: 'P',
        trap: 'X', savepoint: 'V', stairs_up: 'U', stairs_down: 'D', empty: 'R'
      };
      const prefix = typePrefixes[type] || 'R';
      const xx = colIdx.toString().padStart(2, '0');
      const yy = rowIdx.toString().padStart(2, '0');
      const coordToken = prefix + xx + yy;

      if (coordToken !== result) {
        // Two cells can share a legacy token (every "." is R000): each gets its own coordinate token, and the room
        // record is copied to all of them afterwards
        const coordTokens = tokenMapping.get(result) ?? [];
        if (!coordTokens.includes(coordToken)) coordTokens.push(coordToken);
        tokenMapping.set(result, coordTokens);
        result = coordToken;
      }
    }

    return result;
  };
};

/** Rewrites the maze tokens of the parsed temple in place and renames its room records to the new tokens */
export const normalizeImportedLayout = (parsedData: any) => {
  // Normalization: Enforce coordinate-based or standard tokens for maze layout
  const tokenMapping = new Map<string, string[]>();
  const normalizeToken = createTokenNormalizer(parsedData, tokenMapping);

  if (parsedData.dungeonLayout?.maze) {
    const maze = parsedData.dungeonLayout.maze;
    if (Array.isArray(maze)) {
      // Single floor maze
      parsedData.dungeonLayout.maze = maze.map((row: string[], rIdx: number) =>
        row.map((token: string, cIdx: number) => normalizeToken(token, rIdx, cIdx))
      );
    } else {
      // Multi-floor maze
      Object.keys(maze).forEach(floorId => {
        maze[floorId] = maze[floorId].map((row: string[], rIdx: number) =>
          row.map((token: string, cIdx: number) => normalizeToken(token, rIdx, cIdx))
        );
      });
    }
  }

  // 5. IMPORTANT: Synchronize the rooms object keys with the new maze tokens
  if (parsedData.dungeonLayout?.rooms && tokenMapping.size > 0) {
    const oldRooms = parsedData.dungeonLayout.rooms;
    const newRooms: Record<string, any> = {};

    // Transfer all room definitions, renaming those redirected by normalizeToken. A record that several cells shared
    // goes to each of their new tokens as its own deep copy, so editing one room never changes another.
    Object.entries(oldRooms).forEach(([key, room]) => {
      const renamedTo = tokenMapping.get(key);
      const newKeys = renamedTo ?? [key];
      newKeys.forEach((newKey) => {
        // If an old record already holds a new key (unlikely but possible), the first one wins
        if (!newRooms[newKey]) {
          newRooms[newKey] = renamedTo ? JSON.parse(JSON.stringify(room)) : room;
        }
      });
    });

    parsedData.dungeonLayout.rooms = newRooms;
    debug.log(`Normalized ${tokenMapping.size} room tokens in layout import.`);
  }
};
