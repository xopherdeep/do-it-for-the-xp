import { SKIN_TONES } from "@/lib/hero-look/types";
import type { OutfitStyle, SkinTone } from "@/lib/hero-look/types";
import { box, both, lighten, mirrorX, PALETTE, shade } from "./shape";
import type { Box, Part } from "./shape";

/**
 * Character layout (1 unit = 1 voxel, feet at y = 0, facing +Z):
 *   legs  y 0..3   (stubby)      torso y 3..8     head y 8..15 (7 tall, ~45% of the body)
 *   arms hang from the shoulder (+-4, 7.5) and end in a 1.5 wide mitt at y 3.75..5
 * The character's LEFT is +X (it faces +Z, so its left hand is on the viewer's right).
 */
export const NECK_Y = 8;
export const SHOULDER_Y = 7.5;
export const HIP_Y = 3;
export const ARM_X = 4;
export const LEG_X = 1.5;
export const HAND_Y = 4.4;

export interface BodyParts {
  parts: Part[];
  /** Anything the outfit wraps around the head (a raised hood), merged into the head group */
  headGear: Box[];
}

export interface BodyOptions {
  /** Hoodies pull the hood up when there is no hat to fight with */
  hood?: boolean;
}

interface OutfitSpec {
  torso: Box[];
  /** Left (+X) arm without the hand */
  armL: Box[];
  /** Left (+X) leg with footwear */
  legL: Box[];
  /** Glove colour when it is not skin */
  hand?: string;
  headGear?: Box[];
}

/** Shoe or boot under a leg whose x extent is [x0, x1] */
const footwear = (x0: number, x1: number, upper: string, height: number, sole: string): Box[] => [
  box(x0 - 0.05, 0.4, -1.6, x1 + 0.05, height, 1.6, upper),
  box(x0 - 0.05, 0.4, 1.6, x1 + 0.05, 1.0, 2.6, upper),
  box(x0 - 0.05, 0, -1.6, x1 + 0.05, 0.4, 2.6, sole),
];

/** Sleeve from the shoulder down to `to`, skin below it down to the wrist (y 5) */
const arm = (skin: string, color: string, to: number, extra: Box[] = []): Box[] => [
  box(3, to, -1, 5, 8, 1, color),
  ...(to > 5 ? [box(3, 5, -1, 5, to, 1, skin)] : []),
  ...extra,
];

const LEG_X0 = 0.25;
const LEG_X1 = 2.75;
const leg = (color: string, from: number, to = 3): Box => box(LEG_X0, from, -1.5, LEG_X1, to, 1.5, color);

const tunic = (skin: string, C: string, A: string): OutfitSpec => ({
  torso: [
    box(-3, 3, -2, 3, 8, 2, C),
    box(-3.25, 2.25, -2.25, 3.25, 3.9, 2.25, shade(C, 0.9)),
    box(-3.4, 2.25, -2.4, 3.4, 2.75, 2.4, A),
    box(-3.25, 3.9, -2.25, 3.25, 4.65, 2.25, "#5a3a1e"),
    box(-0.7, 3.8, 2.25, 0.7, 4.75, 2.5, PALETTE.gold),
    box(-0.3, 4.65, 2, 0.3, 7.25, 2.25, A),
    box(-1.6, 7.25, 2, 1.6, 8, 2.25, A),
    box(-1.6, 7.25, -2.25, 1.6, 8, -2, A),
  ],
  armL: arm(skin, C, 6.75, [box(2.95, 6.4, -1.1, 5.05, 6.75, 1.1, A)]),
  legL: [leg(PALETTE.leather, 1.5), ...footwear(LEG_X0, LEG_X1, PALETTE.boot, 1.5, shade(PALETTE.boot, 0.6)), box(0.15, 1.5, -1.6, 2.85, 1.9, 1.6, lighten(PALETTE.boot, 0.15))],
});

