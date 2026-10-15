/**
 * The portrait file of a beast (src/assets/images/beasts/NNN.webp) as the URL the page can show, or null when the
 * beast has no portrait number or the file is not in the bundle. Webpack bundles the whole folder for the dynamic
 * require; the beast screens already do the same.
 */
export const beastPortraitUrl = (avatar?: number | null): string | null => {
  if (!avatar) return null;
  try {
    return require(`@/assets/images/beasts/${String(avatar).padStart(3, "0")}.webp`);
  } catch {
    // A portrait number with no file: the row draws a placeholder instead
    return null;
  }
};
