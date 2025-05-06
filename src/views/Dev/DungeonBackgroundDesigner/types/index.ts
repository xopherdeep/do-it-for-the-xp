/**
 * Types for the Dungeon Background Designer
 */

// Temple and room definitions
export interface Temple {
  entrance: number[];
  maze: string[][];
  rooms: Record<string, RoomDefinition>;
}

export interface RoomDefinition {
  type: string;
  visited?: boolean;
  locked?: Record<string, boolean>;
  content?: Record<string, any>;
  isEmpty?: boolean;
}

// Locked door states
export interface LockedDoors {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

// Directions for movement
export type Direction = 'north' | 'south' | 'east' | 'west';

// Visual style options
export interface VisualStyle {
  id: string;
  name: string;
  description: string;
}

// Floor and wall pattern types
export interface PatternOption {
  id: string;
  name: string;
}

// Era-specific style configuration
export interface EraPixelSizes {
  [key: string]: number;
}

// Color palettes for different eras and materials
export interface StyleColors {
  floor: Record<string, string>;
  wall: Record<string, string>;
}

export interface EraPalette {
  [key: string]: StyleColors;
}

// Canvas rendering context with optional methods
export type CanvasContext = CanvasRenderingContext2D | null;