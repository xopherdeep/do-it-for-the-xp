import { DEFAULT_LOOK, HAIR_STYLES, HAT_STYLES, SKIN_TONES } from "@/lib/hero-look/types";
import type { HairStyle, HatStyle, HeroLook } from "@/lib/hero-look/types";
import { assembleHero } from "../voxel/assemble";
import { buildMeshData } from "../voxel/mesh";
import type { Box, MeshData } from "../voxel/mesh";
import { lighten, shade } from "../voxel/shape";

/**
 * The head part with every hair, hat and hood: no two faces that are seen may lie on one plane, face the same way, cover
 * some of the same area and differ in colour, because the depth buffer cannot tell them apart and the pair flickers.
 * The mesher hides a face only when another box covers the whole of it, so two boxes that share a plane and overlap are
 * both drawn.
 *
 * What the scan does: it meshes the head part (head, hair, hat and the hood's gear) of every hair and hat, the bare head
 * also with the hood raised, and compares every pair of quads on one plane that face the same way. A quad is seen when
 * the point a hair in front of it is in the open and the line straight out from it hits no box (the head part and the
 * torso count as boxes): one sealed in a pocket, or pressed against another box, cannot be. The camera looks down at the
 * hero and only turns about the vertical axis, so a quad that points down is skipped too.
 *
 * What it does not catch: two overlapping faces of one colour (the wizard brim's three boxes), which shade a little
 * differently but never swap colours; a pair seen only at a slant, past a box that blocks its straight line out;
 * clashes between parts (head against torso, arms, held items); an overlap thinner than 0.01; and any face style, skin
 * or colour but the default face, peach skin and the fixed colours below.
 */

const AXIS_NAMES = ["x", "y", "z"];
/** The mesher grows every quad by 0.003 on each edge to close pinholes, so two faces that only touch overlap by 0.006: that is no overlap */
const MIN_OVERLAP = 0.01;
/** A face is seen from a point this far in front of it */
const PROBE = 0.01;
/** Samples per side across an overlap, to tell a buried overlap from a seen one */
const SAMPLES = 6;
const EPS = 1e-6;

/** Colours that tell the parts apart: a hair, a hat and a hoodie that no two share */
const HAIR_COLOR = "#5a3a1e";
const HAT_COLOR = "#b8342b";
const HOODIE_COLOR = "#2a8a8a";
/** The hood's trim: the hoodie's colour a fifth darker (see `hoodie` in outfits.ts) */
const HOOD_TRIM_COLOR = shade(HOODIE_COLOR, 0.78);
/** The ears: the skin a little darker (see `head` in head.ts) */
const EAR_COLOR = shade(SKIN_TONES[DEFAULT_LOOK.skin], 0.94);
/** The curly cut's darker lumps (`Hd` in hair.ts) */
const CURL_COLOR = shade(HAIR_COLOR, 0.8);
/** The crown's pale tips (`lighten(G, 0.6)` in hats.ts) */
const CROWN_TIP_COLOR = lighten(HAT_COLOR, 0.6);
/** The beanie's base band (`shade(C, 0.85)` in hats.ts) */
const BEANIE_BASE_COLOR = shade(HAT_COLOR, 0.85);
/** The ponytail's tie (`lighten(H, 0.45)` in hair.ts) */
const TIE_COLOR = lighten(HAIR_COLOR, 0.45);

/** One drawn face, as the plane it lies on and its rectangle across that plane (u and v are the next two axes round) */
interface Face {
  axis: number;
  isPositive: boolean;
  plane: number;
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  color: string;
}

const hexOf = (r: number, g: number, b: number): string =>
  "#" + [r, g, b].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");

