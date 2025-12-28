/**
 * Route Music System
 * 
 * This module provides an adapter between the router music system
 * and the new audio engine. It maintains compatibility with the
 * existing route-based music selection while using the new
 * audio engine features.
 */

import { AudioEngine } from './AudioEngine';
import { useAudioStore } from '@/lib/store/stores/audio';
import debug from '@/lib/utils/debug';

// Define the BGM payload structure that matches the existing system
export interface BGMPayload {
  tracks: string[] | { src: string; title?: string }[];
  track: number;
  startDelay?: number;
  saveBookmark?: boolean;
  repeat?: boolean; // Flag to control whether music should loop
  _usingNewAudioEngine?: boolean; // Flag to prevent double playback
}

/**
 * Process BGM payload from the router and play using the new audio engine
 * @param payload The BGM payload from the router
 */
export function playRouteMusic(payload: BGMPayload): void {
  if (!payload || !payload.tracks || !Array.isArray(payload.tracks) || payload.tracks.length === 0) {
    debug.warn('Invalid BGM payload:', payload);
    return;
  }

  const engine = AudioEngine.getInstance();
  const audioStore = useAudioStore();
  
  // If BGM is toggled off in settings, stop current music and don't start new music
  if (audioStore.bgm && audioStore.bgm.is_on === false) {
    debug.log('BGM is toggled off, stopping playback');
    engine.stopAllMusic(500);
    return;
  }

  const trackIndex = payload.track % payload.tracks.length;
  const delay = payload.startDelay || 0;
  // Default to looping if repeat flag is not explicitly set to false
  const shouldRepeat = payload.repeat !== false;

  // First, prepare all tracks in the sequence
  const trackIds: string[] = [];
  
  // Process each track in the array
  for (let i = 0; i < payload.tracks.length; i++) {
    const trackInfo = payload.tracks[i];
    
    // Get track information
    let trackSrc: string;
    let trackTitle: string | undefined;
    let trackId: string;

    if (typeof trackInfo === 'string') {
      // If it's just a string URL
      trackSrc = trackInfo;
      // Create a unique ID based on the track source
      const uniquePart = trackSrc.split('/').pop() || '';
      // DON'T include the index in the ID if we want seamless transitions between different routes using the same file
      trackId = `route-music-${uniquePart}`; 
      trackTitle = uniquePart.replace(/\..+$/, '').replace(/[-_]/g, ' ');
    } else {
      // If it's an object with src and title
      trackSrc = trackInfo.src;
      trackTitle = trackInfo.title;
      // Create a unique ID based on the track source
      const uniquePart = trackSrc.split('/').pop() || '';
      trackId = `route-music-${uniquePart}`;
    }

    // Add to our track ID list
    trackIds.push(trackId);
    
    // Only load if not already present to preserve playback state
    if (!engine.hasMusicTrack(trackId)) {
        engine.loadMusic(trackId, trackSrc, {
          category: 'music',
          id: trackId,
          src: trackSrc,
          title: trackTitle,
          loop: shouldRepeat // Set loop based on the repeat flag
        });
    } else {
        // Just update the loop option
        engine.setLoopOption(shouldRepeat, trackId);
    }
  }

  // Set up the track sequence for auto-advancing when non-repeating
  if (!shouldRepeat && trackIds.length > 1) {
    engine.setTrackSequence(trackIds);
  }

  const currentTrackId = trackIds[trackIndex];
  
  // Play the track with delay
  if (delay > 0) {
    setTimeout(() => {
      // Check again after delay to ensure BGM wasn't toggled off
      if (audioStore.bgm && audioStore.bgm.is_on !== false) {
          engine.playMusic(currentTrackId);
      }
    }, delay);
  } else {
    engine.playMusic(currentTrackId);
  }
}

/**
 * Change BGM using the new audio engine and update Pinia store state
 * @param audioStore Pinia audio store (optional, will be created if not provided)
 * @param payload BGM payload
 * @param useNewEngine Whether to use the new audio engine (true) or old system (false)
 */
export function changeBGM(audioStore: ReturnType<typeof useAudioStore> | null, payload: BGMPayload, useNewEngine = true): void {
  if (useNewEngine) {
    // Use the new audio engine
    playRouteMusic(payload);
    
    // Add a special flag to the payload so the store action knows
    // that the audio is already being handled by our new engine
    // This prevents double-playback
    const payloadWithFlag = {
      ...payload,
      _usingNewAudioEngine: true
    };
    
    // Update the Pinia store state (but it won't play audio again due to the flag)
    if (audioStore) {
      audioStore.changeBGM(payloadWithFlag);
    }
  } else {
    // Use only the Pinia store system
    if (audioStore) {
      audioStore.changeBGM(payload);
    }
  }
}