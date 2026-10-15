/**
 * The sky behind the cloud banks: a few flat bands from a deep zenith down to a pale horizon, like a SNES sky, tinted
 * by the place the hero is flying to (the same elements that tint the place-name card). Pure, so a jest spec holds it.
 */

/** Zenith (top) and horizon (bottom) of each sky. Every zenith is darker than its horizon. */
type Sky = readonly [zenith: string, horizon: string];

const DEFAULT_SKY: Sky = ["#4c8cd0", "#9cd0f0"];

const SKY_BY_ELEMENT: Record<string, Sky> = {
  wind: ["#4c9cc0", "#bcf0e0"],
  earth: ["#4c90c8", "#c8e8a0"],
  water: ["#2c68c0", "#8cd4f8"],
  fire: ["#c8604c", "#ffd090"],
  ice: ["#78acdc", "#e8f8ff"],
  light: ["#78b8e8", "#fff0b0"],
  shadow: ["#54448c", "#b4a0d4"],
  storm: ["#484890", "#c8b8ff"],
  moon: ["#1c2054", "#8c94cc"],
};

/** How many flat bands the sky is cut into. */
export const SKY_BANDS = 6;

const channels = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const mix = (from: string, to: string, t: number): string => {
  const [a, b] = [channels(from), channels(to)];
  const rgb = a.map((value, i) => Math.round(value + (b[i] - value) * t));
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
};

/** The band colours, top to horizon. No element, or one the sky does not know, gets the plain blue. */
export const skyBands = (element?: string): string[] => {
  const [zenith, horizon] = (element && SKY_BY_ELEMENT[element]) || DEFAULT_SKY;
  return Array.from({ length: SKY_BANDS }, (_, i) => mix(zenith, horizon, i / (SKY_BANDS - 1)));
};

/** The bands as a CSS gradient with a hard edge between them (each colour is stopped twice, so older WebViews cope). */
export const skyGradient = (element?: string): string => {
  const stops = skyBands(element).flatMap((band, i) => {
    const top = +((i / SKY_BANDS) * 100).toFixed(3);
    const bottom = +(((i + 1) / SKY_BANDS) * 100).toFixed(3);
    return [`${band} ${top}%`, `${band} ${bottom}%`];
  });
  return `linear-gradient(to bottom, ${stops.join(", ")})`;
};
