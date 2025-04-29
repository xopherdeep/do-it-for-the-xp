import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';
import AbilitiesDb, { abilitiesStorage } from './AbilitiesDb';
import AccessoriesDb, { accessoriesStorage } from './AccessoriesDb';

const abilitiesDb = new AbilitiesDb(abilitiesStorage);
const accessoriesDb = new AccessoriesDb(accessoriesStorage);

enum ItemType {
  Ability,
  Accessory,
}

interface ShopItem {
  itemId: string;
  type: ItemType;
}

interface Shop {
  id?: any
  name: string;
  description: string;
  items: ShopItem[];
  icon: string;
}

export class ShopsDb extends DbStorageApi {
  private createShop(): Shop {
    return {
      id: uuidv4(),
      name: '',
      description: '',
      items: [],
      icon: ''
    }
  }

  public async setShop(shop: Shop) {
    const id = shop.id ? shop.id : uuidv4();
    const items = shop.items.map(item => ({ itemId: item.itemId, type: item.type }));
    await this.set(id, {
      ...this.createShop(),
      ...shop,
      items,
      id
    });
  }

  public async deleteShop(shop: Shop) {
    this.remove(shop.id)
    return await this.getShops()
  }

  public async getShopById(id) {
    const shops = await this.getShops();
    const shop = shops.find(shop => shop.id === id);
    if (!shop) {
      return this.createShop();
    }
    const items = await Promise.all(shop.items.map(async (item) => {
      if (item.type === ItemType.Ability) {
        return await abilitiesDb.getAbilityById(item.itemId);
      } else if (item.type === ItemType.Accessory) {
        return await accessoriesDb.getAccessoryById(item.itemId);
      }
    }));
    return { ...shop, items };
  }

  public async getShops() {
    const shops = await this.getAll()
    return shops
  }
}

export default ShopsDb