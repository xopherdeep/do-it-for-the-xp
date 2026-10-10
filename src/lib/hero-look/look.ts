import { DEFAULT_LOOK, isHeroLook, type HeroLook } from "./types";

/** A profile as far as the look cares: all optional, the user store keeps profiles untyped. */
export interface LookUser {
  look?: unknown;
  avatar?: string;
  avatarImage?: string;
}

/** Looks up an avatar SVG by key, e.g. "./001-gamer.svg" (the shape of `requireAvatar`). */
export type AvatarLookup = (key: string) => string;

/** The hero's saved look, or the default one when there is none (or it is not a look). */
export function getLook(user?: LookUser | null): HeroLook {
  const look = user?.look;
  return isHeroLook(look) ? { ...DEFAULT_LOOK, ...look } : { ...DEFAULT_LOOK };
}

/** A rendered snapshot of the hero (PNG data URL), or "" when there is none. */
export function heroAvatarImage(user?: LookUser | null): string {
  const image = user?.avatarImage;
  return typeof image === "string" && image.startsWith("data:image/") ? image : "";
}

/**
 * The picture to show for a hero: the snapshot of their look when they have one, else the avatar SVG
 * (as every screen did before), else "". `requireAvatar` is passed in so each caller keeps its own
 * webpack context and tests need none.
 */
export function heroAvatarSrc(user: LookUser | null | undefined, requireAvatar: AvatarLookup): string {
  const image = heroAvatarImage(user);
  if (image) return image;
  const avatar = user?.avatar;
  if (!avatar) return "";
  try {
    const src = requireAvatar(`./${avatar}.svg`);
    return typeof src === "string" ? src : "";
  } catch {
    return "";
  }
}
