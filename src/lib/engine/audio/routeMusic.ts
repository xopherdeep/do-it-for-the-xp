/**
 * Route Music System
 * 
 * This module provides an adapter between the router music system
 * and the new audio engine. It maintains compatibility with the
 * existing route-based music selection while using the new
 * audio engine features.
 */

import { AudioEngine } from './AudioEngine';
import { streamUrl } from './remoteBgm';
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

/** The delayed start of the latest route's song; a newer route cancels it so a stale song never lands late. */
let pendingStart: ReturnType<typeof setTimeout> | undefined;

/**
 * Cancel any pending delayed route music start
 */
export function cancelPendingRouteMusic(): void {
  if (pendingStart) {
    clearTimeout(pendingStart);
    pendingStart = undefined;
  }
}

/**
 * Process BGM payload from the router and play using the new audio engine
 * @param payload The BGM payload from the router
 */
export function playRouteMusic(payload: BGMPayload): void {
  const isInvalidPayload = !payload || !payload.tracks || !Array.isArray(payload.tracks) || payload.tracks.length === 0;
  if (isInvalidPayload) {
    debug.warn('Invalid BGM payload:', payload);
    return;
  }

  cancelPendingRouteMusic();

  const engine = AudioEngine.getInstance();
  const audioStore = useAudioStore();

  // If BGM is toggled off in settings or engine is muted, stop current music and don't start new music
  const isBgmToggledOff = (audioStore.bgm && audioStore.bgm.is_on === false) || engine.state.muted;
  if (isBgmToggledOff) {
    debug.log('BGM is toggled off or muted, stopping playback');
    engine.stopAllMusic(0);
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

    const isUrlOnly = typeof trackInfo === 'string';
    if (isUrlOnly) {
      // If it's just a string URL
      trackSrc = trackInfo;
      // Create a unique ID based on the track source; the slot's fallback tag is left out so two slots
      // that share one song share one track and keep playing it across routes
      const uniquePart = streamUrl(trackSrc).split('/').pop() || '';
      // DON'T include the index in the ID if we want seamless transitions between different routes using the same file
      trackId = `route-music-${uniquePart}`;
      trackTitle = uniquePart.replace(/\..+$/, '').replace(/[-_]/g, ' ');
    } else {
      // If it's an object with src and title
      trackSrc = trackInfo.src;
      trackTitle = trackInfo.title;
      // Create a unique ID based on the track source
      const uniquePart = streamUrl(trackSrc).split('/').pop() || '';
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
  const isPlayingInSequence = !shouldRepeat && trackIds.length > 1;
  if (isPlayingInSequence) {
    engine.setTrackSequence(trackIds);
  }

  const currentTrackId = trackIds[trackIndex];

  // Play the track with delay
  const isDelayed = delay > 0;
  if (isDelayed) {
    pendingStart = setTimeout(() => {
      // Check again after delay to ensure BGM wasn't toggled off or muted
      const isBgmStillOn = (!audioStore.bgm || audioStore.bgm.is_on !== false) && !engine.state.muted;
      if (isBgmStillOn) {
        engine.playMusic(currentTrackId, 1000);
      }
    }, delay);
  } else {
    engine.playMusic(currentTrackId, 1000);
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