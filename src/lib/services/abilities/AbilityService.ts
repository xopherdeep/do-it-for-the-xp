import {
  Ability,
  AbilityStatus,
  AbilityType,
  AbilityPreset,
  ABILITY_CLASSES,
  TimePeriod,
} from "@/hooks/abilities/abilityConstants";
import AbilitiesDb from "@/lib/databases/AbilitiesDb";
import { v4 as uuidv4 } from "uuid";
import { migrateLocalStorageAbilities } from "./AbilitiesMigration.legacy";
import {
  REAL_LIFE_PRESETS,
  TIME_MAGE_PRESETS,
  TECH_MAGE_PRESETS,
} from "./AbilityPresets";
/**
 *
 * Service for handling abilities and their effects
 */
export class AbilityService {
  private static instance: AbilityService;
  private db: AbilitiesDb;

  private constructor(db: AbilitiesDb) {
    this.db = db;
    this.migrateLegacyData();
  }

  public static initialize(db: AbilitiesDb): AbilityService {
    if (!AbilityService.instance) {
      AbilityService.instance = new AbilityService(db);
    }
    return AbilityService.instance;
  }

  public static getInstance(): AbilityService {
    if (!AbilityService.instance) {
      throw new Error(
        "AbilityService not initialized. Call initialize() first."
      );
    }
    return AbilityService.instance;
  }

  /**
   * Migrate legacy data from previous ability structure
   */
  private migrateLegacyData(): void {
    // Migrate abilities stored in localStorage
    migrateLocalStorageAbilities();
  }

  /**
   * Creates a new ability with default values
   */
  createAbility(): Ability {
    return {
      id: uuidv4(),
      name: "",
      description: "",
      type: AbilityType.RealLife,
      frequency: TimePeriod.Daily,
      mpCost: 0,
      apRequirement: {
        amount: 0,
        period: TimePeriod.Flat,
      },
      icon: "",
      prerequisites: [],
      isPreset: false,
      position: { x: 0, y: 0 },
    };
  }

  /**
   * Creates a real-life ability (reward) with sensible defaults
   */
  createRealLifeAbility(
    name: string,
    description: string,
    apAmount: number,
    apPeriod: TimePeriod = TimePeriod.Daily,
    mpCost: number = 0
  ): Ability {
    return {
      ...this.createAbility(),
      name,
      description,
      type: AbilityType.RealLife,
      apRequirement: {
        amount: apAmount,
        period: apPeriod,
      },
      mpCost,
      icon: "homeOutline", // Default icon for real-life abilities
    };
  }

  /**
   * Creates an in-game ability with sensible defaults
   */
  createInGameAbility(
    name: string,
    description: string,
    className: string,
    apAmount: number,
    apPeriod: TimePeriod = TimePeriod.Flat,
    mpCost: number = 5,
    effect: string = "",
    levelRequirement: number = 1
  ): Ability {
    return {
      ...this.createAbility(),
      name,
      description,
      type: AbilityType.InGame,
      apRequirement: {
        amount: apAmount,
        period: apPeriod,
      },
      mpCost,
      effect,
      characterRequirement: {
        level: levelRequirement,
        class: {
          [className]: 1, // Requires at least level 1 in the specified class
        },
      },
      icon: "gameControllerOutline", // Default icon for in-game abilities
    };
  }

  /**
   * Saves an ability to the database
   */
  async saveAbility(ability: Ability): Promise<void> {
    await this.db.setAbility(ability);
  }

  /**
   * Deletes an ability from the database
   */
  async deleteAbility(ability: Ability): Promise<Ability[]> {
    return await this.db.deleteAbility(ability);
  }

  /**
   * Gets all abilities from the database
   */
  async getAllAbilities(): Promise<Ability[]> {
    return await this.db.getAbilities();
  }

  /**
   * Gets an ability by its ID
   */
  async getAbilityById(id: string): Promise<Ability | null> {
    return await this.db.getAbilityById(id);
  }

  /**
   * Gets filtered abilities based on various criteria
   */
  async getFilteredAbilities(filters: {
    type?: AbilityType;
    class?: string;
    frequency?: TimePeriod;
    isPreset?: boolean;
  }): Promise<Ability[]> {
    return await this.db.getFilteredAbilities(filters);
  }

