import type { HairStyle, HatStyle } from "@/lib/hero-look/types";
import { cutBlock } from "./head";
import { box, both, lighten, shade } from "./shape";
import type { Box } from "./shape";

/** Hats that sit over the crown, so hair must not poke through the top */
export const HAT_COVERS_TOP: ReadonlySet<HatStyle> = new Set<HatStyle>(["cap", "wizard", "helmet", "beanie", "bandana"]);

const F_FRONT = 3.5;
/** A lock on the brow starts inside the face, so it also fills the corner the head block has cut away... */
const LOCK_FROM = 3.0;
/** ...and stands a quarter unit off the face */
const LOCK_TO = 3.75;
/** A heavy fringe (a bob's, a long cut's) stands 0.4 off it: short of 4, where a bandana's front plane would meet it */
const BOWL_TO = 3.9;

/** Makes the locks of one colour that stand out to `reach`: a lock runs x0..x1 across and y0..y1 up and down */
const locksOf =
  (color: string, reach: number) =>
  (x0: number, y0: number, x1: number, y1: number): Box =>
    box(x0, y0, LOCK_FROM, x1, y1, reach, color);

export interface HairOptions {
  /** A hat closes over the crown: keep only the hair that hangs below its rim (y 14.5) */
  covered?: boolean;
  /** A raised hood: only a fringe shows under its lip */
  hooded?: boolean;
}

/** Back panel, side panels and a fringe: the shared base of most cuts. `topY` is where they stop under the crown. */
const base = (H: string, topY: number, fringe: Box[], sideFrom = 12.5, backFrom = 11.5): Box[] => [
  box(-3.5, backFrom, -3.75, 3.5, topY, -3.5, H),
  ...both([box(3.5, sideFrom, -3.75, 3.75, topY, 0.25, H)]),
  ...fringe,
];

const SPIKES: Array<[number, number, number]> = [
  [-2.5, 1.5, 1],
  [0, 2.2, 1.5],
  [2.5, 1.5, 1],
  [-2.5, -1, 1.5],
  [0, 0, 2],
  [2.5, -1, 1.5],
  [-1.5, -2.8, 1],
  [1.5, -2.8, 1],
];

