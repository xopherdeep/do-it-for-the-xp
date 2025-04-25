import { ref, reactive } from 'vue';
import { loadAudioSettings, loadAudioTheme, saveAudioSettings, saveAudioTheme } from './storage';
import debug from '@/utils/debug';

// Import types directly instead of from module
export type AudioCategory = 'ui' | 'music' | 'sfx' | 'ambient';
export type ThemeType = 'ui' | 'rpg';

export interface AudioTheme {
  ui: string; // e.g., 'nintendo', 'sony'
  rpg: string; // e.g., 'earthbound', 'chronoTrigger'
}

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

export interface AudioTrack {
  id: string;
  src: string;
  category: AudioCategory;
  volume?: number;
  loop?: boolean;
  preload?: boolean;
}

export interface SoundEffect extends AudioTrack {
  category: 'sfx' | 'ui';
  duration?: number;
}

export interface MusicTrack extends AudioTrack {
  category: 'music';
  title?: string;
  artist?: string;
  loopStart?: number;
  loopEnd?: number;
  bpm?: number;
}

/**
 * AudioEngine - Singleton class to manage all game audio
 * 
 * Handles sound effects and music playback, volume control,
 * audio themes, and audio resource management.
 */
export class AudioEngine {
  private static instance: AudioEngine;
  private audioContext: AudioContext | null = null;
  private soundCache = new Map<string, AudioBuffer>();
  private _musicTracks = new Map<string, HTMLAudioElement>();
  private activeSounds = new Map<string, { source: AudioBufferSourceNode, gain: GainNode }>();
  
  // Keep track of the current track sequence for auto-advancing tracks
  private _currentTrackSequence: string[] = [];
  private _currentTrackIndex = 0;
  
  // Reactive state for the audio system
  public state = reactive<AudioState>({
    masterVolume: 0.8,
    musicVolume: 0.7,
    sfxVolume: 0.8,
    uiVolume: 0.6,
    ambientVolume: 0.5,
    muted: false,
    currentMusic: null,
    currentTheme: {
      ui: 'nintendo',
      rpg: 'earthbound'
    },
    audioReady: false,
    audioPermissionGranted: false
  });
  
  // Private constructor for singleton pattern
  private constructor() {
    // Initialize with saved settings if available
    this.loadUserPreferences();
    
    // Log that engine was created
    debug.log('AudioEngine instance created');
  }
  
