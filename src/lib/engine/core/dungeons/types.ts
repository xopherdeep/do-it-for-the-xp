/**
 * Dungeon Engine Types
 */

/**
 * What a shipped combat room asks of a family quest (docs/Quest-Rooms-Spec.md section 6): the beast it is bound to
 * (the binding key), the quest it wakes when no family quest fills the room, and the difficulty that sizes the
 * temple and sets the tier. `resolveRoomQuest` matches it to a live quest by beast; until one exists the room is
 * dormant and plays as a classic fight with this beast.
 */
export interface RoomQuestTemplate {
  /** The bestiary / library beast id the room is bound to (a quest's beast is its `beastId`, else the library's suggestion) */
  beastId: string;
  /** The Fibonacci difficulty (1-2 monster, 3-5 miniboss, 8+ boss) */
  difficulty: number;
  /** once | daily | weekly | custom, as on the quest record */
  basicSchedule: string;
  repeatOnDays?: string[];
  timesOfDay?: ('morning' | 'noon' | 'evening' | 'night')[];
  dueByTime?: string;
  customPeriodType?: string;
  /** About how long the chore takes in minutes (the strike clock); absent means the default for the difficulty */
  estimatedMinutes?: number;
}

export interface RoomContent {
  beasts?: string[];
  /** A quest room: the family quest the Game Master picked in the editor (5.2 step 1) */
  questId?: string;
  /** A quest room: the quests it holds, in order; each hero meets the one open for them */
  questIds?: string[];
  /** What the room is called in the house: "Kitchen" */
  name?: string;
  /** A quest room: the shipped template, matched to a live quest by beast (5.2 step 2) */
  quest?: RoomQuestTemplate;
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
