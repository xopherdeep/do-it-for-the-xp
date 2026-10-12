/**
 * The pixel clouds of the clouds transition and the little Pegasus that flies through them. Clouds are painted as
 * puffs on a flat base, then shaded in bands (white on top, lavender below, a dark lavender underside), lit from the
 * top left and inked, like the house style in chestSprite.ts. A layer stamps many of them over a grid the size of the
 * screen, so the whole bank is one set of crisp SVG runs (see pixelGrid).
 */

import {
  createGrid,
  gridRuns,
  outlineGrid,
  paint,
  type Grid,
  type PixelRun,
} from "@/app/Console/TempleGrounds/components/pixelGrid";

export interface CloudPalette {
  /** Lit top to shaded, four bands */
  body: [string, string, string, string];
  /** The belly of the cloud: lighter, then darkest */
  under: [string, string];
  ink: string;
}

/** The near and middle banks: white to lavender (EarthBound sky clouds). */
export const CLOUD_LAVENDER: CloudPalette = {
  body: ["#ffffff", "#f0f0fc", "#d8d8f0", "#b8b8e0"],
  under: ["#9c98cc", "#7c76b0"],
  ink: "#4a3c78",
};

/** The far bank is cooler, with a breath of the mint accent. */
export const CLOUD_MINT: CloudPalette = {
  body: ["#f4fff8", "#d8f4e4", "#b8e4d0", "#98ccc0"],
  under: ["#80b0b8", "#6890a8"],
  ink: "#3c6488",
};

export const SKY = "#68a8d8";

/** Small, repeatable random numbers so a bank looks the same every time it is flown through. */
export const seeded = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** How many filled cells in a row from (x, y) in a direction, not counting the start. */
const reach = (mask: boolean[][], x: number, y: number, dx: number, dy: number): number => {
  let n = 0;
  while (mask[y + dy * (n + 1)]?.[x + dx * (n + 1)]) n++;
  return n;
};

/** One cloud of puffs on a flat base, shaded and inked. */
/** Which body band a pixel falls in, by how far the cloud reaches above it. */
const bodyBand = (up: number): number => {
  if (up <= 2) return 0;
  if (up <= 5) return 1;
  if (up <= 9) return 2;
  return 3;
};

export const paintCloud = (w: number, h: number, rand: () => number, palette: CloudPalette): Grid => {
  const mask = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
  const baseY = h - 2;
  const puffs = Math.max(3, Math.round(w / 9));
  const margin = Math.round(h * 0.3);
  for (let i = 0; i < puffs; i++) {
    const t = i / (puffs - 1);
    const cx = margin + (w - 2 * margin) * t;
    // The middle puffs are the tallest
    const r = h * (0.26 + rand() * 0.16) * (1.15 - Math.abs(t - 0.5) * 0.9);
    const cy = baseY - r * 0.7;
    for (let y = 0; y <= baseY; y++)
      for (let x = 0; x < w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) mask[y][x] = true;
  }
  // A flat base under the puffs
  for (let y = baseY - 3; y <= baseY; y++) for (let x = margin; x < w - margin; x++) mask[y][x] = true;

  const g = createGrid(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!mask[y][x]) continue;
      const below = reach(mask, x, y, 0, 1);
      if (below <= 2) {
        paint(g, x, y, palette.under[below <= 1 ? 1 : 0]);
        continue;
      }
      const up = reach(mask, x, y, 0, -1);
      let band = bodyBand(up);
      const shouldRaiseBandAtRightEdge = reach(mask, x, y, 1, 0) <= 2 && band < 3;
      if (shouldRaiseBandAtRightEdge) band++;
      const shouldLowerBandAtLeftEdge = reach(mask, x, y, -1, 0) <= 2 && band > 0;
      if (shouldLowerBandAtLeftEdge) band--;
      paint(g, x, y, palette.body[band]);
    }
  outlineGrid(g, palette.ink);
  return g;
};

export interface CloudLayerSpec {
  /** Screen pixels per painted cell: bigger is nearer */
  scale: number;
  palette: CloudPalette;
  /** Cloud size in cells */
  cloudW: number;
  cloudH: number;
  seed: number;
}

export interface CloudLayer {
  cols: number;
  rows: number;
  scale: number;
  runs: PixelRun[];
}

/** Stamp clouds over a grid that covers the screen so the bank leaves almost no gaps (the sky field fills the rest). */
export const paintCloudLayer = (spec: CloudLayerSpec, width: number, height: number): CloudLayer => {
  const { scale, palette, cloudW, cloudH, seed } = spec;
  const cols = Math.ceil(width / scale) + 1;
  const rows = Math.ceil(height / scale) + 1;
  const rand = seeded(seed);
  const variants = [0.8, 1, 1.2, 0.9].map((k) =>
    paintCloud(Math.round(cloudW * k), Math.round(cloudH * (0.85 + k * 0.15)), rand, palette),
  );
  const target = createGrid(cols, rows);
  const stamps: Array<{ x: number; y: number; sprite: Grid }> = [];
  const stepX = cloudW * 0.55;
  const stepY = cloudH * 0.5;
  let row = 0;
  for (let y = -cloudH / 2; y < rows + cloudH / 2; y += stepY, row++)
    for (let x = -cloudW / 2 + (row % 2 ? stepX / 2 : 0); x < cols + cloudW / 2; x += stepX) {
      const sprite = variants[Math.floor(rand() * variants.length)];
      stamps.push({ x: Math.round(x + (rand() - 0.5) * stepX * 0.5), y: Math.round(y + (rand() - 0.5) * stepY * 0.4), sprite });
    }
  // Lower clouds go on last so they overlap the ones above them
  stamps.sort((a, b) => a.y - b.y);
  for (const { x, y, sprite } of stamps)
    sprite.forEach((line, sy) =>
      line.forEach((cell, sx) => {
        if (cell) paint(target, x + sx, y + sy, cell);
      }),
    );
  return { cols, rows, scale, runs: gridRuns(target) };
};

/** The Pegasus, flying left: white with a gold mane, wings raised. Drawn at 3x by the effect. */
const PEGASUS_ART = [
  "...........ww...........",
  "..........wwww..........",
  ".........wwwwww.........",
  "........wwwwwwww........",
  "..ww...wwwwwwwwww.......",
  ".wwwm.mwwwwwwwwwwww.....",
  ".wwwwmmwwwwwwwwwwwwgg...",
  "..wwwwmwwwwwwwwwwwwggg..",
  "...wwwwwwwwwwwwwwwwgg...",
  "....ggwwwwwwwwwwggg.....",
  ".....w.ww......ww.g.....",
  "....ww.w.......w........",
  "...ww..ww.....ww........",
];
const PEGASUS_TONES: Record<string, string> = { w: "#ffffff", g: "#c4cce8", m: "#f0b830" };

export const PEGASUS_W = 24;
export const PEGASUS_H = PEGASUS_ART.length;

export const pegasusRuns = (): PixelRun[] => {
  const g = createGrid(PEGASUS_W, PEGASUS_H);
  PEGASUS_ART.forEach((line, y) =>
    [...line].forEach((ch, x) => {
      if (PEGASUS_TONES[ch]) paint(g, x, y, PEGASUS_TONES[ch]);
    }),
  );
  outlineGrid(g, "#4a3c78");
  return gridRuns(g);
};
