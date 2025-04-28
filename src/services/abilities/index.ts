/**
 * Ability System Entry Point
 * 
 * This file exports all components of the ability system for easy importing.
 */

// Core ability types
export * from '@/types/abilities';

// Service for manipulating abilities
export { default as AbilityService } from './AbilityService';

// Migration utilities for backward compatibility
export * from './AbilityMigration';

// Preset abilities
export { 
  default as AbilityPresets,
  REAL_LIFE_PRESETS,
  TIME_MAGE_PRESETS,
  TECH_MAGE_PRESETS,
  HYBRID_PRESETS
} from './AbilityPresets';

// Composable hook for using abilities in components
export { useAbilitiesSystem } from '@/hooks/useAbilities';

// UI Components
export { default as XpAbilityDetail } from '@/components/XpAbility/XpAbilityDetail.vue';
export { default as XpAbilityManager } from '@/components/XpAbility/XpAbilityManager.vue';

/**
 * Initialize the ability system
 * This function should be called during app startup
 */
export function initializeAbilitySystem() {
  // Import migration utilities
  const { migrateLocalStorageAbilities } = require('./AbilityMigration');
  
  // Run migrations to ensure data is in the correct format
  migrateLocalStorageAbilities();
  
  console.log('Ability system initialized');
}

/**
 * Public API for the ability system
 */
export default {
  initializeAbilitySystem
};