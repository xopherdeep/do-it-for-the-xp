/**
 * Ability Migration Utility
 * 
 * This file contains functions to migrate legacy ability data to the new enhanced format.
 */

import { 
  Ability, 
  AbilityType, 
  TimePeriod,
  isAbility
} from '@/lib/types/abilities';
import { v4 as uuidv4 } from 'uuid';
import debug from "@/lib/utils/debug";

// Legacy ability format (based on inference from existing code)
interface LegacyAbility {
  id: string;
  name: string;
  description: string;
  type?: string;
  frequency?: string;
  mpCost?: number;
  apCost?: number;
  apType?: string;
  prerequisites?: string[];
  icon?: string;
  isPreset?: boolean;
}

/**
 * Storage key for abilities in localStorage
 */
const STORAGE_KEY = '__abilities';

/**
 * Convert a legacy ability to the new format
 */
export function convertLegacyAbility(legacy: LegacyAbility): Ability {
  // Create a basic ability structure
  const ability: Ability = {
    id: legacy.id || uuidv4(),
    name: legacy.name || '',
    description: legacy.description || '',
    type: AbilityType.RealLife, // Default
    frequency: TimePeriod.Daily, // Default
    mpCost: legacy.mpCost || 0,
    apRequirement: {
      amount: legacy.apCost || 0,
      period: TimePeriod.Daily // Default
    },
    prerequisites: legacy.prerequisites || [],
    icon: legacy.icon || 'colorWandOutline',
    isPreset: legacy.isPreset || false,
    position: {
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600)
    }
  };

  // Map legacy type to new type
  if (legacy.type) {
    switch (legacy.type.toLowerCase()) {
      case 'real-life':
      case 'real life':
      case 'irl':
        ability.type = AbilityType.RealLife;
        break;
      case 'in-game':
      case 'in game':
      case 'game':
        ability.type = AbilityType.InGame;
        break;
      default:
        ability.type = AbilityType.RealLife;
    }
  }

  // Map legacy frequency to new frequency
  if (legacy.frequency) {
    switch (legacy.frequency.toLowerCase()) {
      case 'hourly':
        ability.frequency = TimePeriod.Hourly;
        break;
      case 'daily':
        ability.frequency = TimePeriod.Daily;
        break;
      case 'weekly':
        ability.frequency = TimePeriod.Weekly;
        break;
      case 'monthly':
        ability.frequency = TimePeriod.Monthly;
        break;
      case 'quarterly':
        ability.frequency = TimePeriod.Quarterly;
        break;
      case 'biannual':
      case 'bi-annual':
        ability.frequency = TimePeriod.BiAnnual;
        break;
      case 'yearly':
      case 'annual':
        ability.frequency = TimePeriod.Yearly;
        break;
      case 'flat':
      case 'one-time':
      case 'onetime':
        ability.frequency = TimePeriod.Flat;
        break;
      default:
        ability.frequency = TimePeriod.Daily;
    }
  }

  // Map legacy AP type to new AP period
  if (legacy.apType) {
    switch (legacy.apType.toLowerCase()) {
      case 'hourly':
        ability.apRequirement.period = TimePeriod.Hourly;
        break;
      case 'daily':
        ability.apRequirement.period = TimePeriod.Daily;
        break;
      case 'weekly':
        ability.apRequirement.period = TimePeriod.Weekly;
        break;
      case 'monthly':
        ability.apRequirement.period = TimePeriod.Monthly;
        break;
      case 'flat':
      case 'total':
      case 'one-time':
        ability.apRequirement.period = TimePeriod.Flat;
        break;
      default:
        ability.apRequirement.period = TimePeriod.Daily;
    }
  }

  return ability;
}

/**
 * Migrate abilities stored in localStorage
 */
export function migrateLocalStorageAbilities(): void {
  try {
    // Check if we have abilities in localStorage
    const storageData = localStorage.getItem(STORAGE_KEY);
    if (!storageData) {
      debug.log('No abilities found in localStorage to migrate');
      return;
    }

    let migrated = false;
    const storageMap = JSON.parse(storageData);

    // Create a new map for migrated abilities
    const migratedMap: { [key: string]: Ability } = {};

    // Check and migrate each ability
    for (const key in storageMap) {
      const item = storageMap[key];
      
      // Skip if not an object
      if (!item || typeof item !== 'object') continue;

      // If it doesn't match our new ability structure, migrate it
      if (!isAbility(item)) {
        debug.log(`Migrating ability: ${item.name || key}`);
        migratedMap[key] = convertLegacyAbility(item as LegacyAbility);
        migrated = true;
      } else {
        // Already in the new format, just copy it
        migratedMap[key] = item as Ability;
      }
    }

    // Only save back to localStorage if we actually migrated something
    if (migrated) {
      debug.log('Saving migrated abilities to localStorage');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedMap));
    } else {
      debug.log('All abilities are already in the new format');
    }
  } catch (error) {
    debug.error('Error during ability migration:', error);
  }
}

/**
 * Run migration for all data sources
 */
export function migrateAllAbilityData(): void {
  migrateLocalStorageAbilities();
  
  // Add more migration functions here as needed
  // e.g., migrateIndexedDbAbilities();
}

export default {
  migrateLocalStorageAbilities,
  migrateAllAbilityData,
  convertLegacyAbility
};