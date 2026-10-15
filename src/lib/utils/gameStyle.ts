/** The Theme Settings choice (interface sounds and RPG game style), kept across reloads. */
export interface ThemeChoice {
  ui: string;
  rpg: string;
}

/** Free for everyone. */
export const FREE_GAME_STYLES = ["earthbound", "chronoTrigger", "finalFantasy", "zelda"] as const;
/** Part of XP Pro (the `gameStyles` gate). */
export const PRO_GAME_STYLES = [
  "dragonQuest",
  "pokemon",
  "secretOfMana",
  "phantasyStar",
  "virtualBoy",
  "marioRpg",
] as const;
export const GAME_STYLES = [...FREE_GAME_STYLES, ...PRO_GAME_STYLES] as const;
export type GameStyle = (typeof GAME_STYLES)[number];

/** The names Theme Settings shows. */
export const GAME_STYLE_NAMES: Record<GameStyle, string> = {
  earthbound: "Earthbound",
  chronoTrigger: "Chrono Trigger",
  finalFantasy: "Final Fantasy",
  zelda: "Legend of Zelda",
  dragonQuest: "Dragon Quest",
  pokemon: "Pokémon (Game Boy)",
  secretOfMana: "Secret of Mana",
  phantasyStar: "Phantasy Star",
  virtualBoy: "Virtual Boy",
  marioRpg: "Super Mario RPG",
};
// the UI sound sets in src/assets/fx/uiSounds.ts
export const UI_STYLES = ["nintendo", "sony"] as const;

const KEY = "xp.themeChoice";
const DEFAULT_CHOICE: ThemeChoice = { ui: "nintendo", rpg: "earthbound" };

export const isProGameStyle = (style: string): boolean => (PRO_GAME_STYLES as readonly string[]).includes(style);

/** The style to show: a Pro style without Pro (never bought, or lapsed) falls back to Earthbound. */
export const allowedGameStyle = (style: string, isPro: boolean): string =>
  isProGameStyle(style) && !isPro ? DEFAULT_CHOICE.rpg : style;

const isOneOf = (list: readonly string[], value: unknown): value is string =>
  typeof value === "string" && list.includes(value);

/** The saved choice, or the default for anything missing or unknown. */
export const loadThemeChoice = (): ThemeChoice => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      ui: isOneOf(UI_STYLES, saved.ui) ? saved.ui : DEFAULT_CHOICE.ui,
      rpg: isOneOf(GAME_STYLES, saved.rpg) ? saved.rpg : DEFAULT_CHOICE.rpg,
    };
  } catch {
    return { ...DEFAULT_CHOICE };
  }
};

export const saveThemeChoice = (choice: ThemeChoice): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ui: choice.ui, rpg: choice.rpg }));
  } catch {
    // chemx-allow: best-effort storage full or blocked, so the choice lasts for this session only
  }
};
