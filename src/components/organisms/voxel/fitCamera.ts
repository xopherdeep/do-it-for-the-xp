/**
 * Where a camera stands so a whole voxel model sits inside its view. Pure maths, no three.js: a model's bounds go in
 * (a THREE.Box3 will do, so will any {min, max}), the distance and the point to look at come out. Every viewer (the
 * hero stage and its thumbnails, the shared landmark renderer behind buildings, temples, rooms, chests, monsters and
 * items) keeps its own lens and elevation and lets this decide only how far back to stand and where to look, once the
 * model is built and again whenever the view changes shape.
 *
 * The camera looks at `target` from `distance` away, straight above the +Z side of it and raised by `elevation`:
 * position = target + distance * (0, sin e, cos e). The view's half-width and half-height are tan(fov/2) times the
 * depth (the half-width times the aspect); every point of the model must land inside (1 - margin) of both.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A THREE.Box3 is one of these */
export interface Bounds {
  min: Vec3;
  max: Vec3;
}

/** How far a turning model reaches from the vertical axis at one height */
export interface Ring {
  y: number;
  radius: number;
}

export interface FitInput {
  bounds: Bounds;
  /** The view's width over its height */
  aspect: number;
  /** The lens: vertical field of view in degrees */
  fov: number;
  /** How far the camera is raised above the target's level, in radians (0 = level, looking straight at it) */
  elevation: number;
  /** Air on every side, as a share of the half-view. FIT_MARGIN when left out. */
  margin?: number;
  /** The model is turned this many radians about the vertical axis through the origin (still pictures) */
  yaw?: number;
  /**
   * The model turns (it spins, or a finger drags it round): the fit then holds in every yaw, with the model swept into
   * circles round the vertical axis through the origin instead of the box. A number is the farthest any part strays
   * (a cylinder from the bounds' bottom to their top); rings say how far it strays at each height, so a spire or a
   * tower is not given the room of its widest floor.
   */
  turns?: number | Ring[];
}

export interface CameraFit {
  /** From the target to the camera */
  distance: number;
  /** What the camera looks at: the centre of the model as the view sees it */
  target: Vec3;
}

/** Air kept round a model: 8% of the half-view on every side */
export const FIT_MARGIN = 0.08;

/** The nearest point of the model stays at least this far in front of the camera, whatever else is asked */
const NEAR_CLEARANCE = 2;
/** Points round the circle a turning model sweeps: a point every 11 degrees misses the true edge by less than 1% */
const RING_POINTS = 32;
/** The target is moved to the middle of what the view shows a few times: each pass is closer, the last is within a hair */
const CENTRING_PASSES = 4;

const finiteOr = (value: number | undefined, fallback: number): number => {
  const number = value ?? Number.NaN;
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

/** The rings a `turns` value describes: a number is one cylinder from the bounds' bottom to their top */
const ringsOf = (bounds: Bounds, turns: number | Ring[] | undefined): Ring[] => {
  if (Array.isArray(turns)) {
    const isUsable = (ring: Ring): boolean => Number.isFinite(ring.y) && Number.isFinite(ring.radius) && ring.radius > 0;
    return turns.filter(isUsable);
  }
  const radius = turns ?? 0;
  const isCylinder = Number.isFinite(radius) && radius > 0;
  if (isCylinder) {
    return [
      { y: bounds.min.y, radius },
      { y: bounds.max.y, radius },
    ];
  }
  return [];
};

/** Every point of the model that has to stay on screen, in the world's frame */
const worstPoints = (bounds: Bounds, yaw: number, rings: Ring[]): Vec3[] => {
  const points: Vec3[] = [];
  const hasRings = rings.length > 0;
  if (hasRings) {
    // The farthest a turning part gets is on a circle round the axis, at the height where it is
    for (const { y, radius } of rings) {
      for (let i = 0; i < RING_POINTS; i++) {
        const angle = (i / RING_POINTS) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius });
      }
    }
    return points;
  }
  const { min, max } = bounds;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        // three.js turns by +yaw about Y: x' = x cos + z sin, z' = -x sin + z cos
        points.push({ x: x * cos + z * sin, y, z: -x * sin + z * cos });
      }
    }
  }
  return points;
};

export interface Measured {
  bounds: Bounds;
  /** How far the model strays from the vertical axis through the origin, slice by slice up its height: what it sweeps when it turns */
  rings: Ring[];
}

/** Slices a model is cut into to find how far it reaches at each height */
const SLICES = 16;

