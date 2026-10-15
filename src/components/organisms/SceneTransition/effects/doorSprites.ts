/**
 * The pixel doors of the building transitions, one set of pieces per door type (buildingDoors.ts), painted in the
 * house style of screenDoorSprite.ts: five-tone ramps lit from the top left, a one-pixel ink outline, the trim in
 * the building's colour. Each piece is a grid the effect stretches over its part of the screen; the CSS in
 * DoorsEffect.vue moves the pieces (swing, slide, lift, roll, draw back).
 */
import { createGrid, gridRuns, outlineGrid, paint, type Grid, type PixelRun } from "@/app/Console/TempleGrounds/components/pixelGrid";
import type { DoorType } from "@/lib/services/transitions/buildingDoors";
import { INK, IRON, WOOD, screenLeafLeft, screenLeafRight, tone, trimFor } from "./screenDoorSprite";

export interface DoorPiece {
  /** CSS hook: the piece is drawn in `.door-piece.piece-<name>`. */
  name: string;
  w: number;
  h: number;
  runs: PixelRun[];
  /** stretch fills the piece's box (leaves); meet keeps the pixels square (the vault disc, the bell). */
  fit: "stretch" | "meet";
}

const STONE = ["#24222c", "#44424e", "#66646f", "#8c8a96", "#b6b4c0"];
const GLASS = ["#3a6c88", "#6aa6c4", "#9cd2e6", "#c8eef8", "#f2fcff"];
const CLOTH = ["#5a3c1c", "#8a6436", "#b8915a", "#d8b880", "#f2dcaa"];
const BRASS = ["#5c3606", "#93600e", "#cd9646", "#eebd5a", "#fad78c"];
const CROSS = ["#6a1218", "#a8262e", "#d83a42"];
const WARM = ["#8a4a1c", "#d08a3a", "#f0b050", "#ffd890", "#fff1b0"];

const mirror = (g: Grid): Grid => g.map((row) => [...row].reverse());

const piece = (name: string, g: Grid, fit: DoorPiece["fit"] = "stretch"): DoorPiece => ({
  name,
  w: g[0].length,
  h: g.length,
  runs: gridRuns(g),
  fit,
});

/** One of three tones: the first where `first` holds, else the second where `second` does, else the third. */
const tone3 = (first: boolean, second: boolean, [a, b, c]: readonly [number, number, number]): number => {
  if (first) return a;
  return second ? b : c;
};

/** A frame `width` pixels deep: bright on the top and left, shaded on the bottom and right. */
const frameTone = (x: number, y: number, w: number, h: number, width: number): number | null => {
  const depth = Math.min(x, y, w - 1 - x, h - 1 - y);
  if (depth >= width) return null;
  const isLit = y < width || x < width;
  return isLit ? 4 - Math.min(depth, 1) : 1 + Math.min(depth, 1);
};

/** A bevelled panel: lit on its top and left edge, shaded on its bottom and right. */
const panel = (g: Grid, x0: number, y0: number, w: number, h: number, ramp: string[]): void => {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const isLitEdge = y === y0 || x === x0;
      const isShadedEdge = y === y0 + h - 1 || x === x0 + w - 1;
      paint(g, x, y, tone(ramp, tone3(isLitEdge, isShadedEdge, [4, 0, 2])));
    }
  }
};

// The shop: one tall door with a four-pane window full of lamplight, two raised panels, a brass knob and kick plate

const SHOP_W = 64;
const SHOP_H = 128;

