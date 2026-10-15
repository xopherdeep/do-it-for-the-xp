import { ref } from "vue";

/**
 * How fast dialogue types out (Settings, Theme, Text speed), kept on this device like the game style.
 * Every typing host keeps its own authored pace; this scales it, so Normal is the pace each screen was written at.
 */
export const TEXT_SPEEDS = ["slow", "normal", "fast", "instant"] as const;
export type TextSpeed = (typeof TEXT_SPEEDS)[number];

export const TEXT_SPEED_NAMES: Record<TextSpeed, string> = {
  slow: "Slow",
  normal: "Normal",
  fast: "Fast",
  instant: "Instant",
};

/** Multiplier on the authored milliseconds per letter; Instant shows the whole line at once */
const PACE: Record<TextSpeed, number> = { slow: 1.6, normal: 1, fast: 0.5, instant: 0 };

/** Fast by default: the authored pace read as slow */
export const DEFAULT_TEXT_SPEED: TextSpeed = "fast";

const KEY = "xp.textSpeed";

const isTextSpeed = (value: unknown): value is TextSpeed =>
  typeof value === "string" && (TEXT_SPEEDS as readonly string[]).includes(value);

/** The saved speed, or the default for anything missing or unknown. */
export const loadTextSpeed = (): TextSpeed => {
  try {
    const saved = localStorage.getItem(KEY);
    return isTextSpeed(saved) ? saved : DEFAULT_TEXT_SPEED;
  } catch {
    return DEFAULT_TEXT_SPEED;
  }
};

/** The speed every typing host reads; changing it applies to the next line typed. */
export const textSpeed = ref<TextSpeed>(loadTextSpeed());

export const setTextSpeed = (speed: TextSpeed): void => {
  const isUnknown = !isTextSpeed(speed);
  if (isUnknown) return;
  textSpeed.value = speed;
  try {
    localStorage.setItem(KEY, speed);
  } catch {
    // chemx-allow: best-effort storage blocked, so the choice still holds until reload
  }
};

/** Milliseconds per letter at the chosen speed; 0 means show it all at once. */
export const pacedLetterMs = (authoredMs: number, speed: TextSpeed = textSpeed.value): number =>
  Math.round(Math.max(0, authoredMs) * PACE[speed]);

export const isTextInstant = (speed: TextSpeed = textSpeed.value): boolean => speed === "instant";
