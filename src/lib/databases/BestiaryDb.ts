import { v4 as uuidv4 } from 'uuid'
import DbStorageApi from './DbStorageApi';
import debug from '@/lib/utils/debug';

import { Drivers, Storage } from "@ionic/storage";
import { toastController } from '@ionic/vue';

export const beastStorage = new Storage({
  name: "__beasts",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

// Background presets and settings constants
export const CUSTOM_BG_PRESETS_KEY = 'xp-custom-bg-presets';
export const BESTIARY_BG_SETTINGS_KEY = 'xp-bestiary-bg-settings';

// Define interfaces
export interface Beast {
  id?: any
  name: string;
  checklist: string[]
  imageUrl?: string;
  localImage?: string;
  avatar?: number;
  achievementIds?: string[];
  bg1?: number;            // Background layer 1 for earthbound battle backgrounds
  bg2?: number;            // Background layer 2 for earthbound battle backgrounds
  aspectRatio?: number;    // Aspect ratio for battle background display
}

export interface BackgroundPreset {
  id: string;
  name: string;
  bg1: number;
  bg2: number;
  aspectRatio?: number;
}

export interface BgSettings {
  bg1: number;
  bg2: number;
  aspectRatio?: number;
}

export interface BestiaryExportData {
  beasts: Beast[];
  backgroundPresets: BackgroundPreset[];
  bestiaryBgSettings: BgSettings;
}

export class BestiaryDb extends DbStorageApi {
  private createBeast(): Beast {
    const MAX_BG_INDEX = 327; // Maximum index for earthbound battle backgrounds
    return {
      id: uuidv4(),
      name: '',
      achievementIds: [],
      checklist: [],
      bg1: Math.floor(Math.random() * MAX_BG_INDEX ),          // Default background layer 1
      bg2: Math.floor(Math.random() * MAX_BG_INDEX ),          // Default background layer 2
      aspectRatio: 48    // Default medium letterbox aspect ratio
    }
  }

  public async setBeast(beast: Beast) {
    const id = beast.id ? beast.id : uuidv4()
    await this.set(id, {
      ...this.createBeast(),
      ...beast,
      id
    })
  }

  public async deleteBeast(beast: Beast) {
    this.remove(beast.id)
    return await this.getBeasts()
  }

  public async cloneBeast(beast: Beast) {
    const cloneFromBeasts = async () => {
      const clone = {
        ...beast,
        id: uuidv4(),
        beastName: `${beast.name} (clone)`
      }
      const cloneToast = () => this.showSuccessToast("Clone Successful!")
      return await this.setBeast(clone).then(cloneToast)
    }

    const clone = await this.getBeasts().then(cloneFromBeasts)
    return clone
  }

  public async getBeastById(id) {
    const beasts = await this.getBeasts();
    const beast = beasts.find(beast => beast.id === id);
    return beast || this.createBeast()
  }

  public async getBeasts() {
    const beasts = await this.getAll()
    return beasts
  }

  // NEW IMPORT/EXPORT FUNCTIONALITY

  /**
   * Export bestiary data including beasts and background presets
   * @returns Promise that resolves when the export is complete
   */
  public async exportBestiary(): Promise<void> {
    try {
      // Get all beasts
      const beasts = await this.getBeasts();
      
      if (beasts.length === 0) {
        this.showWarningToast("No beasts to export!");
        return;
      }
      
      // Get custom background presets
      let customPresets: BackgroundPreset[] = [];
      try {
        const savedPresets = localStorage.getItem(CUSTOM_BG_PRESETS_KEY);
        if (savedPresets) {
          customPresets = JSON.parse(savedPresets);
        }
      } catch (e) {
        debug.error('Error loading background presets:', e);
      }
      
      // Get bestiary-specific background settings
      let bestiaryBgSettings: BgSettings = {
        bg1: 0,
        bg2: 0,
        aspectRatio: 0
      };
      try {
        const savedBgSettings = localStorage.getItem(BESTIARY_BG_SETTINGS_KEY);
        if (savedBgSettings) {
          bestiaryBgSettings = JSON.parse(savedBgSettings);
        }
      } catch (e) {
        debug.error('Error loading bestiary background settings:', e);
      }
      
      // Create the export object with all data
      const exportData: BestiaryExportData = {
        beasts,
        backgroundPresets: customPresets,
        bestiaryBgSettings
      };
      
      // Create a data URL with the JSON data
      const jsonData = JSON.stringify(exportData, null, 2);
      const dataUrl = `data:text/json;charset=utf-8,${encodeURIComponent(jsonData)}`;
      
      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `xp-bestiary-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show success toast
      this.showSuccessToast(`Bestiary exported with ${beasts.length} beasts and ${customPresets.length} background presets!`);
    } catch (error) {
      debug.error('Failed to export bestiary:', error);
      this.showErrorToast("Failed to export bestiary");
    }
  }

  /**
   * Trigger file selection to import bestiary data
   * @param onComplete Optional callback function to run after import completes
   */
  public async importBestiary(onComplete?: () => void): Promise<void> {
    try {
      // Create file input element
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      
      // Set up file change handler
      fileInput.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        if (!target || !target.files || target.files.length === 0) return;
        
        const file = target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          try {
            if (!e.target || e.target.result === null) {
              this.showErrorToast("Failed to read file");
              return;
            }

            const content = e.target.result as string;
            const importedData = JSON.parse(content);
            
            // Check if this is the new format with beasts and background presets
            let beasts: Beast[] = [];
            let backgroundPresets: BackgroundPreset[] = [];
            let bestiaryBgSettings: BgSettings | null = null;
            
            if (importedData.beasts && Array.isArray(importedData.beasts)) {
              // New format
              beasts = importedData.beasts;
              backgroundPresets = importedData.backgroundPresets || [];
              bestiaryBgSettings = importedData.bestiaryBgSettings;
            } else if (Array.isArray(importedData)) {
              // Old format - just beasts
              beasts = importedData as Beast[];
            } else {
              this.showErrorToast("Invalid beasts file format");
              return;
            }
            
            // Process the imports based on what's available
            let importMsg = '';
            
            // Import beasts if any available
            if (beasts.length > 0) {
              const beastCount = await this.importBeastsData(beasts);
              importMsg += `${beastCount} beasts `;
            }
            
            // Import background presets if any available
            if (backgroundPresets.length > 0) {
              const presetCount = await this.importBackgroundPresets(backgroundPresets, bestiaryBgSettings);
              if (importMsg) {
                importMsg += 'and ';
              }
              importMsg += `${presetCount} background presets `;
            }
            
            if (importMsg) {
              this.showSuccessToast(`${importMsg}imported successfully!`);
            }
            
            // Run callback if provided
            if (onComplete) {
              onComplete();
            }
            
          } catch (parseError) {
            debug.error('Error parsing import file:', parseError);
            this.showErrorToast("Invalid JSON file");
          }
        };
        
        reader.readAsText(file);
      };
      
      // Trigger file selection
      fileInput.click();
      
    } catch (error) {
      debug.error('Failed to import beasts:', error);
      this.showErrorToast("Failed to import beasts");
    }
  }
  
  /**
   * Import beasts data from parsed JSON
   * @param beasts Array of beasts to import
   * @returns Number of successfully imported beasts
   */
  public async importBeastsData(beasts: Beast[]): Promise<number> {
    try {
      // Import each beast
      let successCount = 0;
      
      for (const beast of beasts) {
        try {
          // Ensure each beast has a new UUID to avoid conflicts
          const importedBeast = {
            ...beast,
            id: uuidv4()
          };
          
          await this.setBeast(importedBeast);
          successCount++;
        } catch (err) {
          debug.error('Error importing beast:', err);
        }
      }
      
      return successCount;
    } catch (error) {
      debug.error('Error importing beasts data:', error);
      this.showErrorToast("Failed to import beasts");
      return 0;
    }
  }
  
  /**
   * Import background presets and settings
   * @param presets Array of background presets to import
   * @param bgSettings Optional background settings for the bestiary
   * @returns Number of successfully imported presets
   */
  public async importBackgroundPresets(presets: BackgroundPreset[], bgSettings: BgSettings | null): Promise<number> {
    try {
      // If no presets to import, skip
      if (!presets || presets.length === 0) {
        return 0;
      }
      
      // Load existing presets
      let existingPresets: BackgroundPreset[] = [];
      try {
        const savedPresets = localStorage.getItem(CUSTOM_BG_PRESETS_KEY);
        if (savedPresets) {
          existingPresets = JSON.parse(savedPresets);
        }
      } catch (e) {
        debug.error('Error loading existing background presets:', e);
      }
      
      // Generate new IDs for imported presets to avoid conflicts
      const newPresets: BackgroundPreset[] = presets.map(preset => ({
        ...preset,
        id: Date.now().toString(36) + Math.random().toString(36).substring(2)
      }));
      
      // Merge presets, avoiding duplicates by name
      const existingNames = new Set(existingPresets.map(p => p.name));
      const filteredNewPresets = newPresets.filter(p => !existingNames.has(p.name));
      const mergedPresets = [...existingPresets, ...filteredNewPresets];
      
      // Save back to localStorage
      localStorage.setItem(CUSTOM_BG_PRESETS_KEY, JSON.stringify(mergedPresets));
      
      // Import bestiary-specific background settings if available
      if (bgSettings) {
        localStorage.setItem(BESTIARY_BG_SETTINGS_KEY, JSON.stringify(bgSettings));
      }
      
      return filteredNewPresets.length;
    } catch (error) {
      debug.error('Error importing background presets:', error);
      return 0;
    }
  }
  
  /**
   * Save background settings to localStorage
   * @param bgSettings Background settings to save
   */
  public saveBgSettings(bgSettings: BgSettings): void {
    try {
      localStorage.setItem(BESTIARY_BG_SETTINGS_KEY, JSON.stringify(bgSettings));
    } catch (error) {
      debug.error('Error saving background settings:', error);
    }
  }
  
  /**
   * Save a new background preset
   * @param name Preset name
   * @param bgSettings Background settings for the preset
   * @returns True if successful, false otherwise
   */
  public saveBackgroundPreset(name: string, bgSettings: BgSettings): boolean {
    try {
      // Load existing presets
      let customPresets: BackgroundPreset[] = [];
      const savedPresets = localStorage.getItem(CUSTOM_BG_PRESETS_KEY);
      if (savedPresets) {
        customPresets = JSON.parse(savedPresets);
      }
      
      // Create new preset
      const newPreset: BackgroundPreset = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        name: name,
        bg1: bgSettings.bg1,
        bg2: bgSettings.bg2,
        aspectRatio: bgSettings.aspectRatio || 0
      };
      
      // Add to presets array
      customPresets.push(newPreset);
      
      // Save back to localStorage
      localStorage.setItem(CUSTOM_BG_PRESETS_KEY, JSON.stringify(customPresets));
      
      // Show confirmation toast
      toastController.create({
        message: `Background preset "${name}" saved!`,
        duration: 2000,
        position: 'top',
        color: 'success'
      }).then(toast => toast.present());
      
      return true;
    } catch (e) {
      debug.error('Failed to save background preset:', e);
      toastController.create({
        message: 'Failed to save background preset',
        duration: 2000,
        position: 'top',
        color: 'danger'
      }).then(toast => toast.present());
      
      return false;
    }
  }
}

export default BestiaryDb
