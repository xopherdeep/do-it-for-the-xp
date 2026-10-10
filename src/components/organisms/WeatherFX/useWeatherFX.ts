import { getCurrentInstance, onUnmounted, readonly, ref } from "vue";
import type { Ref } from "vue";
import { AudioEngine } from "@/lib/engine/audio/AudioEngine";
import { pickSoundSource, SOUND_DEFAULT_VOLUME, SOUND_FADE_MS } from "./sounds";
import type { WeatherSoundType } from "./types";

const FADE_STEP_MS = 50;

interface SoundEntry {
  audio: HTMLAudioElement;
  fadeTimer: ReturnType<typeof setInterval> | null;
}

export interface WeatherFXAPI {
  /** The ambient loop that is currently wanted (it may still be fading in), or null. */
  currentSound: Readonly<Ref<WeatherSoundType | null>>;
  /** Fade `type` in at `DEFAULT_VOLUME[type] * volume` and fade every other loop out. */
  playSound: (type: WeatherSoundType, volume?: number) => void;
  /** Fade the current loop out. */
  stopSound: () => void;
  /** Change the master factor (0-1) of the loop that is playing. */
  setVolume: (volume: number) => void;
  /** Stop everything, immediately when asked, and release the audio elements. */
  dispose: (immediate?: boolean) => void;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

/** Honour the app wide mute when the AudioEngine is around; ignore it otherwise. */
function isAppMuted(): boolean {
  try {
    return AudioEngine.getInstance().state.muted === true;
  } catch {
    return false;
  }
}

/**
 * Ambient weather loops: one lazily created `Audio` per sound, looped, faded in and out over
 * 600 ms, never started on mount. Every failure (missing file, autoplay policy, no Audio API)
 * is swallowed so a sound can never break the weather canvas.
 */
export function useWeatherFX(): WeatherFXAPI {
  const currentSound = ref<WeatherSoundType | null>(null);
  const entries = new Map<WeatherSoundType, SoundEntry>();
  let master = 1;

  const targetVolume = (type: WeatherSoundType): number => clamp01(SOUND_DEFAULT_VOLUME[type] * master);

  function getEntry(type: WeatherSoundType): SoundEntry | null {
    const existing = entries.get(type);
    if (existing) return existing;
    if (typeof Audio === "undefined") return null;
    try {
      const audio = new Audio();
      const src = pickSoundSource(type, audio);
      if (!src) return null;
      audio.src = src;
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;
      const entry: SoundEntry = { audio, fadeTimer: null };
      entries.set(type, entry);
      return entry;
    } catch {
      return null;
    }
  }

  function clearFade(entry: SoundEntry) {
    if (entry.fadeTimer !== null) {
      clearInterval(entry.fadeTimer);
      entry.fadeTimer = null;
    }
  }

  function fadeTo(entry: SoundEntry, target: number, onDone?: () => void) {
    clearFade(entry);
    const from = entry.audio.volume;
    const steps = Math.max(1, Math.round(SOUND_FADE_MS / FADE_STEP_MS));
    let step = 0;
    entry.fadeTimer = setInterval(() => {
      step += 1;
      try {
        entry.audio.volume = clamp01(from + ((target - from) * step) / steps);
      } catch {
        step = steps;
      }
      if (step >= steps) {
        clearFade(entry);
        onDone?.();
      }
    }, FADE_STEP_MS);
  }

  function silence(entry: SoundEntry, immediate: boolean) {
    clearFade(entry);
    const finish = () => {
      try {
        entry.audio.pause();
        entry.audio.currentTime = 0;
      } catch {
        // nothing to clean up
      }
    };
    if (immediate || entry.audio.paused) {
      try {
        entry.audio.volume = 0;
      } catch {
        // ignore
      }
      finish();
      return;
    }
    fadeTo(entry, 0, finish);
  }

  function start(entry: SoundEntry, target: number) {
    if (entry.audio.paused) {
      try {
        entry.audio.volume = 0;
        const result = entry.audio.play();
        if (result && typeof result.catch === "function") {
          result.catch(() => {
            // autoplay blocked or file missing: stay silent
            clearFade(entry);
          });
        }
      } catch {
        return;
      }
    }
    fadeTo(entry, target);
  }

  function playSound(type: WeatherSoundType, volume = 1) {
    master = clamp01(volume);
    entries.forEach((entry, key) => {
      if (key !== type) silence(entry, false);
    });
    currentSound.value = type;
    if (isAppMuted()) {
      const entry = entries.get(type);
      if (entry) silence(entry, true);
      return;
    }
    const entry = getEntry(type);
    if (entry) start(entry, targetVolume(type));
  }

  function stopSound() {
    currentSound.value = null;
    entries.forEach((entry) => silence(entry, false));
  }

  function setVolume(volume: number) {
    master = clamp01(volume);
    const type = currentSound.value;
    if (!type) return;
    const entry = entries.get(type);
    if (entry && !entry.audio.paused && !isAppMuted()) fadeTo(entry, targetVolume(type));
  }

  function dispose(immediate = true) {
    currentSound.value = null;
    entries.forEach((entry) => {
      silence(entry, immediate);
    });
    if (immediate) entries.clear();
  }

  if (getCurrentInstance()) {
    onUnmounted(() => dispose(true));
  }

  return { currentSound: readonly(currentSound) as Readonly<Ref<WeatherSoundType | null>>, playSound, stopSound, setVolume, dispose };
}