/** Every quad of a mesh as a `Face` */
const facesOf = (data: MeshData): Face[] => {
  const faces: Face[] = [];
  for (let i = 0; i < data.faceCount; i++) {
    const o = i * 12;
    const normal = [data.normals[o], data.normals[o + 1], data.normals[o + 2]];
    const axis = normal.findIndex((c) => c !== 0);
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;
    const us = [0, 1, 2, 3].map((k) => data.positions[o + k * 3 + u]);
    const vs = [0, 1, 2, 3].map((k) => data.positions[o + k * 3 + v]);
    faces.push({
      axis,
      isPositive: normal[axis] > 0,
      plane: data.positions[o + axis],
      u0: Math.min(...us),
      u1: Math.max(...us),
      v0: Math.min(...vs),
      v1: Math.max(...vs),
      color: hexOf(data.colors[o], data.colors[o + 1], data.colors[o + 2]),
    });
  }
  return faces;
};

const lowsOf = (b: Box): number[] => [b.x, b.y, b.z];
const highsOf = (b: Box): number[] => [b.x + b.w, b.y + b.h, b.z + b.d];

const isInsideBox = (point: number[], b: Box): boolean => {
  const [lows, highs] = [lowsOf(b), highsOf(b)];
  return [0, 1, 2].every((a) => point[a] > lows[a] + EPS && point[a] < highs[a] - EPS);
};

/** Does the line from `point` straight along (or against) `axis` run into box `b`? */
const isLineBlockedBy = (point: number[], axis: number, isPositive: boolean, b: Box): boolean => {
  const [lows, highs] = [lowsOf(b), highsOf(b)];
  const across = [0, 1, 2].filter((a) => a !== axis);
  const isAcross = across.every((a) => point[a] > lows[a] + EPS && point[a] < highs[a] - EPS);
  if (!isAcross) return false;
  return isPositive ? highs[axis] > point[axis] + EPS : lows[axis] < point[axis] - EPS;
};

/** Is any sample of a rectangle on a face seen: in the open a hair in front, and a clear line straight out? */
const isSeen = (face: Face, rect: [number, number, number, number], world: Box[]): boolean => {
  const [u0, u1, v0, v1] = rect;
  const u = (face.axis + 1) % 3;
  const v = (face.axis + 2) % 3;
  for (let s = 0; s < SAMPLES; s++) {
    for (let r = 0; r < SAMPLES; r++) {
      const point = [0, 0, 0];
      point[face.axis] = face.plane + (face.isPositive ? PROBE : -PROBE);
      point[u] = u0 + ((s + 0.5) / SAMPLES) * (u1 - u0);
      point[v] = v0 + ((r + 0.5) / SAMPLES) * (v1 - v0);
      const isBuried = world.some((b) => isInsideBox(point, b));
      if (isBuried) continue;
      const isBlocked = world.some((b) => isLineBlockedBy(point, face.axis, face.isPositive, b));
      if (!isBlocked) return true;
    }
  }
  return false;
};

const round = (n: number): number => Math.round(n * 100) / 100;

/** A clash: two faces of different colour on one plane, the part of them that overlaps and is seen */
interface Clash {
  face: Face;
  rect: [number, number, number, number];
  other: string;
}

/** What a clash reads as: `x+ 4 (y 14..14.5 × z 0..2.5) #aabbcc vs #ddeeff` */
const describeClash = ({ face, rect, other }: Clash): string => {
  const u = AXIS_NAMES[(face.axis + 1) % 3];
  const v = AXIS_NAMES[(face.axis + 2) % 3];
  const [u0, u1, v0, v1] = rect.map(round);
  const colors = [face.color, other].sort().join(" vs ");
  return `${AXIS_NAMES[face.axis]}${face.isPositive ? "+" : "-"} ${round(face.plane)} (${u} ${u0}..${u1} × ${v} ${v0}..${v1}) ${colors}`;
};

/** The faces that can be seen from above or the sides, gathered by the plane and the way they face */
const planesOf = (faces: Face[]): Face[][] => {
  const byPlane = new Map<string, Face[]>();
  for (const face of faces) {
    const isFacingDown = face.axis === 1 && !face.isPositive;
    if (isFacingDown) continue;
    const key = `${face.axis}${face.isPositive ? "+" : "-"}${face.plane.toFixed(3)}`;
    byPlane.set(key, [...(byPlane.get(key) ?? []), face]);
  }
  return [...byPlane.values()];
};

