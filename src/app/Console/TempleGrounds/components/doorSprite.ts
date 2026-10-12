/**
 * The temple door, painted on a 64 x 72 grid like the chest: an archway of stone blocks lit from the top left, two
 * plank leaves bound in iron, and the lock across them. A small-key door hangs a padlock on the seam; the Boss Door
 * is crossed with chains under a great lock with a gem. The stone and the metal take the temple's colours, the same
 * stone and metal its walls are drawn in (TempleWalls), as five-tone ramps.
 *
 * Every part comes out as runs in one frame, so the reveal can move them on their own: the leaves swing on their
 * hinges, the shackle springs and the lock and the chains drop.
 */
import { cornerInset, createGrid, gridRuns, outlineGrid, paint, type Grid, type PixelRun } from './pixelGrid';

export const DOOR_W = 64;
export const DOOR_H = 72;

/** The doorway the leaves fill: an arch over two straight jambs */
export const OPENING = { left: 12, right: 51, top: 14, archCenterY: 34, radius: 20 } as const;
/** Where the two leaves meet, and where the lock hangs */
export const SEAM_X = 32;
export const LOCK_Y = 44;

const INK = '#140a0e';
const WOOD = ['#2e1608', '#4c2812', '#6e3e1e', '#8e5a2e', '#b07a46'];

interface DoorPalette {
  stone: string[];
  metal: string[];
}

/** Darkest to brightest, built on the stone and metal of each temple's walls */
const PALETTES: Record<string, DoorPalette> = {
  wind: {
    stone: ['#2a1e2a', '#3a2c3a', '#5c4a5c', '#7a6678', '#9a8696'],
    metal: ['#5c3606', '#93600e', '#cd9646', '#eebd5a', '#fad78c'],
  },
  fire: {
    stone: ['#160c0c', '#241616', '#3c2828', '#563a38', '#74504c'],
    metal: ['#4a200a', '#7c3a14', '#be6e32', '#e8964a', '#ffbe6e'],
  },
  ice: {
    stone: ['#24304a', '#3a4a62', '#5a6e8c', '#7e94b0', '#a8bcd4'],
    metal: ['#3c5272', '#6a88aa', '#a0bedc', '#c8dcf0', '#ebf5ff'],
  },
  water: {
    stone: ['#101a20', '#1e2c34', '#324650', '#4a6470', '#688896'],
    metal: ['#3c2e12', '#64502a', '#967d46', '#c4a464', '#e6c882'],
  },
  earth: {
    stone: ['#18120c', '#2c2419', '#463a2c', '#62523e', '#827056'],
    metal: ['#3a2410', '#5e4024', '#8c643c', '#b48a54', '#d2aa6e'],
  },
  light: {
    stone: ['#2e2618', '#4c3f2c', '#786446', '#9c8662', '#c2ac86'],
    metal: ['#6a4c10', '#a07a24', '#dcb450', '#f2d272', '#ffeb96'],
  },
  shadow: {
    stone: ['#0a0612', '#161020', '#282038', '#3c3252', '#584c72'],
    metal: ['#3a3450', '#625a7a', '#968caa', '#bcb2d0', '#dcd2f0'],
  },
};
PALETTES.storm = PALETTES.wind;
PALETTES.moon = PALETTES.shadow;

export const doorPalette = (element: string): DoorPalette => PALETTES[element] ?? PALETTES.wind;

const tone = (ramp: string[], index: number): string => ramp[Math.max(0, Math.min(ramp.length - 1, index))];

/** Inside the doorway: below the arch's spring line it is the straight jambs, above it the circle. */
export const inOpening = (x: number, y: number): boolean => {
  const { left, right, top, archCenterY, radius } = OPENING;
  const isOutsideDoorway = x < left || x > right || y < top;
  if (isOutsideDoorway) return false;
  if (y >= archCenterY) return true;
  const cx = (left + right) / 2;
  return (x - cx) ** 2 + (y - archCenterY) ** 2 <= radius ** 2 + radius;
};