const overalls = (skin: string, C: string, A: string): OutfitSpec => ({
  torso: [
    box(-3, 3, -2, 3, 8, 2, A),
    box(-3.15, 3, -2.15, 3.15, 5.25, 2.15, C),
    box(-2, 5.25, 2, 2, 7.6, 2.3, C),
    box(-1, 5.7, 2.3, 1, 6.5, 2.45, shade(C, 0.8)),
    box(1, 7.6, 1.9, 2, 8, 2.3, C),
    box(-2, 7.6, 1.9, -1, 8, 2.3, C),
    box(1, 7.6, -2.3, 2, 8, -1.9, C),
    box(-2, 7.6, -2.3, -1, 8, -1.9, C),
    box(1.2, 6.9, 2.3, 1.8, 7.5, 2.45, PALETTE.gold),
    box(-1.8, 6.9, 2.3, -1.2, 7.5, 2.45, PALETTE.gold),
  ],
  armL: arm(skin, A, 6.5),
  legL: [
    leg(C, 1.2),
    box(0.15, 1.2, -1.6, 2.85, 1.9, 1.6, lighten(C, 0.3)),
    ...footwear(LEG_X0, LEG_X1, PALETTE.boot, 1.2, shade(PALETTE.boot, 0.6)),
  ],
});

const armor = (skin: string, C: string, A: string): OutfitSpec => {
  const under = shade(C, 0.5);
  return {
    torso: [
      box(-3, 3, -2, 3, 8, 2, under),
      box(-3.15, 4.25, -2.15, 3.15, 7.75, 2.15, C),
      box(-0.5, 4.5, 2.15, 0.5, 7.5, 2.4, lighten(C, 0.3)),
      box(-3.15, 7.3, -2.15, 3.15, 7.75, 2.15, A),
      box(-3.25, 3.5, -2.25, 3.25, 4.25, 2.25, A),
      box(-0.7, 3.55, 2.25, 0.7, 4.2, 2.45, lighten(A, 0.4)),
      box(-3.3, 2.4, -2.3, 3.3, 3.5, 2.3, shade(C, 0.8)),
      box(-3.35, 2.4, -2.35, 3.35, 2.8, 2.35, A),
    ],
    armL: [
      box(3, 5, -1, 5, 8, 1, under),
      box(2.9, 7, -1.7, 5.6, 8.75, 1.7, C),
      box(2.9, 8.5, -1.7, 5.6, 8.9, 1.7, A),
      box(5.6, 7.4, -1.2, 5.8, 8.5, 1.2, A),
      box(2.95, 5, -1.1, 5.05, 6.3, 1.1, lighten(C, 0.15)),
    ],
    hand: shade(C, 0.75),
    legL: [
      leg(shade(C, 0.7), 0.9),
      box(0.15, 1.8, -1.6, 2.85, 2.6, 1.7, lighten(C, 0.2)),
      ...footwear(LEG_X0, LEG_X1, shade(C, 0.55), 1.4, shade(C, 0.35)),
      box(0.15, 1.4, -1.6, 2.85, 1.8, 1.6, A),
    ],
  };
};

const robe = (skin: string, C: string, A: string): OutfitSpec => ({
  torso: [
    box(-3.2, 3, -2.2, 3.2, 8, 2.2, C),
    box(-3.5, 0.4, -2.6, 3.5, 3, 2.6, C),
    box(-3.6, 0.4, -2.7, 3.6, 1.1, 2.7, A),
    box(-3.3, 4.1, -2.3, 3.3, 4.9, 2.3, A),
    box(-0.8, 3.9, 2.3, 0.8, 5.1, 2.6, lighten(A, 0.3)),
    box(0.1, 3, 2.3, 1.1, 3.9, 2.5, A),
    box(-1.3, 7.2, 2.2, 1.3, 8, 2.45, A),
    box(-1.3, 7.2, -2.45, 1.3, 8, -2.2, A),
    box(-1.5, 1.7, 2.6, -1, 2.2, 2.75, PALETTE.gold),
    box(1.2, 2.2, 2.6, 1.7, 2.7, 2.75, PALETTE.gold),
    box(-0.5, 5.6, 2.2, 0, 6.1, 2.35, PALETTE.gold),
    box(1.8, 6, 2.2, 2.3, 6.5, 2.35, PALETTE.gold),
  ],
  armL: [box(3, 4.8, -1.3, 5.5, 8, 1.3, C), box(3, 4.8, -1.4, 5.6, 5.6, 1.4, A)],
  legL: [leg(skin, 0.4), ...footwear(LEG_X0, LEG_X1, PALETTE.leather, 0.7, shade(PALETTE.boot, 0.8))],
});

