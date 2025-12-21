/**
 * Audio system type definitions
 */

export type AudioCategory = 'ui' | 'music' | 'sfx' | 'ambient';
export type ThemeType = 'ui' | 'rpg';

/**
 * Base interface for all audio resources
 */
export interface AudioTrack {
  id: string;
  src: string;
  category: AudioCategory;
  volume?: number;
  loop?: boolean;
  preload?: boolean;
}

/**
 * Sound effect specific properties
 */
export interface SoundEffect extends AudioTrack {
  category: 'sfx' | 'ui';
  duration?: number;
}

/**
 * Music track specific properties
 */
export interface MusicTrack extends AudioTrack {
  category: 'music';
  title?: string;
  artist?: string;
  loopStart?: number;
  loopEnd?: number;
  bpm?: number;
}

/**
 * Theme configuration
 */
export interface AudioTheme {
  ui: string; // e.g., 'nintendo', 'sony'
  rpg: string; // e.g., 'earthbound', 'chronoTrigger'
}

/**
 * Audio state configuration
 */
export interface AudioState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  uiVolume: number;
  ambientVolume: number;
  muted: boolean;
  currentMusic: string | null;
  currentTheme: AudioTheme;
  audioReady: boolean;
  audioPermissionGranted: boolean;
}