/** How far a cell is from the doorway's edge, in whole cells (0 inside it) */
const distanceToOpening = (x: number, y: number): number => {
  for (let d = 1; d <= 4; d++) {
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        const isOpeningAtThisRing = Math.max(Math.abs(dx), Math.abs(dy)) === d && inOpening(x + dx, y + dy);
        if (isOpeningAtThisRing) return d;
      }
    }
  }
  return 99;
};

// Shade picks for the sprites below, kept out of the drawing loops
const thresholdStep = (y: number): number => {
  if (y === DOOR_H - 4) return 4;
  if (y === DOOR_H - 1) return 1;
  return 3;
};
const archRingStep = (ring: number): number => {
  if (ring === 1) return 1;
  if (ring === 2) return 4;
  return 3;
};
const blockLit = (bx: number, by: number): number => {
  const isLitEdge = by === 0 || bx === 0;
  if (isLitEdge) return 1;
  if (by === 4) return -1;
  return 0;
};
const keystoneStep = (x: number, y: number, half: number): number => {
  if (x <= SEAM_X - half) return 4;
  if (y >= 14) return 2;
  return 3;
};
const boardShade = (side: 'left' | 'right', x: number, from: number, to: number): number => {
  const isShadowedRightEdge = side === 'right' && x >= to - 3;
  if (isShadowedRightEdge) return -1;
  const isShadowedLeftEdge = side === 'left' && x <= from + 2;
  if (isShadowedLeftEdge) return -1;
  return 0;
};
const boardLight = (bx: number): number => {
  if (bx === 0) return 3;
  if (bx === 3) return 1;
  return 2;
};
const ringPullStep = (dy: number): number => {
  if (dy < 0) return 4;
  if (dy > 0) return 1;
  return 3;
};
const padlockStep = (y: number, t: number): number => {
  const isBrightEdge = y === LOCK_Y || t < 0.15;
  if (isBrightEdge) return 4;
  if (t < 0.55) return 3;
  if (t < 0.85) return 2;
  return 1;
};
const linkStep = (sum: number): number => {
  if (sum <= 1) return 4;
  if (sum >= 3) return 1;
  return 3;
};
const rimStep = (light: number): number => (light > 0 ? 4 : 1);
const gemStep = (y: number, cy: number): number => (y >= cy - 5 ? 1 : 2);

const grid = (): Grid => createGrid(DOOR_W, DOOR_H);
const runs = (g: Grid): PixelRun[] => {
  outlineGrid(g, INK);
  return gridRuns(g);
};

/** Stone blocks around the doorway, a ring of dressed stone on the arch, the keystone and the threshold. */
export const doorFrame = (element: string): PixelRun[] => {
  const { stone } = doorPalette(element);
  const g = grid();
  for (let y = 0; y < DOOR_H; y++) {
    const inset = cornerInset(y, 6);
    for (let x = inset; x < DOOR_W - inset; x++) {
      if (inOpening(x, y)) continue;
      const ring = distanceToOpening(x, y);
      if (y >= DOOR_H - 4) {
        // The threshold: a worn step, lit along its top
        paint(g, x, y, tone(stone, thresholdStep(y)));
      } else if (ring <= 3) {
        // The dressed stone around the arch, brighter at the inner edge
        paint(g, x, y, tone(stone, archRingStep(ring)));
      } else {
        // Blocks ten wide and six high, every other course shifted half a block
        const course = Math.floor(y / 6);
        const bx = (x + (course % 2) * 5) % 10;
        const by = y % 6;
        const isMortarLine = by === 5 || bx === 9;
        if (isMortarLine) paint(g, x, y, tone(stone, 0));
        else {
          const lit = blockLit(bx, by);
          const side = x < 4 || x > DOOR_W - 6 ? -1 : 0;
          paint(g, x, y, tone(stone, 2 + lit + side));
        }
      }
    }
  }
  // The keystone over the arch
  for (let y = 8; y <= 15; y++) {
    const half = 4 - Math.floor((y - 8) / 3);
    for (let x = SEAM_X - half - 1; x <= SEAM_X + half; x++) {
      paint(g, x, y, tone(stone, keystoneStep(x, y, half)));
    }
  }
  // A few cracks, the same every time
  [[5, 9], [6, 10], [56, 22], [57, 23], [57, 24], [3, 47], [60, 52], [59, 53]].forEach(([x, y]) =>
    paint(g, x, y, tone(stone, 0)),
  );
  return runs(g);
};

