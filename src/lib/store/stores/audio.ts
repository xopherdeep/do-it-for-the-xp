import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { AudioEngine } from '@/lib/engine/audio/AudioEngine';
import debug from '@/lib/utils/debug';
import $fx from "@/assets/fx";

export const useAudioStore = defineStore('audio', () => {
  // --- State ---
  const bgm = reactive({
    audio: new Audio(),
    saveBookmark: false,
    is_on: false,
    startDelay: 0,
    src: null as string | null,
    track: 0,
    tracks: [] as (string | { src: string })[],
    repeat: true,
    $fx
  });

  // --- Getters ---
  // (In setup stores, getters are just computed properties or refs)

  // --- Actions ---

  /**
   * Toggle background music on/off
   */
  function toggleBGM() {
    bgm.is_on = !bgm.is_on;
    turnMusicOnOff();
  }

  /**
   * Toggle repeat setting
   */
  function toggleBGMRepeat() {
    bgm.repeat = !bgm.repeat;
    
    // Update audio element
    if (bgm.audio) {
      bgm.audio.loop = bgm.repeat;
    }
    
    // Update AudioEngine
    const engine = AudioEngine.getInstance();
    engine.setLoopOption(bgm.repeat);
    
    return bgm.repeat;
  }

  /**
   * Turn music on or off based on state
   */
  function turnMusicOnOff() {
    if (bgm.audio) {
      if (bgm.is_on) {
        bgm.audio.play().catch(err => debug.warn('BGM play failed:', err));
      } else {
        bgm.audio.pause();
      }
    }
  }

  /**
   * Change BGM
   */
  async function changeBGM(payload: any = {}) {
    // Update state with any new track data
    Object.assign(bgm, payload);
    
    if (payload._usingNewAudioEngine) {
      return;
    }

    if (!bgm.is_on || !bgm.tracks || !bgm.tracks.length) {
      return;
    }

    const targetTrack = bgm.tracks[bgm.track % bgm.tracks.length];
    if (!targetTrack) return;

    const src = typeof targetTrack === 'string' ? targetTrack : targetTrack.src;
    
    if (!bgm.audio) {
      debug.warn('Audio element not initialized');
      return;
    }

    bgm.audio.src = src;
    bgm.audio.loop = bgm.repeat;

    try {
      await bgm.audio.play();
    } catch (error) {
      debug.warn('Audio playback failed', error);
    }
  }

  return {
    bgm,
    toggleBGM,
    toggleBGMRepeat,
    turnMusicOnOff,
    changeBGM
  };
});
