import type { HatStyle } from "@/lib/hero-look/types";
import { cutBlock } from "./head";
import { hexToRgb } from "./mesh";
import { box, both, lighten, PALETTE, shade } from "./shape";
import type { Box } from "./shape";

/**
 * Every hat has its rim at y 14.5 and reaches at least 4 out from the centre, so it clears the hair
 * (which stops at 3.75) and the head top (y 15) ends up inside it. The round hats have their corners cut by
 * half a unit, like the head under them (`cutBlock`).
 */
const isYellowish = (hex: string): boolean => {
  const [r, g, b] = hexToRgb(hex);
  return r > 0.75 && g > 0.55 && b < 0.45;
};

export const hat = (style: HatStyle, color: string): Box[] => {
  const C = color;
  switch (style) {
    case "cap":
      return [
        // the crown steps in at half-unit tiers, and its base has the corners cut
        ...cutBlock(-4, 14.5, -4, 4, 15.75, 4, C),
        box(-3.5, 15.75, -3.5, 3.5, 16.25, 3.5, C),
        box(-2.5, 16.25, -2.5, 2.5, 16.75, 2.5, C),
        box(-0.5, 16.75, -0.5, 0.5, 17.25, 0.5, lighten(C, 0.4)),
        // the peak, stepping in at its tip
        box(-3.5, 14.5, 4, 3.5, 15, 6, shade(C, 0.6)),
        box(-3, 14.5, 6, 3, 15, 6.5, shade(C, 0.55)),
        box(-1, 15.25, 4, 1, 15.75, 4.25, lighten(C, 0.6)),
        // the band round the foot of the crown, a hair proud of it
        ...cutBlock(-4.1, 14.5, -4.1, 4.1, 14.75, 4, shade(C, 0.85)),
      ];

    case "crown": {
      const G = C;
      return [
        box(-4.25, 14.5, 3.75, 4.25, 15.75, 4.25, G),
        box(-4.25, 14.5, -4.25, 4.25, 15.75, -3.75, G),
        ...both([box(3.75, 14.5, -3.75, 4.25, 15.75, 3.75, G)]),
        // points on the corners and the middle of front and back
        ...both([
          box(3.25, 15.75, 3.25, 4.25, 16.75, 4.25, G),
          box(3.25, 15.75, -4.25, 4.25, 16.75, -3.25, G),
          box(3.75, 15.75, -0.5, 4.25, 16.5, 0.5, G),
          box(3.5, 16.75, 3.5, 4, 17.25, 4, lighten(G, 0.6)),
          box(3.5, 16.75, -4, 4, 17.25, -3.5, lighten(G, 0.6)),
        ]),
        box(-0.5, 15.75, 3.75, 0.5, 16.75, 4.25, G),
        box(-0.5, 15.75, -4.25, 0.5, 16.75, -3.75, G),
        box(-0.25, 16.75, 3.75, 0.25, 17.25, 4.25, lighten(G, 0.6)),
        // gems along the front, and a velvet lining 0.2 deep inside the ring (its top clears the 15.25 plates of buzz and mohawk hair)
        box(-0.5, 14.75, 4.25, 0.5, 15.25, 4.4, "#2f8fe0"),
        ...both([box(2, 14.75, 4.25, 3, 15.25, 4.4, "#e8433b")]),
        box(-3.7, 15.0, -3.7, 3.7, 15.2, 3.7, shade("#9b2d30", 0.9)),
      ];
    }

    case "wizard": {
      const band = shade(C, 0.6);
      return [
        box(-6, 14.5, -4.5, 6, 15.25, 4.5, C),
        box(-4.5, 14.5, -6, 4.5, 15.25, 6, C),
        box(-5.25, 14.5, -5.25, 5.25, 15.25, 5.25, C),
        ...cutBlock(-3.75, 15.25, -3.75, 3.75, 16.5, 3.75, C),
        ...cutBlock(-3.9, 15.25, -3.9, 3.9, 16, 3.9, band),
        box(-0.75, 15.25, 3.9, 0.75, 16, 4.1, PALETTE.gold),
        box(-0.25, 15.375, 4.1, 0.25, 15.875, 4.15, band),
        box(-3, 16.5, -3.25, 3, 17.75, 2.75, C),
        box(-2.25, 17.75, -3, 2.25, 19, 1.5, C),
        box(-1.5, 19, -3.5, 1.5, 20, 0.75, C),
        box(-0.8, 20, -4.5, 0.8, 21, -1.5, C),
        // gold stars on the cone
        box(-1.5, 17, 2.75, -1, 17.5, 2.9, PALETTE.gold),
        box(0.5, 18.25, 1.5, 1, 18.75, 1.65, PALETTE.gold),
        box(-1.5, 18, 1.5, -1, 18.5, 1.65, lighten(PALETTE.gold, 0.4)),
      ];
    }

    case "helmet": {
      const rim = lighten(C, 0.3);
      return [
        ...cutBlock(-4.25, 14.25, -4.25, 4.25, 15.75, 4.25, C),
        box(-3.75, 15.75, -3.75, 3.75, 16.5, 3.75, lighten(C, 0.06)),
        box(-3, 16.5, -3, 3, 17, 3, lighten(C, 0.12)),
        ...cutBlock(-4.35, 14.25, -4.35, 4.35, 14.75, 4.35, rim),
        box(-0.5, 17, -3.5, 0.5, 17.9, 3.5, lighten(C, 0.5)),
        ...both([box(3.5, 10.5, -4.25, 4.25, 14.25, 1.5, C)]),
        box(-3.5, 10.5, -4.25, 3.5, 14.25, -3.5, C),
        box(-0.35, 11.5, 3.5, 0.35, 14.25, 4.0, shade(C, 0.8)),
        ...both([box(3.9, 12.9, 0.4, 4.4, 13.5, 1, rim), box(3.9, 11.3, -3.2, 4.4, 11.9, -2.6, rim)]),
      ];
    }

    case "beanie":
      return [
        ...cutBlock(-4.25, 14.25, -4.25, 4.25, 15.25, 4.25, shade(C, 0.85)),
        ...cutBlock(-4, 15.25, -4, 4, 16.25, 4, C),
        // the stripe: 0.25 tall, 0.05 proud of the knit
        ...cutBlock(-4.05, 15.5, -4.05, 4.05, 15.75, 4.05, lighten(C, 0.35)),
        box(-3.25, 16.25, -3.25, 3.25, 17, 3.25, C),
        box(-1.75, 17, -1.75, 1.75, 17.5, 1.75, C),
        box(-1, 17.5, -1, 1, 19, 1, lighten(C, 0.75)),
      ];

    case "headband":
      return [
        ...cutBlock(-4.15, 13.75, -4.15, 4.15, 14.75, 4.15, C),
        box(-0.5, 14, 4.15, 0.5, 14.5, 4.3, lighten(C, 0.7)),
        box(-0.8, 13.75, -4.65, 0.8, 14.75, -4.15, shade(C, 0.85)),
        box(0.2, 11.5, -5.0, 1.4, 14, -4.15, C),
        box(-1.6, 11, -5.2, -0.4, 13.5, -4.2, shade(C, 0.9)),
      ];

    case "bandana":
      return [
        ...cutBlock(-4, 14, -4, 4, 15.25, 4, C),
        ...both([box(1, 15.25, 0.5, 2, 15.45, 1.5, lighten(C, 0.8)), box(-3, 15.25, -2.5, -2, 15.45, -1.5, lighten(C, 0.8))]),
        box(-0.5, 15.25, 2.4, 0.5, 15.45, 3.4, lighten(C, 0.8)),
        box(-3, 14.4, 4, -2.4, 14.9, 4.15, lighten(C, 0.8)),
        box(-0.3, 14.4, 4, 0.3, 14.9, 4.15, lighten(C, 0.8)),
        box(2.4, 14.4, 4, 3, 14.9, 4.15, lighten(C, 0.8)),
        box(-0.8, 13.4, -5.0, 0.8, 14.8, -4, shade(C, 0.8)),
        box(0.2, 11.5, -5.25, 1.7, 13.5, -4.5, C),
        box(-1.9, 11.5, -5.25, -0.4, 13.8, -4.5, shade(C, 0.9)),
      ];

    case "flower": {
      const centre = isYellowish(C) ? "#7a4a25" : PALETTE.yellow;
      return [
        box(2, 15, 0.75, 2.5, 16.5, 1.25, PALETTE.green),
        box(2.5, 15.5, 0.75, 3.5, 16, 1.25, PALETTE.green),
        box(1.75, 16.5, 0.5, 2.75, 17.5, 1.8, centre),
        box(0.75, 16.5, 0.5, 1.75, 17.5, 1.5, C),
        box(2.75, 16.5, 0.5, 3.75, 17.5, 1.5, C),
        box(1.75, 17.5, 0.5, 2.75, 18.5, 1.5, C),
        box(1.75, 15.5, 0.5, 2.75, 16.5, 1.5, shade(C, 0.9)),
      ];
    }

    case "none":
    default:
      return [];
  }
};
