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
};

/** `flask-potion`, `fa-flask-potion` or `flask-round-potion` -> `flask-potion`: the bare name of a glyph the font has. */
export const faIconName = (raw: string | undefined | null): string => {
  const name = (raw ?? "").trim().replace(/^fa-/, "");
  if (!name) return "";
  return FA_ICON_ALIASES[name] ?? name;
};
