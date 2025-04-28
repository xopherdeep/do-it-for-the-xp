import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';

import { Drivers, Storage } from "@ionic/storage";

export const beastStorage = new Storage({
  name: "__beasts",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface Beast {
  id?: any
  name: string;
  checklist: string[]
  imageUrl?: string;
  localImage?: string;
  avatar?: number;
  achievementIds?: string[];
  bg1?: number;            // Background layer 1 for earthbound battle backgrounds
  bg2?: number;            // Background layer 2 for earthbound battle backgrounds
  aspectRatio?: number;    // Aspect ratio for battle background display
}

export class BestiaryDb extends DbStorageApi {
  private createBeast(): Beast {
    return {
      id: uuidv4(),
      name: '',
      achievementIds: [],
      checklist: [],
      bg1: 219,          // Default background layer 1
      bg2: 218,          // Default background layer 2
      aspectRatio: 64    // Default medium letterbox aspect ratio
    }
  }

  public async setBeast(beast: Beast) {
    const id = beast.id ? beast.id : uuidv4()
    await this.set(id, {
      ...this.createBeast(),
      ...beast,
      id
    })
  }

  public async deleteBeast(beast: Beast) {
    this.remove(beast.id)
    return await this.getBeasts()
  }

  public async cloneBeast(beast: Beast) {
    const cloneFromBeasts = async () => {
      const clone = {
        ...beast,
        id: uuidv4(),
        beastName: `${beast.name} (clone)`
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
    const beasts = await this.getAll()
    return beasts
  }
}

export default BestiaryDb
