import { hexToRgb } from "./mesh";
import type { Box } from "./mesh";

export type { Box } from "./mesh";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type PartName = "torso" | "head" | "armL" | "armR" | "legL" | "legR" | "handL" | "handR";

/** Every part, in the order the builder makes them */
export const PART_NAMES: PartName[] = ["torso", "head", "armL", "armR", "legL", "legR", "handL", "handR"];

/**
 * One named, separately animated lump of the character. Boxes are in CHARACTER space; `pivot` is where the
 * group hangs (shoulder, hip, neck) so the builder can re-centre the geometry on it and animation can rotate it.
 */
export interface Part {
  name: PartName;
  pivot: Vec3;
  boxes: Box[];
  /** Hands hang off their arm so they follow it */
  parent?: PartName;
  /** How far (radians) the arm lifts forward at rest, to carry a held item */
  raise?: number;
}

/** Box from two corners (any order) */
export const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: string): Box => ({
  x: Math.min(x0, x1),
  y: Math.min(y0, y1),
  z: Math.min(z0, z1),
  w: Math.abs(x1 - x0),
  h: Math.abs(y1 - y0),
  d: Math.abs(z1 - z0),
  color,
});

/** How much a rounded block's vertical edges are cut away: half a unit, the smallest step a box may take */
const CUT = 0.5;

/**
 * A block with its four vertical edges cut by half a unit, as three boxes that do not overlap: the middle at full depth
 * and a stub beside it on each side. A stub's face against the middle is hidden and no top or bottom is drawn twice.
 */
export const cutBlock = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: string): Box[] => [
  box(x0 + CUT, y0, z0, x1 - CUT, y1, z1, color),
  box(x0, y0, z0 + CUT, x0 + CUT, y1, z1 - CUT, color),
  box(x1 - CUT, y0, z0 + CUT, x1, y1, z1 - CUT, color),
];

export const mirrorX = (boxes: Box[]): Box[] => boxes.map((b) => ({ ...b, x: -(b.x + b.w) }));
/** The boxes plus their reflection across the x = 0 plane */
export const both = (boxes: Box[]): Box[] => [...boxes, ...mirrorX(boxes)];
export const translate = (boxes: Box[], by: Vec3): Box[] =>
  boxes.map((b) => ({ ...b, x: b.x + by.x, y: b.y + by.y, z: b.z + by.z }));

const toHex = (rgb: [number, number, number]): string =>
  "#" +
  rgb
    .map((c) => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, "0"))
    .join("");

/** Multiply toward black: shade(c, 0.8) is 20% darker */
export const shade = (hex: string, factor: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return toHex([r * factor, g * factor, b * factor]);
};

export const mix = (a: string, b: string, t: number): string => {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return toHex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]);
};

/** Mix toward white: lighten(c, 0.3) */
export const lighten = (hex: string, amount: number): string => mix(hex, "#ffffff", amount);

/** Fixed colours that are not part of the look */
export const PALETTE = {
  boot: "#4a3220",
  leather: "#7a6048",
  denim: "#34456b",
  steel: "#aab4c2",
  gold: "#e8b22b",
  white: "#f5f5f5",
  mouth: "#6e2b2b",
  tongue: "#e0707a",
  blush: "#ff7a7a",
  green: "#3f8a3f",
  yellow: "#f2c230",
} as const;
