import { ARM_X, HIP_Y, NECK_Y, SHOULDER_Y } from "../outfits";
import { box, both, lighten, mix, PALETTE, shade } from "../shape";
import type { Box } from "../shape";

/**
 * The pieces the class outfits are cut from. Each takes the outfit's two colours (C main, A trim) and returns boxes in
 * character space placed on the torso, unless its comment names another part. The torso garment is about x -3..3 and
 * z -2..2 from HIP_Y up to NECK_Y; no torso piece here rises above NECK_Y, so the head and hair stay in view.
 *
 * A piece starts a little inside the garment (so it never floats) and its outer faces sit on the 0.05 grid (2.45,
 * 2.65, 3.35), while the garments in the class files keep to the 0.1 grid: two faces never share a plane and fight.
 */
const FRONT_Z = 2;
const BACK_Z = -2;

/** A standing collar: tall at the back, lapels folding to a V on the chest and a clasp at its point */
export const collar = (C: string, A: string): Box[] => [
  box(-2.65, NECK_Y - 1.15, BACK_Z - 0.55, 2.65, NECK_Y, BACK_Z + 0.15, A),
  ...both([
    box(2.25, NECK_Y - 0.85, BACK_Z - 0.45, 2.85, NECK_Y, FRONT_Z + 0.25, A),
    box(0.45, NECK_Y - 0.85, FRONT_Z - 0.15, 2.25, NECK_Y, FRONT_Z + 0.45, A),
    box(0.15, NECK_Y - 1.55, FRONT_Z - 0.15, 1.25, NECK_Y - 0.85, FRONT_Z + 0.35, A),
  ]),
  box(-0.45, NECK_Y - 1.35, FRONT_Z - 0.15, 0.45, NECK_Y, FRONT_Z + 0.25, shade(C, 0.6)),
  box(-0.35, NECK_Y - 1.95, FRONT_Z - 0.15, 0.35, NECK_Y - 1.4, FRONT_Z + 0.55, PALETTE.gold),
];

/**
 * A cape hung from the shoulders down the back: a fold over the shoulders, a drape that flares toward the hem, cords
 * over the shoulders to two clasps on the chest. "long" reaches the ankles and flares out past the legs, "short" stops
 * at the small of the back.
 */
export const cape = (C: string, A: string, length: "short" | "long"): Box[] => {
  const isLong = length === "long";
  const hem = isLong ? HIP_Y - 2 : HIP_Y + 0.9;
  const knee = isLong ? HIP_Y + 1.2 : HIP_Y + 2.6;
  const flare = isLong ? 4.45 : 4.05;
  return [
    box(-3.35, NECK_Y - 0.75, BACK_Z - 0.95, 3.35, NECK_Y, BACK_Z + 0.15, A),
    box(-3.45, knee, BACK_Z - 0.85, 3.45, NECK_Y - 0.75, BACK_Z - 0.15, C),
    box(-flare, hem + 0.45, BACK_Z - 1.05, flare, knee, BACK_Z - 0.35, C),
    box(-flare - 0.1, hem, BACK_Z - 1.15, flare + 0.1, hem + 0.45, BACK_Z - 0.35, A),
    ...both([
      box(2.25, NECK_Y - 0.45, BACK_Z - 0.25, 2.8, NECK_Y, FRONT_Z + 0.35, A),
      box(2.05, NECK_Y - 1.05, FRONT_Z - 0.15, 2.85, NECK_Y - 0.35, FRONT_Z + 0.45, PALETTE.gold),
    ]),
  ];
};

/**
 * A mantle: a capelet over both shoulders, chest and back, hemmed all round, longer at the back, with a jewelled tab
 * on the chest and a roll at the nape. It sits inside a cape's drape, so the two layer without fighting.
 */
