/**
 * Box list -> triangle soup, with no three.js in sight so it stays testable and can be inspected in node.
 *
 * A box is an axis aligned block: `x, y, z` is its MINIMUM corner, `w, h, d` its size, in character space
 * (16 units tall, origin at the feet centre, +Y up, +Z toward the camera). Fractions are fine.
 *
 * Faces that can never be seen are dropped: a face is hidden when another box of the same part either has the
 * opposite face on the same plane covering it (touching voxels), or swallows it (the plane lies inside that box).
 *
 * Every face also carries what the voxel shader (organisms/voxel/voxelMaterial.ts) needs to shade it, baked here once:
 * - ambient occlusion per corner: how many of the four spots just above the surface round that corner are solid. A
 *   face that something touches is cut so the shade stays a soft band AO_CELL wide at the contact instead of smearing
 *   across a long face; the open rest of it, and an open face, stay one quad.
 * - which of its edges are convex (the solid stops there): the shader rims those with a bevel highlight. A seam where
 *   the same surface carries on into the next box, or a crease into a wall, gets none.
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
  /** Baked ambient occlusion, one float per vertex: 1 is open sky, lower is tucked into a corner */
  ao: Float32Array;
  /**
   * Four floats per vertex: where the vertex sits on its quad in world units (u, v from the quad's low corner) and the
   * quad's size (w, h). The shader measures how far a pixel is from each edge with it.
   */
  faceUv: Float32Array;
  /** Four floats per vertex, the same on all four of a quad's corners: 1 where its low-u, high-u, low-v, high-v edge is convex */
  edges: Float32Array;
  indices: Uint32Array;
  /** Quads emitted (an occluded face may be cut into several) */
  faceCount: number;
}

type Axis = 0 | 1 | 2;
const AXES: Axis[] = [0, 1, 2];
const EPS = 1e-5;

const lo = (b: Box, a: Axis): number => {
  const isAxisX = a === 0;
  if (isAxisX) return b.x;
  const isAxisY = a === 1;
  if (isAxisY) return b.y;
  return b.z;
};
const size = (b: Box, a: Axis): number => {
  const isAxisX = a === 0;
  if (isAxisX) return b.w;
  const isAxisY = a === 1;
  if (isAxisY) return b.h;
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

/** Largest cell a touched face is cut into, in world units: the width of the occlusion band at a contact */
const AO_CELL = 1;
/**
 * How far above the surface, and how far round a corner, the occlusion samples look. Lifted past the 0.25 that painted
 * details (eyes, mouths, cheeks) stand off a face, so they do not smudge it.
 */
const AO_LIFT = 0.3;
const AO_REACH = 0.3;
/** Shade for 0..4 solid spots round a corner */
const AO_LEVELS = [1, 0.74, 0.56, 0.44, 0.38];
/**
 * How far each quad is grown past its edges. Where a face is cut into strips, or meets the face of the next box, the
 * corners of one quad land on the middle of another's edge and the rasteriser leaves pinholes along the join; a
 * hair of overlap closes them and is far too thin to see.
 */
const GROUT = 0.003;
/** How far past an edge the convexity probe looks */
const EDGE_PROBE = 0.02;

/** A unit cell's bucket key: a number, so the hot lookup builds no strings (models stay well inside +-512 units) */
const cellKey = (x: number, y: number, z: number): number => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);

