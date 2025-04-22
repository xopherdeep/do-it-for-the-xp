/**
 * Route Music System
 * 
 * This module provides an adapter between the router music system
 * and the new audio engine. It maintains compatibility with the
 * existing route-based music selection while using the new
 * audio engine features.
 */

import { AudioEngine } from './AudioEngine';
import { Store } from 'vuex';

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
 * @param store Vuex store for handling bookmarks if needed
 */
export function playRouteMusic(payload: BGMPayload, store?: Store<any>): void {
  if (!payload || !payload.tracks || !Array.isArray(payload.tracks) || payload.tracks.length === 0) {
    console.warn('Invalid BGM payload:', payload);
    return;
  }

  const engine = AudioEngine.getInstance();
  const trackIndex = payload.track % payload.tracks.length;
  const trackInfo = payload.tracks[trackIndex];
  const delay = payload.startDelay || 0;
  // Default to looping if repeat flag is not explicitly set to false
  const shouldRepeat = payload.repeat !== false;

  // Get track information
  let trackSrc: string;
  let trackTitle: string | undefined;
  let trackId: string;

  if (typeof trackInfo === 'string') {
    // If it's just a string URL
    trackSrc = trackInfo;
    trackId = `route-music-${trackInfo.split('/').pop() || ''}`;
    trackTitle = undefined;
  } else {
    // If it's an object with src and title
    trackSrc = trackInfo.src;
    trackTitle = trackInfo.title;
    trackId = `route-music-${trackSrc.split('/').pop() || ''}`;
  }

  // Check if we need to load this track
  if (!engine.hasMusicTrack(trackId)) {
    engine.loadMusic(trackId, trackSrc, {
      category: 'music',
      id: trackId,
      src: trackSrc,
      title: trackTitle,
      loop: shouldRepeat // Set loop based on the repeat flag
    });
  } else {
    // If the track is already loaded, update its loop property
    // Get the audio element for this track and update its loop setting
    const audioElement = engine['_musicTracks'].get(trackId);
    if (audioElement) {
      audioElement.loop = shouldRepeat;
    }
  }

  // Handle bookmark if needed
  let bookmark = 0;
  if (payload.saveBookmark && store) {
    // Check if we have a bookmark stored in the store
    try {
      const bookmarkData = store.getters.musicBookmark;
      if (bookmarkData && bookmarkData.id === trackId && typeof bookmarkData.position === 'number') {
        bookmark = bookmarkData.position;
      }
    } catch (e) {
      console.warn('Failed to get music bookmark:', e);
    }
  }

  // Play the track with delay
  if (delay > 0) {
    setTimeout(() => {
      engine.playMusic(trackId);
    }, delay);
  } else {
    engine.playMusic(trackId);
  }

  // Track current music info for bookmark saving
  if (payload.saveBookmark && store) {
    // You might want to periodically save the current position
    // This would depend on how your store is set up to handle bookmarks
    const trackPosition = 0; // You'd need to get this from the Audio element
    store.dispatch('saveMusicBookmark', {
      id: trackId,
      position: trackPosition
    });
  }
}

/**
 * Wrapper for the changeBGM store action that uses the new audio engine
 * This function avoids double-playback by adding a flag to the payload
 * @param store Vuex store
 * @param payload BGM payload
 * @param useNewEngine Whether to use the new audio engine (true) or old system (false)
 */
export function changeBGM(store: Store<any>, payload: BGMPayload, useNewEngine = true): void {
  if (useNewEngine) {
    // Use the new audio engine
    playRouteMusic(payload, store);
    
    // Add a special flag to the payload so the existing store action knows
    // that the audio is already being handled by our new engine
    // This prevents double-playback
    const payloadWithFlag = {
      ...payload,
      _usingNewAudioEngine: true
    };
    
    // Dispatch to the store to update state but won't play audio again
    store.dispatch('changeBGM', payloadWithFlag);
  } else {
    // Use only the old system
    store.dispatch('changeBGM', payload);
  }
}