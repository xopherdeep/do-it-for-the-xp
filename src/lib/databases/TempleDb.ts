import DbStorageApi from './DbStorageApi';
import { Drivers, Storage } from "@ionic/storage";
import { Room } from '@/lib/engine/core/dungeons/types';
import { emitTempleChanged } from '@/lib/engine/temples/templeChanges';

export const templeStorage = new Storage({
  name: "__temples",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface TempleInterface {
  id: string;
  name?: string;
  customName?: string;
  customIcon?: string;
  customDescription?: string;
  categoryIds: string[];
  memberCount?: number;
  level?: number;
  taskCount?: number;
  dungeonLayout?: {
    entrance: number[];
    maze: string[][] | Record<string, string[][]>;
    rooms: Record<string, Room>;
  };
  // Set on the nine temples shipped in code (importAllTemples): the signature of the shipped layout this
  // record was imported from. A record whose layout still has this signature is untouched by the Game Master
  // and is refreshed when the shipped layout changes; a record whose layout differs is theirs and is kept.
  seedSignature?: string;
  // A temple from the generator (src/lib/engine/dungeons/generator): its seed, theme and element
  seed?: number | string;
  themeId?: string;
  element?: string;
  generated?: boolean;
  // Top-level properties for backwards compatibility
  entrance?: number[];
  maze?: string[][] | Record<string, string[][]>;
  rooms?: Record<string, Room>;
}


export class TempleDb extends DbStorageApi {
  // Every save tells the engine (templeChanges), so a temple edited in the Game Master's editor is played as it
  // now is, without reloading the app. The event comes after the write: a listener that reads the record sees it.
  public async setTemple(temple: TempleInterface) {
    await this.set(temple.id, temple);
    emitTempleChanged(temple.id);
  }

  public async remove(key: string) {
    await super.remove(key);
    emitTempleChanged(key);
  }

  public async setTemples(temples: TempleInterface[]) {
    for (const temple of temples) {
      await this.setTemple(temple);
    }
  }

  public async getTempleById(id: string): Promise<TempleInterface | null> {
    return await this.get(id) || null;
  }
  
  public async getTempleByName(name: string): Promise<TempleInterface | null> {
    const keys = await this.keys();
    
    for (const key of keys) {
      const temple = await this.get(key);
      const isRequestedTemple = temple && (temple.name === name || temple.customName === name);
      if (isRequestedTemple) {
        return temple;
      }
    }
    
    return null;
  }
}

// Create and export a singleton instance
const templeDb = new TempleDb(templeStorage);
export default templeDb;