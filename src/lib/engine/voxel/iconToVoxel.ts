import type { Box, MeshData } from "@/components/organisms/HeroModel/voxel/mesh";
import { buildMeshData } from "@/components/organisms/HeroModel/voxel/mesh";
import { pixelDataToBoxes } from "@/lib/engine/voxel/spriteToVoxel";
import { faIconName } from "@/lib/services/items/faIcons";

/**
 * Turns a shop item's Font Awesome duotone icon into a voxel model: the icon is drawn the way the page
 * shows it (its `icon-colors` primary and secondary colours), each layer is extruded on its own and the
 * primary layer stands proud of the secondary one, so a flat glyph reads as a chunky little object.
 */

/** One drawable layer of a duotone glyph. */
export interface GlyphLayer {
  char: string;
  /** #rrggbb */
  color: string;
}

export interface IconGlyph {
  fontFamily: string;
  fontWeight: string;
  primary: GlyphLayer;
  secondary: GlyphLayer | null;
}

/**
 * Icon names come bare ("film") or as a class ("fad fa-film"); an empty one is a gift box. A Font Awesome 6 name
 * is drawn with the glyph the vendored FA 5 font has (`faIconName`).
 */
export const itemIconClass = (icon: string): string => {
  if (!icon) return "fad fa-gift";
  const isFullClass = icon.includes("fa-");
  if (!isFullClass) return `fad fa-${faIconName(icon)}`;
  return icon
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (token.startsWith("fa-") ? `fa-${faIconName(token)}` : token))
    .join(" ");
};

// Uncoloured icons inherit this parchment gold, the shop sign's colour.
export const DEFAULT_ICON_COLOR = "#e9d8a6";
// The secondary layer is shaded toward this instead of being see-through, so both layers stay solid voxels.
const SHADE_BASE = "#2a1a3a";
const ALPHA_CUTOFF = 110;
const PRIMARY_DEPTH = 3;
const SECONDARY_DEPTH = 2;

