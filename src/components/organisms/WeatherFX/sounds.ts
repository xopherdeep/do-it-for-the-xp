import type { WeatherSoundType } from "./types";

/**
 * Ambient weather loops rendered offline into `src/assets/audio/weather/<name>.{ogg,mp3}`.
 * Files are resolved through a webpack context so a sound that has not been rendered yet simply
 * resolves to "no sources" instead of breaking the build or throwing at runtime.
 */
export const SOUND_NAMES: readonly WeatherSoundType[] = ["rain", "storm", "wind", "ocean", "night", "cave"];

/** Loudness of each loop before the caller's `soundVolume` (0-1) is applied. */
export const SOUND_DEFAULT_VOLUME: Record<WeatherSoundType, number> = {
  rain: 0.5,
  storm: 0.55,
  wind: 0.35,
  ocean: 0.45,
  night: 0.35,
  cave: 0.4,
};

/** Fade in/out length in milliseconds. */
export const SOUND_FADE_MS = 600;

type SoundContext = {
  keys: () => string[];
  (key: string): unknown;
};

let soundContext: SoundContext | null | undefined;

function getContext(): SoundContext | null {
  const cached = soundContext;
  const isResolved = cached !== undefined;
  if (isResolved) return cached;
  try {
    soundContext = require.context("@/assets/audio/weather", false, /\.(ogg|mp3)$/) as unknown as SoundContext;
  } catch {
    soundContext = null;
  }
  return soundContext;
}

function moduleToUrl(mod: unknown): string | null {
  const isUrl = typeof mod === "string";
  if (isUrl) return mod;
  const hasDefaultExport = !!mod && typeof mod === "object" && "default" in mod;
  if (hasDefaultExport) {
    const value = (mod as { default: unknown }).default;
    const isUrl = typeof value === "string";
    if (isUrl) return value;
  }
  return null;
}

/** Urls for one sound in preference order: ogg first, mp3 as the fallback. Never throws. */
export function getSoundSources(type: WeatherSoundType): { ogg: string | null; mp3: string | null } {
  const ctx = getContext();
  const result: { ogg: string | null; mp3: string | null } = { ogg: null, mp3: null };
  if (!ctx) return result;
  let keys: string[] = [];
  try {
    keys = ctx.keys();
  } catch {
    return result;
  }
  (["ogg", "mp3"] as const).forEach((ext) => {
    const key = `./${type}.${ext}`;
    const hasSound = keys.includes(key);
    if (!hasSound) return;
    try {
      result[ext] = moduleToUrl(ctx(key));
    } catch {
      result[ext] = null;
    }
  });
  return result;
}

/** The url this browser should play for `type`, or null when no file exists. */
export function pickSoundSource(type: WeatherSoundType, audio?: { canPlayType?: (mime: string) => string }): string | null {
  const { ogg, mp3 } = getSoundSources(type);
  const hasBothFormats = !!ogg && !!mp3;
  if (hasBothFormats) {
    let oggOk = true;
    try {
      oggOk = !audio?.canPlayType || audio.canPlayType('audio/ogg; codecs="vorbis"') !== "";
    } catch {
      oggOk = true;
    }
    return oggOk ? ogg : mp3;
  }
  return ogg || mp3;
}
