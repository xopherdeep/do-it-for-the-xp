import { SKIN_TONES } from "@/lib/hero-look/types";
import type { FaceStyle, SkinTone } from "@/lib/hero-look/types";
import { box, both, cutBlock, mix, PALETTE, shade } from "./shape";
import type { Box } from "./shape";

/**
 * The head block: x -3.5..3.5, y 8..15, z -3.5..3.5, with its four vertical edges cut by half a unit (see `cutBlock`),
 * so the face plane on the +Z side is 6 wide. The face sits on that plane, raised 0.25 off it.
 */
export const HEAD = { x: 3.5, y0: 8, y1: 15, z: 3.5 } as const;
const F = HEAD.z;
const R = F + 0.25;

/** A flat feature on the face: x/y rectangle at the face plane, raised by `depth` (a quarter unit at most) */
const dot = (x0: number, y0: number, x1: number, y1: number, color: string, depth = 0.25): Box =>
  box(x0, y0, F, x1, y1, F + depth, color);

/** Eye highlight: sits on top of the eye, so it is raised a little further */
const glint = (x0: number, y0: number, color = PALETTE.white): Box => box(x0, y0, R, x0 + 0.5, y0 + 0.5, R + 0.12, color);

/**
 * Features sit on half-unit steps and nothing goes past x 3, where the face plane ends. Most are drawn on the right and
 * mirrored with `both`; the glints, the wink, the smirks and the tongue are placed per side on purpose.
 */
const face = (style: FaceStyle, eye: string, brow: string, blush: string, lid: string): Box[] => {
  const cheeks = both([box(2, 10, F, 3, 11, F + 0.12, blush)]);
  switch (style) {
    case "grin":
      return [
        // happy ^ ^ eyes: two legs and a peak, a pixel caret
        ...both([dot(1, 11.5, 1.5, 12, eye), dot(1.5, 12, 2, 12.5, eye), dot(2, 11.5, 2.5, 12, eye)]),
        // open mouth: dark, a row of teeth along the top, a tongue along the bottom
        dot(-1.5, 9, 1.5, 10.5, PALETTE.mouth),
        box(-1, 10, R, 1, 10.5, R + 0.1, PALETTE.white),
        box(-0.5, 9, R, 0.5, 9.5, R + 0.1, PALETTE.tongue),
        ...cheeks,
      ];
    case "determined":
      return [
        ...both([dot(1, 11, 2, 12, eye)]),
        glint(1, 11.5),
        glint(-2, 11.5),
        // brows slant down toward the nose
        ...both([dot(0.5, 12.5, 1.5, 13, brow), dot(1.5, 13, 2.5, 13.5, brow)]),
        // a flat mouth with a smirk on the right
        dot(-1, 9.5, 1, 10, PALETTE.mouth),
        dot(1, 10, 1.5, 10.5, PALETTE.mouth),
      ];
    case "sleepy":
      return [
        ...both([dot(1, 11.5, 2.5, 12, eye), dot(1, 12, 2.5, 12.5, lid, 0.12)]),
        dot(-0.5, 9, 0.5, 10, PALETTE.mouth),
        ...cheeks,
      ];
    case "wink":
      return [
        // open eye on the character's left, closed ">" on the right
        dot(1, 11, 2, 12.5, eye),
        glint(1, 12),
        dot(-2.5, 11.5, -1, 12, eye),
        dot(-1.5, 12, -1, 12.5, eye),
        dot(-1, 9.5, 1, 10, PALETTE.mouth),
        dot(1, 10, 1.5, 10.5, PALETTE.mouth),
        dot(0, 9, 1, 9.5, PALETTE.tongue),
        ...cheeks,
      ];
    case "surprised":
      return [
        ...both([dot(1, 10.5, 2.5, 12.5, PALETTE.white, 0.2), box(1.5, 11, F + 0.2, 2, 12, F + 0.35, eye)]),
        ...both([dot(1, 13, 2.5, 13.5, brow)]),
        dot(-0.5, 9, 0.5, 10.5, PALETTE.mouth),
        box(-0.5, 9, R, 0.5, 9.5, R + 0.1, PALETTE.tongue),
      ];
    case "smile":
    default:
      return [
        ...both([dot(1, 11, 2, 12.5, eye)]),
        glint(1, 12),
        glint(-2, 12),
        // a small smile: a bar with a half unit curling up at each end
        dot(-0.5, 9.5, 0.5, 10, PALETTE.mouth),
        ...both([dot(0.5, 10, 1, 10.5, PALETTE.mouth)]),
        ...cheeks,
      ];
  }
};

/** Head block, ears, and the face for `style`. Hair and hats are separate parts merged by the builder. */
export const head = (skin: SkinTone, style: FaceStyle, eyeColor: string): Box[] => {
  const skinHex = SKIN_TONES[skin] ?? SKIN_TONES.peach;
  const brow = shade(skinHex, 0.4);
  const blush = mix(skinHex, PALETTE.blush, 0.55);
  const earTone = shade(skinHex, 0.94);
  // half a unit thick, rooted inside the block (from x 3.4) and out to 3.9; a lobe steps down behind the main ear
  const ears = both([box(3.4, 11, -0.5, 3.9, 12, 0.5, earTone), box(3.4, 10.5, -0.5, 3.9, 11, 0, earTone)]);
  return [
    ...cutBlock(-HEAD.x, HEAD.y0, -HEAD.z, HEAD.x, HEAD.y1, HEAD.z, skinHex),
    ...ears,
    ...face(style, eyeColor, brow, blush, shade(skinHex, 0.85)),
  ];
};
