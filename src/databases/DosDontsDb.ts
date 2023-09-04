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
  whatFor: string
  difficulty: number,
  awardPoints: {
    xp: boolean
    gp: boolean
    ap: boolean
  },
  points: {
    xp: number;
    gp: number;
    ap: number;
  }
  notes: string;
}

export class DosDontsDb extends DbStorageApi {
  private createDosDont(type: 'do' | 'dont'): DosDont {
    const pointsValue = type === 'do' ? 1 : -1;
    return {
      id: uuidv4(),
      whatFor: '',
      type,
      difficulty: 1,
      points: {
        xp: pointsValue,
        gp: pointsValue,
        ap: pointsValue,
      },
      awardPoints: {
        xp: false,
        gp: false,
        ap: false,
      },
      notes: '',
    }
  }

  public async setDosDont(dosDont: DosDont) {
    const id = dosDont.id ? dosDont.id : uuidv4()
    await this.set(id, {
      ...this.createDosDont(dosDont.type),
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
    return dosDont || this.createDosDont('do')
  }

  public async getDosDonts() {
    const dosDonts = await this.getAll()
    return dosDonts
  }

  public async cloneMe(dosDont: DosDont) {
    const clone = {
      ...dosDont,
      id: uuidv4(),
      whatFor: `${dosDont.whatFor} (clone)`
    }
    const cloneToast = () => this.showSuccessToast("Clone Successful!")
    return await this.setDosDont(clone).then(cloneToast)
  }
}

export default DosDontsDb