export const hair = (style: HairStyle, color: string, options: HairOptions = {}): Box[] => {
  const H = color;
  const Hd = shade(H, 0.8);
  const Hl = lighten(H, 0.22);
  const covered = !!options.covered;
  const topY = covered ? 14.5 : 15;
  /** The cap of hair over the crown, its corners cut like the head's */
  const slab = (r = 3.75, y1 = 15.75): Box[] => (covered ? [] : cutBlock(-r, 15, -r, r, y1, r, H));
  const lock = locksOf(H, LOCK_TO);
  const bowl = locksOf(H, BOWL_TO);

  const isHooded = options.hooded;
  if (isHooded) {
    const isHairHiddenByHood = style === "none" || style === "buzz" || style === "mohawk";
    if (isHairHiddenByHood) return [];
    return [lock(-3.5, 13.75, 3.5, 14.25)];
  }

  switch (style) {
    case "none":
      return [];

    case "buzz":
      // a skin of hair a quarter unit thick all round the head
      return [
        ...(covered ? [] : cutBlock(-3.75, 15, -3.75, 3.75, 15.25, 3.75, H)),
        box(-3.5, 12.5, -3.75, 3.5, topY, -3.5, H),
        ...both([box(3.5, 12.5, -3.75, 3.75, topY, 0.5, H)]),
        lock(-3.5, 14, 3.5, topY),
      ];

    case "bob": {
      const fringe = [bowl(-3.5, 13, 0.5, topY), bowl(0.5, 13.5, 3.5, topY), locksOf(Hd, BOWL_TO)(0.5, 13, 1.5, 13.5)];
      return [
        ...slab(4, 15.75),
        box(-3.5, 9.5, -4, 3.5, topY, -3.5, H),
        ...both([box(3.5, 9.5, -4, 4, topY, 2.5, H)]),
        box(-3.5, 9.5, -4.25, 3.5, 10.5, -4, Hd),
        ...fringe,
      ];
    }

    case "long": {
      return [
        ...slab(4, 15.75),
        box(-3.5, 5.5, -4.25, 3.5, topY, -3.5, H),
        box(-4, 5.5, -4.25, -3.5, 9, -3.5, H),
        box(3.5, 5.5, -4.25, 4, 9, -3.5, H),
        ...both([box(3.5, 9, -4.25, 4, topY, 2.5, H)]),
        box(-3.5, 5.5, -4.5, 3.5, 7, -4.25, Hd),
        ...both([box(3.5, 6, 1.5, 4.4, 9.5, 2.7, H), box(3.5, 5.5, 1.7, 4.2, 6, 2.5, Hd)]),
        // three loose strands hang below the hem, half a unit wide
        box(-2.5, 4.5, -4.5, -2, 5.5, -3.5, Hd),
        box(0, 4, -4.5, 0.5, 5.5, -3.5, Hd),
        box(2, 4.5, -4.5, 2.5, 5.5, -3.5, Hd),
        bowl(-3.5, 13, 1, topY),
        bowl(1, 13.5, 3.5, topY),
      ];
    }

    case "spiky": {
      const spikes = covered
        ? []
        : SPIKES.flatMap(([cx, cz, rise]) => [
            box(cx - 0.8, 15.75, cz - 0.8, cx + 0.8, 15.75 + rise * 1.4, cz + 0.8, H),
            box(cx - 0.4, 15.75 + rise * 1.4, cz - 0.4, cx + 0.4, 15.75 + rise * 1.4 + 1.1, cz + 0.4, Hl),
          ]);
      return [
        ...slab(3.75, 15.75),
        ...base(H, topY, [lock(-3.5, 14, 3.5, topY), lock(-2.5, 13.5, -1.5, 14), lock(0, 13, 1, 14), lock(2, 13.5, 3, 14)]),
        ...spikes,
      ];
    }

    case "ponytail": {
      const tie = lighten(H, 0.45);
      return [
        ...slab(3.75, 15.75),
        ...(covered ? [] : [box(0.5, 15.75, 0, 3, 16.25, 3.75, H)]),
        ...base(H, topY, [lock(-3.5, 14, 3.5, topY), lock(0.5, 13.5, 3.5, 14)]),
        ...(covered
          ? [
              box(-0.9, 12, -4.6, 0.9, 13.5, -3.75, tie),
              box(-1.1, 8.5, -5.6, 1.1, 12, -4.6, H),
              box(-0.8, 6.8, -5.4, 0.8, 8.5, -4.8, Hd),
            ]
          : [
              // a high tail that springs up behind the crown and falls down the back
              box(-0.9, 13.75, -4.6, 0.9, 15.25, -3.75, tie),
              box(-1.1, 15.25, -5.6, 1.1, 16.9, -3.75, H),
              box(-1.1, 9.5, -6.6, 1.1, 16.9, -5.6, H),
              box(-0.8, 7.5, -6.4, 0.8, 9.5, -5.8, Hd),
            ]),
      ];
    }

    case "curly": {
      // half-unit curls hang below the side and back masses
      const curls = [...both([box(3.5, 11, -3.5, 4, 11.5, -1.5, Hd)]), box(-1.5, 11, -4.5, 1.5, 11.5, -3.5, Hd)];
      if (covered) {
        return [...both([box(3.5, 11.5, -4.25, 4.5, 14.5, 0.5, H)]), box(-3.5, 11.5, -4.5, 3.5, 14.5, -3.5, H), ...curls];
      }
      return [
        ...cutBlock(-4, 14.5, -4, 4, 16.25, 3.75, H),
        box(-3.25, 16.25, -3.25, 3.25, 17, 3.25, H),
        // lumps all round make it read as curls
        ...both([
          box(3.5, 11.5, -4.25, 4.5, 14.5, 0.5, H),
          box(3.9, 12.5, 0.5, 4.6, 14.25, 2, Hd),
          box(2.5, 16.25, 1, 4.25, 17.25, 3, H),
          box(1.5, 16.25, -3.5, 3.5, 17.5, -1.5, Hd),
          box(0.2, 17, 0.2, 1.4, 17.6, 1.4, Hl),
          box(3.5, 14.25, 3.5, 4.25, 15.25, 4.25, Hd),
        ]),
        box(-3.5, 11.5, -4.5, 3.5, 14.5, -3.5, H),
        box(-1.25, 16.25, 2.5, 1.25, 17.5, 4.25, Hd),
        box(-1.25, 17, -1.25, 1.25, 17.75, 1.25, Hl),
        box(-2.5, 13.5, F_FRONT, -0.5, 14.5, 4, H),
        box(1, 14, F_FRONT, 3, 14.5, 4, H),
        ...curls,
      ];
    }

    case "mohawk":
      return covered
        ? []
        : [
            // the shaved sides: a darker plate laid on the crown, cut like the head under it
            ...cutBlock(-3.5, 15, -3.5, 3.5, 15.25, 3.5, shade(H, 0.7)),
            box(-0.8, 15, 1, 0.8, 17, 3.75, H),
            box(-0.8, 15, -1.5, 0.8, 18, 1, H),
            box(-0.8, 15, -3.75, 0.8, 16.5, -1.5, H),
            box(-0.4, 18, -1, 0.4, 18.5, 0.5, Hl),
            box(-0.4, 17, 2, 0.4, 17.5, 3.25, Hl),
          ];

    case "bun": {
      const tie = lighten(H, 0.45);
      return [
        ...slab(3.75, 15.75),
        ...base(H, topY, [lock(-3.5, 14, 3.5, topY), lock(-3.5, 13.5, -1, 14)]),
        ...(covered
          ? []
          : [
              box(-1.75, 15.75, -1.75, 1.75, 16.25, 1.75, tie),
              ...cutBlock(-1.5, 16.25, -1.5, 1.5, 17.75, 1.5, H),
              box(-1, 17.75, -1, 1, 18.25, 1, Hl),
            ]),
      ];
    }

    case "short":
    default:
      return [
        ...slab(3.75, 15.75),
        ...(covered ? [] : [box(0.5, 15.75, 0, 3, 16.25, 3.75, H)]),
        ...base(H, topY, [lock(-3.5, 14, 3.5, topY), lock(-3.5, 13.5, -1.5, 14), lock(0.5, 13.5, 3.5, 14)]),
      ];
  }
};

