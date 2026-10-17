import { GAME_STYLES, UI_STYLES, type ThemeChoice } from "@/lib/utils/gameStyle";

/**
 * A hero's own game style and menu sounds (the Theme Settings choice, kept on the profile instead of the device), so
 * each player plays in the look they picked and it comes back whenever they sign in.
 */
export type HeroTheme = ThemeChoice;

const isOneOf = (list: readonly string[], value: unknown): boolean => typeof value === "string" && list.includes(value);

/** A theme with a known game style and known menu sounds */
export const isHeroTheme = (value: unknown): value is HeroTheme => {
  const theme = value as Partial<HeroTheme> | null | undefined;
  return Boolean(theme) && isOneOf(GAME_STYLES, theme?.rpg) && isOneOf(UI_STYLES, theme?.ui);
};

/** The theme a profile asks for, or null when it holds none (an old profile): the device's own choice then stands */
export const themeOf = (profile: { themeChoice?: unknown } | null | undefined): HeroTheme | null =>
  isHeroTheme(profile?.themeChoice) ? { rpg: profile.themeChoice.rpg, ui: profile.themeChoice.ui } : null;

export const sameTheme = (a: HeroTheme, b: HeroTheme): boolean => a.rpg === b.rpg && a.ui === b.ui;

/** What a new hero starts with: the free Earthbound look and the Nintendo menu sounds */
export const DEFAULT_HERO_THEME: HeroTheme = { rpg: "earthbound", ui: "nintendo" };
