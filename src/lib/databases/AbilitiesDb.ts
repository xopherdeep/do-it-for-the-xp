import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';
import { Drivers, Storage } from "@ionic/storage";
import { Ability, TimePeriod, AbilityType } from '@/lib/types/abilities';

export const abilitiesStorage = new Storage({
  name: "__abilities",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export class AbilitiesDb extends DbStorageApi {
  private createAbility(): Ability {
    return {
      id: uuidv4(),
      name: '',
      description: '',
      type: AbilityType.RealLife,
      frequency: TimePeriod.Daily,
      mpCost: 0,
      apRequirement: {
        amount: 0,
        period: TimePeriod.Flat,
      },
      icon: '',
      prerequisites: [],
      isPreset: false,
      position: { x: 0, y: 0 }
    }
  }

  public async setAbility(ability: Ability) {
    const id = ability.id ? ability.id : uuidv4()
    await this.set(id, {
      ...this.createAbility(),
      ...ability,
      id
    })
  }

  public async deleteAbility(ability: Ability) {
    this.remove(ability.id)
    return await this.getAbilities()
  }

  public async getAbilityById(id: string): Promise<Ability> {
    const abilities = await this.getAbilities();
    const ability = abilities.find(ability => ability.id === id);
    return ability || this.createAbility()
  }

  public async getAbilities(): Promise<Ability[]> {
    const abilities = await this.getAll()
    return abilities
  }

  /**
   * Gets abilities that match the specified filters
   */
  public async getFilteredAbilities(filters: {
    type?: AbilityType,
    class?: string,
    frequency?: TimePeriod,
    isPreset?: boolean
  }): Promise<Ability[]> {
    const abilities = await this.getAbilities();
    
    return abilities.filter(ability => {
      let matches = true;
      
      if (filters.type !== undefined && ability.type !== filters.type) {
        matches = false;
      }
      
      if (filters.class !== undefined && 
          ability.characterRequirement?.class && 
          !Object.keys(ability.characterRequirement.class).includes(filters.class)) {
        matches = false;
      }
      
      if (filters.frequency !== undefined && ability.frequency !== filters.frequency) {
        matches = false;
      }
      
      if (filters.isPreset !== undefined && ability.isPreset !== filters.isPreset) {
        matches = false;
      }
      
      return matches;
    });
  }

  /**
   * Checks if an ability is unlocked based on AP requirements
   */
  public async checkAbilityUnlock(abilityId: string, userAp: {
    total: number,
    daily: number,
    weekly: number,
    monthly: number,
  }, characterLevel: number, characterClasses: {[className: string]: number}): Promise<boolean> {
    const ability = await this.getAbilityById(abilityId);
    
    if (!ability) return false;
    
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
      default:
        hasEnoughAp = userAp.total >= ability.apRequirement.amount;
    }
    
    if (!hasEnoughAp) return false;
    
    // Check character level requirement
    if (ability.characterRequirement?.level && 
        characterLevel < ability.characterRequirement.level) {
      return false;
    }
    
    // Check character class requirements
    if (ability.characterRequirement?.class) {
      for (const [className, requiredLevel] of Object.entries(ability.characterRequirement.class)) {
        const userClassLevel = characterClasses[className] || 0;
        if (userClassLevel < requiredLevel) {
          return false;
        }
      }
    }
    
    return true;
  }
}

export default AbilitiesDb
