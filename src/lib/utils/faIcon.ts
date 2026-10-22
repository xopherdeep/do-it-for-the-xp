/**
 * A Font Awesome icon name in either spelling ("bolt" or "fa-bolt") as the class that draws it ("fa-bolt").
 * The Game Master's forms and the presets catalogue store bare names; the nav and older data store the "fa-" spelling,
 * so everything that draws a stored icon goes through here. A missing name gives `fallback` ("" unless the caller
 * wants an icon of its own, such as "fa-sparkles"). A Font Awesome 6 name becomes the glyph the vendored FA 5 font has.
 */
import { faIconName } from "@/lib/services/items/faIcons";

export const toFaClass = (icon?: string | null, fallback = ""): string => {
  const name = faIconName(icon);
  if (!name) return fallback;
  return `fa-${name}`;
};
