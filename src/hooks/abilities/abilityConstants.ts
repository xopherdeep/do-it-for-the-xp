/**
 * Ability System Constants
 *
 * Runtime constants and helpers for the ability system.
 * Type declarations are in @/types/abilities.d.ts
 */

import type {
  Ability,
  AbilityType as AbilityTypeType,
  AbilityStatus as AbilityStatusType,
  TimePeriod as TimePeriodType,
  ApRequirement,
  CharacterRequirement,
  AbilityScaling,
  Position,
  AbilityPreset,
} from "@/types/abilities";

// Re-export types that don't conflict with local values
export type {
  Ability,
  ApRequirement,
  CharacterRequirement,
  AbilityScaling,
  Position,
  AbilityPreset,
};

/**
 * Ability Type Values - enum-compatible object
 */
export const AbilityType = {
  RealLife: "real-life",
  InGame: "in-game",
} as const;

// Merge AbilityType type
export type AbilityType = AbilityTypeType;

/**
 * Time Period Values - enum-compatible object
 */
export const TimePeriod = {
  Hourly: "hourly",
  Daily: "daily",
  Weekly: "weekly",
  Monthly: "monthly",
  Quarterly: "quarterly",
  BiAnnual: "biannual",
  Yearly: "yearly",
  Flat: "flat",
} as const;

// Merge TimePeriod type
export type TimePeriod = TimePeriodType;

/**
 * Ability Status Values - enum-compatible object
 */
export const AbilityStatus = {
  Locked: "locked",
  Unlocked: "unlocked",
  Available: "available",
  Used: "used",
  Cooling: "cooling",
  Active: "active",
} as const;

// Merge AbilityStatus type
export type AbilityStatus = AbilityStatusType;

/**
 * Character Classes
 */
export const ABILITY_CLASSES = {
  TimeMage: "time-mage",
  BlackMage: "black-mage",
  WhiteMage: "white-mage",
  Technician: "technician",
} as const;

/**
 * Type guard to check if an object is a valid Ability
 */
export function isAbility(obj: unknown): obj is Ability {
  return (
    obj !== null &&
    typeof obj === "object" &&
    typeof (obj as Ability).id === "string" &&
    typeof (obj as Ability).name === "string" &&
    typeof (obj as Ability).description === "string" &&
    typeof (obj as Ability).type === "string" &&
    typeof (obj as Ability).frequency === "string" &&
    typeof (obj as Ability).mpCost === "number" &&
    (obj as Ability).apRequirement !== undefined &&
    Array.isArray((obj as Ability).prerequisites) &&
    typeof (obj as Ability).icon === "string" &&
    typeof (obj as Ability).isPreset === "boolean" &&
    (obj as Ability).position !== undefined &&
    typeof (obj as Ability).position.x === "number" &&
    typeof (obj as Ability).position.y === "number"
  );
}
