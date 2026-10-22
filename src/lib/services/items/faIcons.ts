/**
 * Font Awesome icon names as the vendored font knows them.
 *
 * The app ships Font Awesome Pro 5.15.4 (`src/assets/fonts/font-awesome`). A Font Awesome 6 name (`flask-round-potion`,
 * `flask-vial`, `droplet`) has no glyph there and renders as a blank, and a few of those names reached stored data
 * (the catalogue's Health Potion, the bag items bought from it), so every render path normalises the name here.
 */

/** Font Awesome 6 names that reached data or code, and the FA 5 glyph each one is drawn with. */
export const FA_ICON_ALIASES: Readonly<Record<string, string>> = {
  "flask-round-potion": "flask-potion",
  "flask-vial": "flask",
  droplet: "tint",
  // Class icons that older profiles may still carry (JOB_CLASS_OPTIONS).
  gun: "raygun",
  astrology: "moon-stars",
  samurai: "sword",
  "dance-ballroom": "user-music",
  leather: "boot",
  pickaxe: "digging",
  // Favourite foods (FOOD_OPTIONS).
  banana: "lemon",
  smoothie: "glass-citrus",
};

/** A duotone icon's two colours, as `--xp-color-*` names (`red`, `lightBlue`): the glass and the liquid of a flask. */
export interface IconTint {
  primary: string;
  secondary: string;
}

/** The inline variables that paint a duotone icon in a tint; nothing for no tint. */
export const faTintStyle = (tint: IconTint | null | undefined): Record<string, string> => {
  if (!tint) return {};
  return {
    "--fa-primary-color": `var(--xp-color-${tint.primary})`,
    "--fa-secondary-color": `var(--xp-color-${tint.secondary})`,
    "--fa-secondary-opacity": "1",
  };
};

/** `flask-potion`, `fa-flask-potion` or `flask-round-potion` -> `flask-potion`: the bare name of a glyph the font has. */
export const faIconName = (raw: string | undefined | null): string => {
  const name = (raw ?? "").trim().replace(/^fa-/, "");
  if (!name) return "";
  return FA_ICON_ALIASES[name] ?? name;
};
