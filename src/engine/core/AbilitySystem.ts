/**
 * Ability System Core
 * 
 * A singleton service to manage player abilities across the application.
 * Provides a centralized API for ability management similar to other core systems.
 */

import debug from '@/utils/debug';
import { reactive } from 'vue';
import type { Ability, AbilityType, AbilityPreset } from '@/types/abilities';

// Import presets from the new location
import { 
  REAL_LIFE_PRESETS,
  TIME_MAGE_PRESETS,
  TECH_MAGE_PRESETS,
  HYBRID_PRESETS
} from './AbilityPresets';

/**
 * Core AbilitySystem class
 * 
 * Manages abilities using a singleton pattern similar to other engine core systems.
 * Provides ability creation, management, preset loading, and storage functionality.
 */
class AbilitySystem {
  private static instance: AbilitySystem;
  
  // Reactive state for abilities
  public state = reactive({
    abilities: [] as Ability[],
    activePresetType: null as string | null,
    initialized: false
  });
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    debug.log('AbilitySystem instance created');
  }
  
  /**
   * Get the singleton instance of AbilitySystem
   */
  public static getInstance(): AbilitySystem {
    if (!AbilitySystem.instance) {
      AbilitySystem.instance = new AbilitySystem();
    }
    return AbilitySystem.instance;
  }
  
  /**
   * Initialize the ability system and migrate any existing data
   */
  public initialize(): void {
    if (this.state.initialized) {
      return;
    }
    
    // Import migration utilities here to avoid circular dependencies
    const { migrateLocalStorageAbilities } = require('./AbilityMigration');
    
    // Run migrations to ensure data is in the correct format
    migrateLocalStorageAbilities();
    
    // Load stored abilities from local storage
    this.loadAbilities();
    
    this.state.initialized = true;
    debug.log('Ability system initialized');
  }
  
  /**
   * Load abilities from storage
   */
  private loadAbilities(): void {
    // Implementation will be migrated from AbilityService
    // This is a placeholder for now
  }
  
  /**
   * Save abilities to storage
   */
  private saveAbilities(): void {
    // Implementation will be migrated from AbilityService
    // This is a placeholder for now
  }
  
  /**
   * Get all available abilities
   */
  public getAbilities(): Ability[] {
    return [...this.state.abilities];
  }
  
  /**
   * Get abilities by type
   */
  public getAbilitiesByType(type: AbilityType): Ability[] {
    return this.state.abilities.filter(ability => ability.type === type);
  }
  
  /**
   * Add a new ability
   */
  public addAbility(ability: Ability): void {
    this.state.abilities.push(ability);
    this.saveAbilities();
  }
  
  /**
   * Update an existing ability
   */
  public updateAbility(updatedAbility: Ability): boolean {
    const index = this.state.abilities.findIndex(a => a.id === updatedAbility.id);
    if (index === -1) return false;
    
    this.state.abilities[index] = updatedAbility;
    this.saveAbilities();
    return true;
  }
  
  /**
   * Delete an ability
   */
  public deleteAbility(abilityId: string): boolean {
    const initialLength = this.state.abilities.length;
    this.state.abilities = this.state.abilities.filter(a => a.id !== abilityId);
    
    if (this.state.abilities.length !== initialLength) {
      this.saveAbilities();
      return true;
    }
    return false;
  }
  
  /**
   * Load ability presets by type
   */
  public loadPresetsByType(presetType: string): AbilityPreset[] {
    switch (presetType) {
      case 'real-life':
        return REAL_LIFE_PRESETS;
      case 'time-mage':
        return TIME_MAGE_PRESETS;
      case 'tech-mage':
        return TECH_MAGE_PRESETS;
      case 'hybrid':
        return HYBRID_PRESETS;
      default:
        return [];
    }
  }
  
  /**
   * Apply a preset to the user's abilities
   */
  public applyPreset(presetId: string, presetType: string): boolean {
    // Implementation will be migrated from AbilityService
    // This is a placeholder for now
    
    debug.log(`Applying preset ${presetId} of type ${presetType}`);
    
    // TODO: Implement proper preset application
    return true;
  }
}

// Export the singleton instance
export const abilitySystem = AbilitySystem.getInstance();

// Also export the class for testing purposes
export default AbilitySystem;