import type { ClassOutfitStyle } from "@/lib/hero-look/types";
import { arm, footwear, leg, LEG_X0, LEG_X1, slice } from "../outfits";
import type { OutfitSpec } from "../outfits";
import { box, both, lighten, PALETTE, shade } from "../shape";
import { belt, cape, hood, mantle, pauldrons, pouch, sash, scarf, skirt } from "./parts";

/** One class outfit: the skin under it and the outfit's two colours in, the boxes body() hangs on the rig out */
export type OutfitSpecFn = (skin: string, C: string, A: string) => OutfitSpec;

/*
 * The four base classes, three cuts each. Level 1 is a plain two-colour garment, level 5 adds trim and one worn or
 * carried piece, level 10 adds a large silhouette piece (a cape, a mantle, a cloak). Garment faces keep to the 0.1
 * grid; the shared parts sit on the 0.05 grid (see parts.ts).
 */

const boots = (height: number, upper: string = PALETTE.boot) => footwear(LEG_X0, LEG_X1, upper, height, shade(upper, 0.6));
const sandals = (skin: string, height: number) => [
  ...footwear(LEG_X0, LEG_X1, skin, height, PALETTE.leather),
  box(0.1, 0.6, 1.7, 2.9, 0.8, 2.7, PALETTE.leather),
];

/** Warrior 1, Leather Jerkin: a laced jerkin over a short sleeved shirt, breeches and boots */
const warrior1: OutfitSpecFn = (skin, C, A) => ({
  torso: [
    box(-3, 3, -2, 3, 8, 2, C),
    box(-3.2, 2.4, -2.2, 3.2, 3.6, 2.2, shade(C, 0.85)),
    box(-0.3, 3.9, 2, 0.3, 7.4, 2.2, A),
    box(-0.8, 4.9, 2, 0.8, 5.2, 2.3, A),
    box(-0.8, 6.2, 2, 0.8, 6.5, 2.3, A),
    box(-1.5, 7.4, 2, 1.5, 8, 2.2, shade(C, 0.7)),
  ],
  armL: arm(skin, A, 6.6, [box(2.9, 6.6, -1.1, 5.1, 7, 1.1, C)]),
  legL: [leg(PALETTE.leather, 1.4), ...boots(1.4), box(0.1, 1.4, -1.7, 2.9, 1.8, 1.7, lighten(PALETTE.boot, 0.15))],
});

/** Warrior 5, Chainmail Hauberk: mail to the knee under a surcoat with a gold hem and emblem, pauldrons */
const warrior5: OutfitSpecFn = (skin, C, A) => {
  const ring = shade(A, 0.8);
  return {
    torso: [
      ...slice(-3.1, 3.1, -2.1, 2.1, 3, 8, 5, A, ring),
      box(-3.3, 2, -2.3, 3.3, 3, 2.3, ring),
      box(-1.8, 2.4, 2.1, 1.8, 7.4, 2.4, C),
      box(-1.8, 2.4, -2.4, 1.8, 7.4, -2.1, C),
      box(-1.9, 2.2, 2.1, 1.9, 2.6, 2.5, PALETTE.gold),
      box(-1.9, 2.2, -2.5, 1.9, 2.6, -2.1, PALETTE.gold),
      box(-0.6, 5.4, 2.4, 0.6, 6.6, 2.5, PALETTE.gold),
      box(-2.4, 7.4, -2.4, 2.4, 8, 2.4, lighten(A, 0.2)),
    ],
    armL: [...slice(3, 5, -1, 1, 5, 8, 3, A, ring), ...pauldrons(C, A)],
    hand: PALETTE.leather,
    legL: [leg(PALETTE.leather, 1.8), ...boots(1.8), box(0.1, 1.8, 1.2, 2.9, 2.6, 1.7, A)],
  };
};

