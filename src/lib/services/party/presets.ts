/**
 * The only words that travel between families: a fixed list of short phrases and emoji, plus the Cheer and Poke
 * actions. Nothing a kid types leaves their family. The site keeps the same ids (Party_Rules::is_preset); change them together.
 */
export interface Preset {
  id: string;
  text: string;
}

export const PRESETS: readonly Preset[] = [
  { id: "gg", text: "Good game!" },
  { id: "nice", text: "Nice hit!" },
  { id: "onit", text: "On it!" },
  { id: "ready", text: "Ready to fight!" },
  { id: "help", text: "Need a hand?" },
  { id: "thanks", text: "Thank you!" },
  { id: "wait", text: "Wait for me!" },
  { id: "brb", text: "Be right back" },
  { id: "heart", text: "❤️" },
  { id: "star", text: "⭐" },
  { id: "party", text: "🎉" },
  { id: "cheer", text: "Cheers you on!" },
  { id: "poke", text: "Pokes you!" },
];

const KNOWN_IDS: ReadonlySet<string> = new Set(PRESETS.map((preset) => preset.id));

/** Whether this id is on the list; a set lookup, so "toString" and "__proto__" are not */
export const isPreset = (id: string): boolean => KNOWN_IDS.has(id);

/** The words for an id, or undefined for anything off the list */
export const presetText = (id: string): string | undefined => PRESETS.find((preset) => preset.id === id)?.text;
