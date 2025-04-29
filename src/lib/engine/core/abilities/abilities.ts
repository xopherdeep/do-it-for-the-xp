/**
 * Ability System for Do It For The XP
 * 
 * This module provides a centralized ability system for the game,
 * handling ability management, presets, and storage.
 */

// Re-export from AbilitySystem
export * from './AbilitySystem';
export * from './AbilityMigration';

// Import types from the original location (we'll keep these in types/ folder)
export * from '@/types/abilities';

// Convenience method to get the singleton instance
import AbilitySystem, { abilitySystem } from './AbilitySystem';
export const getAbilitySystem = (): AbilitySystem => {
  return abilitySystem;
};

/**
 * Initialize the ability system
 * This function should be called during app startup
 */
export function initializeAbilitySystem(): void {
  abilitySystem.initialize();
}