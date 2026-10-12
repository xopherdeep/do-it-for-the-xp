/**
 * The pixel temple the iris shows at full cover: a small facade (pediment, entablature, four columns around a dark
 * doorway, three steps) painted on a 28 x 22 grid in the temple's own stone ramp, lit from the top left.
 */
import { createGrid, gridRuns, outlineGrid, paint, type PixelRun } from "@/app/Console/TempleGrounds/components/pixelGrid";
import { doorPalette } from "@/app/Console/TempleGrounds/components/doorSprite";

export const IRIS_SPRITE_W = 28;
export const IRIS_SPRITE_H = 22;

const INK = "#140a0e";

const fillRect = (g: ReturnType<typeof createGrid>, x: number, y: number, w: number, h: number, fill: string) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) paint(g, x + i, y + j, fill);
};

/** A pediment pixel: bright on the left slope, shaded on the right, mid-tone between. */
const slopeTone = (stone: string[], x: number, half: number): string => {
  if (x < 14 - half + 2) return stone[4];
  if (x > 14 + half - 3) return stone[2];
  return stone[3];
};

export function irisTemple(element: string): PixelRun[] {
  const stone = doorPalette(element).stone;
  const g = createGrid(IRIS_SPRITE_W, IRIS_SPRITE_H);

  // Pediment: a triangle two pixels wider per row, bright on its left slope
  for (let y = 0; y < 5; y++) {
    const half = 3 + y * 3;
    for (let x = 14 - half; x < 14 + half; x++) paint(g, x, y, slopeTone(stone, x, half));
  }
  // Entablature
  fillRect(g, 1, 5, 26, 2, stone[3]);
  fillRect(g, 1, 5, 26, 1, stone[4]);
  fillRect(g, 1, 7, 26, 1, stone[1]);
  // Doorway behind the columns
  fillRect(g, 9, 8, 10, 10, stone[0]);
  // Four columns: a lit left edge, a shaded right edge
  for (const cx of [2, 7, 18, 23]) {
    fillRect(g, cx, 8, 3, 10, stone[3]);
    fillRect(g, cx, 8, 1, 10, stone[4]);
    fillRect(g, cx + 2, 8, 1, 10, stone[2]);
  }
  // Steps
  fillRect(g, 0, 18, 28, 1, stone[4]);
  fillRect(g, 0, 19, 28, 1, stone[2]);
  fillRect(g, 1, 20, 26, 1, stone[3]);
  fillRect(g, 1, 21, 26, 1, stone[1]);

  outlineGrid(g, INK);
  return gridRuns(g);
}
