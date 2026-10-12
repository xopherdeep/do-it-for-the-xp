/**
 * The treasure chest, painted pixel by pixel on a 64 x 48 grid in the 16-bit way: five-tone wood and gold ramps lit
 * from the top left, a dark outline, rivets on the straps and a lock plate. Each part comes out as horizontal runs of
 * one colour (`ChestRun`, see pixelGrid), which the reveal draws as SVG rects with crisp edges, so the chest stays
 * sharp at any size.
 *
 * The parts share one frame: the body fills rows 20-47. The closed lid sits on it in rows 0-19; when the chest is
 * open, the lid's inside face leans back in rows 0-13 and the dark mouth of the chest shows in rows 14-19.
 */

import { cornerInset, createGrid, gridRuns, outlineGrid, paint, type Grid, type PixelRun } from './pixelGrid';

export const CHEST_W = 64;
export const CHEST_H = 48;
/** The row the body starts on, where the closed lid hinges */
export const BODY_TOP = 20;
/** The row the open lid's inside face ends on, where it hinges */
export const OPEN_LID_BOTTOM = 14;

export type ChestRun = PixelRun;

const INK = '#1c0a04';
// Wood, darkest to brightest
const WOOD = ['#3e1e0c', '#62341a', '#8a4e26', '#b06e36', '#d4965a'];
// Gold, darkest to brightest
const GOLD = ['#5c3606', '#93600e', '#c78f1c', '#eebd34', '#fff2a6'];
// The inside of the chest: the shadow under the lid and the floor of the box
const HOLLOW = ['#120604', '#24100a', '#3a1c0e'];

/** Column spans of the two metal straps, shared by the lid and the body so they line up. */
const STRAPS: Array<[number, number]> = [
  [11, 16],
  [47, 52],
];
const LEFT = 2;
const RIGHT = 61;

const grid = (rows: number): Grid => createGrid(CHEST_W, rows);
const set = paint;
const toRuns = gridRuns;
const outline = (g: Grid) => outlineGrid(g, INK);

const inStrap = (x: number): number => STRAPS.findIndex(([from, to]) => x >= from && x <= to);

/** A strap is lit on its left edge and falls into shadow on its right, like a rounded band of metal. */
const strapTone = (x: number, strap: number): string => {
  const [from, to] = STRAPS[strap];
  const t = (x - from) / (to - from);
  if (t === 0) return GOLD[4];
  if (t < 0.45) return GOLD[3];
  if (t < 0.8) return GOLD[2];
  return GOLD[1];
};

/** The wood darkens towards the sides, a little more on the right, away from the light. */
const sideShade = (x: number): number => {
  if (x <= LEFT + 1) return -1;
  if (x >= RIGHT - 2) return -2;
  if (x >= RIGHT - 6) return -1;
  return 0;
};

const wood = (tone: number): string => WOOD[Math.max(0, Math.min(WOOD.length - 1, tone))];

/** Two-pixel rivet: a bright head with its shadow below. */
/** Plank tone by row within the seven-row plank: bright top edge, dark seam at the bottom */
const plankTone = (plankRow: number): number => {
  if (plankRow === 0) return 3;
  if (plankRow === 6) return 0;
  return plankRow >= 4 ? 1 : 2;
};

/** Gold tone across the lock plate: bright along the top and the left edge, fading to the right */
const lockTone = (y: number, t: number): number => {
  if (y === 2 || t < 0.12) return 4;
  if (t < 0.5) return 3;
  return t < 0.85 ? 2 : 1;
};

/** Wood tone banded over the lid's curve: highlight at the crown, falling into shadow above the rim */
const lidTone = (y: number): number => {
  if (y <= 3) return 4;
  if (y <= 7) return 3;
  return y <= 12 ? 2 : 1;
};

/** Gold tone across the hasp: lit on its left column, then falling to the right */
const haspTone = (x: number): number => {
  if (x === 29) return 4;
  return x <= 31 ? 3 : 2;
};

/** Wood tone on the open lid's inside face: the light fades towards the hinge */
const insideTone = (y: number): number => {
  if (y <= 4) return 2;
  return y <= 9 ? 1 : 0;
};

const rivet = (g: Grid, x: number, y: number) => {
  set(g, x, y, GOLD[4]);
  set(g, x + 1, y, GOLD[3]);
  set(g, x, y + 1, GOLD[2]);
  set(g, x + 1, y + 1, GOLD[0]);
};

