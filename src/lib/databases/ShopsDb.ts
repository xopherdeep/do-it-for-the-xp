import DbStorageApi from './DbStorageApi';
import { Drivers, Storage } from "@ionic/storage";
import { v4 as uuidv4 } from 'uuid'
import { getAllShops, SHOP_METADATA } from '@/lib/engine/core/shopRegistry';
import type { ShopHours } from '@/lib/services/shops/shopHours';

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
  greeting?: string; // What the clerk says to a hero walking in; absent = the portal's own line for this shop
  hours?: ShopHours | null; // Local opening and closing times; absent or null = always open
  items: ShopItem[];
}

// Who minds each shop in the hero's portal, and what they say, until the Game Master gives the shop its own
// clerk (Compendium > Economy > Shops > Clerk). A shop id with no entry here keeps the registry's clerk name
// (if it has one) and the `default` greeting.
export interface ShopClerkDefault {
  shopkeep: string;
  greeting: string;
}

export const SHOP_CLERK_DEFAULTS: Record<string, ShopClerkDefault> = {
  "pegasus-ranch": {
    shopkeep: "Francis the Rancher",
    greeting: "Howdy partner, let me know what I can do ya for.",
  },
  "wrecked-ship": {
    shopkeep: "Douglas the Pirate",
    greeting: "Rrrrrr matey, I be wilin ta trade with ya.",
  },
  "hermits-tent": {
    shopkeep: "Terrance the Hermit",
    greeting: "No loitering, I have work that needs my attention.",
  },
  "witchs-hut": {
    shopkeep: "Dr. Who",
    greeting: "Hello my sweet, will you be staying long?",
  },
  "crystal-caverns": {
    shopkeep: "Jeff",
    greeting: "Hi there, take a look at our lovely jewels!",
  },
  "snow-shack": {
    shopkeep: "Abominable Snowman",
    greeting: "Greetings, the warmth is free, but please buy something if you plan on staying.",
  },
  "traveling-merchant": {
    shopkeep: "Boobeedeedle",
    greeting: "Ah, It's you! Here's what I have today.",
  },
  "theia-city": {
    shopkeep: "The Watcher",
    greeting: "Ah, It's you! Here's what I have today.",
  },
  default: {
    shopkeep: "Dr. Who",
    greeting: "Hello! What shelf can I show you?",
  },
};

export function clerkDefaultFor(shopId: string | null | undefined): ShopClerkDefault {
  const own = SHOP_CLERK_DEFAULTS[shopId ?? ""];
  if (own) return own;
  const registryClerk = SHOP_METADATA[shopId ?? ""]?.clerkName;
  if (registryClerk) return { shopkeep: registryClerk, greeting: SHOP_CLERK_DEFAULTS.default.greeting };
  return SHOP_CLERK_DEFAULTS.default;
}

// A seeded shop carries the registry's clerk name, world and icon from day one, so those fields only count as
// the Game Master's own choice once they differ from the registry. Until then the hero's portal keeps its own art
// and clerk. A shop the Game Master created has no registry entry, so whatever it carries is its own.
export function customClerkName(shop: Pick<ShopInterface, "id" | "clerkName"> | null | undefined): string {
  const name = (shop?.clerkName || "").trim();
  return name && name !== SHOP_METADATA[shop?.id ?? ""]?.clerkName ? name : "";
}

export function customGreeting(shop: Pick<ShopInterface, "greeting"> | null | undefined): string {
  return (shop?.greeting || "").trim();
}

export function customWorld(shop: Pick<ShopInterface, "id" | "world"> | null | undefined): string {
  const world = (shop?.world || "").trim();
  return world && world !== SHOP_METADATA[shop?.id ?? ""]?.world ? world : "";
}

export function customIcon(shop: Pick<ShopInterface, "id" | "icon"> | null | undefined): string {
  const icon = (shop?.icon || "").trim();
  const seeded = SHOP_METADATA[shop?.id ?? ""]?.icon;
  return icon && icon !== (seeded ? `fad fa-${seeded}` : "") ? icon : "";
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