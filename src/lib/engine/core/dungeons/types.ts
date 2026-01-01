/**
 * Dungeon Engine Types
 */

export interface RoomContent {
  beasts?: string[];
  difficulty?: 'easy' | 'normal' | 'hard' | 'boss';
  lockOnEnter?: boolean;
  isMimic?: boolean;
  mimicType?: 'random' | 'classic' | 'pick' | string;
  mimicBeastId?: string | null;
  chest?: 'dungeon' | 'loot' | 'gold' | 'consumable' | string;
  items?: string[];
  gold?: number;
  dungeon?: string;
  chestId?: string;
  healthPoints?: number;
  // Rewards (required for combat rooms)
  xp?: number;
  gp?: number;
  ap?: number;
  // Multi-floor navigation
  targetLevel?: string; // For stairs/teleports
  targetCoords?: { x: number; y: number; z?: number | string };
  // Shop config
  shopId?: string;
  [key: string]: any;
}

export interface Room {
  type: string;
  content?: RoomContent;
  coords?: { x: number; y: number; z?: number | string };
  id?: string;
  locked?: {
    north?: boolean;
    south?: boolean;
    east?: boolean;
    west?: boolean;
    [key: string]: boolean | undefined;
  };
  isEmpty?: boolean;
  visited?: boolean;
  sides?: Record<string, string>;
  [key: string]: any;
}

export interface Dungeon {
  id: string;
  name: string;
  // Multilevel Support: string[][] for simple, Record for complex
  maze: string[][] | Record<string, string[][]>;
  rooms: Record<string, Room>;
  visitedPositions: Set<string>;
  entrance?: number[]; // [y, x] or [z, y, x]
}