/** The rectangle two faces on one plane share, or nothing if they only touch */
const sharedRect = (a: Face, b: Face): [number, number, number, number] | undefined => {
  const rect: [number, number, number, number] = [Math.max(a.u0, b.u0), Math.min(a.u1, b.u1), Math.max(a.v0, b.v0), Math.min(a.v1, b.v1)];
  const isWideEnough = rect[1] - rect[0] > MIN_OVERLAP;
  const isTallEnough = rect[3] - rect[2] > MIN_OVERLAP;
  const isOverlapping = isWideEnough && isTallEnough;
  return isOverlapping ? rect : undefined;
};

/** Every pair of different-coloured faces on one plane, facing one way, that overlap where they are seen */
const clashesIn = (boxes: Box[], world: Box[]): Clash[] => {
  const clashes: Clash[] = [];
  for (const faces of planesOf(facesOf(buildMeshData(boxes)))) {
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        const [a, b] = [faces[i], faces[j]];
        const isSameColor = a.color === b.color;
        if (isSameColor) continue;
        const rect = sharedRect(a, b);
        if (!rect) continue;
        const isFlickering = isSeen(a, rect, world);
        if (isFlickering) clashes.push({ face: a, rect, other: b.color });
      }
    }
  }
  return clashes;
};

/** A clash and the look it was found on */
interface Found {
  hair: HairStyle;
  hat: HatStyle;
  isHooded: boolean;
  clash: Clash;
}

const isPair = ({ face, other }: Clash, a: string, b: string): boolean =>
  (face.color === a && other === b) || (face.color === b && other === a);

/** A plane a clash may lie on: the axis, which way it faces and where it is */
interface PlaneKey {
  axis: number;
  isPositive: boolean;
  plane: number;
}

const isOnPlane = ({ face }: Clash, key: PlaneKey): boolean =>
  face.axis === key.axis && face.isPositive === key.isPositive && Math.abs(face.plane - key.plane) < 1e-3;

/** One recorded clash: it is allowed only for these hairs, these hats (hooded or not), these planes and this pair of colours */
interface ArtDebt {
  hairs: HairStyle[];
  hats: HatStyle[];
  isHooded: boolean;
  planes: PlaneKey[];
  pairs: Array<[string, string]>;
}

const xPlus = (plane: number): PlaneKey => ({ axis: 0, isPositive: true, plane });
const xMinus = (plane: number): PlaneKey => ({ axis: 0, isPositive: false, plane });
const yPlus = (plane: number): PlaneKey => ({ axis: 1, isPositive: true, plane });
const zPlus = (plane: number): PlaneKey => ({ axis: 2, isPositive: true, plane });
const zMinus = (plane: number): PlaneKey => ({ axis: 2, isPositive: false, plane });

/**
 * Pre-existing on master before feat/voxel-half-unit, recorded as art debt:
 *  - the hood's dark trim against the hood's sides (every hair, the bare head with the hood raised)
 *  - a bob's panels against the bandana's sides and back, a long cut's against its sides
 *  - a bob's or a long cut's slab against the crown's ring top
 *  - curly hair against the ear, on every hat (the side mass and the ear share a front plane)
 *  - curly lumps against the crown's ring and its tips
 *  - hair against the back planes of the beanie (curly, long), the crown (long) and the helmet (curly, long)
 *  - the ponytail's tie against the bandana's tail
 *  - bun hair against the flower's petal
 * A new pair in any of these combinations still fails: each entry names the hairs, the hats, the planes and the colours.
 */
