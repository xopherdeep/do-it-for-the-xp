import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';

import { Drivers, Storage } from "@ionic/storage";

export const monsterStorage = new Storage({
  name: "__monsters",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface Monster {
  id: any
  monsterName: string;
  imageUrl?: string;
  localImage?: string;
  achievementId: string;
  type: string;
  difficulty: number;
  xp: number;
  gp: number;
  ap: number;
}

export class BestiaryDb extends DbStorageApi {
  private createMonster(): Monster {
    return {
      id: uuidv4(),
      monsterName: '',
      achievementId: '',
      type: 'individual',
      difficulty: 1,
      xp: 200,
      gp: 20,
      ap: 2
    }
  }

  public async setMonster(monster: Monster) {
    const id = monster.id ? monster.id : uuidv4()
    await this.set(id, {
      ...this.createMonster(),
      ...monster
    })
  }

  public async deleteMonster(monster: Monster) {
    this.remove(monster.id)
    return await this.getMonsters()
  }

  public async cloneMonster(monster: Monster) {
    const cloneFromMonsters = async () => {
      const clone = {
        ...monster,
        id: uuidv4(),
        monsterName: `${monster.monsterName} (clone)`
      }
      const cloneToast = () => this.showSuccessToast("Clone Successful!")
      return await this.setMonster(clone).then(cloneToast)
    }

    const clone = await this.getMonsters().then(cloneFromMonsters)
    return clone
  }

  public async getMonsterById(id) {
    const monsters = await this.getMonsters();
    const monster = monsters.find((monster) => monster.id === id);
    return monster || this.createMonster()
  }

  public async getMonsters() {
    const monsters = await this.getAll()
    return monsters
  }
}

export default BestiaryDb
