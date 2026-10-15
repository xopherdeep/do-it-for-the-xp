/**
 * The cracked wall of the Bomb sheet, painted on a 56 x 48 grid like the chest and the doors: courses of stone blocks
 * in the temple's stone, lit from the top left, with a fissure running down the middle, lit from behind.
 *
 * The wall comes out as blocks, one per brick, so the sheet can move them on their own. The blocks around the
 * fissure's heart `fall` when the Bomb goes off, one after another, and leave an opening; the top and bottom courses
 * and the outer blocks hold, so the opening has a lintel, a sill and ragged sides.
 */
import { createGrid, gridRuns, paint, type PixelRun } from './pixelGrid';
import { doorPalette } from './doorSprite';

export const WALL_W = 56;
export const WALL_H = 48;

const BRICK_W = 14;
const BRICK_H = 8;
/** Where the blast is centred, and how far its ellipse reaches: the blocks whose middle lies inside it fall */
const BLAST = { x: WALL_W / 2, y: WALL_H / 2, reachX: 18, reachY: 14 } as const;

const MORTAR_DARK = '#0c080a';

export interface WallBrick {
  id: number;
  /** Its top left cell and width (every block is 8 cells tall) */
  x: number;
  y: number;
  w: number;
  runs: PixelRun[];
  /** Whether the Bomb brings it down */
  falls: boolean;
  /** 0 is the first to let go; the sheet staggers the fall by it */
  order: number;
  /** How far it drifts sideways as it falls (sprite pixels) and how far it turns (degrees) */
  drift: number;
  turn: number;
}

/** Where the blocks of a course begin: whole blocks, with half a block at the ends of every second course. */
const cutsOf = (course: number): number[] => {
  const cuts = [0];
  let x = course % 2 === 1 ? BRICK_W / 2 : BRICK_W;
  while (x < WALL_W) {
    cuts.push(x);
    x += BRICK_W;
  }
  cuts.push(WALL_W);
  return cuts;
};

/** A little deterministic noise for the speckle on the stone. */
const speckle = (x: number, y: number): number => (x * 7 + y * 13 + x * y) % 11;

/** One block, mortared along its foot and right side, lit along its top and left. */
const paintBrick = (x0: number, y0: number, w: number, stone: string[]): PixelRun[] => {
  const g = createGrid(w, BRICK_H);
  for (let y = 0; y < BRICK_H; y++) {
    for (let x = 0; x < w; x++) {
      const isMortar = y === BRICK_H - 1 || x === w - 1;
      const isShadow = y === BRICK_H - 2;
      const isLit = y === 0 || x === 0;
      const noise = speckle(x0 + x, y0 + y);
      let fill = stone[2];
      if (isMortar) fill = stone[0];
      else if (isShadow) fill = stone[1];
      else if (isLit) fill = stone[3];
      else if (noise === 0) fill = stone[3];
      else if (noise === 1) fill = stone[1];
      paint(g, x, y, fill);
    }
  }
  return gridRuns(g, y0).map((run) => ({ ...run, x: run.x + x0 }));
};

/** Every block of the wall, in the temple's stone, with the ones that fall marked and ordered. */
export const wallBricks = (element: string): WallBrick[] => {
  const { stone } = doorPalette(element);
  const bricks: WallBrick[] = [];
  for (let course = 0; course < WALL_H / BRICK_H; course++) {
    const cuts = cutsOf(course);
    for (let i = 0; i < cuts.length - 1; i++) {
      const x0 = cuts[i];
      const w = cuts[i + 1] - x0;
      const y0 = course * BRICK_H;
      const dx = (x0 + w / 2 - BLAST.x) / BLAST.reachX;
      const dy = (y0 + BRICK_H / 2 - BLAST.y) / BLAST.reachY;
      const id = bricks.length;
      bricks.push({
        id,
        x: x0,
        y: y0,
        w,
        runs: paintBrick(x0, y0, w, stone),
        falls: dx * dx + dy * dy <= 1,
        order: 0,
        drift: ((id * 5) % 7) - 3,
        turn: (((id * 7) % 9) - 4) * 9
      });
    }
  }
  // The blocks nearest the heart go first
  const heart = (brick: WallBrick): number => {
    const x = brick.x + brick.w / 2 - BLAST.x;
    const y = brick.y + BRICK_H / 2 - BLAST.y;
    return x * x + y * y * 1.7;
  };
  bricks
    .filter((brick) => brick.falls)
    .sort((a, b) => heart(a) - heart(b) || a.id - b.id)
    .forEach((brick, order) => {
      brick.order = order;
    });
  return bricks;
};

interface WallHole {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The box around the blocks that fall (cells, inclusive): the opening the blast leaves. */
export const wallHole = (): WallHole => {
  const runs = wallBricks('wind').filter((brick) => brick.falls).flatMap((brick) => brick.runs);
  return {
    left: Math.min(...runs.map((run) => run.x)),
    right: Math.max(...runs.map((run) => run.x + run.w - 1)),
    top: Math.min(...runs.map((run) => run.y)),
    bottom: Math.max(...runs.map((run) => run.y))
  };
};

/** The fissure's middle at the top, then at each bend, down to the bottom. */
const BENDS: Array<[number, number]> = [[0, 27], [6, 30], [12, 26], [19, 30], [25, 27], [31, 31], [38, 26], [44, 29], [47, 28]];

const fissureX = (y: number): number => {
  const next = BENDS.findIndex(([bendY]) => bendY >= y);
  const [y1, x1] = BENDS[Math.max(0, next)];
  const [y0, x0] = BENDS[Math.max(0, next - 1)];
  return y1 === y0 ? x1 : Math.round(x0 + ((x1 - x0) * (y - y0)) / (y1 - y0));
};

/** The fissure: a dark gap two cells wide that jogs from row to row, with a lit edge each side (it takes the sheet's glow colour). */
export const wallCrack = (): { dark: PixelRun[]; glow: PixelRun[] } => {
  const dark: PixelRun[] = [];
  const glow: PixelRun[] = [];
  let previous = fissureX(0);
  for (let y = 0; y < WALL_H; y++) {
    const x = fissureX(y);
    // A jog fills the cells between the two rows, so the gap never breaks
    const left = Math.min(previous, x);
    const w = Math.abs(previous - x) + 2;
    dark.push({ x: left, y, w, fill: MORTAR_DARK });
    glow.push({ x: left - 1, y, w: 1, fill: 'currentColor' }, { x: left + w, y, w: 1, fill: 'currentColor' });
    previous = x;
  }
  return { dark, glow };
};
