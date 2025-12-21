import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';

import { Drivers, Storage } from "@ionic/storage";

export const achievementStorage = new Storage({
  name: "__achievements",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export const achievementCategoryStorage = new Storage({
  name: "__achievementCategories",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export interface Achievement {
  // achievement
  id: any
  achievementName: string;
  categoryId: string;
  imageUrl?: string;
  localImage?: string;
  bonusAchievement: boolean;
  requiresApproval: boolean;
  beastId?: string;
  subAchievementIds?: string[];
  // assignment
  type: string;
  assignee: never[];
  // schedule
  basicSchedule: string;
  customFrequency: number;
  customPeriodType: string;
  dueByTime: string;
  endsOn: string;
  startsOn: string;
  repeatOnDays: never[],
  showDailyUntilComplete: boolean;
  // stats
  difficulty: number;
  xp: number;
  gp: number;
  ap: number;
}

export interface AchievementCategoryInterface {
  id: string
  name: string;
}

export class AchievementCategoryDb extends DbStorageApi {
  public async setCategory(category: AchievementCategoryInterface) {
    await this.set(category.id, category)
  }

  public async setCategories(categories: AchievementCategoryInterface[]) {
    categories.forEach(this.setCategory)
  }
}


export class AchievementDb extends DbStorageApi {
  private createAchievement(): Achievement {
    return {
      id: uuidv4(),
      achievementName: '',
      categoryId: '',
      beastId: '',
      subAchievementIds: [],
      requiresApproval: false,
      assignee: [],
      type: 'individual',
      bonusAchievement: false,
      startsOn: new Date().toISOString(),
      endsOn: new Date().toISOString(),
      dueByTime: '',
      basicSchedule: 'once',
      showDailyUntilComplete: false,
      customFrequency: 0,
      customPeriodType: '',
      repeatOnDays: [],
      difficulty: 1,
      xp: 200,
      gp: 20,
      ap: 2
    }
  }

  public async setTask(task: Achievement) {
    const id = task.id ? task.id : uuidv4()
    await this.set(id, {
      ...this.createAchievement(),
      ...task,
      id
    })
  }

  public async deleteTask(task: Achievement) {
    this.remove(task.id)
    return await this.getTasks()
  }

  public async cloneTask(task: Achievement) {
    const cloneFromTasks = async () => {
      const clone = {
        ...task,
        id: uuidv4(),
        achievementName: `${task.achievementName} (clone)`
      }
      const cloneToast = () => this.showSuccessToast("Clone Successful!")
      return await this.setTask(clone).then(cloneToast)
    }

    const clone = await this.getTasks().then(cloneFromTasks)
    return clone
  }


  public async getTaskById(id) {
    const tasks = await this.getTasks();
    const task = tasks.find((task) => task.id === id);
    return task || this.createAchievement()
  }

  public async getTasks() {
    const tasks = await this.getAll()
    return tasks
  }
}


export default AchievementDb