export const mantle = (C: string, A: string): Box[] => [
  box(-3.55, NECK_Y - 2.05, BACK_Z - 0.65, 3.55, NECK_Y, FRONT_Z + 0.65, C),
  box(-3.65, NECK_Y - 2.45, BACK_Z - 0.75, 3.65, NECK_Y - 1.95, FRONT_Z + 0.75, A),
  box(-3.35, NECK_Y - 3.45, BACK_Z - 0.75, 3.35, NECK_Y - 2.45, BACK_Z - 0.05, C),
  box(-3.4, NECK_Y - 3.75, BACK_Z - 0.75, 3.4, NECK_Y - 3.45, BACK_Z - 0.05, A),
  box(-1.45, NECK_Y - 3.25, FRONT_Z + 0.15, 1.45, NECK_Y - 2.35, FRONT_Z + 0.85, A),
  box(-0.45, NECK_Y - 3.05, FRONT_Z + 0.75, 0.45, NECK_Y - 2.55, FRONT_Z + 0.95, PALETTE.gold),
  box(-2.65, NECK_Y - 0.55, BACK_Z - 1.05, 2.65, NECK_Y, BACK_Z - 0.45, shade(C, 0.8)),
];

/** Shoulder guards for the LEFT arm: a dome over the shoulder, a lame below it, a trim band and a rivet. The body mirrors them. */
export const pauldrons = (C: string, A: string): Box[] => [
  box(ARM_X - 1.15, SHOULDER_Y - 0.45, -1.55, ARM_X + 1.55, SHOULDER_Y + 1.05, 1.55, C),
  box(ARM_X - 0.85, SHOULDER_Y + 1.05, -1.25, ARM_X + 1.25, SHOULDER_Y + 1.45, 1.25, lighten(C, 0.2)),
  box(ARM_X - 1.05, SHOULDER_Y - 1.05, -1.45, ARM_X + 1.65, SHOULDER_Y - 0.45, 1.45, shade(C, 0.85)),
  box(ARM_X - 1.25, SHOULDER_Y - 0.65, -1.65, ARM_X + 1.6, SHOULDER_Y - 0.35, 1.65, A),
  box(ARM_X + 1.55, SHOULDER_Y + 0.15, -0.35, ARM_X + 1.75, SHOULDER_Y + 0.65, 0.35, lighten(A, 0.4)),
];

/** A sash (in A) from the left shoulder across the chest to a knot at the right hip, two tails hanging from the knot */
export const sash = (C: string, A: string): Box[] => {
  const band = [0, 1, 2, 3, 4].map((i) => {
    const x = 2.3 - 1.15 * i;
    const top = NECK_Y - 0.15 - 0.85 * i;
    return box(x - 0.75, top - 0.85, FRONT_Z - 0.15, x + 0.75, top, FRONT_Z + 0.45, A);
  });
  return [
    ...band,
    box(1.65, NECK_Y - 0.55, BACK_Z - 0.45, 3.15, NECK_Y, FRONT_Z + 0.05, A),
    box(1.45, NECK_Y - 3.45, BACK_Z - 0.45, 3.05, NECK_Y - 0.55, BACK_Z + 0.15, A),
    box(-3.25, HIP_Y + 0.35, FRONT_Z - 0.15, -1.85, HIP_Y + 1.65, FRONT_Z + 0.75, mix(A, C, 0.3)),
    box(-3.05, HIP_Y - 1, FRONT_Z + 0.15, -2.45, HIP_Y + 0.35, FRONT_Z + 0.65, A),
    box(-2.35, HIP_Y - 0.7, FRONT_Z + 0.15, -1.85, HIP_Y + 0.35, FRONT_Z + 0.65, shade(A, 0.85)),
  ];
};

/**
 * A skirt panel for the LEFT leg, hanging `length` below the hip: the body mirrors it, so the two halves meet at x 0
 * and part as the legs walk (tassets, a split robe, a hakama).
 */
export const skirt = (C: string, A: string, length: number): Box[] => {
  const hem = HIP_Y - length;
  return [
    box(0, hem + 0.35, -1.85, 3.05, HIP_Y, 1.85, C),
    box(0, hem, -1.95, 3.15, hem + 0.35, 1.95, A),
    box(1.35, hem + 0.35, 1.85, 1.75, HIP_Y - 0.25, 1.95, shade(C, 0.8)),
  ];
};

