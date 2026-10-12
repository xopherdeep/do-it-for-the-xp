/**
 * One plank-door leaf for the building transitions, painted on a 48 x 96 grid in the temple door's house style
 * (doorSprite.ts): vertical boards in a five-tone wood ramp lit from the top left, a trim frame in the building's
 * colour, two iron bands with rivets and a ring pull by the seam. The right leaf is the left one turned around,
 * so both hinge on the screen edge and meet in the middle.
 */
import { createGrid, gridRuns, outlineGrid, paint, type Grid, type PixelRun } from "@/app/Console/TempleGrounds/components/pixelGrid";

export const LEAF_W = 48;
export const LEAF_H = 96;

const INK = "#140a0e";
const WOOD = ["#2e1608", "#4c2812", "#6e3e1e", "#8e5a2e", "#b07a46"];
const IRON = ["#1c1a22", "#3a3844", "#5a5868", "#807e90", "#aeacbe"];

/** Trim ramps, darkest to brightest, one per kind of building */
const TRIMS: Record<string, string[]> = {
  gold: ["#5c3606", "#93600e", "#cd9646", "#eebd5a", "#fad78c"],
  hospital: ["#6a1218", "#a8262e", "#d8d8e0", "#f0f0f6", "#ffffff"],
  hotel: ["#142a5c", "#24489a", "#4a78d0", "#7aa4ec", "#b4ccfa"],
  green: ["#10381a", "#1e6030", "#38954a", "#62c070", "#9ae6a2"],
  plain: ["#3a3450", "#625a7a", "#968caa", "#bcb2d0", "#dcd2f0"],
};

/** Which trim a place gets: gold for the shop, bank and town hall, white and red for the hospital, and so on. */
export const trimFor = (title?: string): string[] => {
  switch (title) {
    case "Item Shop":
    case "Gold Bank":
    case "Town Hall":
      return TRIMS.gold;
    case "Hospital":
      return TRIMS.hospital;
    case "Hotel":
      return TRIMS.hotel;
    case "My Home":
      return TRIMS.green;
    // Coming out, the plan names the town, not the building we leave
    default:
      return TRIMS.plain;
  }
};

const tone = (ramp: string[], index: number): string => ramp[Math.max(0, Math.min(ramp.length - 1, index))];

const BANDS = [14, 74];
const RING = { x: LEAF_W - 9, y: 48 };

const paintLeaf = (trim: string[]): Grid => {
  const g = createGrid(LEAF_W, LEAF_H);
  for (let y = 0; y < LEAF_H; y++) {
    for (let x = 0; x < LEAF_W; x++) {
      const frame = Math.min(x, y, LEAF_H - 1 - y); // the hinge side and the top and bottom
      const seamEdge = LEAF_W - 1 - x;
      if (frame < 3 || seamEdge < 2) {
        // Trim: bright on the top and hinge edge, shaded on the bottom and seam edge
        const shade = y < 3 || x < 3 ? 4 : y >= LEAF_H - 3 || seamEdge < 2 ? 1 : 3;
        paint(g, x, y, tone(trim, frame === 2 ? shade - 1 : shade));
        continue;
      }
      const band = BANDS.find((top) => y >= top && y <= top + 4);
      if (band !== undefined) {
        paint(g, x, y, tone(IRON, [4, 3, 2, 1, 0][y - band]));
        continue;
      }
      // Boards seven wide: lit on the left, a dark seam on the right, a knot or two
      const bx = (x - 3) % 7;
      paint(g, x, y, bx === 6 ? WOOD[0] : tone(WOOD, bx === 0 ? 4 : bx <= 2 ? 3 : bx <= 4 ? 2 : 1));
    }
  }
  [[8, 34], [22, 60], [31, 24], [12, 86]].forEach(([x, y]) => {
    paint(g, x, y, WOOD[0]);
    paint(g, x + 1, y, WOOD[1]);
  });
  // Rivets on the bands
  BANDS.forEach((top) => {
    for (let x = 6; x < LEAF_W - 3; x += 8) {
      paint(g, x, top + 2, tone(IRON, 4));
      paint(g, x + 1, top + 3, tone(IRON, 0));
    }
  });
  // The ring pull: a plate and a hoop
  const { x: rx, y: ry } = RING;
  [[0, -2], [-1, -1], [1, -1], [-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2]].forEach(([dx, dy]) =>
    paint(g, rx + dx, ry + dy, tone(IRON, dy < 0 ? 4 : dy > 0 ? 1 : 3)),
  );
  paint(g, rx, ry - 4, tone(IRON, 2));
  paint(g, rx, ry - 3, tone(IRON, 3));
  outlineGrid(g, INK);
  return g;
};

/** The left leaf (hinged on the left screen edge), as runs for PixelRuns */
export const screenLeafLeft = (title?: string): PixelRun[] => gridRuns(paintLeaf(trimFor(title)));

/** The right leaf: the same boards turned around, hinged on the right screen edge */
export const screenLeafRight = (title?: string): PixelRun[] => {
  const g = paintLeaf(trimFor(title)).map((row) => [...row].reverse());
  return gridRuns(g);
};
