import DbStorageApi from './DbStorageApi';
import { Drivers, Storage } from "@ionic/storage";
import { v4 as uuidv4 } from 'uuid'
import { getAllShops } from '@/lib/engine/core/shopRegistry';

export const shopStorage = new Storage({
  name: "__shops",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export enum ShopItemType {
  Ability,
  Accessory,
}

export interface ShopItem {
  itemId: string;
  type: ShopItemType;
  price?: number; // Override price
  availableDays?: number[]; // 0-6, null/empty = always
}

export interface ShopInterface {
  id: string;
  name: string;
  description: string;
  world: string; // Used for BG image
  icon: string;
  clerkName?: string;
  items: ShopItem[];
}

export class ShopsDb extends DbStorageApi {
  
  public async setShop(shop: ShopInterface) {
    if (!shop.id) {
        shop.id =  uuidv4();
    }
    await this.set(shop.id, shop);
  }

  public async getShopById(id: string): Promise<ShopInterface | null> {
    return await this.get(id) || null;
  }
  
  public async getShops(): Promise<ShopInterface[]> {
    const keys = await this.keys();
    const shops: ShopInterface[] = [];
    for (const key of keys) {
      const shop = await this.get(key);
      if (shop) {
        shops.push(shop);
      }
    }
    return shops;
  }

  /**
   * Seeds the database with shop data from the centralized shopRegistry.
   * This ensures consistent shop data across the application.
   */
  public async seedDefaults() {
    const existing = await this.getShops();
    if (existing.length > 0) return;

    // Get all shops from the centralized registry
    const registryShops = getAllShops();
    
    for (const meta of registryShops) {
      const shop: ShopInterface = {
        id: meta.id,
        name: meta.name,
        description: meta.description,
        world: meta.world,
        icon: `fad fa-${meta.icon}`,
        clerkName: meta.clerkName,
        items: []
      };
      await this.setShop(shop);
    }
  }

  /**
   * Syncs the database with the registry, adding any new shops
   * and updating metadata for existing ones (while preserving user items).
   */
  public async syncWithRegistry() {
    const registryShops = getAllShops();
    const existingShops = await this.getShops();
    const existingIds = new Set(existingShops.map(s => s.id));

    for (const meta of registryShops) {
      if (!existingIds.has(meta.id)) {
        // New shop from registry - add it
        const shop: ShopInterface = {
          id: meta.id,
          name: meta.name,
          description: meta.description,
          world: meta.world,
          icon: `fad fa-${meta.icon}`,
          clerkName: meta.clerkName,
          items: []
        };
        await this.setShop(shop);
      } else {
        // Existing shop - update metadata but preserve items
        const existing = await this.getShopById(meta.id);
        if (existing) {
          existing.name = meta.name;
          existing.description = meta.description;
          existing.world = meta.world;
          existing.icon = `fad fa-${meta.icon}`;
          existing.clerkName = meta.clerkName;
          // Items are preserved
          await this.setShop(existing);
        }
      }
    }
  }
}

const shopsDb = new ShopsDb(shopStorage);
export default shopsDb;