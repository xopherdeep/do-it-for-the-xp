/**
 * A Font Awesome icon name in either spelling ("bolt" or "fa-bolt") as the class that draws it ("fa-bolt").
 * The Game Master's forms and the presets catalogue store bare names; the nav and older data store the "fa-" spelling,
 * so everything that draws a stored icon goes through here. A missing name gives `fallback` ("" unless the caller
 * wants an icon of its own, such as "fa-sparkles").
 */
export const toFaClass = (icon?: string | null, fallback = ""): string => {
  const name = (icon ?? "").trim();
  if (!name) return fallback;
  return name.startsWith("fa-") ? name : `fa-${name}`;
};