/** Boxes bucketed by the unit cells they overlap, to find the few that come near a face without testing all of them */
const bucketed = (boxes: Box[]): ((min: number[], max: number[]) => Box[]) => {
  const grid = new Map<number, number[]>();
  boxes.forEach((b, index) => {
    const isEmptyBox = b.w <= 0 || b.h <= 0 || b.d <= 0;
    if (isEmptyBox) return;
    for (let x = Math.floor(b.x); x <= Math.floor(b.x + b.w - EPS); x++)
      for (let y = Math.floor(b.y); y <= Math.floor(b.y + b.h - EPS); y++)
        for (let z = Math.floor(b.z); z <= Math.floor(b.z + b.d - EPS); z++) {
          const key = cellKey(x, y, z);
          const bucket = grid.get(key);
          if (bucket) bucket.push(index);
          else grid.set(key, [index]);
        }
  });
  // A box spans several cells: stamp it with the query number so it is reported once
  const seen = new Int32Array(boxes.length);
  let query = 0;
  /** The boxes whose inside overlaps the region */
  return (min, max) => {
    query++;
    const found: Box[] = [];
    for (let x = Math.floor(min[0]); x <= Math.floor(max[0]); x++)
      for (let y = Math.floor(min[1]); y <= Math.floor(max[1]); y++)
        for (let z = Math.floor(min[2]); z <= Math.floor(max[2]); z++) {
          const bucket = grid.get(cellKey(x, y, z));
          if (!bucket) continue;
          for (const index of bucket) {
            const isSeenThisQuery = seen[index] === query;
            if (isSeenThisQuery) continue;
            seen[index] = query;
            const o = boxes[index];
            const overlaps =
              o.x < max[0] - EPS && o.x + o.w > min[0] + EPS &&
              o.y < max[1] - EPS && o.y + o.h > min[1] + EPS &&
              o.z < max[2] - EPS && o.z + o.d > min[2] + EPS;
            if (overlaps) found.push(o);
          }
        }
    return found;
  };
};

/** How far past a face the boxes that could hide it are looked for: one that touches or swallows the plane reaches in */
const HIDE_REACH = 0.01;

/** The face's own rectangle thickened into a thin slab on its plane: a hiding box starts on the plane or crosses it */
const faceSlab = (box: Box, axis: Axis, positive: boolean): [number[], number[]] => {
  const plane = positive ? hi(box, axis) : lo(box, axis);
  const u = ((axis + 1) % 3) as Axis;
  const v = ((axis + 2) % 3) as Axis;
  const min = [0, 0, 0];
  const max = [0, 0, 0];
  min[axis] = positive ? plane : plane - HIDE_REACH;
  max[axis] = positive ? plane + HIDE_REACH : plane;
  min[u] = lo(box, u);
  max[u] = hi(box, u);
  min[v] = lo(box, v);
  max[v] = hi(box, v);
  return [min, max];
};

