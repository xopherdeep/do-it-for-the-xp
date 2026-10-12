/** Dark tiles from the earthbound palette; the initial is drawn in its pale yellow. */
const TILE_COLORS = ["#280828", "#383050", "#3a2a14", "#3d3c55"];
const INITIAL_COLOR = "#f7e8a8";

const XML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

const escapeXml = (text: string): string => text.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);

/** The same name always lands on the same tile colour. */
const tileColorOf = (name: string): string => {
  const hash = Array.from(name).reduce((sum, char) => (sum * 31 + (char.codePointAt(0) ?? 0)) >>> 0, 0);
  return TILE_COLORS[hash % TILE_COLORS.length];
};

/**
 * A hero's initial on a coloured tile, drawn here as an SVG data URI. It replaces the ui-avatars.com
 * fallback, which sent a child's first name to a third-party server; nothing leaves the device now.
 */
export function initialAvatar(name?: string | null): string {
  const cleanName = (name ?? "").trim();
  const initial = Array.from(cleanName)[0]?.toUpperCase() || "H";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" fill="${tileColorOf(cleanName)}"/>` +
    `<text x="48" y="48" dy=".35em" text-anchor="middle" font-family="monospace" font-size="44" ` +
    `font-weight="bold" fill="${INITIAL_COLOR}">${escapeXml(initial)}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
