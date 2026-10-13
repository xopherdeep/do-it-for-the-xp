/**
 * Read-aloud behind two calls, `speak(text)` and `stop()`. The simple voice reads guide and NPC lines on its own and
 * everyone has a speaker button; both go through here. Three routes, picked on every call (`route()`):
 *
 * - "native": the phone app (Capacitor on Android or iOS) speaks through the @capacitor-community/text-to-speech
 *   plugin, because the Android WebView has no Web Speech voices;
 * - "web": a browser speaks through `speechSynthesis`, when it lists at least one voice (voices load a moment after
 *   the page, so `onChange` tells a screen when they arrive);
 * - "none": nothing can read (no voice at all, as in jest, an old webview, or a desktop pane with no voices). Screens
 *   dim their speaker button and say so (`hasReadingVoice()`); `speak` does nothing and says it did not start.
 *
 * It never throws, and stays quiet when the app's audio is muted (AudioEngine) or the text is empty. One line speaks
 * at a time: a new `speak` cuts the last one off.
 */
import { Capacitor } from "@capacitor/core";
import { AudioEngine } from "@/lib/engine/audio/AudioEngine";

export type SpeechRoute = "native" | "web" | "none";

/** The part of the text-to-speech plugin that read-aloud uses (a spec hands in a stand-in) */
export interface NativeTts {
  speak(options: { text: string; lang: string; rate: number }): Promise<unknown>;
  stop(): Promise<unknown>;
  getSupportedLanguages(): Promise<{ languages: string[] }>;
  getSupportedVoices(): Promise<{ voices: unknown[] }>;
}

/** What read-aloud needs from the outside; every part is read when used, so a missing one is only a quiet no-op */
export interface SpeechEnv {
  synth: () => SpeechSynthesis | null | undefined;
  utterance: (text: string) => SpeechSynthesisUtterance | null;
  isMuted: () => boolean;
  /** Whether the app runs as the packaged phone app (Capacitor native) */
  isNative: () => boolean;
  /** The text-to-speech plugin, loaded the first time it is needed; null where it cannot load */
  nativeTts: () => Promise<NativeTts | null>;
  /** Wait before asking the phone again whether it has a voice (its engine starts up a moment after the app); 0 never retries */
  retryMs: number;
}

export interface SpeakOptions {
  /** Speech rate, 1 is normal; reading aloud runs a little slower by default so a new reader can follow */
  rate?: number;
  lang?: string;
}

export const DEFAULT_SPEECH_RATE = 0.9;
export const DEFAULT_SPEECH_LANG = "en-US";

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** The words in a line as they should be spoken: markup (alerts render HTML) and entities gone, spaces collapsed */
export const plainText = (text: string): string =>
  String(text ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();

const browserSynth = (): SpeechSynthesis | null => (typeof window !== "undefined" && window.speechSynthesis) || null;

const browserUtterance = (text: string): SpeechSynthesisUtterance | null =>
  typeof SpeechSynthesisUtterance === "function" ? new SpeechSynthesisUtterance(text) : null;

/** The app's mute switch (the audio settings screen and the silent start both set it); unreadable counts as not muted */
const appIsMuted = (): boolean => {
  try {
    return AudioEngine.getInstance().state.muted === true;
  } catch {
    return false;
  }
};

const appIsNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform() === true;
  } catch {
    return false;
  }
};

/** Loaded on demand so a browser never downloads the plugin's chunk */
const loadNativeTts = async (): Promise<NativeTts | null> => {
  try {
    const { TextToSpeech } = await import(/* webpackChunkName: "native-tts" */ "@capacitor-community/text-to-speech");
    return TextToSpeech;
  } catch {
    return null;
  }
};

const DEFAULT_ENV: SpeechEnv = {
  synth: browserSynth,
  utterance: browserUtterance,
  isMuted: appIsMuted,
  isNative: appIsNative,
  nativeTts: loadNativeTts,
  retryMs: 1500,
};

/** How many more times the phone is asked, after the first ask, whether it has a voice */
const NATIVE_RETRIES = 3;