/** Is the face of `box` on `axis` (positive side if `positive`) hidden by a box `near` finds beside it? */
const isHidden = (box: Box, axis: Axis, positive: boolean, near: ReturnType<typeof bucketed>): boolean => {
  const plane = positive ? hi(box, axis) : lo(box, axis);
  const u = ((axis + 1) % 3) as Axis;
  const v = ((axis + 2) % 3) as Axis;
  const [min, max] = faceSlab(box, axis, positive);
  for (const o of near(min, max)) {
    const isSelf = o === box;
    if (isSelf) continue;
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

/** Which faces of `box` survive culling against the boxes `near` finds: [axis, positive][] */
const visibleFacesNear = (box: Box, near: ReturnType<typeof bucketed>): Array<[Axis, boolean]> => {
  const out: Array<[Axis, boolean]> = [];
  for (const axis of AXES) {
    for (const positive of [true, false]) {
      if (!isHidden(box, axis, positive, near)) out.push([axis, positive]);
    }
  }
  return out;
};

/** Which faces of `box` survive culling against `others`: [axis, positive][] */
export const visibleFaces = (box: Box, others: Box[]): Array<[Axis, boolean]> => visibleFacesNear(box, bucketed(others));

/** Equal steps from lo to hi, none longer than AO_CELL */
const steps = (from: number, to: number): number[] => {
  const n = Math.max(1, Math.ceil((to - from) / AO_CELL - EPS));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(from + ((to - from) * i) / n);
  return out;
};

interface Quad {
  axis: Axis;
  positive: boolean;
  plane: number;
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  color: [number, number, number];
  /** Corners in the order (u0,v0) (u1,v0) (u1,v1) (u0,v1) */
  ao: [number, number, number, number];
  /** low-u, high-u, low-v, high-v */
  edges: [number, number, number, number];
}

/** A face as one or more quads with their occlusion and convex edges */
const shadeFace = (box: Box, axis: Axis, positive: boolean, near: (min: number[], max: number[]) => Box[]): Quad[] => {
  const u = ((axis + 1) % 3) as Axis;
  const v = ((axis + 2) % 3) as Axis;
  const plane = positive ? hi(box, axis) : lo(box, axis);
  const out = positive ? 1 : -1;
  const color = hexToRgb(box.color);
  const point = (n: number, cu: number, cv: number): number[] => {
    const p = [0, 0, 0];
    p[axis] = plane + n;
    p[u] = cu;
    p[v] = cv;
    return p;
  };

  // Every probe lands in a thin slab over the face, never inside the face's own box. With nothing else in that slab
  // the face is open and every rim is convex: one quad, no sampling.
  const reach = AO_REACH + EDGE_PROBE;
  const slabA = point(-out * EDGE_PROBE, lo(box, u) - reach, lo(box, v) - reach);
  const slabB = point(out * (AO_LIFT + EDGE_PROBE), hi(box, u) + reach, hi(box, v) + reach);
  const neighbours = near(
    AXES.map((k) => Math.min(slabA[k], slabB[k])),
    AXES.map((k) => Math.max(slabA[k], slabB[k])),
  ).filter((o) => o !== box);
  const hasNeighbours = neighbours.length > 0;
  if (!hasNeighbours) {
    return [{ axis, positive, plane, u0: lo(box, u), u1: hi(box, u), v0: lo(box, v), v1: hi(box, v), color, ao: [1, 1, 1, 1], edges: [1, 1, 1, 1] }];
  }
  const us = steps(lo(box, u), hi(box, u));
  const vs = steps(lo(box, v), hi(box, v));
  const cellsU = us.length - 1;
  const cellsV = vs.length - 1;

  // Occlusion at every grid point: which of the four spots just above the surface round it are solid. Each neighbour
  // stamps the grid points whose spots it holds (one bit per spot), so the cost follows the neighbours, not the samples.
  const lifted = plane + out * AO_LIFT;
  const spots = us.map(() => vs.map(() => 0));
  for (const o of neighbours) {
    const holdsLift = lo(o, axis) + EPS < lifted && lifted < hi(o, axis) - EPS;
    if (!holdsLift) continue;
    const [ou0, ou1, ov0, ov1] = [lo(o, u) + EPS, hi(o, u) - EPS, lo(o, v) + EPS, hi(o, v) - EPS];
    for (let bit = 0; bit < 4; bit++) {
      const du = bit & 1 ? AO_REACH : -AO_REACH;
      const dv = bit & 2 ? AO_REACH : -AO_REACH;
      for (let i = 0; i < us.length; i++) {
        const su = us[i] + du;
        const isOutsideU = su <= ou0 || su >= ou1;
        if (isOutsideU) continue;
        for (let j = 0; j < vs.length; j++) {
          const sv = vs[j] + dv;
          const isInsideV = sv > ov0 && sv < ov1;
          if (isInsideV) spots[i][j] |= 1 << bit;
        }
      }
    }
  }
  const SOLID = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
  const aoAt = spots.map((column) => column.map((mask) => AO_LEVELS[SOLID[mask]]));

  // An edge of the face is convex where, just past it, there is neither more of the surface (a seam) nor a wall (a crease)
  const isSolid = (n: number, cu: number, cv: number): boolean =>
    neighbours.some(
      (o) =>
        n > lo(o, axis) + EPS && n < hi(o, axis) - EPS &&
        cu > lo(o, u) + EPS && cu < hi(o, u) - EPS &&
        cv > lo(o, v) + EPS && cv < hi(o, v) - EPS,
    );
  const isConvex = (cu: number, cv: number, du: number, dv: number): number => {
    const pu = cu + du * EDGE_PROBE;
    const pv = cv + dv * EDGE_PROBE;
    return isSolid(plane - out * EDGE_PROBE, pu, pv) || isSolid(plane + out * EDGE_PROBE, pu, pv) ? 0 : 1;
  };
  // The rim's convexity, one flag per cell along each side
  const lowU = vs.slice(1).map((cv, j) => isConvex(us[0], (vs[j] + cv) / 2, -1, 0));
  const highU = vs.slice(1).map((cv, j) => isConvex(us[cellsU], (vs[j] + cv) / 2, 1, 0));
  const lowV = us.slice(1).map((cu, i) => isConvex((us[i] + cu) / 2, vs[0], 0, -1));
  const highV = us.slice(1).map((cu, i) => isConvex((us[i] + cu) / 2, vs[cellsV], 0, 1));

  const used = us.slice(1).map(() => vs.slice(1).map(() => false));
  /** Is the shade the same at grid points (i, ja..jb) / (ia..ib, j)? */
  const isFlatAlongV = (i: number, ja: number, jb: number): boolean => {
    for (let j = ja + 1; j <= jb; j++) {
      const isShadeChanged = aoAt[i][j] !== aoAt[i][ja];
      if (isShadeChanged) return false;
    }
    return true;
  };
  const isFlatAlongU = (j: number, ia: number, ib: number): boolean => {
    for (let i = ia + 1; i <= ib; i++) {
      const isShadeChanged = aoAt[i][j] !== aoAt[ia][j];
      if (isShadeChanged) return false;
    }
    return true;
  };
  const isFlatRun = (flags: number[], a: number, b: number): boolean => {
    for (let k = a + 1; k <= b; k++) {
      const isFlagChanged = flags[k] !== flags[a];
      if (isFlagChanged) return false;
    }
    return true;
  };
  /**
   * Can cells i0..i1 x j0..j1 be one quad and still shade the same? Only if the bilinear blend across its four corners
   * matches the grid inside it: open throughout, or a one-cell-wide strip whose shade only changes across the strip
   * (the band along a wall). And the stretch of each rim it touches must be all bevelled or all not.
   */
  const fits = (i0: number, i1: number, j0: number, j1: number): boolean => {
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        const isCellUsed = used[i][j];
        if (isCellUsed) return false;
      }
    let isOpen = true;
    for (let i = i0; i <= i1 + 1 && isOpen; i++) for (let j = j0; j <= j1 + 1 && isOpen; j++) isOpen = aoAt[i][j] === 1;
    const isAlongV = i0 === i1 && isFlatAlongV(i0, j0, j1 + 1) && isFlatAlongV(i0 + 1, j0, j1 + 1);
    const isAlongU = j0 === j1 && isFlatAlongU(j0, i0, i1 + 1) && isFlatAlongU(j0 + 1, i0, i1 + 1);
    const isBlendMismatched = !isOpen && !isAlongV && !isAlongU;
    if (isBlendMismatched) return false;
    return (
      (i0 > 0 || isFlatRun(lowU, j0, j1)) &&
      (i1 < cellsU - 1 || isFlatRun(highU, j0, j1)) &&
      (j0 > 0 || isFlatRun(lowV, i0, i1)) &&
      (j1 < cellsV - 1 || isFlatRun(highV, i0, i1))
    );
  };

  // Cells merge greedily into the largest rectangles that shade the same, so a contact costs a strip, not a grid
  const quads: Quad[] = [];
  for (let j = 0; j < cellsV; j++) {
    for (let i = 0; i < cellsU; i++) {
      const isCellUsed = used[i][j];
      if (isCellUsed) continue;
      let i1 = i;
      while (i1 + 1 < cellsU && fits(i, i1 + 1, j, j)) i1++;
      let j1 = j;
      while (j1 + 1 < cellsV && fits(i, i1, j, j1 + 1)) j1++;
      for (let a = i; a <= i1; a++) for (let b = j; b <= j1; b++) used[a][b] = true;
      quads.push({
        axis,
        positive,
        plane,
        u0: us[i],
        u1: us[i1 + 1],
        v0: vs[j],
        v1: vs[j1 + 1],
        color,
        ao: [aoAt[i][j], aoAt[i1 + 1][j], aoAt[i1 + 1][j1 + 1], aoAt[i][j1 + 1]],
        edges: [i === 0 ? lowU[j] : 0, i1 === cellsU - 1 ? highU[j] : 0, j === 0 ? lowV[i] : 0, j1 === cellsV - 1 ? highV[i] : 0],
      });
    }
  }
  return quads;
};

/**
 * `occluders` are boxes that are not drawn here but sit against these ones (a neighbouring part of the same model):
 * they shade the contact and stop a bevel, but never hide a face.
 */
export const buildMeshData = (boxes: Box[], occluders: Box[] = []): MeshData => {
  // Only the part's own boxes hide a face; the occluders join them to shade it
  const own = bucketed(boxes);
  const near = occluders.length ? bucketed([...boxes, ...occluders]) : own;
  const quads: Quad[] = [];
  for (const box of boxes) {
    const isEmptyBox = box.w <= 0 || box.h <= 0 || box.d <= 0;
    if (isEmptyBox) continue;
    for (const [axis, positive] of visibleFacesNear(box, own)) quads.push(...shadeFace(box, axis, positive, near));
  }

  const positions = new Float32Array(quads.length * 12);
  const normals = new Float32Array(quads.length * 12);
  const colors = new Float32Array(quads.length * 12);
  const ao = new Float32Array(quads.length * 4);
  const faceUv = new Float32Array(quads.length * 16);
  const edges = new Float32Array(quads.length * 16);
  const indices = new Uint32Array(quads.length * 6);

  // Corners counter-clockwise seen from outside when the face points along +axis (u x v = +axis); the negative side
  // walks them the other way. Corner c of a quad is (u0,v0) (u1,v0) (u1,v1) (u0,v1).
  const CORNER_U = [0, 1, 1, 0];
  const CORNER_V = [0, 0, 1, 1];
  quads.forEach((q, i) => {
    const u = (q.axis + 1) % 3;
    const v = (q.axis + 2) % 3;
    const w = q.u1 - q.u0;
    const h = q.v1 - q.v0;
    for (let k = 0; k < 4; k++) {
      const c = q.positive ? k : 3 - k;
      const cu = CORNER_U[c] ? q.u1 : q.u0;
      const cv = CORNER_V[c] ? q.v1 : q.v0;
      const o = i * 12 + k * 3;
      positions[o + q.axis] = q.plane;
      positions[o + u] = cu + (CORNER_U[c] ? GROUT : -GROUT);
      positions[o + v] = cv + (CORNER_V[c] ? GROUT : -GROUT);
      normals[o + q.axis] = q.positive ? 1 : -1;
      colors[o] = q.color[0];
      colors[o + 1] = q.color[1];
      colors[o + 2] = q.color[2];
      const vertex = i * 4 + k;
      ao[vertex] = q.ao[c];
      const t = vertex * 4;
      faceUv[t] = cu - q.u0;
      faceUv[t + 1] = cv - q.v0;
      faceUv[t + 2] = w;
      faceUv[t + 3] = h;
      edges[t] = q.edges[0];
      edges[t + 1] = q.edges[1];
      edges[t + 2] = q.edges[2];
      edges[t + 3] = q.edges[3];
    }
    const base = i * 4;
    const n = i * 6;
    indices[n] = base;
    indices[n + 1] = base + 1;
    indices[n + 2] = base + 2;
    indices[n + 3] = base;
    indices[n + 4] = base + 2;
    indices[n + 5] = base + 3;
  });

  return { positions, normals, colors, ao, faceUv, edges, indices, faceCount: quads.length };
};
