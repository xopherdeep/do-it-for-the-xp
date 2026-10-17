/**
 * A hero's look and feel: Retro (the SNES window) or Modern (the phone-app one). It lives on the profile, so each hero
 * keeps their own, and it is what the game store's fabStyle follows while that hero plays.
 */
export type HeroSkin = "retro" | "modern";

export const HERO_SKINS: readonly HeroSkin[] = ["retro", "modern"];

/** What a hero who never picked one gets (the app's own default) */
export const DEFAULT_HERO_SKIN: HeroSkin = "modern";

export const isHeroSkin = (value: unknown): value is HeroSkin => value === "retro" || value === "modern";

/** The skin a profile asks for, or null when it holds none (an old profile): the device's own choice then stands */
export const skinOf = (profile: { skin?: unknown } | null | undefined): HeroSkin | null =>
  isHeroSkin(profile?.skin) ? profile.skin : null;
