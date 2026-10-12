/**
 * Ability Types
 *
 * Pure type declarations for the ability system.
 * Runtime constants are in @/hooks/abilities/abilityConstants.ts
 */
import type { BattleEffectId } from "@/lib/services/battle/BattleEffects";

/**
 * Ability Type - real-life or in-game
 */
export type AbilityType = "real-life" | "in-game";

/**
 * Time Period for scheduling and frequency
 */
export type TimePeriod =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "biannual"
  | "yearly"
  | "flat";

/**
 * Ability Status
 */
export type AbilityStatus =
  | "locked"
  | "unlocked"
  | "available"
  | "used"
  | "cooling"
  | "active";

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
    [className: string]: number;
  };
}

/**
 * Ability Scaling interface
 */
export interface AbilityScaling {
  attribute: string;
  rate: number;
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
  frequency: TimePeriod;
  mpCost: number;
  apRequirement: ApRequirement;
  prerequisites: string[];
  icon: string;
  iconPrefix?: string;
  isPreset: boolean;
  position: Position;
  effect?: string;
  characterRequirement?: CharacterRequirement;
  scaling?: AbilityScaling;
  lastUsed?: string;
  /** In-game Powers: the fight effect the Game Master picked ("In battle"); 'none' wins over the preset default. */
  battleEffect?: BattleEffectId | "none";
}

/**
 * AbilityPreset is the same as Ability
 */
export type AbilityPreset = Ability;
