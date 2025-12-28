/**
 * Temple Icon Utilities
 */

export const TEMPLE_ICON_MAP: Record<string, string> = {
  "wind-temple": "fad fa-wind",
  "earth-temple": "fad fa-mountain",
  "water-temple": "fad fa-water",
  "fire-temple": "fad fa-fire",
  "ice-temple": "fad fa-snowflake",
  "light-temple": "fad fa-sun",
  "shadow-temple": "fad fa-moon",
  "lightning-temple": "fad fa-bolt",
};

export const DEFAULT_TEMPLE_ICON = "fad fa-place-of-worship";

/**
 * Gets the specific icon for a temple, or a default temple icon
 */
export function getTempleIcon(templeId: string): string {
  return TEMPLE_ICON_MAP[templeId] || DEFAULT_TEMPLE_ICON;
}

/**
 * Gets the wall icon for a temple (which is often the same as the temple icon)
 */
export function getTempleWallIcon(templeId: string): string {
  // If we want to return just the fa- class without fad/fas
  const fullIcon = getTempleIcon(templeId);
  return fullIcon;
}