const paintShopDoor = (trim: string[]): Grid => {
  const g = createGrid(SHOP_W, SHOP_H);
  for (let y = 0; y < SHOP_H; y++) {
    for (let x = 0; x < SHOP_W; x++) {
      const trimShade = frameTone(x, y, SHOP_W, SHOP_H, 4);
      if (trimShade !== null) {
        paint(g, x, y, tone(trim, trimShade));
        continue;
      }
      // Grain: a darker streak every few columns
      const isGrain = (x * 7 + Math.floor(y / 9)) % 11 === 0;
      paint(g, x, y, tone(WOOD, isGrain ? 1 : 2));
    }
  }
  // The window: four panes of warm light behind wooden muntins, a glint across the top left pane
  for (let y = 12; y < 56; y++) {
    for (let x = 10; x < 54; x++) {
      const isMuntin = x === 10 || x === 53 || y === 12 || y === 55 || Math.abs(x - 31.5) < 1.5 || Math.abs(y - 33.5) < 1.5;
      if (isMuntin) {
        paint(g, x, y, tone(WOOD, y === 12 || x === 10 ? 4 : 0));
        continue;
      }
      const isGlint = (x - 12) + (y - 14) >= 6 && (x - 12) + (y - 14) <= 8 && x < 30 && y < 32;
      paint(g, x, y, isGlint ? WARM[4] : tone(WARM, 3 - Math.floor((y - 12) / 15)));
    }
  }
  panel(g, 10, 64, 20, 48, WOOD);
  panel(g, 34, 64, 20, 48, WOOD);
  // Kick plate and knob
  for (let x = 6; x < SHOP_W - 6; x++) {
    paint(g, x, 116, tone(BRASS, 4));
    paint(g, x, 117, tone(BRASS, 2));
    paint(g, x, 118, tone(BRASS, 1));
  }
  [[56, 74, 4], [57, 74, 3], [56, 75, 2], [57, 75, 1], [55, 74, 3], [55, 75, 1]].forEach(([x, y, t]) => paint(g, x, y, tone(BRASS, t)));
  outlineGrid(g, INK);
  return g;
};

const BELL_W = 14;
const BELL_H = 16;

/** The shop bell on its bracket: a curl of iron and a brass bell with a clapper. */
const paintBell = (): Grid => {
  const g = createGrid(BELL_W, BELL_H);
  for (let x = 0; x < BELL_W; x++) paint(g, x, 0, tone(IRON, 3));
  paint(g, 6, 1, tone(IRON, 2));
  paint(g, 7, 1, tone(IRON, 2));
  paint(g, 6, 2, tone(IRON, 1));
  paint(g, 7, 2, tone(IRON, 1));
  // Bell flare: narrow on top, wide at the lip
  for (let y = 3; y < 13; y++) {
    const half = Math.round(1.5 + (y - 3) * 0.45);
    for (let x = 7 - half; x < 7 + half; x++) {
      const t = tone3(x < 7 - half + 2, x >= 7 + half - 2, [4, 1, 3]);
      paint(g, x, y, tone(BRASS, y === 12 ? 0 : t));
    }
  }
  paint(g, 6, 13, tone(IRON, 1));
  paint(g, 7, 13, tone(IRON, 1));
  paint(g, 6, 14, tone(IRON, 0));
  paint(g, 7, 14, tone(IRON, 0));
  outlineGrid(g, INK);
  return g;
};

// The hospital: two glass doors in steel frames, glare streaks, a red cross split down the seam

const LEAF_W = 48;
const LEAF_H = 96;

const paintGlassLeaf = (): Grid => {
  const g = createGrid(LEAF_W, LEAF_H);
  for (let y = 0; y < LEAF_H; y++) {
    for (let x = 0; x < LEAF_W; x++) {
      const steel = frameTone(x, y, LEAF_W, LEAF_H, 3);
      if (steel !== null) {
        paint(g, x, y, tone(IRON, steel));
        continue;
      }
      const isPushBar = y >= 50 && y <= 52 && x >= 8 && x < LEAF_W - 4;
      if (isPushBar) {
        paint(g, x, y, tone(IRON, tone3(y === 50, y === 51, [4, 3, 1])));
        continue;
      }
      // Two diagonal glare streaks across the glass, the rest lighter at the top
      const d = x + y;
      const isGlare = (d >= 30 && d <= 33) || (d >= 38 && d <= 39) || (d >= 92 && d <= 94);
      paint(g, x, y, isGlare ? GLASS[4] : tone(GLASS, 3 - Math.floor(y / 32)));
    }
  }
  // Half of the red cross on a white field, against the seam (the right edge of the left leaf)
  for (let y = 18; y < 42; y++) {
    for (let x = LEAF_W - 14; x < LEAF_W - 2; x++) {
      const isBorder = y === 18 || y === 41 || x === LEAF_W - 14;
      const dx = LEAF_W - 2 - x;
      const isArm = (dx <= 4 && y >= 21 && y <= 38) || (y >= 26 && y <= 33 && dx <= 10);
      const arm = CROSS[y < 30 ? 2 : 1];
      const field = isArm ? arm : "#f8f8fc";
      paint(g, x, y, isBorder ? "#c8c8d0" : field);
    }
  }
  outlineGrid(g, INK);
  return g;
};

