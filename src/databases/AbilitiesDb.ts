import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';
import { Drivers, Storage } from "@ionic/storage";

export const abilitiesStorage = new Storage({
  name: "__abilities",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

enum UnlockTimeSlot {
  Hourly,
  Daily,
  Weekly,
}

export interface Ability {
  id?: any
  name: string;
  description: string;
  mpCost: number;
  unlockRequirement: {
    ap: number;
    timeSlot: UnlockTimeSlot;
  };
  icon: string;
}

export class AbilitiesDb extends DbStorageApi {
  private createAbility(): Ability {
    return {
      id: uuidv4(),
      name: '',
      description: '',
      mpCost: 0,
      unlockRequirement: {
        ap: 0,
        timeSlot: UnlockTimeSlot.Hourly,
      },
      icon: ''
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

  public async getAbilityById(id) {
    const abilities = await this.getAbilities();
    const ability = abilities.find(ability => ability.id === id);
    return ability || this.createAbility()
  }

  public async getAbilities() {
    const abilities = await this.getAll()
    return abilities
  }
}

export default AbilitiesDb
