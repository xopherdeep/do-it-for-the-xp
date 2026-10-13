/**
 * The pictures that rise in the light above an in-world prompt: the dungeon's own sprites (the chest and the coin
 * stacks of the temple reveals), reused as they are painted. The temple files are only read, never changed.
 */
import {
  BODY_TOP,
  CHEST_H,
  CHEST_W,
  OPEN_LID_BOTTOM,
  chestBody,
  chestLidClosed,
  chestLidOpen,
  chestMouth,
} from '@/app/Console/TempleGrounds/components/chestSprite';
import { createGrid, gridRuns, outlineGrid, paint, type Grid, type PixelRun } from '@/app/Console/TempleGrounds/components/pixelGrid';
import { COINS_H, COINS_W, TABLET_H, TABLET_W, coinStackRuns, tabletRuns } from '@/app/Console/TempleGrounds/components/tabletSprite';
import type { RevealSpriteName } from './revealPrompt';

/** A sprite as runs of one colour on a grid of `width` x `height` pixels. */
export interface RevealSprite {
  runs: PixelRun[];
  width: number;
  height: number;
}

const INK = '#1c0a04';
// Heart reds, darkest to brightest
const HEART = ['#5a0a1e', '#8c1230', '#c01c3c', '#e8486a', '#ff93a6'];
// The bed: wood, linen and a hearth-orange blanket (the hotel's colour), darkest to brightest
const BED_WOOD = ['#3e1e0c', '#62341a', '#8a4e26', '#b06e36', '#d4965a'];
const LINEN = ['#9a96b8', '#c4c0dc', '#e6e3f4', '#ffffff'];
const BLANKET = ['#7a2a10', '#a8431a', '#e2783c', '#f09a5c', '#ffc796'];

export const HEART_W = 40;
export const HEART_H = 36;
export const BED_W = 48;
export const BED_H = 34;

/** A filled rectangle, corners included. */
const rect = (g: Grid, x0: number, y0: number, x1: number, y1: number, fill: string) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) paint(g, x, y, fill);
};

/** The Hospital's heart: the classic curve, lit from the top left with a glint, in a dark outline. */
const heartRuns = (): PixelRun[] => {
  const g = createGrid(HEART_W, HEART_H);
  for (let py = 0; py < HEART_H; py++) {
    for (let px = 0; px < HEART_W; px++) {
      const x = ((px + 0.5) / HEART_W) * 2.4 - 1.2;
      const y = 1.3 - ((py + 0.5) / HEART_H) * 2.4;
      const inside = (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;
      if (!inside) continue;
      // The farther from the glint at the top left, the darker the red
      const d = Math.hypot(x + 0.55, y - 0.6);
      const tone = d < 0.32 ? 4 : d < 0.75 ? 3 : d < 1.3 ? 2 : d < 1.75 ? 1 : 0;
      paint(g, px, py, HEART[tone]);
    }
  }
  outlineGrid(g, INK);
  // A small bright glint on the left lobe
  [[8, 8], [9, 8], [8, 9], [10, 7]].forEach(([x, y]) => paint(g, x, y, '#ffffff'));
  return gridRuns(g);
};

/** The Hotel's bed: a wooden frame with a head and foot board, a pillow and an orange blanket turned down. */
const bedRuns = (): PixelRun[] => {
  const g = createGrid(BED_W, BED_H);
  // Legs
  rect(g, 4, 28, 7, 32, BED_WOOD[1]);
  rect(g, 40, 28, 43, 32, BED_WOOD[1]);
  // The frame the mattress sits in, lit on top
  rect(g, 3, 22, 44, 28, BED_WOOD[2]);
  rect(g, 3, 22, 44, 23, BED_WOOD[3]);
  rect(g, 3, 27, 44, 28, BED_WOOD[1]);
  // The headboard (tall, left) and the footboard (short, right), each with a lit edge
  rect(g, 1, 3, 8, 28, BED_WOOD[2]);
  rect(g, 1, 3, 2, 28, BED_WOOD[3]);
  rect(g, 7, 3, 8, 28, BED_WOOD[1]);
  rect(g, 40, 14, 46, 28, BED_WOOD[2]);
  rect(g, 40, 14, 41, 28, BED_WOOD[3]);
  rect(g, 45, 14, 46, 28, BED_WOOD[1]);
  // The mattress and its linen
  rect(g, 9, 16, 39, 22, LINEN[2]);
  rect(g, 9, 16, 39, 17, LINEN[3]);
  rect(g, 9, 21, 39, 22, LINEN[1]);
  // The pillow
  rect(g, 10, 10, 20, 17, LINEN[2]);
  rect(g, 10, 10, 20, 11, LINEN[3]);
  rect(g, 10, 16, 20, 17, LINEN[0]);
  // The blanket, turned down at the pillow, with a band of lighter stitching
  rect(g, 19, 13, 39, 22, BLANKET[2]);
  rect(g, 19, 13, 39, 14, BLANKET[3]);
  rect(g, 19, 21, 39, 22, BLANKET[1]);
  rect(g, 19, 13, 22, 22, BLANKET[4]);
  rect(g, 23, 13, 23, 22, BLANKET[1]);
  rect(g, 28, 17, 38, 17, BLANKET[4]);
  rect(g, 28, 19, 38, 19, BLANKET[1]);
  outlineGrid(g, INK);
  return gridRuns(g);
};

// Light welling up in the hollow of an open chest, dim at the top and bright at the bottom
const HOLLOW_LIGHT = ['#7a4c14', '#a8731c', '#d6a232', '#f3cf5c', '#fff2a6'];

/** The open chest with its hollow full of light, as if what is inside is the prize. */
const openChestRuns = (): PixelRun[] => {
  const light: PixelRun[] = [];
  for (let y = OPEN_LID_BOTTOM + 1; y < BODY_TOP; y++) {
    const tone = HOLLOW_LIGHT[Math.min(HOLLOW_LIGHT.length - 1, y - OPEN_LID_BOTTOM - 1)];
    light.push({ x: 3, y, w: CHEST_W - 6, fill: tone });
  }
  return [...chestLidOpen(), ...chestMouth(), ...light, ...chestBody()];
};

const SPRITE_BUILDERS: Record<RevealSpriteName, () => RevealSprite> = {
  chest: () => ({ runs: [...chestBody(), ...chestLidClosed()], width: CHEST_W, height: CHEST_H }),
  chestOpen: () => ({ runs: openChestRuns(), width: CHEST_W, height: CHEST_H }),
  coins: () => ({ runs: coinStackRuns(), width: COINS_W, height: COINS_H }),
  tablet: () => ({ runs: tabletRuns(), width: TABLET_W, height: TABLET_H }),
  heart: () => ({ runs: heartRuns(), width: HEART_W, height: HEART_H }),
  bed: () => ({ runs: bedRuns(), width: BED_W, height: BED_H })
};

/** The sprite for a name; built each time it is asked for, so a prompt can be drawn once and forgotten. */
export const spriteFor = (name: RevealSpriteName): RevealSprite => SPRITE_BUILDERS[name]();
