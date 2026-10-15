import { SKIN_TONES } from "@/lib/hero-look/types";
import type { FaceStyle, SkinTone } from "@/lib/hero-look/types";
import { box, both, mix, PALETTE, shade } from "./shape";
import type { Box } from "./shape";

/** The head block: x -3.5..3.5, y 8..15, z -3.5..3.5. The face sits on the +Z side, raised 0.25 off it. */
export const HEAD = { x: 3.5, y0: 8, y1: 15, z: 3.5 } as const;
const F = HEAD.z;
const R = F + 0.25;

/** A flat feature on the face: x/y rectangle at the face plane, raised by `depth` */
const dot = (x0: number, y0: number, x1: number, y1: number, color: string, depth = 0.25): Box =>
  box(x0, y0, F, x1, y1, F + depth, color);

/** Eye highlight: sits on top of the eye, so it is raised a little further */
const glint = (x0: number, y0: number, color = PALETTE.white): Box => box(x0, y0, R, x0 + 0.5, y0 + 0.5, R + 0.12, color);

const face = (style: FaceStyle, eye: string, brow: string, blush: string, lid: string): Box[] => {
  const cheeks = both([box(2.25, 10.25, F, 3.25, 11, F + 0.12, blush)]);
  switch (style) {
    case "grin":
      return [
        // happy ^ ^ eyes
        ...both([dot(1, 11.5, 1.5, 12, eye), dot(1.5, 12, 2.5, 12.5, eye), dot(2.5, 11.5, 3, 12, eye)]),
        dot(-1.5, 9, 1.5, 10.25, PALETTE.mouth),
        box(-1.25, 9.75, R, 1.25, 10.25, R + 0.1, PALETTE.white),
        box(-0.75, 9, R, 0.75, 9.5, R + 0.1, PALETTE.tongue),
        ...cheeks,
      ];
    case "determined":
      return [
        ...both([dot(1.25, 11, 2.25, 12, eye)]),
        glint(1.25, 11.4),
        glint(-2.25, 11.4),
        // brows slant down toward the nose
        dot(0.75, 12.5, 1.75, 13, brow),
        dot(1.75, 13, 2.75, 13.5, brow),
        dot(-1.75, 12.5, -0.75, 13, brow),
        dot(-2.75, 13, -1.75, 13.5, brow),
        dot(-1, 9.75, 1, 10.2, PALETTE.mouth),
        dot(1, 10.2, 1.5, 10.7, PALETTE.mouth),
      ];
    case "sleepy":
      return [
        ...both([dot(1, 11.5, 2.5, 12, eye), dot(1, 12, 2.5, 12.4, lid, 0.12)]),
        dot(-0.5, 9.25, 0.5, 10, PALETTE.mouth),
        ...cheeks,
      ];
    case "wink":
      return [
        // open eye on the character's left, closed ">" on the right
        dot(1.25, 11, 2.25, 12.5, eye),
        glint(1.25, 11.9),
        dot(-2.5, 11.5, -1, 12, eye),
        dot(-1.75, 12, -1, 12.4, eye),
        dot(-1, 9.75, 1.25, 10.25, PALETTE.mouth),
        dot(1.25, 10.25, 1.75, 10.75, PALETTE.mouth),
        dot(-1.25, 10.25, -1, 10.5, PALETTE.mouth),
        dot(0.1, 9.25, 1.1, 9.75, PALETTE.tongue),
        ...cheeks,
      ];
    case "surprised":
      return [
        ...both([dot(1, 10.75, 2.5, 12.75, PALETTE.white, 0.2), box(1.5, 11.25, F + 0.2, 2, 12.25, F + 0.35, eye)]),
        dot(1.25, 13.25, 2.5, 13.75, brow),
        dot(-2.5, 13.25, -1.25, 13.75, brow),
        dot(-0.75, 9, 0.75, 10.25, PALETTE.mouth),
        box(-0.4, 9.25, R, 0.4, 9.75, R + 0.1, PALETTE.tongue),
      ];
    case "smile":
    default:
      return [
        ...both([dot(1.25, 11, 2.25, 12.5, eye)]),
        glint(1.25, 11.9),
        glint(-2.25, 11.9),
        dot(-0.75, 9.75, 0.75, 10.25, PALETTE.mouth),
        ...both([dot(0.75, 10.25, 1.25, 10.75, PALETTE.mouth)]),
        ...cheeks,
      ];
  }
};

/** Head block, ears, and the face for `style`. Hair and hats are separate parts merged by the builder. */
export const head = (skin: SkinTone, style: FaceStyle, eyeColor: string): Box[] => {
  const skinHex = SKIN_TONES[skin] ?? SKIN_TONES.peach;
  const brow = shade(skinHex, 0.4);
  const blush = mix(skinHex, PALETTE.blush, 0.55);
  const ears = both([box(3.5, 10.5, -0.5, 3.9, 12, 0.5, shade(skinHex, 0.94))]);
  return [
    box(-HEAD.x, HEAD.y0, -HEAD.z, HEAD.x, HEAD.y1, HEAD.z, skinHex),
    ...ears,
    ...face(style, eyeColor, brow, blush, shade(skinHex, 0.85)),
  ];
};
