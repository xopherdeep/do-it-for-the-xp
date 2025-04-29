import Stats from '@/lib/utils/User/stats';
import DbStorageApi from './DbStorageApi';
import User from '@/lib/utils/User';
import PersistentStorageService from '@/lib/utils/PersistentStorageService';

import { Entry, SpecialStats } from '@/lib/utils/User/stats';
import debug from '@/lib/utils/debug';

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
    
    // Backup to persistent storage after setting a profile
    await this.backupProfiles()
  }

  public async removeProfile(profileId: string) {
    await this.remove(profileId)
    
    // Backup to persistent storage after removing a profile
    await this.backupProfiles()
  }

  // Update stats like gp, xp, etc
  public async updateStats(profileId: string, stats: Stats) {
    const profile = await this.get(profileId)
    await this.set(profileId, {
      ...profile,
      stats
    })
    
    // Backup to persistent storage after updating stats
    await this.backupProfiles()
  }
  
  /**
   * Backs up all profiles to persistent storage
   */
  public async backupProfiles() {
    try {
      const profiles = await this.getAll()
      await PersistentStorageService.saveProfiles(profiles)
    } catch (error) {
      debug.error('Failed to backup profiles:', error)
    }
  }
  
  /**
   * Restores profiles from persistent storage
   * @returns {Promise<boolean>} True if profiles were restored, false otherwise
   */
  public async restoreProfiles(): Promise<boolean> {
    try {
      // Get profiles from persistent storage
      const profiles = await PersistentStorageService.getProfiles()
      
      if (!profiles || profiles.length === 0) {
        debug.log('No profiles found in persistent storage')
        return false
      }
      
      // Clear existing profiles
      await this.clear()
      
      // Add each profile from backup
      for (const profile of profiles) {
        if (profile.id) {
          await this.set(profile.id, profile)
        }
      }
      
      debug.log(`Restored ${profiles.length} profiles from persistent storage`)
      return true
    } catch (error) {
      debug.error('Failed to restore profiles:', error)
      return false
    }
  }
  
  /**
   * Export profiles as downloadable JSON file
   */
  public async exportProfiles(): Promise<string> {
    const profiles = await this.getAll()
    return PersistentStorageService.exportProfilesToFile(profiles)
  }
  
  /**
   * Import profiles from JSON file content
   */
  public async importProfiles(fileContent: string): Promise<boolean> {
    try {
      const profiles = await PersistentStorageService.importProfilesFromJson(fileContent)
      
      // Add each profile
      for (const profile of profiles) {
        if (profile.id) {
          await this.set(profile.id, profile)
        }
      }
      
      // Backup after import
      await this.backupProfiles()
      
      return true
    } catch (error) {
      debug.error('Failed to import profiles:', error)
      return false
    }
  }
}

export default ProfileDb