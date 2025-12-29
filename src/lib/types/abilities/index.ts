/**
 * Ability Types
 *
 * This file defines the core types and interfaces for the enhanced ability system.
 */

/**
 * Ability Types Enum
 */
export enum AbilityType {
  RealLife = "real-life",
  InGame = "in-game",
}

/**
 * Time Period Enum for scheduling and frequency
 */
export enum TimePeriod {
  Hourly = "hourly",
  Daily = "daily",
  Weekly = "weekly",
  Monthly = "monthly",
  Quarterly = "quarterly",
  BiAnnual = "biannual",
  Yearly = "yearly",
  Flat = "flat", // One-time
}

/**
 * Ability Status Enum
 */
export enum AbilityStatus {
  Locked = "locked", // Not yet unlocked
  Unlocked = "unlocked", // Unlocked but can't use (e.g., not enough MP)
  Available = "available", // Ready to use
  Used = "used", // Already used this period
  Cooling = "cooling", // In cooldown
  Active = "active", // Currently active
}

/**
 * Character Classes constants
 */
export const ABILITY_CLASSES = {
  TimeMage: "time-mage",
  BlackMage: "black-mage",
  WhiteMage: "white-mage",
  Technician: "technician",
  // Legacy aliases for compatibility
  TIME_MAGE: "time-mage",
  BLACK_MAGE: "black-mage",
  WHITE_MAGE: "white-mage",
  TECHNICIAN: "technician",
} as const;

/**
 * AP Requirement interface
 */
export interface ApRequirement {
  amount: number;
  period: TimePeriod;
}

/**
 * Character Requirement interface
 */
export interface CharacterRequirement {
  level?: number;
  class?: {
    [className: string]: number; // Class name to level requirement
  };
}

/**
 * Ability Scaling interface
 */
export interface AbilityScaling {
  attribute: string; // 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'
  rate: number; // Scaling rate (e.g., 0.1 = 10% per attribute point)
}

/**
 * Position interface for ability tree visualization
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Core Ability interface
 */
export interface Ability {
  id: string;
  name: string;
  description: string;
  type: AbilityType;
  frequency: TimePeriod; // How often it can be used
  mpCost: number; // MP cost to use
  apRequirement: ApRequirement; // AP needed to unlock
  prerequisites: string[]; // IDs of abilities required before this can be unlocked
  icon: string; // Icon name for display
  iconPrefix?: string; // 'fas', 'far', 'fal', 'fab', etc.
  isPreset: boolean; // Whether this is a preset ability
  position: Position; // Position in the ability tree

  // Optional properties
  effect?: string; // What the ability does (for in-game abilities)
  characterRequirement?: CharacterRequirement; // Level/class requirements
  scaling?: AbilityScaling; // How the ability scales with attributes
  lastUsed?: string; // ISO date string of last use
}

/**
 * Type guard to check if an object is a valid Ability
 */
export function isAbility(obj: any): obj is Ability {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.description === "string" &&
    typeof obj.type === "string" &&
    typeof obj.frequency === "string" &&
    typeof obj.mpCost === "number" &&
    obj.apRequirement &&
    Array.isArray(obj.prerequisites) &&
    typeof obj.icon === "string" &&
    typeof obj.isPreset === "boolean" &&
    obj.position &&
    typeof obj.position.x === "number" &&
    typeof obj.position.y === "number"
  );
}

// For consistency with our other systems, Ability and AbilityPreset are the same type
// but we use AbilityPreset when explicitly referring to predefined abilities
export type AbilityPreset = Ability;

export default {
  AbilityType,
  TimePeriod,
  AbilityStatus,
  ABILITY_CLASSES,
  isAbility,
};
