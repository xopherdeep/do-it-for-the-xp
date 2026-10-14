/** The Theme Settings choice (interface sounds and RPG game style), kept across reloads. */
export interface ThemeChoice {
  ui: string;
  rpg: string;
}

export const GAME_STYLES = ["earthbound", "chronoTrigger", "finalFantasy", "zelda"] as const;
// the UI sound sets in src/assets/fx/uiSounds.ts
export const UI_STYLES = ["nintendo", "sony"] as const;

const KEY = "xp.themeChoice";
const DEFAULT_CHOICE: ThemeChoice = { ui: "nintendo", rpg: "earthbound" };

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
    // storage full or blocked: the choice lasts for this session only
  }
};
