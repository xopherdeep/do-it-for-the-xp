import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';
import { Drivers, Storage } from "@ionic/storage";

export const accessoriesStorage = new Storage({
  name: "__accessories",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

enum Rarity {
  Common,
  Uncommon,
  Rare,
  Legendary,
}

enum CharacterType {
  Warrior,
  Mage,
  Archer,
  Healer,
}

interface SpecialStats {
  hp?: number;
  mp?: number;
  attack?: number;
  defense?: number;
  speed?: number;
}

export interface Accessory {
  id?: any
  name: string;
  description: string;
  basePrice: number;
  bonusStats: SpecialStats;
  equippableBy: CharacterType[];
  rarity: Rarity;
  icon: string;
}

export class AccessoriesDb extends DbStorageApi {
  private createAccessory(): Accessory {
    return {
      id: uuidv4(),
      name: '',
      description: '',
      basePrice: 0,
      bonusStats: {},
      equippableBy: [],
      rarity: Rarity.Common,
      icon: ''
    }
  }

  public async setAccessory(accessory: Accessory) {
    const id = accessory.id ? accessory.id : uuidv4()
    await this.set(id, {
      ...this.createAccessory(),
      ...accessory,
      id
    })
  }

  public async deleteAccessory(accessory: Accessory) {
    this.remove(accessory.id)
    return await this.getAccessories()
  }

  public async getAccessoryById(id) {
    const accessories = await this.getAccessories();
    const accessory = accessories.find(accessory => accessory.id === id);
    return accessory || this.createAccessory()
  }

  public async getAccessories() {
    const accessories = await this.getAll()
    return accessories
  }
}

export default AccessoriesDb
