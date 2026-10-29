import Stats from '@/lib/utils/User/stats';
import DbStorageApi from './DbStorageApi';
import User from '@/lib/utils/User';
import StorageService from '@/lib/services/core/StorageService';

import { Entry, SpecialStats } from '@/lib/utils/User/stats';
import debug from '@/lib/utils/debug';
import { emitHeroRemoved } from '@/lib/services/multiplayer/gameSignals';
import { hasUnsealedSecrets, sealProfileSecrets } from '@/lib/services/profile/pinSeal';
import { DEFAULT_WALLET_LIMIT } from '@/lib/services/gp/wallet';

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
  /** The PIN, sealed (services/profile/pinSeal.ts). A form may hand over the 4 typed digits; ProfileDb seals them on save. */
  passcode?: string
  /** The Game Master's forgotten-PIN code, sealed (services/profile/pinRecovery.ts) */
  pinRecovery?: string
  avatar: string
  favoriteFood: string
  favoriteThing: string
  jobClass: string
  jobClasses?: JobClass[];
  isAdult: boolean
  /** Retro or Modern look (services/profile/heroSkin.ts). Missing: the device's own choice stands. */
  skin?: 'retro' | 'modern'
  /** Game style and menu sounds (services/profile/heroTheme.ts). Missing: the device's own choice stands. */
  themeChoice?: { rpg: string; ui: string }
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

/** Whether a profile carries a legacy wallet limit below the base game tier */
export const hasOutdatedWalletLimit = (profile: Record<string, any> | undefined): boolean => {
  const limit = Number(profile?.stats?.gp?.limit);
  return Number.isFinite(limit) && limit > 0 && limit < DEFAULT_WALLET_LIMIT;
};

/** Ensure the profile's wallet limit is at least the starting tier */
export const normalizeProfileWallet = <T extends Record<string, any>>(profile: T): T => {
  const needsFix = hasOutdatedWalletLimit(profile);
  if (!needsFix) return profile;
  return {
    ...profile,
    stats: {
      ...profile.stats,
      gp: {
        ...profile.stats?.gp,
        limit: DEFAULT_WALLET_LIMIT,
      },
    },
  };
};

export class ProfileDb extends DbStorageApi {
  /** Every profile write goes through here, so a PIN is never stored as typed */
  public async set(key: string, value: any) {
    await super.set(key, sealProfileSecrets(value))
  }

  /** Profiles saved before PINs were sealed or with outdated wallet limits are migrated as they are read */
  public async getAll() {
    const profiles = await super.getAll()
    const needsMigration = profiles.filter(
      (profile) => hasUnsealedSecrets(profile) || hasOutdatedWalletLimit(profile)
    )
    const hasMigration = needsMigration.length > 0
    if (hasMigration) {
      for (const profile of needsMigration) {
        const hasId = Boolean(profile.id)
        if (hasId) {
          const migrated = normalizeProfileWallet(sealProfileSecrets(profile))
          await this.set(profile.id, migrated)
        }
      }
      await this.backupProfiles()
    }
    return profiles.map((profile) => sealProfileSecrets(normalizeProfileWallet(profile)))
  }

  public newProfile(profile: NewProfileForm) {
    return new User(profile)
  }

  public async getProfiles() {
    return this.getAll()
  }

  public async setProfile(profile: NewProfileForm) {
    const id = profile.id
    if (!id) return
    await this.set(id, profile)
    
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
        const id = profile.id
        if (id) {
          await this.set(id, profile)
        }
      }
      
      debug.log(`Restored ${profiles.length} profiles from persistent storage`)
      return true
    } catch (error) {
      debug.error('Failed to restore profiles:', error)
      return false
    }
  }
}

export default ProfileDb