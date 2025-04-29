import { ref, computed, onMounted, watch } from 'vue';
import { abilitySystem } from '@/engine/core/abilities';
import type { Ability, AbilityType } from '@/types/abilities';

/**
 * Hook that provides access to the AbilitySystem
 * Makes it easy to manage abilities in Vue components
 */
export function useAbilitySystem() {
  const isInitialized = ref(abilitySystem.state.initialized);
  const abilities = computed(() => abilitySystem.getAbilities());
  const activePresetType = computed(() => abilitySystem.state.activePresetType);
  
  // Initialize if not already done
  onMounted(() => {
    if (!isInitialized.value) {
      abilitySystem.initialize();
      isInitialized.value = true;
    }
  });
  
  // Watch initialization state
  watch(() => abilitySystem.state.initialized, (newValue) => {
    isInitialized.value = newValue;
  });
  
  // Function to get abilities by type
  const getAbilitiesByType = (type: AbilityType) => {
    return abilitySystem.getAbilitiesByType(type);
  };
  
  // Function to add a new ability
  const addAbility = (ability: Ability) => {
    abilitySystem.addAbility(ability);
  };
  
  // Function to update an existing ability
  const updateAbility = (ability: Ability) => {
    return abilitySystem.updateAbility(ability);
  };
  
  // Function to delete an ability
  const deleteAbility = (abilityId: string) => {
    return abilitySystem.deleteAbility(abilityId);
  };
  
  // Function to load presets by type
  const loadPresetsByType = (presetType: string) => {
    return abilitySystem.loadPresetsByType(presetType);
  };
  
  // Function to apply a preset
  const applyPreset = (presetId: string, presetType: string) => {
    return abilitySystem.applyPreset(presetId, presetType);
  };
  
  // Return everything needed by components
  return {
    // State
    isInitialized,
    abilities,
    activePresetType,
    
    // Methods
    getAbilitiesByType,
    addAbility,
    updateAbility,
    deleteAbility,
    loadPresetsByType,
    applyPreset
  };
}