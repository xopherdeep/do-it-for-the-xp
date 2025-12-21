import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';
import { Drivers, Storage } from "@ionic/storage";

export const dosDontsStorage = new Storage({
  name: "__dosDonts",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface DosDont {
  id: string;
  type: 'do' | 'dont';
  whatFor: string;
  difficulty: number;
  awardPoints: {
    xp: boolean;
    gp: boolean;
    ap: boolean;
  };
  points: {
    xp: number;
    gp: number;
    ap: number;
  };
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export class DosDontsDb extends DbStorageApi {
  constructor() {
    super(dosDontsStorage);
  }

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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  public async setDosDont(dosDont: DosDont) {
    const id = dosDont.id || uuidv4();
    const now = Date.now();
    
    // Calculate points based on difficulty
    const baseValue = dosDont.type === 'do' ? dosDont.difficulty : -dosDont.difficulty;
    const points = {
      xp: dosDont.awardPoints.xp ? baseValue : 0,
      gp: dosDont.awardPoints.gp ? baseValue : 0,
      ap: dosDont.awardPoints.ap ? baseValue : 0,
    };

    await this.set(id, {
      ...this.createDosDont(dosDont.type),
      ...dosDont,
      points,
      id,
      updatedAt: now,
      createdAt: dosDont.createdAt || now,
    });
    
    await this.showSuccessToast("Saved successfully!");
    return await this.getDosDontById(id);
  }

  public async deleteDosDont(dosDont: DosDont) {
    if (!dosDont.id) {
      throw new Error('Cannot delete DosDont without an id');
    }
    await this.remove(dosDont.id);
    await this.showDeleteToast();
    return await this.getDosDonts();
  }

  public async getDosDontById(id: string) {
    const dosDonts = await this.getDosDonts();
    return dosDonts.find(dosDont => dosDont.id === id) || this.createDosDont('do');
  }

  public async getDosDonts(filters?: {
    type?: 'do' | 'dont';
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'whatFor';
    sortOrder?: 'asc' | 'desc';
  }) {
    let dosDonts = await this.getAll() as DosDont[];

    // Apply filters
    if (filters) {
      if (filters.type) {
        dosDonts = dosDonts.filter(item => item.type === filters.type);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        dosDonts = dosDonts.filter(item => 
          item.whatFor.toLowerCase().includes(searchLower) ||
          item.notes.toLowerCase().includes(searchLower)
        );
      }

      // Sort results
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      
      dosDonts.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (typeof aValue === 'string') {
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue as string)
            : (bValue as string).localeCompare(aValue);
        }
        
        return sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      });
    }

    return dosDonts;
  }

  public async cloneDosDont(dosDont: DosDont) {
    const clone = {
      ...dosDont,
      id: uuidv4(),
      whatFor: `${dosDont.whatFor} (clone)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await this.setDosDont(clone);
    await this.showSuccessToast("Cloned successfully!");
    return clone;
  }
}

export default DosDontsDb;