const hoodie = (skin: string, C: string, A: string, hood: boolean): OutfitSpec => {
  const dark = shade(C, 0.78);
  const headGear: Box[] = hood
    ? both([
        box(3.5, 8.4, -4.25, 4.25, 14.75, 4.0, C),
        box(3.5, 8.4, 3.6, 4.25, 14.4, 4.4, dark),
      ]).concat([
        box(-4.25, 14.75, -4.25, 4.25, 16.25, 3.6, C),
        box(-4.25, 14.25, 3.6, 4.25, 16.25, 4.4, C),
        box(-3.5, 8.4, -4.25, 3.5, 14.75, -3.5, C),
        box(-3.5, 13.6, 3.45, 3.5, 14.25, 3.6, dark),
      ])
    : [];
  return {
    torso: [
      box(-3.25, 3, -2.25, 3.25, 8, 2.25, C),
      box(-3.35, 3, -2.35, 3.35, 3.7, 2.35, dark),
      box(-2.25, 3.9, 2.25, 2.25, 5.2, 2.5, shade(C, 0.9)),
      box(-2.25, 5.0, 2.5, -1.9, 5.2, 2.55, dark),
      box(1.9, 5.0, 2.5, 2.25, 5.2, 2.55, dark),
      box(-1.4, 6.0, 2.25, -0.95, 7.9, 2.45, A),
      box(0.95, 6.0, 2.25, 1.4, 7.9, 2.45, A),
      box(-1.5, 5.6, 2.25, -0.85, 6.0, 2.5, lighten(A, 0.4)),
      box(0.85, 5.6, 2.25, 1.5, 6.0, 2.5, lighten(A, 0.4)),
      ...(hood
        ? [box(-1.75, 7.6, 2.25, 1.75, 8, 2.4, dark)]
        : [box(-3, 6.3, -3.1, 3, 8.3, -2.25, shade(C, 0.9)), box(-2.4, 7.4, -3.4, 2.4, 8.3, -3.1, dark)]),
    ],
    armL: arm(skin, C, 5, [box(2.95, 5, -1.1, 5.05, 5.65, 1.1, dark)]),
    legL: [leg(PALETTE.denim, 0.9), ...footwear(LEG_X0, LEG_X1, PALETTE.white, 1.1, A)],
    headGear,
  };
};

const dress = (skin: string, C: string, A: string): OutfitSpec => ({
  torso: [
    box(-3, 4.75, -2, 3, 8, 2, C),
    box(-3.3, 3, -2.3, 3.3, 4.75, 2.3, C),
    box(-3.8, 1.75, -2.8, 3.8, 3, 2.8, shade(C, 0.92)),
    box(-3.9, 1.75, -2.9, 3.9, 2.4, 2.9, A),
    box(-3.15, 4.75, -2.15, 3.15, 5.5, 2.15, A),
    box(-1.3, 4.4, -2.7, 1.3, 5.9, -2.15, lighten(A, 0.25)),
    box(-0.4, 4.9, 2.15, 0.4, 5.4, 2.3, PALETTE.gold),
    box(-2, 7.5, 2, 2, 8, 2.2, A),
    box(-2, 7.5, -2.2, 2, 8, -2, A),
  ],
  armL: [box(3, 6, -1.3, 5.4, 8, 1.3, C), box(3, 5, -1, 5, 6, 1, skin), box(2.95, 6, -1.4, 5.45, 6.4, 1.4, A)],
  legL: [leg("#f1ebe0", 0.6), ...footwear(LEG_X0, LEG_X1, shade(C, 0.5), 0.6, shade(C, 0.3))],
});

const tracksuit = (skin: string, C: string, A: string): OutfitSpec => {
  const dark = shade(C, 0.8);
  return {
    torso: [
      box(-3.1, 3, -2.1, 3.1, 8, 2.1, C),
      box(-3.2, 3, -2.2, 3.2, 3.6, 2.2, dark),
      box(-3.2, 6.1, -2.2, 3.2, 6.8, 2.2, A),
      box(-0.3, 3, 2.2, 0.3, 8, 2.35, lighten(A, 0.3)),
      box(-0.45, 3.1, 2.35, 0.45, 3.6, 2.45, PALETTE.gold),
      box(-2.2, 7.6, -2.2, 2.2, 8.3, 2.2, dark),
    ],
    armL: arm(skin, C, 5, [box(4.95, 5.6, -0.45, 5.2, 8, 0.45, A), box(2.95, 5, -1.1, 5.05, 5.6, 1.1, dark)]),
    legL: [
      leg(C, 0.9),
      box(2.75, 1.4, -0.5, 3.0, 3, 0.5, A),
      box(0.15, 0.9, -1.6, 2.85, 1.4, 1.6, dark),
      ...footwear(LEG_X0, LEG_X1, PALETTE.white, 1.0, A),
    ],
  };
};

