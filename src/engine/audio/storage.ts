/**
 * Storage utilities for audio settings
 * Handles saving and loading audio preferences
 */

import { AudioState, AudioTheme } from './AudioEngine';
import debug from '@/utils/debug';

// Storage keys
const AUDIO_SETTINGS_KEY = 'xp-audio-settings';
const AUDIO_THEME_KEY = 'xp-audio-theme';

/**
 * Default audio settings
 */
export const defaultAudioSettings = {
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  uiVolume: 0.6,
  ambientVolume: 0.5,
  muted: false
};

/**
 * Default audio theme
 */
export const defaultAudioTheme = {
  ui: 'nintendo',
  rpg: 'earthbound'
};

/**
 * Save audio settings to local storage
 * @param settings Audio settings to save
 */
export function saveAudioSettings(settings: Partial<AudioState>): void {
  const settingsToSave = {
    masterVolume: settings.masterVolume,
    musicVolume: settings.musicVolume,
    sfxVolume: settings.sfxVolume,
    uiVolume: settings.uiVolume,
    ambientVolume: settings.ambientVolume,
    muted: settings.muted
  };
  
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settingsToSave));
  } catch (e) {
    debug.error('Failed to save audio settings to localStorage:', e);
  }
}

/**
 * Load audio settings from local storage
 * @returns The saved audio settings or defaults if none found
 */
export function loadAudioSettings(): Partial<AudioState> {
  try {
    const savedSettings = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (savedSettings) {
      return { ...defaultAudioSettings, ...JSON.parse(savedSettings) };
    }
  } catch (e) {
    debug.error('Failed to load audio settings from localStorage:', e);
  }
  
  return { ...defaultAudioSettings };
}

/**
 * Save audio theme to local storage
 * @param theme Audio theme to save
 */
export function saveAudioTheme(theme: AudioTheme): void {
  try {
    localStorage.setItem(AUDIO_THEME_KEY, JSON.stringify(theme));
  } catch (e) {
    debug.error('Failed to save audio theme to localStorage:', e);
  }
}

/**
 * Load audio theme from local storage
 * @returns The saved audio theme or defaults if none found
 */
export function loadAudioTheme(): AudioTheme {
  try {
    const savedTheme = localStorage.getItem(AUDIO_THEME_KEY);
    if (savedTheme) {
      return { ...defaultAudioTheme, ...JSON.parse(savedTheme) };
    }
  } catch (e) {
    debug.error('Failed to load audio theme from localStorage:', e);
  }
  
  return { ...defaultAudioTheme };
}