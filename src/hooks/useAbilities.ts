import { ref } from 'vue';
import { useAbilitySystem } from '@/hooks/useAbilitySystem';

/**
 * Hook to interact with abilities 
 * @deprecated Use useAbilitySystem() from hooks/useAbilitySystem.ts instead
 */
export function useAbilities(page?: number, params?: any, updateTotals?: (arg: any) => any) {
  console.warn('DEPRECATED: useAbilities() is deprecated, please use useAbilitySystem() instead');
  
  // If page, params, and updateTotals are provided, this is being used as a data fetching hook
  // so we need to provide a compatible API
  if (page !== undefined && params !== undefined) {
    // Create dummy refs that match the expected API structure
    const isLoading = ref(false);
    const isError = ref(false);
    const isFetching = ref(false);
    const error = ref(null);
    
    // Use the new hook to get the abilities
    const { abilities } = useAbilitySystem();
    
    // Create a mock data object with empty headers for the updateTotals function
    if (updateTotals) {
      const mockResponse = {
        data: [],
        headers: new Map([
          ["x-wp-total", "0"],
          ["x-wp-totalpages", "1"],
        ])
      };
      updateTotals(mockResponse);
    }
    
    // Return a compatible API shape
    return {
      isLoading,
      isError,
      data: abilities,
      error,
      isFetching,
    };
  }
  
  // If no arguments are provided, use the new hook and return its API
  const {
    isInitialized,
    abilities,
    activePresetType,
    getAbilitiesByType,
    addAbility,
    updateAbility,
    deleteAbility,
    loadPresetsByType,
    applyPreset
  } = useAbilitySystem();
  
  return {
    isInitialized,
    abilities,
    activePresetType,
    getAbilitiesByType,
    addAbility,
    updateAbility,
    deleteAbility,
    loadPresetsByType,
    applyPreset
  };
}

export default useAbilities;