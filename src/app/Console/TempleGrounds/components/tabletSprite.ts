/**
 * The small sprites of the temple's choice reveal (TempleChoiceReveal), painted in the way of the chest and the doors
 * (see pixelGrid): the riddle's stone tablet, graven with glowing glyphs, and the shopkeeper's stacks of coins. Both
 * use the five-tone ramps of the door and chest sprites, lit from the top left, with a dark outline, and come out as
 * runs of one colour that an SVG draws as rects with crisp edges.
 */

import { cornerInset, createGrid, gridRuns, outlineGrid, paint, type Grid, type PixelRun } from './pixelGrid';

export const TABLET_W = 48;
export const TABLET_H = 40;
export const COINS_W = 48;
export const COINS_H = 40;

const INK = '#140a0e';
// The wind temple's stone, darkest to brightest (the doors use the same ramp)
const STONE = ['#2a1e2a', '#3a2c3a', '#5c4a5c', '#7a6678', '#9a8696'];
// Gold, darkest to brightest (the chest's ramp)
const GOLD = ['#5c3606', '#93600e', '#c78f1c', '#eebd34', '#fff2a6'];

// ---------------------------------------------------------------------------------------------------------------
// The tablet: a slab with a rounded top on a wider plinth, a recessed face and three lines of glyphs
// ---------------------------------------------------------------------------------------------------------------

const SLAB = { left: 6, right: 41, bottom: 33, radius: 9 } as const;
const PLINTH = { left: 2, right: 45, top: 34, bottom: 39 } as const;
const FACE = { left: 10, right: 37, top: 8, bottom: 29 } as const;

/** Glyphs three pixels wide and five tall, one string per row */
const GLYPHS = [
  ['###', '#.#', '###', '.#.', '.#.'],
  ['#.#', '#.#', '###', '#.#', '#.#'],
  ['.#.', '###', '.#.', '.#.', '###'],
  ['###', '..#', '.#.', '#..', '###'],
  ['#..', '###', '#.#', '###', '..#'],
  ['.#.', '#.#', '###', '#.#', '#.#'],
];
/** Which glyph stands where, line by line: the same each time, so the tablet always reads the same */
const LINES = [
  [0, 3, 1, 4, 2],
  [5, 2, 0, 1, 3],
  [4, 1, 5, 3, 0],
];
const GLYPH_PITCH = 5;
const LINE_PITCH = 7;

/** The bevel of a slab: lit along the top and left, falling into shadow along the bottom and right. */
const bevelTone = (x: number, y: number, left: number, right: number, top: number, bottom: number): number => {
  const isLitEdge = y <= top + 1 || x <= left + 1;
  if (isLitEdge) return 4;
  const isShadowedEdge = y >= bottom - 1 || x >= right - 1;
  if (isShadowedEdge) return 1;
  const isNearLitEdge = y <= top + 3 || x <= left + 3;
  if (isNearLitEdge) return 3;
  return 2;
};

const paintSlab = (g: Grid) => {
  for (let y = 0; y <= SLAB.bottom; y++) {
    const inset = cornerInset(y, SLAB.radius);
    for (let x = SLAB.left + inset; x <= SLAB.right - inset; x++) {
      let tone = bevelTone(x, y, SLAB.left + inset, SLAB.right - inset, 0, SLAB.bottom);
      // Grain: a few darker flecks in the stone
      const isGrainFleck = tone === 2 && (x * 7 + y * 13) % 11 === 0;
      if (isGrainFleck) tone = 1;
      paint(g, x, y, STONE[tone]);
    }
  }
};

/** The face is cut back into the slab: shadowed on its top and left, lit on its bottom and right. */
const paintFace = (g: Grid) => {
  for (let y = FACE.top; y <= FACE.bottom; y++) {
    for (let x = FACE.left; x <= FACE.right; x++) {
      let tone = 2;
      if (y === FACE.top || x === FACE.left) tone = 0;
      else if (y === FACE.top + 1 || x === FACE.left + 1) tone = 1;
      else if (y === FACE.bottom || x === FACE.right) tone = 3;
      else if ((x * 5 + y * 3) % 17 === 0) tone = 1;
      paint(g, x, y, STONE[tone]);
    }
  }
};

const paintGlyph = (g: Grid, glyph: string[], x0: number, y0: number) => {
  // The groove first, a pixel down and to the right of the lit stroke
  glyph.forEach((row, dy) =>
    [...row].forEach((cell, dx) => {
      if (cell === '#') paint(g, x0 + dx + 1, y0 + dy + 1, STONE[0]);
    }),
  );
  glyph.forEach((row, dy) =>
    [...row].forEach((cell, dx) => {
      if (cell === '#') paint(g, x0 + dx, y0 + dy, GOLD[glyphTone(dy, glyph.length)]);
    }),
  );
};

/** Gold tone for a glyph row: lit on the first row, shadowed on the last */
const glyphTone = (dy: number, rows: number): number => {
  if (dy === 0) return 4;
  return dy === rows - 1 ? 2 : 3;
};