/** Warrior 10, Battle Plate: steel plate over red, a red tabard, steel pauldrons trimmed red and a long red cape */
const warrior10: OutfitSpecFn = (skin, C, A) => {
  const steel = lighten(A, 0.25);
  return {
    torso: [
      box(-3, 3, -2, 3, 8, 2, shade(C, 0.5)),
      box(-3.2, 4.4, -2.2, 3.2, 7.8, 2.2, steel),
      box(-0.4, 4.6, 2.2, 0.4, 7.4, 2.4, lighten(A, 0.5)),
      box(-2.4, 7.4, -2.4, 2.4, 8, 2.4, A),
      ...both([box(2.1, 6.9, 2.2, 2.5, 7.3, 2.3, PALETTE.gold)]),
      box(-3.3, 3.6, -2.3, 3.3, 4.4, 2.3, A),
      box(-0.7, 3.5, 2.3, 0.7, 4.5, 2.5, PALETTE.gold),
      box(-1, 1.8, 2.1, 1, 3.6, 2.4, C),
      ...cape(C, A, "long"),
    ],
    armL: [
      box(3, 6.4, -1, 5, 8, 1, shade(C, 0.5)),
      box(2.9, 5, -1.1, 5.1, 6.4, 1.1, steel),
      box(2.8, 5.8, -1.2, 5.2, 6.1, 1.2, A),
      ...pauldrons(steel, C),
    ],
    hand: shade(A, 0.8),
    legL: [
      leg(shade(A, 0.6), 0.9),
      ...skirt(steel, C, 0.9),
      box(0.1, 1.5, -1.6, 2.9, 2.2, 1.8, steel),
      ...footwear(LEG_X0, LEG_X1, A, 1.3, shade(A, 0.5)),
    ],
  };
};

/** Mage 1, Apprentice Robe: a plain robe to the ankle with a rope belt and wide sleeves */
const mage1: OutfitSpecFn = (skin, C, A) => ({
  torso: [
    box(-3.1, 3, -2.1, 3.1, 8, 2.1, C),
    box(-3.4, 1, -2.5, 3.4, 3, 2.5, C),
    box(-3.5, 0.6, -2.6, 3.5, 1, 2.6, A),
    box(-3.2, 4.2, -2.2, 3.2, 4.6, 2.2, A),
    box(-0.2, 1, 2.5, 0.2, 3, 2.6, shade(C, 0.75)),
    box(-0.2, 4.6, 2.1, 0.2, 7.4, 2.2, shade(C, 0.75)),
    box(-1.3, 7.4, 2.1, 1.3, 8, 2.3, A),
  ],
  armL: [box(3, 5, -1.2, 5.4, 8, 1.2, C), box(2.9, 4.8, -1.3, 5.5, 5.4, 1.3, A)],
  legL: [leg(shade(C, 0.6), 0.7), ...footwear(LEG_X0, LEG_X1, PALETTE.leather, 0.7, shade(PALETTE.boot, 0.8))],
});

/** Mage 5, Star Robe: a double hem, stars on the skirt and back, a gold sash across the chest */
const mage5: OutfitSpecFn = (skin, C, A) => {
  const star = lighten(A, 0.45);
  return {
    torso: [
      box(-3.1, 3, -2.1, 3.1, 8, 2.1, C),
      box(-3.5, 1, -2.5, 3.5, 3, 2.5, C),
      box(-3.6, 0.5, -2.6, 3.6, 1, 2.6, A),
      box(-3.6, 1.2, -2.6, 3.6, 1.4, 2.6, A),
      box(-1.4, 7.4, 2.1, 1.4, 8, 2.3, A),
      box(-1.6, 1.7, 2.5, -1.1, 2.2, 2.6, star),
      box(1.4, 2.1, 2.5, 1.9, 2.6, 2.6, star),
      box(-0.9, 1.6, -2.6, -0.4, 2.1, -2.5, star),
      box(2.1, 2.2, -2.6, 2.6, 2.7, -2.5, star),
      ...sash(C, A),
    ],
    armL: [box(3, 5, -1.2, 5.4, 8, 1.2, C), box(2.9, 4.8, -1.3, 5.5, 5.4, 1.3, A), box(2.9, 7.4, -1.3, 5.5, 7.7, 1.3, A)],
    legL: [leg(shade(C, 0.6), 0.6), ...footwear(LEG_X0, LEG_X1, PALETTE.leather, 0.6, shade(PALETTE.boot, 0.8))],
  };
};