/** The bounds and the turning rings of a flat x, y, z, x, y, z... vertex list; null when there is nothing in it */
export const measurePositions = (positions: ArrayLike<number>): Measured | null => {
  const isMissingVertex = positions.length < 3;
  if (isMissingVertex) return null;
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (let i = 0; i + 2 < positions.length; i += 3) {
    min.x = Math.min(min.x, positions[i]);
    min.y = Math.min(min.y, positions[i + 1]);
    min.z = Math.min(min.z, positions[i + 2]);
    max.x = Math.max(max.x, positions[i]);
    max.y = Math.max(max.y, positions[i + 1]);
    max.z = Math.max(max.z, positions[i + 2]);
  }
  // Each slice keeps the widest reach of any vertex in it, and is drawn as a ring at its own lowest and highest vertex
  const height = max.y - min.y;
  const slices = height > 0 ? SLICES : 1;
  const reach = new Array<number>(slices).fill(0);
  const low = new Array<number>(slices).fill(Infinity);
  const high = new Array<number>(slices).fill(-Infinity);
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const y = positions[i + 1];
    const slice = height > 0 ? Math.min(slices - 1, Math.floor(((y - min.y) / height) * slices)) : 0;
    reach[slice] = Math.max(reach[slice], Math.hypot(positions[i], positions[i + 2]));
    low[slice] = Math.min(low[slice], y);
    high[slice] = Math.max(high[slice], y);
  }
  const rings: Ring[] = [];
  for (let slice = 0; slice < slices; slice++) {
    const isEmptySlice = low[slice] === Infinity;
    if (isEmptySlice) continue;
    rings.push({ y: low[slice], radius: reach[slice] }, { y: high[slice], radius: reach[slice] });
  }
  return { bounds: { min, max }, rings };
};

/** Where the camera stands, from a fit and the elevation it was made for */
export const fitPosition = (fit: CameraFit, elevation: number): Vec3 => ({
  x: fit.target.x,
  y: fit.target.y + Math.sin(elevation) * fit.distance,
  z: fit.target.z + Math.cos(elevation) * fit.distance,
});

/**
 * The distance and target that keep the whole model inside the view with `margin` of air on both axes. The axis that
 * runs out of room first decides: a tall model in a phone view is limited by its height, a wide one by its width, and
 * the other axis has room to spare. Perspective is honoured (the near edge of a footprint reaches lower than its far
 * edge and looks bigger), so the answer holds for the real camera and not only for a flat picture of the box.
 */
export const fitCamera = (input: FitInput): CameraFit => {
  const keep = 1 - clamp(finiteOr(input.margin, FIT_MARGIN), 0, 0.9);
  const aspect = finiteOr(input.aspect, 1) > 0 ? finiteOr(input.aspect, 1) : 1;
  const fov = clamp(finiteOr(input.fov, 24), 1, 150);
  const elevation = clamp(finiteOr(input.elevation, 0), -1.55, 1.55);
  const tanUp = Math.tan((fov * Math.PI) / 360);
  const tanSide = tanUp * aspect;
  const sin = Math.sin(elevation);
  const cos = Math.cos(elevation);

  const rings = ringsOf(input.bounds, input.turns);
  const points = worstPoints(input.bounds, finiteOr(input.yaw, 0), rings);
  const { min, max } = input.bounds;
  const target: Vec3 = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
  const hasRings = rings.length > 0;
  if (hasRings) {
    target.x = 0;
    target.z = 0;
  } else {
    // A turned box is no longer centred where its bounds were
    let lowX = Infinity;
    let highX = -Infinity;
    let lowZ = Infinity;
    let highZ = -Infinity;
    for (const p of points) {
      lowX = Math.min(lowX, p.x);
      highX = Math.max(highX, p.x);
      lowZ = Math.min(lowZ, p.z);
      highZ = Math.max(highZ, p.z);
    }
    target.x = (lowX + highX) / 2;
    target.z = (lowZ + highZ) / 2;
  }

  /** A point seen from the target: across the view, up the view, and how far beyond the target along the view */
  const seen = (p: Vec3): { across: number; up: number; beyond: number } => {
    const dx = p.x - target.x;
    const dy = p.y - target.y;
    const dz = p.z - target.z;
    return { across: dx, up: dy * cos - dz * sin, beyond: -dy * sin - dz * cos };
  };

  /** The smallest distance at which every point is inside the kept share of the view, and in front of the camera */
  const distanceFor = (): number => {
    let distance = 0;
    let nearest = Infinity;
    for (const p of points) {
      const { across, up, beyond } = seen(p);
      distance = Math.max(distance, Math.abs(across) / (keep * tanSide) - beyond, Math.abs(up) / (keep * tanUp) - beyond);
      nearest = Math.min(nearest, beyond);
    }
    return Math.max(distance, NEAR_CLEARANCE - nearest);
  };

  let distance = distanceFor();
  for (let pass = 0; pass < CENTRING_PASSES; pass++) {
    // Where the model's edges land on screen (-1..1); the target moves by half of the difference so they balance
    let lowAcross = Infinity;
    let highAcross = -Infinity;
    let lowUp = Infinity;
    let highUp = -Infinity;
    for (const p of points) {
      const { across, up, beyond } = seen(p);
      const depth = distance + beyond;
      lowAcross = Math.min(lowAcross, across / (depth * tanSide));
      highAcross = Math.max(highAcross, across / (depth * tanSide));
      lowUp = Math.min(lowUp, up / (depth * tanUp));
      highUp = Math.max(highUp, up / (depth * tanUp));
    }
    const shiftAcross = ((lowAcross + highAcross) / 2) * distance * tanSide;
    const shiftUp = ((lowUp + highUp) / 2) * distance * tanUp;
    // "up the view" is (0, cos, -sin) in the world, "across" is +X
    target.x += shiftAcross;
    target.y += shiftUp * cos;
    target.z -= shiftUp * sin;
    distance = distanceFor();
  }

  return { distance, target };
};