// The town hall: dressed stone slabs with a carved trim border and a heavy iron ring

const paintStoneLeaf = (trim: string[]): Grid => {
  const g = createGrid(LEAF_W, LEAF_H);
  for (let y = 0; y < LEAF_H; y++) {
    for (let x = 0; x < LEAF_W; x++) {
      const border = frameTone(x, y, LEAF_W, LEAF_H, 3);
      if (border !== null) {
        paint(g, x, y, tone(STONE, border));
        continue;
      }
      // A carved band of trim colour just inside the border, on the hinge side and the top and bottom
      const isCarving = (x === 5 || y === 5 || y === LEAF_H - 6) && x >= 5 && x < LEAF_W - 3;
      if (isCarving) {
        paint(g, x, y, tone(trim, (x + y) % 4 === 0 ? 4 : 2));
        continue;
      }
      // Blocks twelve wide and eight tall, every other course offset by six; mortar between them
      const course = Math.floor(y / 8);
      const bx = (x + (course % 2) * 6) % 12;
      const by = y % 8;
      const isMortar = bx === 11 || by === 7;
      if (isMortar) {
        paint(g, x, y, STONE[0]);
        continue;
      }
      const isChip = ((x * 13 + y * 7) % 37) === 0;
      paint(g, x, y, tone(STONE, tone3(isChip, by === 0 || bx === 0, [1, 3, 2])));
    }
  }
  // The ring: a heavy hoop of iron near the seam
  const [rx, ry] = [LEAF_W - 10, 52];
  for (let a = 0; a < 24; a++) {
    const angle = (a / 24) * Math.PI * 2;
    const x = Math.round(rx + Math.cos(angle) * 4);
    const y = Math.round(ry + Math.sin(angle) * 4);
    paint(g, x, y, tone(IRON, y < ry ? 4 : 1));
  }
  paint(g, rx, ry - 6, tone(IRON, 3));
  paint(g, rx, ry - 5, tone(IRON, 2));
  outlineGrid(g, INK);
  return g;
};

// The bank: a round vault door, riveted, and the wheel that spins before it rolls aside

const VAULT = 96;
const WHEEL = 48;

const paintVaultDisc = (trim: string[]): Grid => {
  const g = createGrid(VAULT, VAULT);
  const c = (VAULT - 1) / 2;
  for (let y = 0; y < VAULT; y++) {
    for (let x = 0; x < VAULT; x++) {
      const dx = x - c;
      const dy = y - c;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > 47) continue;
      const lit = dx + dy < 0;
      if (r > 42) {
        paint(g, x, y, tone(IRON, lit ? 4 : 1));
        continue;
      }
      if (r > 39) {
        paint(g, x, y, tone(trim, lit ? 3 : 1));
        continue;
      }
      paint(g, x, y, tone(IRON, r > 30 && lit ? 3 : 2));
    }
  }
  // Rivets around the trim ring, and a seam between the outer plate and the face
  for (let a = 0; a < 16; a++) {
    const angle = (a / 16) * Math.PI * 2;
    const x = Math.round(c + Math.cos(angle) * 35);
    const y = Math.round(c + Math.sin(angle) * 35);
    paint(g, x, y, tone(IRON, 4));
    paint(g, x + 1, y + 1, tone(IRON, 0));
  }
  outlineGrid(g, INK);
  return g;
};

const paintVaultWheel = (): Grid => {
  const g = createGrid(WHEEL, WHEEL);
  const c = (WHEEL - 1) / 2;
  for (let y = 0; y < WHEEL; y++) {
    for (let x = 0; x < WHEEL; x++) {
      const dx = x - c;
      const dy = y - c;
      const r = Math.sqrt(dx * dx + dy * dy);
      const lit = dx + dy < 0;
      const isRim = r >= 19 && r <= 23;
      const isHub = r <= 5;
      // Three spokes, six arms: within a pixel and a half of a line through the centre every 60 degrees
      const angle = Math.atan2(dy, dx);
      const toSpoke = Math.abs(Math.sin(3 * angle)) * r;
      const isSpoke = r < 21 && toSpoke < 1.6;
      if (isRim || isHub || isSpoke) paint(g, x, y, tone(BRASS, tone3(isHub, lit, [3, 4, 1])));
    }
  }
  outlineGrid(g, INK);
  return g;
};