/** A belt: the band in C, the buckle (or knot) in A, and the strap end hanging beside it */
export const belt = (C: string, A: string): Box[] => [
  box(-3.35, HIP_Y + 0.55, BACK_Z - 0.35, 3.35, HIP_Y + 1.25, FRONT_Z + 0.35, C),
  box(-0.65, HIP_Y + 0.45, FRONT_Z + 0.15, 0.65, HIP_Y + 1.35, FRONT_Z + 0.55, A),
  box(-0.3, HIP_Y + 0.7, FRONT_Z + 0.45, 0.3, HIP_Y + 1.1, FRONT_Z + 0.6, shade(C, 0.6)),
  box(0.65, HIP_Y - 0.15, FRONT_Z + 0.15, 1.15, HIP_Y + 0.65, FRONT_Z + 0.45, shade(C, 0.85)),
];

/** A pouch hanging from the belt line at the left hip, and a smaller one on the right side; bags in C, flaps in A */
export const pouch = (C: string, A: string): Box[] => [
  box(1.85, HIP_Y - 0.55, FRONT_Z - 0.35, 3.15, HIP_Y + 0.75, FRONT_Z + 0.75, C),
  box(1.8, HIP_Y + 0.35, FRONT_Z - 0.35, 3.2, HIP_Y + 0.85, FRONT_Z + 0.85, A),
  box(2.35, HIP_Y + 0.15, FRONT_Z + 0.75, 2.65, HIP_Y + 0.45, FRONT_Z + 0.9, PALETTE.gold),
  box(-3.45, HIP_Y - 0.05, -0.95, -2.85, HIP_Y + 0.95, 0.65, shade(C, 0.85)),
  box(-3.55, HIP_Y + 0.65, -1.05, -2.85, HIP_Y + 1.05, 0.75, A),
];

/**
 * headGear: a hood thrown back, lying behind the head from the nape up, its lining (A) at the opening and its sides
 * folding round under the ears. It never covers the crown, so hair and any hat stay as they are.
 */
export const hood = (C: string, A: string): Box[] => [
  box(-3.95, NECK_Y, -4.55, 3.95, NECK_Y + 3.85, -3.45, C),
  box(-4.05, NECK_Y + 3.35, -4.65, 4.05, NECK_Y + 4.25, -3.55, A),
  ...both([box(3.45, NECK_Y, -4.55, 4.25, NECK_Y + 1.35, -0.95, C)]),
];

/**
 * A scarf wound round the neck (deep enough to show over a mantle), a tail hanging down the chest and another
 * streaming out behind to the right, both ends fringed in A.
 */
export const scarf = (C: string, A: string): Box[] => [
  box(-2.45, NECK_Y - 0.95, BACK_Z - 0.85, 2.45, NECK_Y, FRONT_Z + 0.85, C),
  box(-2.55, NECK_Y - 0.75, BACK_Z - 0.95, 2.55, NECK_Y - 0.45, FRONT_Z + 0.95, A),
  box(0.95, NECK_Y - 3.45, FRONT_Z - 0.15, 1.95, NECK_Y - 0.95, FRONT_Z + 0.95, C),
  box(0.95, NECK_Y - 3.75, FRONT_Z - 0.05, 1.95, NECK_Y - 3.45, FRONT_Z + 0.95, A),
  box(-2.45, NECK_Y - 2.15, BACK_Z - 1.25, -1.25, NECK_Y - 0.95, BACK_Z - 0.55, C),
  box(-3.85, NECK_Y - 2.65, BACK_Z - 1.55, -2.45, NECK_Y - 1.35, BACK_Z - 0.85, C),
  box(-4.45, NECK_Y - 3.05, BACK_Z - 1.75, -3.85, NECK_Y - 1.85, BACK_Z - 1.05, A),
];

/**
 * headGear: a crest standing up behind the head above the collar, a fan that widens as it rises, rimmed in A with a
 * point at each corner. It stays behind the head, so the face and the front of the hair stay in view.
 */
export const crest = (C: string, A: string): Box[] => [
  box(-3.25, NECK_Y, -4.35, 3.25, NECK_Y + 1.55, -3.45, C),
  box(-3.95, NECK_Y + 1.55, -4.45, 3.95, NECK_Y + 3.05, -3.45, C),
  box(-4.55, NECK_Y + 3.05, -4.55, 4.55, NECK_Y + 4.45, -3.45, C),
  box(-4.65, NECK_Y + 4.45, -4.65, 4.65, NECK_Y + 4.85, -3.45, A),
  ...both([box(4.15, NECK_Y + 4.85, -4.55, 4.65, NECK_Y + 5.45, -3.75, A)]),
];
