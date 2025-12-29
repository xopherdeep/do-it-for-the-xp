import { Room } from '@/lib/engine/core/dungeons/types';

/**
 * Spatial Palette - The 4-character tokens for the Temple DSL
 * 
 * Rules:
 * - Tokens MUST be exactly 4 characters (standardized grid).
 * - EXIT handles both Entrance (first) and Exit (others).
 */
export const SPATIAL_PALETTE: Record<string, Partial<Room>> = {
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
export const isMonsterToken = (token: string) => /^[MmB]\d{3,4}$/.test(token);

/**
 * Helper to identify if a token is a key room starting with K (K000-K999)
 */
export const isKeyToken = (token: string) => /^K\d{3,4}$/.test(token);

/**
 * Helper to identify if a token is a loot room starting with $ ($000-$999)
 */
export const isLootToken = (token: string) => /^[L$]\d{3,4}$/.test(token);

/**
 * Helper to identify if a token is a teleporter room starting with T (T000-T999)
 */
export const isTeleportToken = (token: string) => /^T\d{3,4}$/.test(token);

/**
 * Helper to identify if a token is a shop room starting with S
 */
export const isShopToken = (token: string) => /^S\d{3,4}$/.test(token);

/**
 * Helper to identify if a token is a health/mana recovery room
 */
export const isRecoveryToken = (token: string) => /^[HA]\d{3,4}$/.test(token);

/**
 * Helper to identify if a token is a save point
 */
export const isSaveToken = (token: string) => /^V\d{3,4}$/.test(token);

/**
 * Helper to identify if a token is a locked door room D...
 */
export const isLockedDoorToken = (token: string) => token.startsWith('D') && (token.length === 4);

/**
 * Helper to identify if a token is a wall
 */
export const isWallToken = (token: string) => 
  token === '____' || // Standard 4-char wall
  token === 'WALL' || // Legacy literal
  token === '_';      // Legacy single char

/**
 * Helper to identify if a token is explicitly an empty room
 */
export const isEmptyRoomToken = (token: string) => 
  /^[A-Za-z]\d{4}$/.test(token) || // New coordinate-based tokens (TXXYY)
  /^R\d{3,4}$/.test(token) || // Standard R000 or RXXYY
  token === '0' ||    // Legacy single char
  token === 'O__O';   // Legacy 4-char
