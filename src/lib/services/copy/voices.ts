/**
 * Hero voices: the same game for everyone, only the WORDS change with the reader.
 *
 *   simple     8 and under: short common words, one idea per line, digits for numbers
 *   adventure  9 to 12: playful RPG flavour, beast puns, a little attitude (also the fallback voice)
 *   classic    13 and up, or any adult: a straight SNES-era RPG voice, terse and dry
 *
 * The voice comes from the profile's birthday, unless the hero (or a Game Master) picked one on the profile (`voice`,
 * "Text style"). Pure: no storage, no Vue. The lines themselves live in catalog/*.ts; copy.ts looks them up.
 */
import { heroAgeOf } from "@/lib/services/core/packs/heroAge";

export type Voice = "simple" | "adventure" | "classic";

/** Every voice, from the youngest reader up */
export const VOICES: readonly Voice[] = ["simple", "adventure", "classic"];

/** The voice a line falls back to when its own voice has no wording, and what an unknown birthday reads */
export const FALLBACK_VOICE: Voice = "adventure";

/** The oldest age that still reads the simple voice */
export const SIMPLE_VOICE_MAX_AGE = 8;
/** The youngest age that reads the classic voice (an adult reads it at any age) */
export const CLASSIC_VOICE_MIN_AGE = 13;

/** What the voice rule reads off a profile */
export interface VoiceProfile {
  isAdult?: unknown;
  birthday?: unknown;
  /** The "Text style" the hero picked; missing (Auto) lets the birthday decide */
  voice?: unknown;
}

/**
 * One line of the game in each voice. `adventure` is required: it is what the other two fall back to, so a line can
 * ship in one voice and the rest follow. App, item and beast names stay the same in every voice.
 */
export interface CopyEntry {
  simple?: string;
  adventure: string;
  classic?: string;
}

/** Keys to lines. A key is dotted by screen: "questWizard.title". Placeholders are written {name}. */
export type CopyCatalog = Record<string, CopyEntry>;

/** What fills a {placeholder}: numbers print as plain digits */
export type CopyVars = Record<string, string | number | boolean | null | undefined>;

/** The "Text style" choices on the profile: Auto (no override) then the three voices */
export type TextStyleChoice = Voice | "auto";

export const TEXT_STYLE_CHOICES: readonly { id: TextStyleChoice; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "simple", label: "Simple" },
  { id: "adventure", label: "Adventure" },
  { id: "classic", label: "Classic" },
];

export const isVoice = (value: unknown): value is Voice => value === "simple" || value === "adventure" || value === "classic";

/** The capitalised name of a voice, for labels ("Adventure") */
export const voiceLabel = (voice: Voice): string => voice.charAt(0).toUpperCase() + voice.slice(1);

/**
 * The voice a hero reads: their own pick if the profile holds one, else an adult is classic, a hero of 8 or younger is
 * simple, 9 to 12 is adventure and 13 and up is classic. An unreadable (or future) birthday is adventure.
 */
export const voiceFor = (profile: VoiceProfile | null | undefined, today: Date = new Date()): Voice => {
  const hasNoProfile = !profile;
  if (hasNoProfile) return FALLBACK_VOICE;
  const pick = profile.voice;
  const hasOwnPick = isVoice(pick);
  if (hasOwnPick) return pick;
  const isAdult = profile.isAdult === true;
  if (isAdult) return "classic";
  const age = heroAgeOf(profile, today);
  const hasNoUsableAge = age === null || age < 0;
  if (hasNoUsableAge) return FALLBACK_VOICE;
  const isYoungReader = age <= SIMPLE_VOICE_MAX_AGE;
  if (isYoungReader) return "simple";
  return age >= CLASSIC_VOICE_MIN_AGE ? "classic" : "adventure";
};

/** The voice the birthday alone gives, ignoring any pick: what "Auto" means on the profile */
export const autoVoiceFor = (profile: VoiceProfile | null | undefined, today: Date = new Date()): Voice =>
  voiceFor(profile ? { isAdult: profile.isAdult, birthday: profile.birthday } : profile, today);

/**
 * Whether lines are read aloud on their own: only in the simple voice, and only until the hero turns it off
 * (`autoRead` false on the profile; missing is on). The speaker button works for every voice regardless.
 */
export const autoReadsFor = (voice: Voice, autoRead?: unknown): boolean => voice === "simple" && autoRead !== false;
