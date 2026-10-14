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
 * What a real-life Power does to the hero's own quest board when cast (services/abilities/PowerBoardEffects.ts)
 */
export type PowerBoardEffectId = "snooze" | "extra-time" | "quiet-day" | "trusted-hour";

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
  /** Real-life Powers: the quest-board effect the Game Master picked ("On the quest board"); 'none' wins over the preset default. */
  boardEffect?: PowerBoardEffectId | "none";
  /**
   * Real-life Powers: minutes on the clock once cast (services/abilities/PowerTimers.ts). Above 0 makes the Power a
   * timed privilege, like 30 minutes of video games; 0 or missing is a privilege with no timer.
   */
  timerMinutes?: number;
}

/**
 * AbilityPreset is the same as Ability
 */
export type AbilityPreset = Ability;