const pyjamas = (skin: string, C: string, A: string): OutfitSpec => {
  const slice = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, n: number): Box[] =>
    Array.from({ length: n }, (_, i) =>
      box(x0, y0 + ((y1 - y0) / n) * i, z0, x1, y0 + ((y1 - y0) / n) * (i + 1), z1, i % 2 === 0 ? C : A),
    );
  return {
    torso: [
      ...slice(-3.1, 3.1, -2.1, 2.1, 3, 8, 5),
      box(-1.4, 7.5, 2.1, 1.4, 8, 2.25, lighten(C, 0.5)),
      box(-0.2, 4.2, 2.1, 0.2, 4.6, 2.3, PALETTE.gold),
      box(-0.2, 5.4, 2.1, 0.2, 5.8, 2.3, PALETTE.gold),
      box(-0.2, 6.6, 2.1, 0.2, 7.0, 2.3, PALETTE.gold),
    ],
    armL: [...slice(3, 5, -1, 1, 5, 8, 3), box(2.95, 5, -1.1, 5.05, 5.4, 1.1, lighten(A, 0.4))],
    legL: [...slice(LEG_X0, LEG_X1, -1.5, 1.5, 0.6, 3, 3), ...footwear(LEG_X0, LEG_X1, shade(A, 0.75), 0.9, lighten(A, 0.3)), box(0.35, 0.4, 2.6, 2.65, 0.9, 3.0, lighten(A, 0.5))],
  };
};

const specFor = (outfit: OutfitStyle, skin: string, C: string, A: string, hood: boolean): OutfitSpec => {
  switch (outfit) {
    case "overalls":
      return overalls(skin, C, A);
    case "armor":
      return armor(skin, C, A);
    case "robe":
      return robe(skin, C, A);
    case "hoodie":
      return hoodie(skin, C, A, hood);
    case "dress":
      return dress(skin, C, A);
    case "tracksuit":
      return tracksuit(skin, C, A);
    case "pyjamas":
      return pyjamas(skin, C, A);
    case "tunic":
    default:
      return tunic(skin, C, A);
  }
};

export const body = (
  skin: SkinTone,
  outfit: OutfitStyle,
  outfitColor: string,
  outfitAccent: string,
  options: BodyOptions = {},
): BodyParts => {
  const skinHex = SKIN_TONES[skin] ?? SKIN_TONES.peach;
  const spec = specFor(outfit, skinHex, outfitColor, outfitAccent, options.hood !== false);
  const handColor = spec.hand ?? skinHex;
  const hand = [box(3.25, 3.75, -0.75, 4.75, 5, 0.75, handColor)];

  const parts: Part[] = [
    { name: "torso", pivot: { x: 0, y: HIP_Y, z: 0 }, boxes: spec.torso },
    { name: "armL", pivot: { x: ARM_X, y: SHOULDER_Y, z: 0 }, boxes: spec.armL },
    { name: "armR", pivot: { x: -ARM_X, y: SHOULDER_Y, z: 0 }, boxes: mirrorX(spec.armL) },
    { name: "legL", pivot: { x: LEG_X, y: HIP_Y, z: 0 }, boxes: spec.legL },
    { name: "legR", pivot: { x: -LEG_X, y: HIP_Y, z: 0 }, boxes: mirrorX(spec.legL) },
    { name: "handL", pivot: { x: ARM_X, y: HAND_Y, z: 0 }, boxes: hand, parent: "armL" },
    { name: "handR", pivot: { x: -ARM_X, y: HAND_Y, z: 0 }, boxes: mirrorX(hand), parent: "armR" },
  ];
  return { parts, headGear: spec.headGear ?? [] };
};
