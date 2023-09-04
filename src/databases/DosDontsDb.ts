import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';

import { Drivers, Storage } from "@ionic/storage";

export const dosDontsStorage = new Storage({
  name: "__dosDonts",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface DosDont {
  id?: any
  type: 'do' | 'dont'
  bonus: {
    xp: number;
    gp: number;
    ap: number;
  }
  notes: string;
}

export class DosDontsDb extends DbStorageApi {
  private createDosDont(): DosDont {
    return {
      id: uuidv4(),
      type: 'do',
      bonus: {
        xp: 0,
        gp: 0,
        ap: 0,
      },
      notes: '',
    }
  }

  public async setDosDont(dosDont: DosDont) {
    const id = dosDont.id ? dosDont.id : uuidv4()
    await this.set(id, {
      ...this.createDosDont(),
      ...dosDont,
      id
    })
  }

  public async deleteDosDont(dosDont: DosDont) {
    this.remove(dosDont.id)
    return await this.getDosDonts()
  }

  public async getDosDontById(id) {
    const dosDonts = await this.getDosDonts();
    const dosDont = dosDonts.find(dosDont => dosDont.id === id);
    return dosDont || this.createDosDont()
  }

  public async getDosDonts() {
    const dosDonts = await this.getAll()
    return dosDonts
  }
}

export default DosDontsDb
