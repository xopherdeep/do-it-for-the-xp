/**
 * Read-aloud: the browser's speech synthesis (the Web Speech API) behind two calls, `speak(text)` and `stop()`.
 * The simple voice reads guide and NPC lines on its own and everyone has a speaker button; both go through here.
 *
 * It stays quiet, never throws, when there is nothing to say it with (no `speechSynthesis`, as in jest or an old
 * webview), when the app's audio is muted (AudioEngine), or when the text is empty. One line speaks at a time: a new
 * `speak` cuts the last one off.
 */
import { AudioEngine } from "@/lib/engine/audio/AudioEngine";

/** What read-aloud needs from the outside; every part is read when used, so a missing one is only a quiet no-op */
export interface SpeechEnv {
  synth: () => SpeechSynthesis | null | undefined;
  utterance: (text: string) => SpeechSynthesisUtterance | null;
  isMuted: () => boolean;
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

const DEFAULT_ENV: SpeechEnv = { synth: browserSynth, utterance: browserUtterance, isMuted: appIsMuted };

export function createSpeech(env: Partial<SpeechEnv> = {}) {
  const { synth, utterance, isMuted } = { ...DEFAULT_ENV, ...env };
  let current: SpeechSynthesisUtterance | null = null;

  /** Whether this device can speak at all */
  function isAvailable(): boolean {
    try {
      return !!synth() && !!utterance("");
    } catch {
      return false;
    }
  }

  /** Cut off whatever is being read. Safe to call any time, anywhere. */
  function stop(): void {
    current = null;
    try {
      synth()?.cancel();
    } catch {
      // chemx-allow: best-effort there is nothing to cut off where speech cannot start
    }
  }

  /** Whether a line is being read right now */
  function isSpeaking(): boolean {
    return current !== null;
  }

  /** Read `text` aloud, cutting off any line already being read. Returns whether it started (false: nothing said). */
  function speak(text: string, options: SpeakOptions = {}): boolean {
    const words = plainText(text);
    const hasNothingToSay = words === "";
    if (hasNothingToSay) return false;
    try {
      if (isMuted()) return false;
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
      engine.speak(line);
      return true;
    } catch {
      // chemx-allow: best-effort a device that fails to speak stays quiet; the text is on screen
      current = null;
      return false;
    }
  }

  return { speak, stop, isAvailable, isSpeaking };
}

/** The app's read-aloud, on the browser's speech synthesis and the app's mute switch */
export const speech = createSpeech();
export const speak = (text: string, options?: SpeakOptions): boolean => speech.speak(text, options);
export const stop = (): void => speech.stop();