  /**
   * Checks if an ability is unlocked based on prerequisites, AP, and character requirements
   */
  async checkAbilityUnlock(
    ability: Ability,
    userAp: {
      total: number;
      daily: number;
      weekly: number;
      monthly: number;
      quarterly?: number;
      yearly?: number;
    },
    characterLevel: number,
    characterClasses: { [className: string]: number },
    unlockedAbilityIds: string[]
  ): Promise<boolean> {
    // Check AP requirements
    let hasEnoughAp = false;
    switch (ability.apRequirement.period) {
      case TimePeriod.Flat:
        hasEnoughAp = userAp.total >= ability.apRequirement.amount;
        break;
      case TimePeriod.Daily:
        hasEnoughAp = userAp.daily >= ability.apRequirement.amount;
        break;
      case TimePeriod.Weekly:
        hasEnoughAp = userAp.weekly >= ability.apRequirement.amount;
        break;
      case TimePeriod.Monthly:
        hasEnoughAp = userAp.monthly >= ability.apRequirement.amount;
        break;
      case TimePeriod.Quarterly:
        hasEnoughAp = (userAp.quarterly || 0) >= ability.apRequirement.amount;
        break;
      case TimePeriod.Yearly:
        hasEnoughAp = (userAp.yearly || 0) >= ability.apRequirement.amount;
        break;
      default:
        hasEnoughAp = userAp.total >= ability.apRequirement.amount;
    }

    if (!hasEnoughAp) return false;

    // Check character level requirement
    if (
      ability.characterRequirement?.level &&
      characterLevel < ability.characterRequirement.level
    ) {
      return false;
    }

    // Check character class requirements
    if (ability.characterRequirement?.class) {
      for (const [className, requiredLevel] of Object.entries(
        ability.characterRequirement.class
      )) {
        const userClassLevel = characterClasses[className] || 0;
        if (userClassLevel < requiredLevel) {
          return false;
        }
      }
    }

    // Check prerequisites
    if (ability.prerequisites && ability.prerequisites.length > 0) {
      for (const prereqId of ability.prerequisites) {
        if (!unlockedAbilityIds.includes(prereqId)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Gets the status of an ability based on user stats and usage history
   */
  getAbilityStatus(
    ability: Ability,
    isUnlocked: boolean,
    mpAvailable: number,
    lastUsed?: Date
  ): AbilityStatus {
    if (!isUnlocked) {
      return AbilityStatus.Locked;
    }

    if (mpAvailable < ability.mpCost) {
      return AbilityStatus.Unlocked; // Unlocked but not enough MP to use
    }

    if (!lastUsed) {
      return AbilityStatus.Available;
    }

    // Check if the ability is in cooldown based on frequency
    const now = new Date();
    let cooldownExpired = true;
    let oneWeek: number;
    let currentQuarter: number;
    let lastQuarter: number;
    let currentHalf: number;
    let lastHalf: number;

    switch (ability.frequency) {
      case TimePeriod.Hourly:
        cooldownExpired = now.getTime() - lastUsed.getTime() > 60 * 60 * 1000;
        break;
      case TimePeriod.Daily:
        cooldownExpired =
          now.getDate() !== lastUsed.getDate() ||
          now.getMonth() !== lastUsed.getMonth() ||
          now.getFullYear() !== lastUsed.getFullYear();
        break;
      case TimePeriod.Weekly:
        oneWeek = 7 * 24 * 60 * 60 * 1000;
        cooldownExpired = now.getTime() - lastUsed.getTime() > oneWeek;
        break;
      case TimePeriod.Monthly:
        cooldownExpired =
          now.getMonth() !== lastUsed.getMonth() ||
          now.getFullYear() !== lastUsed.getFullYear();
        break;
      case TimePeriod.Quarterly:
        currentQuarter = Math.floor(now.getMonth() / 3);
        lastQuarter = Math.floor(lastUsed.getMonth() / 3);
        cooldownExpired =
          currentQuarter !== lastQuarter ||
          now.getFullYear() !== lastUsed.getFullYear();
        break;
      case TimePeriod.BiAnnual:
        currentHalf = now.getMonth() < 6 ? 0 : 1;
        lastHalf = lastUsed.getMonth() < 6 ? 0 : 1;
        cooldownExpired =
          currentHalf !== lastHalf ||
          now.getFullYear() !== lastUsed.getFullYear();
        break;
      case TimePeriod.Yearly:
        cooldownExpired = now.getFullYear() !== lastUsed.getFullYear();
        break;
      default:
        cooldownExpired = true;
    }

    if (!cooldownExpired) {
      return AbilityStatus.Cooling;
    }

    return AbilityStatus.Available;
  }

  /**
   * Calculates the effective value of an ability based on character stats
   */
  calculateAbilityEffect(
    ability: Ability,
    characterStats: { [stat: string]: number }
  ): number {
    if (!ability.scaling) {
      return 1; // No scaling, return base value
    }

    const attributeValue = characterStats[ability.scaling.attribute] || 0;
    return 1 + attributeValue * ability.scaling.rate;
  }

  /**
   * Use an ability and record its usage
   */
  async useAbility(
    abilityId: string,
    userId: string,
    mpAvailable: number
  ): Promise<{ success: boolean; message: string; mpCost: number }> {
    const ability = await this.getAbilityById(abilityId);

    if (!ability) {
      return {
        success: false,
        message: "Ability not found",
        mpCost: 0,
      };
    }

    if (mpAvailable < ability.mpCost) {
      return {
        success: false,
        message: "Not enough MP",
        mpCost: ability.mpCost,
      };
    }

    // Update ability with usage timestamp
    ability.lastUsed = new Date().toISOString();
    await this.saveAbility(ability);

    return {
      success: true,
      message: `Successfully used ${ability.name}`,
      mpCost: ability.mpCost,
    };
  }
  /**
   * Load ability presets by type
   */
  public loadPresetsByType(presetType: string): AbilityPreset[] {
    switch (presetType) {
      case AbilityType.RealLife:
        return REAL_LIFE_PRESETS;
      case ABILITY_CLASSES.TimeMage:
        return TIME_MAGE_PRESETS;
      case ABILITY_CLASSES.Technician:
        return TECH_MAGE_PRESETS;
      default:
        return [];
    }
  }

  /**
   * Apply a preset to the user's abilities
   */
  public async applyPreset(
    presetId: string,
    presetType: string
  ): Promise<boolean> {
    const presets = this.loadPresetsByType(presetType);
    const preset = presets.find((p) => p.id === presetId);

    if (preset) {
      // Cast preset to Ability (it overlaps significantly) and ensure it's not marked as preset
      const ability: Ability = {
        ...preset,
        isPreset: false,
        id: uuidv4(), // Generate new ID for the user's copy
      } as Ability;

      await this.saveAbility(ability);
      return true;
    }
    return false;
  }
}

// Export a convenience function to get the AbilityService instance
export const getAbilityService = (): AbilityService => {
  return AbilityService.getInstance();
};

export default AbilityService;
