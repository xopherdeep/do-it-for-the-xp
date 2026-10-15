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
import { useUserStore } from "@/lib/store/stores/user";
import { isGrounded } from "@/lib/services/gp/wallet";
import { format } from "date-fns";
import { getCastLogDb, type CastLogEntry } from "@/lib/databases/CastLogDb";
import { FAMILY_CHAT_ROOM, useChatStore } from "@/lib/store/stores/chat";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { POWER_CAST_ALERT_ID, showAlert } from "@/lib/services/notifications/alertBridge";
import debug from "@/lib/utils/debug";

/** The criteria `getFilteredAbilities` narrows by */
interface AbilityFilters {
  type?: AbilityType;
  class?: string;
  frequency?: TimePeriod;
  isPreset?: boolean;
}

/** The hero's AP, overall and per period, for an unlock check */
interface HeroApTotals {
  total: number;
  daily: number;
  weekly: number;
  monthly: number;
  quarterly?: number;
  yearly?: number;
}

/**
 * What a cast came to: `grounded` when the hero owes the Hospital (checked first), `mp` when the hero could not afford
 * it, `unknown` when there is no such ability or hero.
 * A successful cast carries the Cast Log entry it left behind (absent only if the log could not be written).
 */
export type UseAbilityResult = { ok: true; entry?: CastLogEntry } | { ok: false; reason: "grounded" | "mp" | "unknown" };

/** The hero's MP right now, whether stats keep it as `{ now, max }` or a bare number. */
const currentMp = (stats: { mp?: { now?: number } | number } | undefined): number => {
  const mp = stats?.mp;
  const isBareNumber = typeof mp === "number";
  if (isBareNumber) return mp;
  return typeof mp?.now === "number" ? mp.now : 0;
};
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
    const isInitialized = Boolean(AbilityService.instance);
    if (!isInitialized) {
      AbilityService.instance = new AbilityService(db);
    }
    return AbilityService.instance;
  }

  public static getInstance(): AbilityService {
    const isInitialized = Boolean(AbilityService.instance);
    if (!isInitialized) {
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
  async getFilteredAbilities(filters: AbilityFilters): Promise<Ability[]> {
    return await this.db.getFilteredAbilities(filters);
  }

  /**
   * Checks if an ability is unlocked based on prerequisites, AP, and character requirements
   */
  async checkAbilityUnlock(
    ability: Ability,
    userAp: HeroApTotals,
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
    const isBelowRequiredLevel =
      ability.characterRequirement?.level &&
      characterLevel < ability.characterRequirement.level;
    if (isBelowRequiredLevel) {
      return false;
    }

    // Check character class requirements
    const classRequirements = ability.characterRequirement?.class;
    if (classRequirements) {
      for (const [className, requiredLevel] of Object.entries(
        classRequirements
      )) {
        const userClassLevel = characterClasses[className] || 0;
        const isUnderClassLevel = userClassLevel < requiredLevel;
        if (isUnderClassLevel) {
          return false;
        }
      }
    }

    // Check prerequisites
    const { prerequisites } = ability;
    const hasPrerequisites = prerequisites && prerequisites.length > 0;
    if (hasPrerequisites) {
      for (const prereqId of prerequisites) {
        const isPrereqUnlocked = unlockedAbilityIds.includes(prereqId);
        if (!isPrereqUnlocked) {
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

    const isShortOfMp = mpAvailable < ability.mpCost;
    if (isShortOfMp) {
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
    const { scaling } = ability;
    if (!scaling) {
      return 1; // No scaling, return base value
    }

    const attributeValue = characterStats[scaling.attribute] || 0;
    return 1 + attributeValue * scaling.rate;
  }

  /**
   * Cast an ability: charge its MP cost to the hero through the user store, stamp `lastUsed`, and leave a
   * record the parent sees (Cast Log entry, Town Crier line, Game Master notifications, one OS alert).
   * Refuses (and charges nothing) when the hero is grounded by an unpaid hospital bill (docs/Quest-Rooms-Spec.md 5.8,
   * checked before anything else), when the ability is unknown, or when the hero has less MP than it costs.
   * Battle spells never pass through here, so a grounded hero keeps casting in a fight.
   */
  async useAbility(abilityId: string, userId: string): Promise<UseAbilityResult> {
    const userStore = useUserStore();
    const hero = userStore.users[userId];
    if (isGrounded(hero?.stats?.gp)) return { ok: false, reason: "grounded" };

    const ability = await this.getAbilityById(abilityId);
    if (!ability) return { ok: false, reason: "unknown" };

    const cost = Math.max(0, Number(ability.mpCost) || 0);
    if (!hero) return { ok: false, reason: "unknown" };

    const isShortOfMp = currentMp(hero.stats) < cost;
    if (isShortOfMp) return { ok: false, reason: "mp" };

    const hasCost = cost > 0;
    if (hasCost) userStore.updateUserMP({ userId, amount: -cost });

    ability.lastUsed = new Date().toISOString();
    await this.saveAbility(ability);

    // The ledger: the cast is already paid for, so nothing below may undo it
    let entry: CastLogEntry | undefined;
    try {
      entry = await getCastLogDb().logCast({
        userId,
        abilityId,
        abilityName: ability.name,
        abilityType: ability.type,
        mpPaid: cost,
      });
    } catch (error) {
      debug.warn("The cast could not be logged", error);
      return { ok: true };
    }

    await this.tellTheFamily(entry, ability, hero, userId, cost);
    return { ok: true, entry };
  }

  /**
   * Announce a cast: a Town Crier line in the family chat, a notification for every other Game Master and one OS alert.
   * Each step stands alone; a failure is logged and never reaches the caller.
   */
  private async tellTheFamily(
    entry: CastLogEntry,
    ability: Ability,
    hero: { name?: { nick?: string; first?: string } },
    userId: string,
    cost: number
  ): Promise<void> {
    const heroName = hero.name?.nick || hero.name?.first || "A hero";
    const time = format(new Date(entry.castAt), "h:mma").toLowerCase();
    const title = `${ability.name} cast`;
    const body = `${heroName} · ${time}`;

    try {
      const line = `${heroName} cast ${ability.name}${cost > 0 ? ` · ${cost} MP` : ""} · ${time}`;
      await useChatStore().postSystemLine(FAMILY_CHAT_ROOM, line);
    } catch (error) {
      debug.warn("The Town Crier could not post the cast", error);
    }

    try {
      const notifications = useNotificationsStore();
      for (const gm of Object.values(useUserStore().users)) {
        const shouldSkipHero = gm?.isAdult !== true || gm.id === userId;
        if (shouldSkipHero) continue;
        notifications.push({
          heroId: gm.id,
          kind: "power-cast",
          title,
          body,
          refId: entry.id,
          link: "/game-master/chat",
        });
      }
    } catch (error) {
      debug.warn("The Game Masters could not be notified of the cast", error);
    }

    try {
      void showAlert({ id: POWER_CAST_ALERT_ID, title, body }).catch(() => undefined);
    } catch (error) {
      debug.warn("The cast alert could not be shown", error);
    }
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
