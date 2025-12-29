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
  '____': { type: 'empty' },
  'EXIT': { type: 'entrance', visited: true }, // Hydrator handles flipping to 'exit' if needed
  'WALL': { type: 'wall' },
  'TELE': { type: 'teleport' },
  
  // Combat
  'M001': { type: 'monster', content: { difficulty: 'easy' } },
  'M002': { type: 'monster', content: { difficulty: 'normal' } },
  'M003': { type: 'monster', content: { difficulty: 'hard' } },
  'M01!': { type: 'monster', content: { difficulty: 'hard', lockOnEnter: true } },
  'MINI': { type: 'miniboss' },
  'BOSS': { type: 'boss', content: { lockOnEnter: true } },
  'TRAP': { type: 'trap' },
  
  // Resources
  '$GP$': { type: 'loot', content: { chest: 'gold' } },
  '$XP$': { type: 'loot', content: { chest: 'loot', dungeon: 'XP Scroll' } },
  'ITEM': { type: 'loot', content: { chest: 'consumable' } },
  'SHOP': { type: 'shop' },
  
  // Dungeon Progression (Keys)
  'K001': { type: 'key', content: { keyId: 'key1' } },
  'K002': { type: 'key', content: { keyId: 'key2' } },
  'K003': { type: 'key', content: { keyId: 'key3' } },
  'MSTK': { type: 'key', content: { keyId: 'master' } },
  
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
 * Helper to identify if a token is a monster room starting with M
 */
export const isMonsterToken = (token: string) => token.startsWith('M') && !isNaN(parseInt(token.substring(1, 3)));

/**
 * Helper to identify if a token is a key room starting with K
 */
export const isKeyToken = (token: string) => token.startsWith('K') && !isNaN(parseInt(token.substring(1)));

/**
 * Helper to identify if a token is a locked door room D...
 */
export const isLockedDoorToken = (token: string) => token.startsWith('D') && (token.length === 4);