/** The box: three planks between gold rims, two straps with rivets, and the lock plate hanging from the top. */
export const chestBody = (): ChestRun[] => {
  const rows = CHEST_H - BODY_TOP;
  const g = grid(rows);
  for (let y = 0; y < rows; y++) {
    for (let x = LEFT; x <= RIGHT; x++) {
      const strap = inStrap(x);
      if (y <= 2) {
        // Top rim, lit from above
        set(g, x, y, GOLD[[4, 3, 2][y]]);
      } else if (y >= rows - 3) {
        // Bottom rim, in the shadow of the box
        set(g, x, y, GOLD[[2, 1, 0][y - (rows - 3)]]);
      } else if (strap >= 0) {
        set(g, x, y, strapTone(x, strap));
      } else {
        // Planks seven rows high: a bright top edge, the face, a dark seam at the bottom
        const plankRow = (y - 3) % 7;
        const tone = plankTone(plankRow);
        set(g, x, y, wood(tone + sideShade(x)));
      }
    }
  }
  // Grain: a few dark flecks on the planks, fixed so the chest is the same every time
  [[6, 6], [22, 9], [41, 5], [57, 12], [27, 16], [8, 19], [37, 20], [56, 18], [20, 13]].forEach(([x, y]) =>
    set(g, x, y, WOOD[0]),
  );
  // Rivets down the straps
  STRAPS.forEach(([from]) => [5, 12, 19].forEach((y) => rivet(g, from + 2, y)));
  // Lock plate: a gold shield hanging from the rim with a keyhole
  for (let y = 2; y <= 13; y++) {
    const inset = y >= 11 ? y - 10 : 0;
    for (let x = 26 + inset; x <= 37 - inset; x++) {
      const t = (x - 26) / 11;
      const tone = lockTone(y, t);
      set(g, x, y, GOLD[y >= 12 ? Math.min(tone, 2) : tone]);
    }
  }
  // Keyhole: a round top and a slot
  [[31, 5], [32, 5], [30, 6], [31, 6], [32, 6], [33, 6], [31, 7], [32, 7], [31, 8], [32, 8], [31, 9], [32, 9]].forEach(
    ([x, y]) => set(g, x, y, INK),
  );
  set(g, 33, 7, GOLD[4]);
  outline(g);
  // The plate's own edge, so it reads as a separate piece of metal
  for (let y = 2; y <= 13; y++) {
    const inset = y >= 11 ? y - 10 : 0;
    set(g, 25 + inset, y, INK);
    set(g, 38 - inset, y, INK);
  }
  for (let x = 26 + 3; x <= 37 - 3; x++) set(g, x, 14, INK);
  return toRuns(g, BODY_TOP);
};

/** The closed lid: a rounded top, lit across its crown, with the straps running over it and a rim at the bottom. */
export const chestLidClosed = (): ChestRun[] => {
  const rows = BODY_TOP;
  const g = grid(rows);
  for (let y = 0; y < rows; y++) {
    const inset = cornerInset(y, 9);
    for (let x = LEFT + inset; x <= RIGHT - inset; x++) {
      const strap = inStrap(x);
      if (y >= rows - 3) {
        set(g, x, y, GOLD[[3, 2, 1][y - (rows - 3)]]);
      } else if (strap >= 0) {
        // The strap bends over the crown, so it is brightest at the top too
        set(g, x, y, y <= 3 ? GOLD[4] : strapTone(x, strap));
      } else {
        // Banded light over the curve: highlight at the crown, falling into shadow above the rim
        const tone = lidTone(y);
        set(g, x, y, wood(tone + sideShade(x)));
      }
    }
  }
  // A glint on the crown
  for (let x = 20; x <= 27; x++) set(g, x, 2, '#f0c486');
  for (let x = 22; x <= 25; x++) set(g, x, 1, '#f8dcae');
  STRAPS.forEach(([from]) => [7, 12].forEach((y) => rivet(g, from + 2, y)));
  // The hasp that drops onto the lock
  for (let y = 13; y <= 19; y++) for (let x = 29; x <= 34; x++) set(g, x, y, GOLD[haspTone(x)]);
  outline(g);
  return toRuns(g, 0);
};

/** The open lid's inside face, leaning back: dark wood inside a gold rim, darker towards the hinge. */
export const chestLidOpen = (): ChestRun[] => {
  const rows = OPEN_LID_BOTTOM;
  const g = grid(rows);
  for (let y = 0; y < rows; y++) {
    const inset = cornerInset(y, 7);
    for (let x = LEFT + inset; x <= RIGHT - inset; x++) {
      const nearEdge = y <= 1 || x - (LEFT + inset) <= 1 || RIGHT - inset - x <= 1;
      if (nearEdge) {
        set(g, x, y, y <= 1 ? GOLD[3] : GOLD[2]);
      } else if (inStrap(x) >= 0) {
        set(g, x, y, GOLD[1]);
      } else {
        // Vertical boards, every eighth column a seam; the light fades towards the hinge
        const tone = insideTone(y);
        const lean = sideShade(x) < 0 ? -1 : 0;
        set(g, x, y, (x - LEFT) % 8 === 0 ? WOOD[0] : wood(tone + lean));
      }
    }
  }
  outline(g);
  return toRuns(g, 0);
};

/** The mouth of the open chest: the far rim, then the hollow, darkest under the lid. */
export const chestMouth = (): ChestRun[] => {
  const rows = BODY_TOP - OPEN_LID_BOTTOM;
  const g = grid(rows);
  for (let y = 0; y < rows; y++) {
    for (let x = LEFT; x <= RIGHT; x++) {
      if (y === 0) set(g, x, y, GOLD[1]);
      else set(g, x, y, HOLLOW[Math.min(HOLLOW.length - 1, Math.floor((y - 1) / 2))]);
    }
  }
  for (let y = 0; y < rows; y++) {
    set(g, LEFT, y, INK);
    set(g, RIGHT, y, INK);
  }
  return toRuns(g, OPEN_LID_BOTTOM);
};
