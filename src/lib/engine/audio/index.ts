/**
 * Audio Engine for Do It For The XP
 * 
 * This module provides a centralized audio system for the game,
 * handling sound effects, music, and theme-based audio.
 */

// Re-export everything from AudioEngine
export * from './AudioEngine';
export { soundEffects, musicTracks, getSound, getMusicByCategory } from './soundRegistry';

// Convenience method to get the singleton instance
import { AudioEngine } from './AudioEngine';
export const getAudioEngine = (): AudioEngine => {
  return AudioEngine.getInstance();
};