const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.replace(/./g, "$&$&") : clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${((clampByte(r) << 16) | (clampByte(g) << 8) | clampByte(b)).toString(16).padStart(6, "0")}`;

/** "rgb(190, 92, 0)" / "rgba(...)" / "#be5c00" to #rrggbb; anything else gives the fallback. */
export const cssColorToHex = (css: string, fallback = DEFAULT_ICON_COLOR): string => {
  const value = (css || "").trim();
  const isHexColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
  if (isHexColor) return rgbToHex(...hexToRgb(value));
  const match = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
  if (!match) return fallback;
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  const isTransparent = alpha === 0;
  if (isTransparent) return fallback;
  return rgbToHex(Number(match[1]), Number(match[2]), Number(match[3]));
};

/** What a layer drawn at `opacity` over the shade base looks like, as a solid colour. */
export const shadeForOpacity = (color: string, opacity: number, base = SHADE_BASE): string => {
  const alpha = Math.max(0, Math.min(1, Number.isFinite(opacity) ? opacity : 1));
  const [r, g, b] = hexToRgb(color);
  const [br, bg, bb] = hexToRgb(base);
  return rgbToHex(br + (r - br) * alpha, bg + (g - bg) * alpha, bb + (b - bb) * alpha);
};

/**
 * One glyph layer's pixels to voxel boxes in a single colour: antialiased edges are snapped in or out at
 * the cutoff and recoloured, so a layer never splits into runs of near-identical shades.
 */
export const layerToBoxes = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  color: string,
  depth: number
): Box[] => {
  const [r, g, b] = hexToRgb(color);
  const solid = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const isSeeThrough = pixels[i + 3] < ALPHA_CUTOFF;
    if (isSeeThrough) continue;
    solid[i] = r;
    solid[i + 1] = g;
    solid[i + 2] = b;
    solid[i + 3] = 255;
  }
  return pixelDataToBoxes(solid, width, height, depth);
};

/** Stands the model on the floor (its lowest voxel `gap` above y = 0) so it sits on the renderer's shadow. */
export const standOnFloor = (boxes: Box[], gap = 1): Box[] => {
  const hasNoBoxes = !boxes.length;
  if (hasNoBoxes) return boxes;
  const lowest = Math.min(...boxes.map((box) => box.y));
  return boxes.map((box) => ({ ...box, y: box.y - lowest + gap }));
};

/** A small wooden crate with a gold band: shown while an icon draws, and when it cannot be drawn at all. */
export const createPlaceholderItemMesh = (): MeshData =>
  buildMeshData([
    { x: -6, y: 1, z: -6, w: 12, h: 11, d: 12, color: "#8a5a2b" },
    { x: -6.2, y: 5.5, z: -6.2, w: 12.4, h: 2, d: 12.4, color: "#e8c050" },
    { x: -1, y: 4.5, z: 6.1, w: 2, h: 3, d: 0.4, color: "#5a3a1b" },
  ]);

/**
 * Reads the glyph a `<i class="fad fa-...">` draws inside `.icon-colors`, colours included. `style` is extra inline
 * style for the probe: a potion's tint (`faTintStyle`) overrides the icon's own colours the way it does on the page.
 */
export const readIconGlyph = (iconClass: string, style: Record<string, string> = {}): IconGlyph | null => {
  const isWithoutDom = typeof document === "undefined" || typeof getComputedStyle !== "function";
  if (isWithoutDom) return null;
  const wrap = document.createElement("span");
  wrap.className = "icon-colors";
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;color:${DEFAULT_ICON_COLOR}`;
  const probe = document.createElement("i");
  probe.className = iconClass;
  for (const [property, value] of Object.entries(style)) probe.style.setProperty(property, value);
  wrap.appendChild(probe);
  document.body.appendChild(wrap);
  try {
    const before = getComputedStyle(probe, "::before");
    const after = getComputedStyle(probe, "::after");
    const glyphOf = (content: string): string => {
      const text = (content || "").replace(/^["']|["']$/g, "");
      return text === "none" || text === "normal" ? "" : text;
    };
    const primaryChar = glyphOf(before.content);
    if (!primaryChar) return null;
    const secondaryChar = glyphOf(after.content);
    const secondaryColor = cssColorToHex(after.color);
    return {
      fontFamily: before.fontFamily,
      fontWeight: before.fontWeight || "900",
      primary: { char: primaryChar, color: cssColorToHex(before.color) },
      secondary: secondaryChar
        ? { char: secondaryChar, color: shadeForOpacity(secondaryColor, Number(after.opacity)) }
        : null,
    };
  } finally {
    wrap.remove();
  }
};

const waitForFont = async (font: string, sample: string): Promise<void> => {
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  const canLoadFonts = typeof fonts?.load === "function";
  if (!canLoadFonts) return;
  await Promise.race([fonts.load(font, sample).catch(() => []), new Promise((done) => setTimeout(done, 1500))]);
};

/** Draws each layer of the glyph centred on its own `resolution` square and returns the pixels. */
const rasteriseGlyph = (glyph: IconGlyph, resolution: number): Uint8ClampedArray[] | null => {
  const canvas = document.createElement("canvas");
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const layers = [glyph.secondary, glyph.primary].filter(Boolean) as GlyphLayer[];
  const reference = 100;
  ctx.font = `${glyph.fontWeight} ${reference}px ${glyph.fontFamily}`;
  let left = 0;
  let right = 0;
  let ascent = 0;
  let descent = 0;
  for (const layer of layers) {
    const metrics = ctx.measureText(layer.char);
    left = Math.max(left, metrics.actualBoundingBoxLeft || 0);
    right = Math.max(right, metrics.actualBoundingBoxRight || metrics.width || 0);
    ascent = Math.max(ascent, metrics.actualBoundingBoxAscent || reference * 0.8);
    descent = Math.max(descent, metrics.actualBoundingBoxDescent || 0);
  }
  const span = Math.max(left + right, ascent + descent, 1);
  const scale = (resolution - 2) / span;
  const x = resolution / 2 - ((right - left) * scale) / 2;
  const y = resolution / 2 + ((ascent - descent) * scale) / 2;

  ctx.font = `${glyph.fontWeight} ${reference * scale}px ${glyph.fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  return layers.map((layer) => {
    ctx.clearRect(0, 0, resolution, resolution);
    ctx.fillStyle = layer.color;
    ctx.fillText(layer.char, x, y);
    return ctx.getImageData(0, 0, resolution, resolution).data;
  });
};

const meshCache = new Map<string, MeshData>();

/** The voxel model of an item's icon, in `style`'s tint if any; a crate when the icon or its font cannot be drawn. */
export const iconToVoxelMesh = async (icon: string, resolution = 24, style: Record<string, string> = {}): Promise<MeshData> => {
  const iconClass = itemIconClass(icon);
  const key = `${iconClass}@${resolution}${JSON.stringify(style)}`;
  const cached = meshCache.get(key);
  if (cached) return cached;

  let mesh = createPlaceholderItemMesh();
  try {
    const glyph = readIconGlyph(iconClass, style);
    if (glyph) {
      await waitForFont(`${glyph.fontWeight} ${resolution}px ${glyph.fontFamily}`, glyph.primary.char);
      const layers = rasteriseGlyph(glyph, resolution);
      if (layers) {
        const [secondaryPixels, primaryPixels] = glyph.secondary ? layers : [null, layers[0]];
        const boxes = [
          ...(secondaryPixels && glyph.secondary
            ? layerToBoxes(secondaryPixels, resolution, resolution, glyph.secondary.color, SECONDARY_DEPTH)
            : []),
          ...layerToBoxes(primaryPixels, resolution, resolution, glyph.primary.color, PRIMARY_DEPTH),
        ];
        const hasBoxes = boxes.length > 0;
        if (hasBoxes) mesh = buildMeshData(standOnFloor(boxes));
      }
    }
  } catch {
    // chemx-allow: best-effort an icon that cannot be drawn shows the crate instead
  }
  meshCache.set(key, mesh);
  return mesh;
};