/** What lies beyond the door: dark, until the light behind it comes up (the reveal paints the light). */
export const doorBeyond = (): PixelRun[] => {
  const g = grid();
  for (let y = 0; y < DOOR_H - 4; y++) {
    for (let x = 0; x < DOOR_W; x++) if (inOpening(x, y)) paint(g, x, y, y < OPENING.archCenterY ? '#0a060c' : '#120a12');
  }
  return gridRuns(g);
};

/** One leaf of the door: plank boards, two iron bands with rivets and a ring to pull it by. */
const leaf = (element: string, side: 'left' | 'right'): PixelRun[] => {
  const { metal } = doorPalette(element);
  const g = grid();
  const from = side === 'left' ? OPENING.left : SEAM_X;
  const to = side === 'left' ? SEAM_X - 1 : OPENING.right;
  const bands = [24, 58];
  for (let y = OPENING.top; y < DOOR_H - 4; y++) {
    for (let x = from; x <= to; x++) {
      if (!inOpening(x, y)) continue;
      const band = bands.find((top) => y >= top && y <= top + 2);
      if (band !== undefined) {
        paint(g, x, y, tone(metal, [4, 2, 1][y - band]));
      } else {
        // Boards five wide: lit on the left, a dark seam on the right
        const bx = (x - from) % 5;
        const shade = boardShade(side, x, from, to);
        paint(g, x, y, bx === 4 ? WOOD[0] : tone(WOOD, boardLight(bx) + shade));
      }
    }
  }
  // Rivets on the bands
  bands.forEach((top) => {
    for (let x = from + 2; x <= to - 1; x += 5) {
      paint(g, x, top + 1, tone(metal, 4));
      paint(g, x, top + 2, tone(metal, 0));
    }
  });
  // The ring pull, near the seam
  const rx = side === 'left' ? SEAM_X - 6 : SEAM_X + 5;
  [[0, -2], [-1, -1], [1, -1], [-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2]].forEach(([dx, dy]) =>
    paint(g, rx + dx, 40 + dy, tone(metal, ringPullStep(dy))),
  );
  paint(g, rx, 37, tone(metal, 2));
  return runs(g);
};

export const doorLeafLeft = (element: string): PixelRun[] => leaf(element, 'left');
export const doorLeafRight = (element: string): PixelRun[] => leaf(element, 'right');

/** The padlock's shackle: a thick hoop over the body, hooked through both rings. */
export const padlockShackle = (element: string): PixelRun[] => {
  const { metal } = doorPalette(element);
  const g = grid();
  const cx = SEAM_X - 0.5;
  for (let y = LOCK_Y - 9; y <= LOCK_Y - 1; y++) {
    for (let x = SEAM_X - 6; x <= SEAM_X + 5; x++) {
      const dx = x - cx;
      const dy = Math.max(0, LOCK_Y - 5 - y);
      const r = Math.sqrt(dx * dx + dy * dy);
      const isOnHoop = r >= 3.5 && r <= 5.6;
      if (isOnHoop) paint(g, x, y, tone(metal, dx < 0 ? 3 : 1));
    }
  }
  return runs(g);
};

