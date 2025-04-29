/**
 * Ability System Entry Point
 * 
 * This file re-exports all components of the ability system from the new
 * engine/core location, providing backward compatibility.
 * 
 * DEPRECATED: Import from '@/engine/core/abilities' instead.
 */

// Re-export everything from engine/core/abilities to maintain backward compatibility
export * from '@/lib/engine/core/abilities';

// Export UI components
export { default as XpAbilityDetail } from '@/components/XpAbility/XpAbilityDetail.vue';
export { default as XpAbilityManager } from '@/components/XpAbility/XpAbilityManager.vue';

// Use the new hook
export { useAbilitySystem as useAbilitiesSystem } from '@/hooks/useAbilitySystem';

// Use the new initialization function from engine/core
import { initializeAbilitySystem as initCoreAbilitySystem } from '@/lib/engine/core/abilities';

/**
 * Initialize the ability system
 * This function should be called during app startup
 * @deprecated Use `initializeAbilitySystem()` from '@/engine/core/abilities' instead
 */
export function initializeAbilitySystem() {
  console.warn('DEPRECATED: Using abilities from services/abilities is deprecated. Import from engine/core/abilities instead.');
  // Call the new initialize function
  initCoreAbilitySystem();
}

/**
 * Public API for the ability system
 * @deprecated Use the exported functions from '@/engine/core/abilities' instead
 */
export default {
  initializeAbilitySystem
};