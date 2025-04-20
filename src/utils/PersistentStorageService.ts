import { Preferences } from '@capacitor/preferences';

/**
 * PersistentStorageService provides a way to store data that persists between app installations
 * using Capacitor Preferences which survives app reinstallation on most devices.
 */
export class PersistentStorageService {
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
      console.log('Profiles saved to persistent storage');
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to save profiles to persistent storage:', error);
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
      console.error('Failed to get profiles from persistent storage:', error);
      return [];
    }
  }

  /**
   * Creates a backup of all profiles as a downloadable JSON file
   */
  static async exportProfilesToFile(profiles: any[]): Promise<string> {
    try {
      const dataStr = JSON.stringify(profiles, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      // For web, create a downloadable link
      const exportDate = new Date().toISOString().split('T')[0];
      const fileName = `do-it-for-xp-profiles-${exportDate}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', fileName);
      linkElement.style.display = 'none';
      
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);
      
      return fileName;
    } catch (error) {
      console.error('Failed to export profiles:', error);
      throw error;
    }
  }

  /**
   * Imports profiles from a JSON file
   * @param fileContent JSON string containing profile data
   */
  static async importProfilesFromJson(fileContent: string): Promise<any[]> {
    try {
      const profiles = JSON.parse(fileContent);
      if (!Array.isArray(profiles)) {
        throw new Error('Invalid profile data format');
      }
      return profiles;
    } catch (error) {
      console.error('Failed to import profiles:', error);
      throw error;
    }
  }
}

export default PersistentStorageService;