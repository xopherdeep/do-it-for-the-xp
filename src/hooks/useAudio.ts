import { ref, computed, onUnmounted } from 'vue';
import { AudioEngine } from '@/engine/audio/AudioEngine';
import { getSound, getMusicByCategory } from '@/engine/audio/soundRegistry';
import debug from '@/lib/utils/debug';

/**
 * Hook that provides access to the AudioEngine
 * Makes it easy to play sounds and control audio settings in Vue components
 */
export function useAudio() {
  const engine = AudioEngine.getInstance();
  
  // Track active sound instances for this component
  const activeInstances = ref<Set<string>>(new Set());
  
  // Clean up function to stop all sounds started through this hook
  onUnmounted(() => {
    activeInstances.value.forEach(id => {
      engine.stopSound(id);
    });
    activeInstances.value.clear();
  });
  
  /**
   * Play a sound effect with the current theme settings
   * @param soundId The ID of the sound to play
   * @param options Playback options
   */
  const playSound = (soundId: string, options: { volume?: number, loop?: boolean } = {}): string => {
    // Get current RPG theme
    const theme = engine.state.currentTheme.rpg;
    
    // Get the sound based on current theme
    const sound = getSound('rpg', soundId, theme);
    
    // If sound not found, return empty string
    if (!sound) return '';
    
    // Play the sound and track the instance
    const instanceId = engine.playSound(sound.id, options);
    if (instanceId) {
      activeInstances.value.add(instanceId);
    }
    
    return instanceId;
  };
  
  /**
   * Play a UI sound with the current UI theme
   * @param soundId The ID of the sound to play
   * @param options Playback options
   */
  const playUISound = (soundId: string, options: { volume?: number } = {}): string => {
    // Get current UI theme
    const theme = engine.state.currentTheme.ui;
    
    // Get the sound based on current UI theme
    const sound = getSound('ui', soundId, theme);
    
    // If sound not found, return empty string
    if (!sound) return '';
    
    // Calculate volume - UI sounds use UI volume setting
    const volume = (options.volume ?? 1) * (engine.state.uiVolume / engine.state.sfxVolume);
    
    // Play the sound and track the instance
    const instanceId = engine.playSound(sound.id, { volume });
    if (instanceId) {
      activeInstances.value.add(instanceId);
    }
    
    return instanceId;
  };
  
  /**
   * Helper method for common UI sound: select
   */
  const playSelectSound = (): string => {
    return playUISound('select');
  };
  
  /**
   * Helper method for common UI sound: confirm
   */
  const playConfirmSound = (): string => {
    return playUISound('confirm');
  };
  
  /**
   * Helper method for common UI sound: cancel
   */
  const playCancelSound = (): string => {
    return playUISound('cancel');
  };
  
  /**
   * Helper method for common UI sound: error
   */
  const playErrorSound = (): string => {
    return playUISound('error');
  };
  
  /**
   * Play music by ID
   * @param id The music track ID
   * @param fadeInTime Time to fade in (ms)
   */
  const playMusic = (id: string, fadeInTime = 1000): void => {
    engine.playMusic(id, fadeInTime);
  };
  
  /**
   * Play music from a specific category
   * @param category The music category (e.g. battle, field)
   * @param index Optional index in the category array
   * @param fadeInTime Time to fade in (ms)
   */
  const playMusicCategory = (category: string, index = 0, fadeInTime = 1000): void => {
    const tracks = getMusicByCategory(category);
    if (tracks.length === 0) {
      debug.warn(`No music tracks found for category: ${category}`);
      return;
    }
    
    // Use modulo to ensure index is in bounds
    const safeIndex = index % tracks.length;
    const track = tracks[safeIndex];
    
    // Load if not already loaded
    if (!engine.hasMusicTrack(track.id)) {
      engine.loadMusic(track.id, track.src, track);
    }
    
    engine.playMusic(track.id, fadeInTime);
  };
  
  /**
   * Stop the current music
   * @param fadeOutTime Time to fade out (ms)
   */
  const stopMusic = (fadeOutTime = 1000): void => {
    engine.stopMusic(fadeOutTime);
  };
  
  /**
   * Preload a list of sounds
   * @param soundIds Array of sound IDs to preload
   */
  const preloadSounds = async (soundIds: string[]): Promise<void> => {
    // Get current themes
    const uiTheme = engine.state.currentTheme.ui;
    const rpgTheme = engine.state.currentTheme.rpg;
    
    // Create paths map for RPG sounds
    const paths: Record<string, string> = {};
    
    soundIds.forEach(id => {
      // Look up in UI sounds first
      const uiSound = getSound('ui', id, uiTheme);
      if (uiSound) {
        paths[uiSound.id] = uiSound.src;
        return;
      }
      
      // Then in RPG sounds
      const rpgSound = getSound('rpg', id, rpgTheme);
      if (rpgSound) {
        paths[rpgSound.id] = rpgSound.src;
        return;
      }
    });
    
    // Preload all sounds
    await engine.preloadSounds(Object.keys(paths), paths);
  };
  
  // Return all the methods and reactive state needed by components
  return {
    // Sound playback
    playSound,
    playUISound,
    playSelectSound,
    playConfirmSound,
    playCancelSound,
    playErrorSound,
    stopSound: engine.stopSound.bind(engine),
    
    // Music playback
    playMusic,
    playMusicCategory,
    stopMusic,
    
    // Asset loading
    preloadSounds,
    
    // Volume controls
    setMasterVolume: (vol: number) => engine.setVolume('master', vol),
    setMusicVolume: (vol: number) => engine.setVolume('music', vol),
    setSfxVolume: (vol: number) => engine.setVolume('sfx', vol),
    setUIVolume: (vol: number) => engine.setVolume('ui', vol),
    
    // Mute controls
    toggleMute: engine.toggleMute.bind(engine),
    mute: engine.mute.bind(engine),
    unmute: engine.unmute.bind(engine),
    
    // Theme controls
    setUITheme: (theme: string) => engine.setTheme('ui', theme),
    setRPGTheme: (theme: string) => engine.setTheme('rpg', theme),
    
    // Reactive state access
    isMuted: computed(() => engine.state.muted),
    masterVolume: computed(() => engine.state.masterVolume),
    musicVolume: computed(() => engine.state.musicVolume),
    sfxVolume: computed(() => engine.state.sfxVolume),
    uiVolume: computed(() => engine.state.uiVolume),
    currentMusic: computed(() => engine.state.currentMusic),
    currentUITheme: computed(() => engine.state.currentTheme.ui),
    currentRPGTheme: computed(() => engine.state.currentTheme.rpg),
    
    // Audio status
    isAudioReady: computed(() => engine.state.audioReady),
    hasAudioPermission: computed(() => engine.state.audioPermissionGranted)
  };
}