import { ref, computed, reactive, onMounted } from 'vue';
import { useQuery } from "vue-query";
import XpApi from "@/api/doit.forthexp.com.api";
import { Ability, AbilityStatus, TimePeriod } from '@/types/abilities';
import AbilityService from '@/services/abilities/AbilityService';
import AbilitiesDb, { abilitiesStorage } from '@/databases/AbilitiesDb';

// Create the AbilityService instance with the AbilitiesDb
const db = new AbilitiesDb(abilitiesStorage);
const abilityService = new AbilityService(db);

/**
 * Legacy hook - Compatibility with existing code
 */
function useAbilitiesApi(page, params, callback) {
  const fetchAbilities = async () => await XpApi
    .get("xp_ability", params)
    .then(callback)

  return useQuery(["abilities", page, params], fetchAbilities, {
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
}

/**
 * Enhanced hook for working with abilities in the application
 * Provides reactive abilities state and methods for manipulation
 */
export function useAbilitiesSystem(options: {
  includePresets?: boolean;
  characterLevel?: number;
  characterClasses?: { [className: string]: number };
  characterStats?: { [statName: string]: number };
  userAp?: {
    total: number;
    daily: number;
    weekly: number;
    monthly: number;
    quarterly?: number;
    yearly?: number;
  };
  userMp?: number;
} = {}) {
  // Default options
  const {
    includePresets = true,
    characterLevel = 1,
    characterClasses = {},
    characterStats = {},
    userAp = { total: 0, daily: 0, weekly: 0, monthly: 0 },
    userMp = 0
  } = options;

  // Reactive state
  const abilities = ref<Ability[]>([]);
  const isLoading = ref(true);
  const error = ref<Error | null>(null);
  const unlockStatuses = reactive<{ [abilityId: string]: boolean }>({});
  const abilityStatuses = reactive<{ [abilityId: string]: AbilityStatus }>({});
  const calculatedEffects = reactive<{ [abilityId: string]: number }>({});
  
  // Computed properties
  const unlockedAbilities = computed(() => 
    abilities.value.filter(ability => unlockStatuses[ability.id]));
  
  const availableAbilities = computed(() => 
    abilities.value.filter(ability => 
      abilityStatuses[ability.id] === AbilityStatus.Available));

  const abilitiesByFrequency = computed(() => {
    const result: { [key in TimePeriod]?: Ability[] } = {};
    
    // Initialize with empty arrays for each TimePeriod
    Object.values(TimePeriod).forEach(period => {
      result[period] = [];
    });
    
    // Group abilities by their frequency
    abilities.value.forEach(ability => {
      if (!result[ability.frequency]) {
        result[ability.frequency] = [];
      }
      result[ability.frequency]?.push(ability);
    });
    
    return result;
  });

  // Methods
  async function loadAbilities() {
    isLoading.value = true;
    error.value = null;
    
    try {
      abilities.value = await abilityService.getAllAbilities();
      
      // If includePresets is false, filter out presets
      if (!includePresets) {
        abilities.value = abilities.value.filter(a => !a.isPreset);
      }
      
      // Calculate unlock statuses for all abilities
      await updateAbilityStatuses();
    } catch (e) {
      error.value = e as Error;
      console.error('Error loading abilities:', e);
    } finally {
      isLoading.value = false;
    }
  }
  
  async function updateAbilityStatuses() {
    // First determine which abilities are unlocked
    for (const ability of abilities.value) {
      unlockStatuses[ability.id] = await abilityService.checkAbilityUnlock(
        ability,
        userAp,
        characterLevel,
        characterClasses,
        Object.keys(unlockStatuses).filter(id => unlockStatuses[id])
      );
      
      // Determine ability status (available, used, cooling, etc)
      abilityStatuses[ability.id] = abilityService.getAbilityStatus(
        ability,
        unlockStatuses[ability.id],
        userMp,
        ability.lastUsed ? new Date(ability.lastUsed) : undefined
      );
      
      // Calculate ability scaling effects
      calculatedEffects[ability.id] = abilityService.calculateAbilityEffect(
        ability,
        characterStats
      );
    }
  }
  
  async function createAbility(abilityData: Partial<Ability>): Promise<Ability> {
    const newAbility = {
      ...abilityService.createAbility(),
      ...abilityData
    };
    
    await abilityService.saveAbility(newAbility);
    await loadAbilities();
    return newAbility;
  }
  
  async function updateAbility(abilityId: string, updates: Partial<Ability>): Promise<Ability | null> {
    const ability = await abilityService.getAbilityById(abilityId);
    
    if (!ability) return null;
    
    const updatedAbility = {
      ...ability,
      ...updates
    };
    
    await abilityService.saveAbility(updatedAbility);
    await loadAbilities();
    return updatedAbility;
  }
  
  async function removeAbility(abilityId: string): Promise<boolean> {
    const ability = await abilityService.getAbilityById(abilityId);
    
    if (!ability) return false;
    
    await abilityService.deleteAbility(ability);
    await loadAbilities();
    return true;
  }
  
  async function useAbility(abilityId: string, userId: string = 'current-user'): Promise<{
    success: boolean;
    message: string;
    mpCost: number;
  }> {
    const result = await abilityService.useAbility(abilityId, userId, userMp);
    
    // Reload abilities to update statuses
    await loadAbilities();
    
    return result;
  }
  
  // Initialization
  onMounted(() => {
    loadAbilities();
  });
  
  // Return the API
  return {
    // State
    abilities,
    isLoading,
    error,
    unlockStatuses,
    abilityStatuses,
    calculatedEffects,
    
    // Computed
    unlockedAbilities,
    availableAbilities,
    abilitiesByFrequency,
    
    // Methods
    loadAbilities,
    updateAbilityStatuses,
    createAbility,
    updateAbility,
    removeAbility,
    useAbility,
    
    // Service direct access
    service: abilityService
  };
}

// For backward compatibility, export the original function as default
export default useAbilitiesApi;