// The citadel: an iron portcullis, bars and cross-bars riveted where they meet, spikes along the bottom

const GATE_W = 64;
const GATE_H = 128;

const paintPortcullis = (): Grid => {
  const g = createGrid(GATE_W, GATE_H);
  for (let y = 0; y < GATE_H; y++) {
    for (let x = 0; x < GATE_W; x++) {
      const bx = x % 10;
      const by = y % 18;
      const isBar = bx >= 3 && bx <= 6;
      const isCrossBar = by >= 6 && by <= 8 && y < GATE_H - 12;
      const isSpike = isBar && y >= GATE_H - 12 && y - (GATE_H - 12) < 12 - Math.abs(bx - 4.5) * 2.4;
      const isShaft = isBar && y < GATE_H - 12;
      if (isCrossBar) paint(g, x, y, tone(IRON, tone3(by === 6, by === 8, [4, 1, 2])));
      else if (isShaft) paint(g, x, y, tone(IRON, tone3(bx === 3, bx === 6, [4, 1, 2])));
      else if (isSpike) paint(g, x, y, tone(IRON, bx <= 4 ? 3 : 1));
    }
  }
  outlineGrid(g, INK);
  return g;
};

// The tent: canvas flaps striped in the trim colour, a stitched hem at the seam, a rope tie

const paintTentFlap = (trim: string[]): Grid => {
  const g = createGrid(LEAF_W, LEAF_H);
  for (let y = 0; y < LEAF_H; y++) {
    for (let x = 0; x < LEAF_W; x++) {
      const isStripe = Math.floor((x + 3) / 8) % 2 === 1;
      const ramp = isStripe ? trim : CLOTH;
      // Folds: the cloth darkens toward the seam and in soft vertical creases
      const crease = Math.sin(x * 0.55 + y * 0.04) > 0.6 ? 1 : 0;
      const t = 3 - crease - (x > LEAF_W - 6 ? 1 : 0);
      paint(g, x, y, tone(ramp, t));
    }
  }
  // Stitches down the seam edge
  for (let y = 2; y < LEAF_H - 2; y += 4) {
    paint(g, LEAF_W - 3, y, CLOTH[0]);
    paint(g, LEAF_W - 3, y + 1, CLOTH[0]);
  }
  // A rope tie at the waist of the flap
  for (let x = LEAF_W - 12; x < LEAF_W; x++) {
    paint(g, x, 46, tone(WOOD, 4));
    paint(g, x, 47, tone(WOOD, 2));
  }
  paint(g, LEAF_W - 12, 48, tone(WOOD, 3));
  paint(g, LEAF_W - 12, 49, tone(WOOD, 1));
  outlineGrid(g, INK);
  return g;
};

/** Every piece of the door of one type, in drawing order (back to front). */
export const doorPieces = (type: DoorType, title?: string): DoorPiece[] => {
  const trim = trimFor(title);
  switch (type) {
    case "shop":
      return [piece("shop-door", paintShopDoor(trim)), piece("bell", paintBell(), "meet")];
    case "sliding": {
      const leaf = paintGlassLeaf();
      return [piece("left", leaf), piece("right", mirror(leaf))];
    }
    case "stone": {
      const leaf = paintStoneLeaf(trim);
      return [piece("left", leaf), piece("right", mirror(leaf))];
    }
    case "vault":
      return [piece("disc", paintVaultDisc(trim), "meet"), piece("wheel", paintVaultWheel(), "meet")];
    case "gate":
      return [piece("portcullis", paintPortcullis())];
    case "tent": {
      const flap = paintTentFlap(trim);
      return [piece("left", flap), piece("right", mirror(flap))];
    }
    // The portal is all CSS: a swirl, no door
    case "portal":
      return [];
    case "plank":
    default:
      return [
        { name: "left", w: 48, h: 96, runs: screenLeafLeft(title), fit: "stretch" },
        { name: "right", w: 48, h: 96, runs: screenLeafRight(title), fit: "stretch" },
      ];
  }
};