/** Gold tone on a coin's rim: lit on the left, then falling from the top rows into shadow */
const rimTone = (dx: number, dy: number): number => {
  const isLitLeftRim = dx < -COIN_RX + 3 && dy <= 0;
  if (isLitLeftRim) return 3;
  if (dy <= 0) return 2;
  return dy === 1 ? 1 : 0;
};

const paintGlyphs = (g: Grid) => {
  const width = GLYPH_PITCH * 5 - 2;
  const x0 = FACE.left + Math.round((FACE.right - FACE.left + 1 - width) / 2);
  LINES.forEach((line, row) =>
    line.forEach((glyph, col) => paintGlyph(g, GLYPHS[glyph], x0 + col * GLYPH_PITCH, FACE.top + 3 + row * LINE_PITCH)),
  );
};

/** A crack running down from the shoulder of the slab, to show its age. */
const paintCrack = (g: Grid) => {
  const path: Array<[number, number]> = [[34, 3], [34, 4], [33, 5], [33, 6], [34, 7]];
  path.forEach(([x, y]) => paint(g, x, y, STONE[0]));
};

const paintPlinth = (g: Grid) => {
  for (let y = PLINTH.top; y <= PLINTH.bottom; y++) {
    for (let x = PLINTH.left; x <= PLINTH.right; x++) {
      let tone = bevelTone(x, y, PLINTH.left, PLINTH.right, PLINTH.top, PLINTH.bottom);
      // Straight in front of the viewer, the plinth is mostly one flat face: keep the shadow on the lower rows
      const isFlatFace = y >= PLINTH.top + 2 && y < PLINTH.bottom - 1 && x > PLINTH.left + 1 && x < PLINTH.right - 1;
      if (isFlatFace) tone = 2;
      paint(g, x, y, STONE[tone]);
    }
  }
};

/** The tablet on its plinth. */
export const tabletRuns = (): PixelRun[] => {
  const g = createGrid(TABLET_W, TABLET_H);
  paintSlab(g);
  paintFace(g);
  paintCrack(g);
  paintGlyphs(g);
  paintPlinth(g);
  outlineGrid(g, INK);
  // The plinth's top edge hides the foot of the slab: a line of shadow where they meet
  for (let x = SLAB.left + 1; x <= SLAB.right - 1; x++) paint(g, x, SLAB.bottom, STONE[0]);
  return gridRuns(g);
};

// ---------------------------------------------------------------------------------------------------------------
// The coins: three stacks of different heights and one lying flat, seen from slightly above
// ---------------------------------------------------------------------------------------------------------------

const COIN_RX = 8;
const COIN_RY = 3;
/** How far one coin rises above the one under it, and how deep its rim is */
const COIN_STEP = 3;

/** Half the width of a coin's ellipse on the row `dy` from its centre. */
const halfWidth = (dy: number, rx: number, ry: number): number =>
  Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))));

const paintEllipse = (g: Grid, cx: number, cy: number, rx: number, ry: number, fill: (dx: number, dy: number) => string) => {
  for (let dy = -ry; dy <= ry; dy++) {
    const half = halfWidth(dy, rx, ry);
    for (let dx = -half; dx <= half; dx++) paint(g, cx + dx, cy + dy, fill(dx, dy));
  }
};

/** One coin with its top face at row `cy`: a band of rim under a lit face. */
const paintCoin = (g: Grid, cx: number, cy: number) => {
  // The rim: the same ellipse two rows lower, in three tones from lit to shadowed, brightest on the left
  paintEllipse(g, cx, cy + 2, COIN_RX, COIN_RY, (dx, dy) =>
    GOLD[rimTone(dx, dy)],
  );
  // The face: a bright edge along the top left and a pale mark in the middle
  paintEllipse(g, cx, cy, COIN_RX, COIN_RY, (dx, dy) => {
    const isLitTopLeftEdge = dy === -COIN_RY || (dx < -COIN_RX + 3 && dy < 0);
    if (isLitTopLeftEdge) return GOLD[4];
    const isShadowedBottomRightEdge = dy === COIN_RY || dx > COIN_RX - 3;
    if (isShadowedBottomRightEdge) return GOLD[2];
    return GOLD[3];
  });
  // The stamp on the face
  paint(g, cx - 1, cy, GOLD[2]);
  paint(g, cx, cy, GOLD[2]);
  paint(g, cx + 1, cy - 1, GOLD[4]);
};

/** A stack of `count` coins standing on row `floorY`, its centre at column `cx`. */
const paintStack = (g: Grid, cx: number, floorY: number, count: number) => {
  for (let i = 0; i < count; i++) paintCoin(g, cx, floorY - COIN_RY - 2 - i * COIN_STEP);
};

/** A pile of coins on a floor. */
export const coinStackRuns = (): PixelRun[] => {
  const g = createGrid(COINS_W, COINS_H);
  // Back to front, so the nearer stacks cover the ones behind
  paintStack(g, 33, 30, 6);
  paintStack(g, 14, 31, 4);
  paintStack(g, 24, 38, 3);
  // One coin lying on the floor, leaning on the front stack
  paintCoin(g, 38, 36);
  outlineGrid(g, INK);
  return gridRuns(g);
};
