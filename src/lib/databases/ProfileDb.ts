import Stats from '@/lib/utils/User/stats';
import DbStorageApi from './DbStorageApi';
import User from '@/lib/utils/User';
import StorageService from '@/lib/services/core/StorageService';

import { Entry, SpecialStats } from '@/lib/utils/User/stats';
import debug from '@/lib/utils/debug';
import { emitHeroRemoved } from '@/lib/services/multiplayer/gameSignals';

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
  /** What the hero keeps in storage, the same raw shape as `inventory` (Storage.ts). Missing on old profiles: empty. */
  storage?: InventoryItem[];
  /** The storage tier bought at the Gold Bank (0 = locked). Missing on old profiles: locked. */
  storageTier?: number;
  /** Equipment items the hero has unlocked (names). Missing on profiles that predate the locks: they hold everything. */
  unlockedItems?: string[];
  /** The "Text style" the hero picked in the profile (services/copy/voices.ts). Missing is Auto: the birthday decides. */
  voice?: 'simple' | 'adventure' | 'classic';
  /** Whether the simple voice reads lines aloud on its own. Missing is on; the speaker button always works. */
  autoRead?: boolean;
}

export class ProfileDb extends DbStorageApi {
  public newProfile(profile: NewProfileForm) {
    return new User(profile)
  }

  public async getProfiles() {
    return this.getAll()
  }

  public async setProfile(profile: NewProfileForm) {
    if (!profile.id) return
    await this.set(profile.id, profile)
    
    // Backup to persistent storage after setting a profile
    await this.backupProfiles()
  }

  public async removeProfile(profileId: string) {
    await this.remove(profileId)
    // Multiplayer removes the hero from the family server; only an explicit removal says so, never a profile that is
    // just not loaded yet
    emitHeroRemoved(profileId)
    
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
      await StorageService.saveProfiles(profiles)
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
      const profiles = await StorageService.getProfiles()
      
      const hasNoProfiles = !profiles || profiles.length === 0;
      if (hasNoProfiles) {
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
    return StorageService.exportProfilesToFile(profiles)
  }
  
  /**
   * Import profiles from JSON file content
   */
  public async importProfiles(fileContent: string): Promise<boolean> {
    try {
      const profiles = await StorageService.importProfilesFromJson(fileContent)
      
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