const PREDATING: ArtDebt[] = [
  { hairs: HAIR_STYLES, hats: ["none"], isHooded: true, planes: [xPlus(4.25), xMinus(-4.25), zPlus(4.4)], pairs: [[HOODIE_COLOR, HOOD_TRIM_COLOR]] },
  { hairs: ["bob"], hats: ["bandana"], isHooded: false, planes: [xPlus(4), xMinus(-4), zMinus(-4)], pairs: [[HAIR_COLOR, HAT_COLOR]] },
  { hairs: ["long"], hats: ["bandana"], isHooded: false, planes: [xPlus(4), xMinus(-4)], pairs: [[HAIR_COLOR, HAT_COLOR]] },
  { hairs: ["bob", "long"], hats: ["crown"], isHooded: false, planes: [yPlus(15.75)], pairs: [[HAIR_COLOR, HAT_COLOR]] },
  { hairs: ["curly"], hats: HAT_STYLES, isHooded: false, planes: [zPlus(0.5)], pairs: [[HAIR_COLOR, EAR_COLOR]] },
  {
    hairs: ["curly"],
    hats: ["crown"],
    isHooded: false,
    planes: [xPlus(4.25), xMinus(-4.25), zPlus(4.25)],
    pairs: [
      [CURL_COLOR, HAT_COLOR],
      [CURL_COLOR, CROWN_TIP_COLOR],
    ],
  },
  { hairs: ["curly", "long"], hats: ["beanie"], isHooded: false, planes: [zMinus(-4.25)], pairs: [[HAIR_COLOR, BEANIE_BASE_COLOR]] },
  { hairs: ["long"], hats: ["crown"], isHooded: false, planes: [zMinus(-4.25)], pairs: [[HAIR_COLOR, HAT_COLOR]] },
  { hairs: ["curly", "long"], hats: ["helmet"], isHooded: false, planes: [zMinus(-4.25)], pairs: [[HAIR_COLOR, HAT_COLOR]] },
  { hairs: ["ponytail"], hats: ["bandana"], isHooded: false, planes: [yPlus(13.5)], pairs: [[TIE_COLOR, HAT_COLOR]] },
  { hairs: ["bun"], hats: ["flower"], isHooded: false, planes: [zPlus(1.5)], pairs: [[HAIR_COLOR, HAT_COLOR]] },
];

/** Is a clash one of the recorded ones? */
const isRecorded = ({ hair, hat, isHooded, clash }: Found, debt: ArtDebt): boolean => {
  const isHairListed = debt.hairs.includes(hair);
  const isHatListed = debt.hats.includes(hat);
  const isHoodSame = debt.isHooded === isHooded;
  const isPlaneListed = debt.planes.some((key) => isOnPlane(clash, key));
  const isPairListed = debt.pairs.some(([a, b]) => isPair(clash, a, b));
  return isHairListed && isHatListed && isHoodSame && isPlaneListed && isPairListed;
};

/** The look the builder assembles for a hair, a hat and a hood: a hoodie with no hat raises its hood */
const lookOf = (hair: HairStyle, hat: HatStyle, isHooded: boolean): HeroLook => ({
  ...DEFAULT_LOOK,
  hair,
  hairColor: HAIR_COLOR,
  hat,
  hatColor: HAT_COLOR,
  outfit: isHooded ? "hoodie" : "tunic",
  outfitColor: HOODIE_COLOR,
});

/** The clashes of one hair and hat that are not left as they were, each read as `hair/hat[/hooded]: ...` */
const newClashesOf = (hair: HairStyle, hat: HatStyle, isHooded: boolean): string[] => {
  const parts = assembleHero(lookOf(hair, hat, isHooded));
  const head = parts.find((p) => p.name === "head");
  const torso = parts.find((p) => p.name === "torso");
  const isIncomplete = !head || !torso;
  if (isIncomplete) throw new Error("the hero has no head or no torso");
  const label = `${hair}/${hat}${isHooded ? "/hooded" : ""}`;
  return clashesIn(head.boxes, [...head.boxes, ...torso.boxes])
    .map((clash): Found => ({ hair, hat, isHooded, clash }))
    .filter((found) => !PREDATING.some((debt) => isRecorded(found, debt)))
    .map((found) => `${label}: ${describeClash(found.clash)}`);
};

describe("head overlaps", () => {
  // Only a bare head raises the hood, so the "none" hat is checked both ways
  it.each(HAT_STYLES)("draws no two faces of different colours on one plane with the %s hat", (hat) => {
    const hoods = hat === "none" ? [false, true] : [false];
    const clashes = HAIR_STYLES.flatMap((hair) => hoods.flatMap((isHooded) => newClashesOf(hair, hat, isHooded)));
    expect(clashes).toEqual([]);
  });
});