/** Mage 10, Archmage Mantle: the robe edged in gold under a jewelled mantle, mantle caps on the arms, a long cape */
const mage10: OutfitSpecFn = (skin, C, A) => {
  const star = lighten(A, 0.45);
  const cloth = shade(C, 0.8);
  const deep = shade(C, 0.62);
  return {
    torso: [
      box(-3.1, 3, -2.1, 3.1, 8, 2.1, C),
      box(-3.5, 0.9, -2.5, 3.5, 3, 2.5, C),
      box(-3.6, 0.4, -2.6, 3.6, 0.9, 2.6, A),
      box(-3.6, 1.1, -2.6, 3.6, 1.3, 2.6, A),
      ...both([box(0.3, 1.3, 2.5, 0.7, 3, 2.6, A)]),
      box(-0.3, 1.3, 2.5, 0.3, 3, 2.55, deep),
      box(-2.6, 1.7, 2.5, -2.1, 2.2, 2.6, star),
      box(1.6, 2, 2.5, 2.1, 2.5, 2.6, star),
      box(-3.2, 3.6, -2.2, 3.2, 4.2, 2.2, A),
      ...mantle(cloth, A),
      ...cape(deep, A, "long"),
    ],
    armL: [
      box(3, 5, -1.2, 5.4, 8, 1.2, C),
      box(2.9, 4.6, -1.3, 5.5, 5.3, 1.3, A),
      box(2.9, 7, -1.4, 5.6, 8.1, 1.4, cloth),
      box(2.8, 6.7, -1.5, 5.7, 7, 1.5, A),
    ],
    legL: [leg(shade(C, 0.6), 0.6), ...footwear(LEG_X0, LEG_X1, deep, 0.6, A)],
  };
};

/** Thief 1, Hooded Vest: a vest open over a shirt, the hood thrown back, soft boots */
const thief1: OutfitSpecFn = (skin, C, A) => ({
  torso: [
    box(-3, 3, -2, 3, 8, 2, A),
    box(-3.2, 2.6, -2.2, 3.2, 3.3, 2.2, shade(A, 0.8)),
    box(-3.1, 3.3, -2.1, 3.1, 7.8, 1.4, C),
    ...both([box(0.6, 3.3, 1.4, 3.1, 7.8, 2.2, C)]),
  ],
  armL: arm(skin, A, 5.6, [box(2.9, 5.6, -1.1, 5.1, 5.9, 1.1, shade(A, 0.8))]),
  legL: [leg(C, 1.2), ...boots(1.2), box(0.1, 1.2, -1.7, 2.9, 1.5, 1.7, A)],
  headGear: hood(C, A),
});

/** The thief's leathers, shared by levels 5 and 10: a jerkin with a stitched chest panel over a short hem */
const leathers = (C: string, A: string) => [
  box(-3.1, 3, -2.1, 3.1, 8, 2.1, C),
  box(-3.2, 2.5, -2.2, 3.2, 3.3, 2.2, shade(C, 0.8)),
  box(-2.4, 4.6, 2.1, 2.4, 7.4, 2.3, lighten(C, 0.12)),
  ...both([box(2, 4.6, 2.3, 2.2, 7.4, 2.4, A)]),
];
const thiefArm = (skin: string, C: string, A: string) =>
  arm(skin, C, 5, [box(2.9, 4.9, -1.1, 5.1, 6.2, 1.1, PALETTE.leather), box(2.8, 5.5, -1.2, 5.2, 5.7, 1.2, A)]);
const thiefLeg = (C: string, A: string) => [leg(C, 1.8), ...boots(1.8), box(0.1, 2.1, -1.6, 2.9, 2.3, 1.6, A)];

/** Thief 5, Shadow Leathers: stitched leathers, a high collar, a belt with a steel buckle and two pouches, gloves */
const thief5: OutfitSpecFn = (skin, C, A) => ({
  torso: [
    ...leathers(C, A),
    box(-2.2, 7.4, -2.3, 2.2, 8, 2.3, shade(C, 0.75)),
    ...belt(PALETTE.leather, A),
    ...pouch(PALETTE.leather, A),
  ],
  armL: thiefArm(skin, C, A),
  hand: shade(PALETTE.leather, 0.8),
  legL: thiefLeg(C, A),
});

/** Thief 10, Phantom Cloak: the leathers under a long cloak with front edges, a chain clasp and the hood thrown back */
const thief10: OutfitSpecFn = (skin, C, A) => {
  const cloak = lighten(C, 0.1);
  return {
    torso: [
      ...leathers(C, A),
      ...belt(PALETTE.leather, A),
      ...both([box(2.4, 2.6, 2, 3.4, 7.6, 2.5, cloak)]),
      box(-2.4, 6.9, 2.3, 2.4, 7.2, 2.6, PALETTE.gold),
      ...cape(cloak, A, "long"),
    ],
    armL: thiefArm(skin, C, A),
    hand: shade(PALETTE.leather, 0.8),
    legL: [...thiefLeg(C, A), box(0.1, 1.4, -1.7, 2.9, 1.6, 1.7, A)],
    headGear: hood(cloak, A),
  };
};

