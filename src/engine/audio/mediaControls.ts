/**
 * Media Session API integration for Do It For The XP
 * 
 * This module provides integration with the Media Session API
 * to enable media controls in browsers and operating systems.
 */

import { AudioEngine, MusicTrack } from './AudioEngine';
import debug from '@/utils/debug';

/**
 * Default album artwork for the game
 */
const DEFAULT_ARTWORK = [
  {
    src: '/assets/icon-only.png',
    sizes: '512x512',
    type: 'image/png'
  }
];

/**
 * Handle media session integration for the audio engine
 */
export class MediaSessionHandler {
  private engine: AudioEngine;
  private mediaSessionAvailable: boolean;
  private currentTrackId: string | null = null;
  private trackData = new Map<string, Partial<MusicTrack>>();

  constructor(engine: AudioEngine) {
    this.engine = engine;
    this.mediaSessionAvailable = 'mediaSession' in navigator;
    
    if (!this.mediaSessionAvailable) {
      debug.warn('Media Session API not available in this browser');
    } else {
      debug.log('Media Session API available, initializing...');
      this.setupMediaSession();
    }
  }
  
  /**
   * Register a track with the media session handler
   * @param id Track identifier
   * @param trackInfo Track metadata
   */
  public registerTrack(id: string, trackInfo: Partial<MusicTrack>): void {
    this.trackData.set(id, trackInfo);
  }
  
  /**
   * Set up media session action handlers
   */
  private setupMediaSession(): void {
    if (!this.mediaSessionAvailable) return;
    
    const mediaSession = navigator.mediaSession;
    
    // Set action handlers for media controls
    mediaSession.setActionHandler('play', () => {
      debug.log('Media Session: Play');
      if (this.currentTrackId) {
        this.engine.playMusic(this.currentTrackId);
      }
    });
    
    mediaSession.setActionHandler('pause', () => {
      debug.log('Media Session: Pause');
      this.engine.stopMusic();
    });
    
    mediaSession.setActionHandler('stop', () => {
      debug.log('Media Session: Stop');
      this.engine.stopMusic();
    });
    
    mediaSession.setActionHandler('previoustrack', () => {
      debug.log('Media Session: Previous Track');
      // You might need a way to get the current track's index in a playlist
      // and then play the previous track in that playlist
      // For now, we'll emit an event that can be captured to handle this
      document.dispatchEvent(new CustomEvent('media-session-previous-track'));
    });
    
    mediaSession.setActionHandler('nexttrack', () => {
      debug.log('Media Session: Next Track');
      // Same as above, but for next track
      document.dispatchEvent(new CustomEvent('media-session-next-track'));
    });
    
    // Optional: Add seekbackward and seekforward handlers if needed
    try {
      mediaSession.setActionHandler('seekbackward', (details) => {
        debug.log('Media Session: Seek Backward', details);
        document.dispatchEvent(new CustomEvent('media-session-seek-backward', { 
          detail: details.seekOffset || 10
        }));
      });
      
      mediaSession.setActionHandler('seekforward', (details) => {
        debug.log('Media Session: Seek Forward', details);
        document.dispatchEvent(new CustomEvent('media-session-seek-forward', { 
          detail: details.seekOffset || 10
        }));
      });
    } catch (error) {
      debug.warn('Media Session: Seek actions not supported', error);
    }
  }
  
  /**
   * Update media session metadata with current track info
   * @param id Track identifier
   */
  public updateMetadata(id: string): void {
    if (!this.mediaSessionAvailable) return;
    
    // Save current track ID
    this.currentTrackId = id;
    
    // Get track metadata
    const trackInfo = this.trackData.get(id) || {};
    
    const title = trackInfo.title || this.extractTitleFromId(id);
    const artist = trackInfo.artist || 'Do It For The XP';
    const album = 'Game Soundtrack';
    
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork: DEFAULT_ARTWORK
      });
      
      debug.log('Media Session: Updated metadata', { title, artist, album });
    } catch (error) {
      debug.error('Media Session: Failed to update metadata', error);
    }
  }
  
  /**
   * Update current playback state
   * @param state 'playing' or 'paused'
   */
  public updatePlaybackState(state: MediaSessionPlaybackState): void {
    if (!this.mediaSessionAvailable) return;
    
    try {
      navigator.mediaSession.playbackState = state;
      debug.log(`Media Session: Playback state changed to ${state}`);
    } catch (error) {
      debug.error('Media Session: Failed to update playback state', error);
    }
  }
  
  /**
   * Try to extract a title from the track ID
   * @param id Track identifier
   * @returns A human-readable title
   */
  private extractTitleFromId(id: string): string {
    // Convert camelCase or snake_case to Title Case
    // e.g. "earthbound_onett" → "Earthbound Onett"
    return id
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to spaces
      .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}