export function createSpeech(env: Partial<SpeechEnv> = {}) {
  const { synth, utterance, isMuted, isNative, nativeTts, retryMs } = { ...DEFAULT_ENV, ...env };
  /** The line being read: the utterance on the web, a marker object on the phone; null when nothing is */
  let current: object | null = null;
  let currentIsNative = false;
  /** Whether the phone reported a voice: null until it has answered */
  let nativeVoices: boolean | null = null;
  let isAskingPhone = false;
  let hasStartedWatching = false;
  let plugin: Promise<NativeTts | null> | null = null;
  const listeners = new Set<() => void>();

  const loadPlugin = (): Promise<NativeTts | null> => {
    if (!plugin) plugin = nativeTts().catch(() => null);
    return plugin;
  };

  /** How many voices the browser lists (0 where it has no speech synthesis, or none installed) */
  function webVoiceCount(): number {
    try {
      return synth()?.getVoices?.().length ?? 0;
    } catch {
      return 0;
    }
  }

  function canSpeakOnTheWeb(): boolean {
    try {
      return webVoiceCount() > 0 && !!utterance("");
    } catch {
      return false;
    }
  }

  /** Which way a line would be read right now */
  function route(): SpeechRoute {
    if (isNative() && nativeVoices !== false) return "native";
    return canSpeakOnTheWeb() ? "web" : "none";
  }

  /** Whether this device has a voice to read with: the phone said so, or the browser lists one */
  function hasReadingVoice(): boolean {
    const way = route();
    return way === "native" ? nativeVoices === true : way === "web";
  }

  const tell = (): void => listeners.forEach((listener) => listener());

  function setNativeVoices(found: boolean): void {
    const changed = nativeVoices !== found;
    nativeVoices = found;
    if (changed) tell();
  }

  /** Ask the phone for its languages (then its voices) and remember whether it has any; asks again soon if it has none yet */
  async function checkNativeVoices(retriesLeft: number): Promise<void> {
    if (!isNative() || isAskingPhone) return;
    isAskingPhone = true;
    let found = false;
    try {
      const tts = await loadPlugin();
      if (tts) {
        const { languages } = await tts.getSupportedLanguages();
        found = Array.isArray(languages) && languages.length > 0;
        if (!found) {
          const { voices } = await tts.getSupportedVoices();
          found = Array.isArray(voices) && voices.length > 0;
        }
      }
    } catch {
      // chemx-allow: best-effort a phone whose engine is not up yet (or without the plugin) answers "no voice", then is asked again
      found = false;
    }
    isAskingPhone = false;
    setNativeVoices(found);
    const shouldAskAgain = !found && retriesLeft > 0 && retryMs > 0;
    if (shouldAskAgain) setTimeout(() => void checkNativeVoices(retriesLeft - 1), retryMs);
  }

  /** Look again for voices (a screen coming up on a phone that had none): the browser's list is read live, the phone is asked */
  function refresh(): Promise<void> {
    return checkNativeVoices(0);
  }

  /** Start noticing voices: the browser's late list (voiceschanged) and the phone's answer. Safe to call again. */
  function watch(): void {
    if (hasStartedWatching) {
      if (nativeVoices === false) void refresh();
      return;
    }
    hasStartedWatching = true;
    try {
      synth()?.addEventListener?.("voiceschanged", tell);
      synth()?.getVoices?.();
    } catch {
      // chemx-allow: best-effort a webview without the voices event just never announces them
    }
    void checkNativeVoices(NATIVE_RETRIES);
  }

  /** Be told when whether the device can read changes (the browser's voices arrived, the phone answered). Returns the way to stop. */
  function onChange(listener: () => void): () => void {
    watch();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  /** Cut off whatever is being read. Safe to call any time, anywhere. */
  function stop(): void {
    const wasNative = currentIsNative && current !== null;
    current = null;
    currentIsNative = false;
    try {
      synth()?.cancel();
    } catch {
      // chemx-allow: best-effort there is nothing to cut off where speech cannot start
    }
    if (wasNative) {
      loadPlugin()
        .then((tts) => tts?.stop())
        .catch(() => undefined);
    }
  }

  /** Whether a line is being read right now */
  function isSpeaking(): boolean {
    return current !== null;
  }

  function speakOnTheWeb(words: string, options: SpeakOptions): boolean {
    const engine = synth();
    const line = engine ? utterance(words) : null;
    const cannotSpeak = !engine || !line;
    if (cannotSpeak) return false;
    engine.cancel();
    line.lang = options.lang ?? DEFAULT_SPEECH_LANG;
    line.rate = options.rate ?? DEFAULT_SPEECH_RATE;
    const done = () => {
      const isThisLine = current === line;
      if (isThisLine) current = null;
    };
    line.onend = done;
    line.onerror = done;
    // Held until it ends, so the browser does not collect the line while it is being spoken
    current = line;
    currentIsNative = false;
    engine.speak(line);
    return true;
  }

  /** Hand the line to the phone; it is on its way (true) before the phone has said it can, and a failure only ends the line */
  function speakOnThePhone(words: string, options: SpeakOptions): boolean {
    const line = {};
    const hadLine = current !== null;
    current = line;
    currentIsNative = true;
    const finish = () => {
      const isThisLine = current === line;
      if (isThisLine) current = null;
    };
    loadPlugin()
      .then(async (tts) => {
        if (!tts) return finish();
        if (hadLine) await tts.stop().catch(() => undefined);
        // A newer line (or a stop) came while the plugin loaded: this one is no longer wanted
        if (current !== line) return;
        await tts.speak({ text: words, lang: options.lang ?? DEFAULT_SPEECH_LANG, rate: options.rate ?? DEFAULT_SPEECH_RATE });
        setNativeVoices(true);
        finish();
      })
      .catch(finish);
    return true;
  }

  /** Read `text` aloud, cutting off any line already being read. Returns whether it started (false: nothing said). */
  function speak(text: string, options: SpeakOptions = {}): boolean {
    const words = plainText(text);
    const hasNothingToSay = words === "";
    if (hasNothingToSay) return false;
    try {
      if (isMuted()) return false;
      const way = route();
      if (way === "native") return speakOnThePhone(words, options);
      if (way === "web") return speakOnTheWeb(words, options);
      return false;
    } catch {
      // chemx-allow: best-effort a device that fails to speak stays quiet; the text is on screen
      current = null;
      return false;
    }
  }

  return { speak, stop, route, hasReadingVoice, onChange, watch, refresh, isSpeaking };
}

/** The app's read-aloud: the phone's text-to-speech in the packaged app, the browser's speech synthesis on the web, and the app's mute switch */
export const speech = createSpeech();
// Voices load after the page does: start listening now so they are known by the time a screen asks
speech.watch();
export const speak = (text: string, options?: SpeakOptions): boolean => speech.speak(text, options);
export const stop = (): void => speech.stop();
/** Whether this device has a voice to read with (false: dim the speaker button and say "No reading voice on this device") */
export const hasReadingVoice = (): boolean => speech.hasReadingVoice();
/** Be told when `hasReadingVoice()` may have changed; returns the way to stop listening */
export const onReadingVoiceChange = (listener: () => void): (() => void) => speech.onChange(listener);
