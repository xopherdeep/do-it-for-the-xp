import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';

import { Drivers, Storage } from "@ionic/storage";

export const monsterStorage = new Storage({
  name: "__monsters",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface Beast {
  id: any
  monsterName: string;
  imageUrl?: string;
  localImage?: string;
  achievementIds: string[];
}

export class BestiaryDb extends DbStorageApi {
  private createBeast(): Beast {
    return {
      id: uuidv4(),
      monsterName: '',
      achievementIds: [],
    }
  }

  public async setBeast(Beast: Beast) {
    const id = Beast.id ? Beast.id : uuidv4()
    await this.set(id, {
      ...this.createBeast(),
      ...Beast
    })
  }

  public async deleteBeast(beast: Beast) {
    this.remove(beast.id)
    return await this.getBeasts()
  }

  public async cloneBeast(monster: Beast) {
    const cloneFromBeasts = async () => {
      const clone = {
        ...monster,
        id: uuidv4(),
        monsterName: `${monster.monsterName} (clone)`
      }
      const cloneToast = () => this.showSuccessToast("Clone Successful!")
      return await this.setBeast(clone).then(cloneToast)
    }

    const clone = await this.getBeasts().then(cloneFromBeasts)
    return clone
  }

  public async getBeastById(id) {
    const beasts = await this.getBeasts();
    const beast = beasts.find(beast => beast.id === id);
    return beast || this.createBeast()
  }

  public async getBeasts() {
    const monsters = await this.getAll()
    return monsters
  }
}

export default BestiaryDb
