import { ref, computed, onMounted } from 'vue';
import { getAbilityService } from '@/lib/services/abilities';
import type { Ability, AbilityType } from '@/hooks/abilities/abilityConstants';
import debug from '@/lib/utils/debug';

/**
 * Hook that provides access to the AbilityService
 * Makes it easy to manage abilities in Vue components
 */
export function useAbilitySystem() {
  const isInitialized = ref(false);
  const abilities = ref<Ability[]>([]);
  const activePresetType = ref<string | null>(null);
  const isLoading = ref(false);
  const service = getAbilityService();

  const fetchAbilities = async () => {
    isLoading.value = true;
    try {
      abilities.value = await service.getAllAbilities();
    } catch (error) {
      debug.error('Failed to fetch abilities', error);
    } finally {
      isLoading.value = false;
    }
  };

  // Initialize if not already done
  onMounted(async () => {
    if (!isInitialized.value) {
      await fetchAbilities();
      isInitialized.value = true;
    }
  });

  // Function to get abilities by type
  const getAbilitiesByType = (type: AbilityType) => {
    return abilities.value.filter(ability => ability.type === type);
  };
  
  // Function to add a new ability
  const addAbility = async (ability: Ability) => {
    await service.saveAbility(ability);
    await fetchAbilities(); // Refresh list
  };
  
  // Function to update an existing ability
  const updateAbility = async (ability: Ability) => {
    await service.saveAbility(ability);
    await fetchAbilities(); // Refresh list
    return true;
  };
  
  // Function to delete an ability
  const deleteAbility = async (abilityId: string) => {
    // We need the full object to delete in current DB implementation
    const ability = abilities.value.find(a => a.id === abilityId);
    if (ability) {
      await service.deleteAbility(ability);
      await fetchAbilities();
      return true;
    }
    return false;
  };
  
  // Function to load presets by type
  const loadPresetsByType = (presetType: string) => {
    return service.loadPresetsByType(presetType);
  };
  
  // Function to apply a preset
  const applyPreset = async (presetId: string, presetType: string) => {
    const result = await service.applyPreset(presetId, presetType);
    if (result) {
      await fetchAbilities();
    }
    return result;
  };
  
  // Return everything needed by components
  return {
    // State
    isInitialized,
    abilities: computed(() => abilities.value), // Read-only access
    activePresetType,
    isLoading,
    
    // Methods
    getAbilitiesByType,
    addAbility,
    updateAbility,
    deleteAbility,
    loadPresetsByType,
    applyPreset,
    refresh: fetchAbilities
  };
}