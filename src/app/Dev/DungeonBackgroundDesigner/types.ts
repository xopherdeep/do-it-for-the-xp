// Room types
export type RoomType = 
  | 'entrance' 
  | 'exit' 
  | 'hall' 
  | 'wall' 
  | 'loot' 
  | 'monster' 
  | 'boss' 
  | 'miniboss' 
  | 'shop' 
  | 'trap' 
  | 'puzzle' 
  | 'teleport' 
  | 'empty' 
  | 'hidden';

// Canvas rendering context type alias
export type CanvasContext = CanvasRenderingContext2D | null;

// Directions
export type Direction = 'north' | 'south' | 'east' | 'west';

// Room content items (for chests, shops, etc.)
export interface ContentItem {
  name: string;
  type: 'item' | 'gold' | 'key' | 'accessory';
  value?: string | number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  effect?: string;
}

// Room content definition
export interface RoomContent {
  items?: ContentItem[];
  monsters?: string[];
  puzzleType?: string;
  teleportTo?: [number, number];
  message?: string;
  shopItems?: ContentItem[];
}

// Room definition
export interface RoomDefinition {
  type: RoomType;
  doors?: Partial<Record<Direction, boolean>>; // True = locked, False = unlocked
  content?: RoomContent;
  visited?: boolean;
  isEmpty?: boolean; // For chests that have been looted
  background?: string;
  locked?: boolean; // If the room itself is locked
}

// Temple definition
export interface Temple {
  name: string;
  maze: string[][]; // IDs of rooms in the grid
  rooms: Record<string, RoomDefinition>; // Room definitions keyed by ID
  entrance: [number, number]; // Starting position [row, col]
}

// Style configuration 
export interface StyleConfig {
  wallColor: string;
  floorColor: string;
  roomTypeColors: Record<RoomType, string>;
  doorSize: number;
  doorColor: string;
  lockedDoorColor: string;
}

// Visual style selection
export interface VisualStyle {
  id: string;
  name: string;
  description: string;
}

// Pattern selection
export interface PatternOption {
  id: string;
  name: string;
}

// Era-specific pixel sizes
export interface EraPixelSizes {
  [key: string]: number;
}

// Style colors for different materials
export interface MaterialColors {
  [key: string]: string;
}

export interface StyleColors {
  floor: Record<string, string>;
  wall: Record<string, string>;
}

// Era-specific color palettes
export interface EraPalette {
  [key: string]: {
    floor: Record<string, string>;
    wall: Record<string, string>;
  };
}

// Room visibility status for maps
export type RoomVisibility = 'visited' | 'revealed' | 'none';

// Locked doors state
export type LockedDoors = Partial<Record<Direction, boolean>>;

// Define types for component props and events
export interface NavigationControlsProps {
  canMoveUp: boolean;
  canMoveDown: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  isDoorLocked: (direction: Direction) => boolean;
}

export interface NavigationControlsEvents {
  move: (direction: Direction) => void;
}

export interface RoomInfoDisplayProps {
  roomType: string;
  position: [number, number];
}

export interface RoomActionButtonProps {
  roomIcon: string;
}

export interface RoomActionButtonEvents {
  showDetails: () => void;
}

export interface SettingsModalProps {
  isOpen: boolean;
  selectedTemple: string;
  currentPosition: [number, number];
  currentRoomType: string;
  styles: StyleConfig;
  lockedDoors: {
    [key in Direction]?: boolean;
  };
}

export interface SettingsModalEvents {
  close: () => void;
  templeChanged: () => Promise<void>;
  styleChanged: () => void;
  toggleDoorLock: (direction: Direction) => void;
  exportBackground: () => void;
  resetToEntrance: () => void;
}