/** The padlock's body: a heavy block, lit on the left, with a keyhole. */
export const padlockBody = (element: string): PixelRun[] => {
  const { metal } = doorPalette(element);
  const g = grid();
  for (let y = LOCK_Y; y <= LOCK_Y + 10; y++) {
    const inset = y >= LOCK_Y + 8 ? y - (LOCK_Y + 7) : 0;
    for (let x = SEAM_X - 7 + inset; x <= SEAM_X + 6 - inset; x++) {
      const t = (x - (SEAM_X - 7)) / 13;
      paint(g, x, y, tone(metal, padlockStep(y, t)));
    }
  }
  [[0, 3], [-1, 3], [0, 4], [-1, 4], [0, 5], [-1, 5], [0, 6], [-1, 6], [-1, 7], [0, 7]].forEach(([dx, dy]) =>
    paint(g, SEAM_X + dx, LOCK_Y + dy, INK),
  );
  paint(g, SEAM_X - 2, LOCK_Y + 3, INK);
  paint(g, SEAM_X + 1, LOCK_Y + 3, INK);
  return runs(g);
};

/** Two chains crossed over the Boss Door, corner to corner across the leaves. */
export const bossChains = (element: string): PixelRun[] => {
  const { metal } = doorPalette(element);
  const g = grid();
  const ends: Array<[[number, number], [number, number]]> = [
    [[OPENING.left + 2, 28], [OPENING.right - 2, 64]],
    [[OPENING.right - 2, 28], [OPENING.left + 2, 64]],
  ];
  ends.forEach(([[x0, y0], [x1, y1]]) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0, link = 0; i <= steps; i += 2, link++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps) - 1;
      const y = Math.round(y0 + ((y1 - y0) * i) / steps) - 1;
      if (link % 2 === 0) {
        // A link seen face on: a ring of metal around a dark eye, lit on its upper left
        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 3; dx++) {
            const isLinkEye = dx === 1 && dy === 1;
            if (isLinkEye) paint(g, x + dx, y + dy, INK);
            else paint(g, x + dx, y + dy, tone(metal, linkStep(dx + dy)));
          }
        }
      } else {
        // The next link edge on, threaded through it
        paint(g, x + 1, y + 1, tone(metal, 2));
        paint(g, x + 2, y + 1, tone(metal, 1));
      }
    }
  });
  // A drop shadow under the chains, so they hang off the wood
  for (let y = DOOR_H - 2; y >= 0; y--) {
    for (let x = 0; x < DOOR_W - 1; x++) {
      const needsDropShadow = g[y][x] && g[y][x] !== INK && !g[y + 1][x + 1];
      if (needsDropShadow) paint(g, x + 1, y + 1, INK);
    }
  }
  return gridRuns(g);
};

/** The Boss Door's great lock: a round plate with a red gem over a big keyhole. */
export const bossLock = (element: string): PixelRun[] => {
  const { metal } = doorPalette(element);
  const g = grid();
  const cx = SEAM_X - 0.5;
  const cy = LOCK_Y + 2;
  for (let y = cy - 10; y <= cy + 10; y++) {
    for (let x = SEAM_X - 11; x <= SEAM_X + 10; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > 10.4) continue;
      // A raised rim, then the face lit from the top left
      const light = -(dx + dy) / 14;
      paint(g, x, y, tone(metal, r > 8.6 ? rimStep(light) : Math.round(2.4 + light)));
    }
  }
  // The gem, with its glint
  const gem = ['#5a0a14', '#a01428', '#e0283c', '#ff8a96'];
  for (let y = cy - 8; y <= cy - 4; y++) {
    const half = 2 - Math.abs(y - (cy - 6));
    for (let x = SEAM_X - 1 - half; x <= SEAM_X + half; x++) paint(g, x, y, gem[gemStep(y, cy)]);
  }
  paint(g, SEAM_X - 1, cy - 7, gem[3]);
  // The keyhole: a round head and a long slot
  for (let y = cy - 2; y <= cy + 7; y++) {
    const wide = y <= cy ? 2 : 1;
    for (let x = SEAM_X - wide; x <= SEAM_X + wide - 1; x++) paint(g, x, y, INK);
  }
  return runs(g);
};