/** Monk 1, Training Gi: a crossed gi jacket with a pale beginner's belt, short sleeves and wrapped shins */
const monk1: OutfitSpecFn = (skin, C, A) => ({
  torso: [
    box(-3.1, 3, -2.1, 3.1, 8, 2.1, C),
    box(-3.2, 2.5, -2.2, 3.2, 3.5, 2.2, shade(C, 0.9)),
    box(-1.8, 7, 2.1, -0.4, 8, 2.3, A),
    box(-0.8, 6, 2.1, 0.6, 7, 2.3, A),
    box(0.2, 5, 2.1, 1.6, 6, 2.3, A),
    box(1, 4.3, 2.1, 2.4, 5, 2.3, A),
    box(0.6, 7.2, 2.1, 1.8, 8, 2.2, A),
    ...belt(A, shade(A, 0.8)),
  ],
  armL: arm(skin, C, 6.2, [box(2.9, 6.2, -1.1, 5.1, 6.5, 1.1, A), box(2.9, 4.9, -1.1, 5.1, 5.4, 1.1, A)]),
  legL: [leg(C, 0.9), box(0.1, 0.9, -1.6, 2.9, 1.7, 1.6, A), ...sandals(skin, 0.9)],
});

/** Monk 5, Sash Robes: a robe to the shin with a trimmed crossed collar and a deep sash over the shoulder */
const monk5: OutfitSpecFn = (skin, C, A) => ({
  torso: [
    box(-3.2, 3, -2.2, 3.2, 8, 2.2, C),
    box(-3.4, 1.6, -2.5, 3.4, 3, 2.5, C),
    box(-3.5, 1.2, -2.6, 3.5, 1.6, 2.6, A),
    box(-1.8, 7, 2.2, -0.4, 8, 2.4, A),
    box(-0.8, 6, 2.2, 0.4, 7, 2.4, A),
    box(0.6, 7.2, 2.2, 1.8, 8, 2.3, A),
    ...sash(C, shade(C, 0.72)),
  ],
  armL: [box(3, 5, -1.2, 5.4, 8, 1.2, C), box(2.9, 4.8, -1.3, 5.5, 5.4, 1.3, A)],
  legL: [leg(A, 0.9), ...sandals(skin, 0.9)],
});

/** Monk 10, Iron Fist Vestments: long vestments with an apron, a deep mantle, a cream scarf, iron bracers and fists */
const monk10: OutfitSpecFn = (skin, C, A) => {
  const deep = shade(C, 0.72);
  return {
    torso: [
      box(-3.2, 3, -2.2, 3.2, 8, 2.2, C),
      box(-3.5, 1.2, -2.5, 3.5, 3, 2.5, shade(C, 0.92)),
      box(-3.6, 0.8, -2.6, 3.6, 1.2, 2.6, A),
      box(-1.2, 1.2, 2.5, 1.2, 4.2, 2.7, A),
      box(-0.5, 2.2, 2.7, 0.5, 3.2, 2.8, deep),
      box(-3.3, 3.8, -2.3, 3.3, 4.6, 2.3, deep),
      ...mantle(deep, A),
      ...scarf(A, deep),
    ],
    armL: arm(skin, C, 6, [
      box(2.8, 6, -1.2, 5.2, 6.4, 1.2, A),
      box(2.9, 4.9, -1.1, 5.1, 5.9, 1.1, PALETTE.steel),
      box(2.8, 5.5, -1.2, 5.2, 5.7, 1.2, PALETTE.gold),
    ]),
    hand: shade(PALETTE.steel, 0.8),
    legL: [leg(A, 0.8), box(0.1, 0.8, -1.6, 2.9, 1.5, 1.6, deep), ...sandals(skin, 0.8)],
  };
};

/** The 12 base class outfits by look value; classOutfits/index.ts merges every class file into the full map */
export const BASE_OUTFITS: Partial<Record<ClassOutfitStyle, OutfitSpecFn>> = {
  "warrior-1": warrior1,
  "warrior-5": warrior5,
  "warrior-10": warrior10,
  "mage-1": mage1,
  "mage-5": mage5,
  "mage-10": mage10,
  "thief-1": thief1,
  "thief-5": thief5,
  "thief-10": thief10,
  "monk-1": monk1,
  "monk-5": monk5,
  "monk-10": monk10,
};