  /**
   * Get the singleton instance of AudioEngine
   */
  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
      AudioEngine.instance.initialize();
    }
    return AudioEngine.instance;
  }
  
  /**
   * Load user preferences from storage
   */
  private loadUserPreferences(): void {
    // Load audio settings
    const savedSettings = loadAudioSettings();
    Object.assign(this.state, savedSettings);
    
    // Load theme settings
    const savedTheme = loadAudioTheme();
    this.state.currentTheme = savedTheme;
  }
  
  /**
   * Save current settings to storage
   */
  private saveUserPreferences(): void {
    // Save volume and mute settings
    saveAudioSettings({
      masterVolume: this.state.masterVolume,
      musicVolume: this.state.musicVolume,
      sfxVolume: this.state.sfxVolume,
      uiVolume: this.state.uiVolume,
      ambientVolume: this.state.ambientVolume,
      muted: this.state.muted
    });
    
    // Save theme settings
    saveAudioTheme(this.state.currentTheme);
  }
  
  /**
   * Initialize the audio engine
   * Creates AudioContext and sets up event listeners
   */
  public initialize(): void {
    // Attempt to create AudioContext immediately
    try {
      this.initializeAudioContext();
    } catch (e) {
      debug.warn('Audio context initialization deferred: user interaction required');
    }
    
    // Set up event listeners for user interaction to initialize audio
    this.setupAudioContextInitializationEvents();
  }
  
  /**
   * Initialize the AudioContext
   * May fail if called before user interaction
   */
  private initializeAudioContext(): void {
    if (this.audioContext) return;
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.state.audioReady = true;
    this.state.audioPermissionGranted = this.audioContext.state !== 'suspended';
    
    if (this.audioContext.state === 'suspended') {
      debug.warn('AudioContext is suspended. Audio will not play until user interaction.');
    } else {
      this.preloadCommonSounds();
    }
  }
  
  /**
   * Set up event listeners to initialize AudioContext on user interaction
   */
  private setupAudioContextInitializationEvents(): void {
    const initAudio = () => {
      try {
        this.initializeAudioContext();
        this.state.audioPermissionGranted = true;
        
        // Resume AudioContext if it was suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(err => {
            debug.error('Failed to resume AudioContext', err);
          });
        }
      } catch (e) {
        debug.error('Error initializing audio context:', e);
      }
    };
    
    // Add event listeners for common user interactions
    const events = ['click', 'touchend', 'keydown'];
    events.forEach(eventType => {
      document.addEventListener(eventType, () => {
        if (!this.state.audioPermissionGranted) {
          initAudio();
        }
      }, { once: true });
    });
  }
  
  /**
   * Preload commonly used sound effects
   */
  private preloadCommonSounds(): void {
    // This would be filled with common sounds from your game
    // Example: this.loadSound('click', 'path/to/click-sound.wav');
  }
  
  /**
   * Load a sound effect into the cache
   * @param id Unique identifier for the sound
   * @param url URL to the sound file
   */
  public async loadSound(id: string, url: string): Promise<AudioBuffer> {
    if (this.soundCache.has(id)) {
      return this.soundCache.get(id)!;
    }
    
    if (!this.audioContext) {
      try {
        this.initializeAudioContext();
      } catch (e) {
        throw new Error('Audio context not initialized: user interaction required');
      }
    }
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      
      this.soundCache.set(id, audioBuffer);
      return audioBuffer;
    } catch (error) {
      debug.error(`Failed to load sound: ${id}`, error);
      throw error;
    }
  }
  
  /**
   * Play a sound effect
   * @param id Sound identifier
   * @param options Playback options
   * @returns String identifier for the sound instance
   */
  public playSound(id: string, options: { volume?: number, loop?: boolean } = {}): string {
    if (!this.audioContext || !this.state.audioReady) {
      debug.warn('Audio context not ready. Sound will not play:', id);
      return '';
    }
    
    const soundBuffer = this.soundCache.get(id);
    if (!soundBuffer) {
      debug.warn(`Sound not loaded: ${id}`);
      return '';
    }
    
    // Calculate effective volume based on category and master volume
    const volume = (options.volume ?? 1) * 
                   (this.state.muted ? 0 : this.state.sfxVolume * this.state.masterVolume);
    
    // Create audio nodes
    const sourceNode = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    // Configure nodes
    sourceNode.buffer = soundBuffer;
    sourceNode.loop = options.loop || false;
    gainNode.gain.value = volume;
    
    // Connect nodes
    sourceNode.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Generate unique instance ID for this playback
    const instanceId = `${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store active sound for later control
    this.activeSounds.set(instanceId, { source: sourceNode, gain: gainNode });
    
    // Clean up when playback ends
    sourceNode.onended = () => {
      this.activeSounds.delete(instanceId);
    };
    
    // Start playback
    sourceNode.start(0);
    
    return instanceId;
  }
  
  /**
   * Play a UI sound effect (uses UI volume level)
   * @param id Sound identifier
   */
  public playSoundUI(id: string): string {
    // Calculate volume based on UI volume setting
    const volume = this.state.uiVolume / this.state.sfxVolume;
    return this.playSound(id, { volume });
  }
  
  /**
   * Stop a playing sound
   * @param instanceId The sound instance ID returned by playSound
   */
  public stopSound(instanceId: string): void {
    const sound = this.activeSounds.get(instanceId);
    if (!sound) return;
    
    try {
      sound.source.stop();
    } catch (e) {
      // Source might have already ended
    }
    
    this.activeSounds.delete(instanceId);
  }
  
  /**
   * Load a music track
   * @param id Unique identifier for the track
   * @param url URL to the music file
   * @param metadata Additional track metadata
   */
  public loadMusic(id: string, url: string, metadata: Partial<MusicTrack> = {}): void {
    // Create audio element for music (HTML5 Audio is better for streaming)
    const audio = new Audio(url);
    audio.volume = this.state.muted ? 0 : this.state.musicVolume * this.state.masterVolume;
    audio.loop = metadata.loop !== false; // Default to looping if not specified
    
    // Set up event listener for non-looping tracks to handle track completion
    if (!audio.loop) {
      audio.addEventListener('ended', () => {
        this.handleTrackEnded(id);
      });
    }
    
    // Store the music track
    this._musicTracks.set(id, audio);
  }
  
  /**
   * Handle when a non-looping track ends
   * @param id The track ID that just ended
   */
  private handleTrackEnded(id: string): void {
    // If we're playing a sequence of tracks, advance to the next one
    if (this._currentTrackSequence.length > 0 && 
        this._currentTrackIndex < this._currentTrackSequence.length - 1) {
      // Advance to next track
      this._currentTrackIndex++;
      const nextTrackId = this._currentTrackSequence[this._currentTrackIndex];
      this.playMusic(nextTrackId, 1000); // Play next track with fade-in
    } else {
      // Reached end of sequence or not in a sequence
      // Reset state since we're not playing anymore
      this.state.currentMusic = null;
    }
  }
  
  /**
   * Set the current track sequence for auto-advancing when non-looping tracks end
   * @param trackIds Array of track IDs to play in sequence
   */
  public setTrackSequence(trackIds: string[]): void {
    this._currentTrackSequence = [...trackIds];
    this._currentTrackIndex = 0;
  }
  
  /**
   * Stop all currently playing music tracks
   * This ensures only one BGM track plays at a time
   */
  public stopAllMusic(fadeOutTime = 1000): void {
    // Get all loaded music tracks
    const trackIds = Array.from(this._musicTracks.keys());
    
    // Stop each track
    trackIds.forEach(id => {
      const track = this._musicTracks.get(id);
      if (track && !track.paused) {
        const startVolume = track.volume;
        const startTime = Date.now();
        
        const fadeOut = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(1, elapsed / fadeOutTime);
          
          track.volume = startVolume * (1 - progress);
          
          if (progress < 1) {
            requestAnimationFrame(fadeOut);
          } else {
            track.pause();
            track.currentTime = 0;
          }
        };
        
        if (fadeOutTime <= 0) {
          track.pause();
          track.currentTime = 0;
        } else {
          requestAnimationFrame(fadeOut);
        }
      }
    });
    
    this.state.currentMusic = null;
  }
  
  /**
   * Play a music track
   * @param id Track identifier
   * @param fadeInTime Time in ms to fade in (default: 1000)
   */
  public playMusic(id: string, fadeInTime = 1000): void {
    const track = this._musicTracks.get(id);
    if (!track) {
      debug.warn(`Music track not loaded: ${id}`);
      return;
    }
    
    // Stop all other music with fade out - ensures only one track plays at a time
    this.stopAllMusic(fadeInTime);
    
    // Set new current music
    this.state.currentMusic = id;
    
    // Start with volume 0 and fade in
    track.volume = 0;
    track.play().catch(error => {
      debug.error("Couldn't play music:", error);
    });
    
    const startTime = Date.now();
    const targetVolume = this.state.muted ? 0 : this.state.musicVolume * this.state.masterVolume;
    
    const fadeIn = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / fadeInTime);
      
      track.volume = progress * targetVolume;
      
      if (progress < 1) {
        requestAnimationFrame(fadeIn);
      }
    };
    
    requestAnimationFrame(fadeIn);
  }
  
  /**
   * Stop the current music track
   * @param fadeOutTime Time in ms to fade out (default: 1000)
   */
  public stopMusic(fadeOutTime = 1000): void {
    const currentId = this.state.currentMusic;
    if (!currentId) return;
    
    const currentTrack = this._musicTracks.get(currentId);
    if (!currentTrack) return;
    
    const startVolume = currentTrack.volume;
    const startTime = Date.now();
    
    // Clear the track sequence when explicitly stopping music
    this._currentTrackSequence = [];
    this._currentTrackIndex = 0;
    
    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / fadeOutTime);
      
      currentTrack.volume = startVolume * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        currentTrack.pause();
        currentTrack.currentTime = 0;
        this.state.currentMusic = null;
      }
    };
    
    if (fadeOutTime <= 0) {
      currentTrack.pause();
      currentTrack.currentTime = 0;
      this.state.currentMusic = null;
    } else {
      requestAnimationFrame(fadeOut);
    }
  }
  
  /**
   * Set the volume level for a specific category
   * @param category Audio category
   * @param volume Volume level (0.0 to 1.0)
   */
  public setVolume(category: 'master' | AudioCategory, volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    switch (category) {
      case 'master':
        this.state.masterVolume = clampedVolume;
        this.updateAllVolumes();
        break;
      case 'music':
        this.state.musicVolume = clampedVolume;
        this.updateMusicVolume();
        break;
      case 'sfx':
        this.state.sfxVolume = clampedVolume;
        break;
      case 'ui':
        this.state.uiVolume = clampedVolume;
        break;
      case 'ambient':
        this.state.ambientVolume = clampedVolume;
        break;
    }
    
    // Save settings after each change
    this.saveUserPreferences();
  }
  
  /**
   * Update all active sound volumes
   */
  private updateAllVolumes(): void {
    // Update music volume
    this.updateMusicVolume();
    
    // Update active sound effects
    this.activeSounds.forEach((sound, id) => {
      // Determine category from ID (this is just an example)
      const isUI = id.includes('ui-');
      const category = isUI ? 'ui' : 'sfx';
      const categoryVolume = isUI ? this.state.uiVolume : this.state.sfxVolume;
      
      // Set volume based on category and master volume
      sound.gain.gain.value = categoryVolume * this.state.masterVolume * (this.state.muted ? 0 : 1);
    });
  }
  
  /**
   * Update music volume specifically
   */
  private updateMusicVolume(): void {
    const currentId = this.state.currentMusic;
    if (!currentId) return;
    
    const track = this._musicTracks.get(currentId);
    if (!track) return;
    
    track.volume = this.state.musicVolume * this.state.masterVolume * (this.state.muted ? 0 : 1);
  }
  
  /**
   * Toggle mute state
   */
  public toggleMute(): boolean {
    this.state.muted = !this.state.muted;
    this.updateAllVolumes();
    this.saveUserPreferences();
    return this.state.muted;
  }
  
  /**
   * Mute all audio
   */
  public mute(): void {
    this.state.muted = true;
    this.updateAllVolumes();
    this.saveUserPreferences();
  }
  
  /**
   * Unmute all audio
   */
  public unmute(): void {
    this.state.muted = false;
    this.updateAllVolumes();
    this.saveUserPreferences();
  }
  
  /**
   * Set the audio theme
   * @param type Theme type (ui or rpg)
   * @param theme Theme name
   */
  public setTheme(type: ThemeType, theme: string): void {
    this.state.currentTheme[type] = theme;
    this.saveUserPreferences();
  }
  
  /**
   * Preload a list of sounds
   * @param ids Array of sound IDs to preload
   * @param paths Optional map of ID to file path
   */
  public async preloadSounds(ids: string[], paths?: Record<string, string>): Promise<void> {
    const loadPromises = ids.map(id => {
      const path = paths?.[id];
      if (!path) {
        // If no explicit path provided, sound might already be in registry
        // Implementation would depend on your sound registry
        return Promise.resolve();
      }
      return this.loadSound(id, path).catch(err => {
        debug.error(`Failed to preload sound: ${id}`, err);
      });
    });
    
    await Promise.all(loadPromises);
  }
  
  /**
   * Check if a music track is loaded
   */
  public hasMusicTrack(id: string): boolean {
    return this._musicTracks.has(id);
  }
  
  /**
   * Update loop setting for a specific track or all tracks
   * @param loop Whether the track(s) should loop
   * @param trackId Optional track ID (if not provided, applies to all tracks) 
   */
  public setLoopOption(loop: boolean, trackId?: string): void {
    if (trackId) {
      // Update specific track
      const track = this._musicTracks.get(trackId);
      if (track) {
        track.loop = loop;
      }
    } else {
      // Update all tracks
      this._musicTracks.forEach(track => {
        track.loop = loop;
      });
    }
  }
}