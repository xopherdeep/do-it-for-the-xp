import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';
import { Drivers, Storage } from "@ionic/storage";

export const accessoriesStorage = new Storage({
  name: "__accessories",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export enum Rarity {
  Common,
  Uncommon,
  Rare,
  Epic,
  Legendary,
}

enum CharacterType {
  Warrior,
  Mage,
  Archer,
  Healer,
}

export enum AccessoryType {
  RealLife = 'real',
  Virtual = 'virtual'
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
  url: string;
  description: string;
  basePrice: number;
  bonusStats?: SpecialStats;
  equippableBy?: CharacterType[];
  rarity: Rarity;
  icon?: string;
  rewardCount: number
  isLayaway: boolean
  type: AccessoryType;
  availableToMembers: string[];
  requiresApproval: boolean;
  inventory?: {
    total: number;
    available: number;
    reserved: number;
  };
  expiryDate?: string; // For limited-time items
  tags?: string[]; // For categorization
  imageUrl?: string; // For visual representation
  purchaseHistory?: {
    userId: string;
    purchaseDate: string;
    amount: number;
  }[];
}

export class AccessoriesDb extends DbStorageApi {
  private createAccessory(): Accessory {
    return {
      id: uuidv4(),
      name: '',
      description: '',
      basePrice: 0,
      url: '',
      bonusStats: {},
      equippableBy: [],
      rarity: Rarity.Common,
      icon: '',
      rewardCount: 0,
      isLayaway: false,
      type: AccessoryType.Virtual,
      availableToMembers: [],
      requiresApproval: false,
      inventory: {
        total: 0,
        available: 0,
        reserved: 0
      },
      tags: [],
      purchaseHistory: []
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
