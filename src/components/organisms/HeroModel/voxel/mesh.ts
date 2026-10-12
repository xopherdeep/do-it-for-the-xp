/**
 * Box list -> triangle soup, with no three.js in sight so it stays testable and can be inspected in node.
 *
 * A box is an axis aligned block: `x, y, z` is its MINIMUM corner, `w, h, d` its size, in character space
 * (16 units tall, origin at the feet centre, +Y up, +Z toward the camera). Fractions are fine.
 *
 * Faces that can never be seen are dropped: a face is hidden when another box of the same part either has the
 * opposite face on the same plane covering it (touching voxels), or swallows it (the plane lies inside that box).
 */
export interface Box {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  /** CSS hex colour, #rrggbb */
  color: string;
}

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  /** sRGB 0..1, three floats per vertex; the renderer converts to its working space */
  colors: Float32Array;
  indices: Uint32Array;
  faceCount: number;
}

type Axis = 0 | 1 | 2;
const AXES: Axis[] = [0, 1, 2];
const EPS = 1e-5;

const lo = (b: Box, a: Axis): number => {
  if (a === 0) return b.x;
  if (a === 1) return b.y;
  return b.z;
};
const size = (b: Box, a: Axis): number => {
  if (a === 0) return b.w;
  if (a === 1) return b.h;
  return b.d;
};
const hi = (b: Box, a: Axis): number => lo(b, a) + size(b, a);

export const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return [1, 0, 1];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** Is the face of `box` on `axis` (positive side if `positive`) hidden by one of `others`? */
const isHidden = (box: Box, axis: Axis, positive: boolean, others: Box[]): boolean => {
  const plane = positive ? hi(box, axis) : lo(box, axis);
  const u = ((axis + 1) % 3) as Axis;
  const v = ((axis + 2) % 3) as Axis;
  for (const o of others) {
    if (o === box) continue;
    const touching = Math.abs((positive ? lo(o, axis) : hi(o, axis)) - plane) < EPS;
    const swallowing = lo(o, axis) < plane - EPS && hi(o, axis) > plane + EPS;
    const cannotHideFace = !touching && !swallowing;
    if (cannotHideFace) continue;
    const isFaceCovered =
      lo(o, u) <= lo(box, u) + EPS &&
      hi(o, u) >= hi(box, u) - EPS &&
      lo(o, v) <= lo(box, v) + EPS &&
      hi(o, v) >= hi(box, v) - EPS;
    if (isFaceCovered) {
      return true;
    }
  }
  return false;
};

/** Which faces of `box` survive culling against `others`: [axis, positive][] */
export const visibleFaces = (box: Box, others: Box[]): Array<[Axis, boolean]> => {
  const out: Array<[Axis, boolean]> = [];
  for (const axis of AXES) {
    for (const positive of [true, false]) {
      if (!isHidden(box, axis, positive, others)) out.push([axis, positive]);
    }
  }
  return out;
};

export const buildMeshData = (boxes: Box[]): MeshData => {
  const faces: Array<{ box: Box; axis: Axis; positive: boolean }> = [];
  for (const box of boxes) {
    const isEmptyBox = box.w <= 0 || box.h <= 0 || box.d <= 0;
    if (isEmptyBox) continue;
    for (const [axis, positive] of visibleFaces(box, boxes)) faces.push({ box, axis, positive });
  }

  const positions = new Float32Array(faces.length * 12);
  const normals = new Float32Array(faces.length * 12);
  const colors = new Float32Array(faces.length * 12);
  const indices = new Uint32Array(faces.length * 6);

  faces.forEach(({ box, axis, positive }, i) => {
    const u = ((axis + 1) % 3) as Axis;
    const v = ((axis + 2) % 3) as Axis;
    const plane = positive ? hi(box, axis) : lo(box, axis);
    // Corners counter-clockwise seen from outside when the face points along +axis (u x v = +axis);
    // flip the walk for the negative side.
    const corners: Array<[number, number]> = [
      [lo(box, u), lo(box, v)],
      [hi(box, u), lo(box, v)],
      [hi(box, u), hi(box, v)],
      [lo(box, u), hi(box, v)],
    ];
    if (!positive) corners.reverse();
    const [r, g, b] = hexToRgb(box.color);
    corners.forEach(([cu, cv], k) => {
      const o = i * 12 + k * 3;
      positions[o + axis] = plane;
      positions[o + u] = cu;
      positions[o + v] = cv;
      normals[o + axis] = positive ? 1 : -1;
      colors[o] = r;
      colors[o + 1] = g;
      colors[o + 2] = b;
    });
    const base = i * 4;
    indices.set([base, base + 1, base + 2, base, base + 2, base + 3], i * 6);
  });

  return { positions, normals, colors, indices, faceCount: faces.length };
};
