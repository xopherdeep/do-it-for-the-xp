import Stats from '@/utils/User/stats';
import DbStorageApi from './DbStorageApi';
import User from '@/utils/User';

import { Entry, SpecialStats } from '@/utils/User/stats';

// New types and interfaces for Skills, JobClass, Equipment, and Quests
interface Skill {
  name: string;
  level: number;
}

interface JobClass {
  name: string;
  level: number;
  xp: number;
  skills: Skill[];
  ledger: Entry[];
  statBonuses: Partial<SpecialStats>;
  multiClassPenalty: number;
  multiClassBonus: number;
}

interface Equipment {
  accessory: string;
  weapon: string;
  armor: string;
}

interface Quest {
  id: string;
  status: 'completed' | 'in-progress' | 'not-started';
  // ...other details
}

interface InventoryItem {
  itemId: string;
  quantity: number;
}
export interface NewProfileForm {
  id?: string
  email?: string
  name: {
    full: string;
  }
  passcode?: string
  avatar: string
  favoriteFood: string
  favoriteThing: string
  jobClass: string
  jobClasses?: JobClass[];
  isAdult: boolean
  birthday?: string
  stats: Stats
  equipment?: Equipment;
  quests?: Quest[];
  inventory?: InventoryItem[];
}

export class ProfileDb extends DbStorageApi {
  public newProfile(profile: NewProfileForm) {
    return new User(profile)
  }

  public async getProfiles() {
    const profiles = await this.getAll()
    return profiles
  }

  public async setProfile(profile: NewProfileForm) {
    if (!profile.id) return
    await this.set(profile.id, profile)
  }


  public async removeProfile(profileId: string) {
    await this.remove(profileId)
  }

  // Update stats like gp, xp, etc
  public async updateStats(profileId: string, stats: Stats) {
    const profile = await this.get(profileId)
    await this.set(profileId, {
      ...profile,
      stats
    })
  }

}


export default ProfileDb