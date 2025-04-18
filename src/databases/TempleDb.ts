import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';
import { Drivers, Storage } from "@ionic/storage";

export const templeStorage = new Storage({
  name: "__temples",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface TempleInterface {
  id: string;
  customName?: string;
  customDescription?: string;
  categoryIds: string[];
  memberCount?: number;
  level?: number;
  taskCount?: number;
  dungeonLayout?: {
    entrance: number[];
    maze: string[][];
    rooms: Record<string, any>;
  };
}

export class TempleDb extends DbStorageApi {
  public async setTemple(temple: TempleInterface) {
    await this.set(temple.id, temple);
  }

  public async setTemples(temples: TempleInterface[]) {
    for (const temple of temples) {
      await this.setTemple(temple);
    }
  }

  public async getTempleById(id: string): Promise<TempleInterface | null> {
    return await this.get(id) || null;
  }
}

export default TempleDb;