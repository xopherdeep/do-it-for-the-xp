import { Preferences } from '@capacitor/preferences';
import debug from '@/lib/utils/debug';

/**
 * StorageService provides a way to store data that persists between app installations
 * using Capacitor Preferences which survives app reinstallation on most devices.
 */
export class StorageService {
  /**
   * Saves profiles data to persistent storage
   * @param profiles Array of user profiles
   */
  static async saveProfiles(profiles: any[]): Promise<void> {
    try {
      await Preferences.set({
        key: 'xp_profiles_backup',
        value: JSON.stringify(profiles)
      });
      debug.log('Profiles saved to persistent storage');
      return Promise.resolve();
    } catch (error) {
      debug.error('Failed to save profiles to persistent storage:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Retrieves profiles data from persistent storage
   */
  static async getProfiles(): Promise<any[]> {
    try {
      const result = await Preferences.get({ key: 'xp_profiles_backup' });
      if (result.value) {
        return JSON.parse(result.value);
      }
      return [];
    } catch (error) {
      debug.error('Failed to get profiles from persistent storage:', error);
      return [];
    }
  }

  /**
   * Saves users data to persistent storage
   * @param users Object containing all user data
   */
  static async saveUsers(users: any): Promise<void> {
    try {
      await Preferences.set({
        key: 'xp_users_data',
        value: JSON.stringify(users)
      });
      return Promise.resolve();
    } catch (error) {
      debug.error('Failed to save users to persistent storage:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Retrieves users data from persistent storage
   */
  static async getUsers(): Promise<any> {
    try {
      const result = await Preferences.get({ key: 'xp_users_data' });
      if (result.value) {
        return JSON.parse(result.value);
      }
      return null;
    } catch (error) {
      debug.error('Failed to get users from persistent storage:', error);
      return null;
    }
  }
}

export default StorageService;