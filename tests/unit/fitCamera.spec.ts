import * as THREE from "three";
import { FIT_MARGIN, fitCamera, fitPosition, measurePositions } from "@/components/organisms/voxel/fitCamera";
import type { Bounds, FitInput } from "@/components/organisms/voxel/fitCamera";

/**
 * The pure camera fit: from a model's bounds, the view's aspect, the lens and the elevation, how far back the camera
 * stands and where it looks so that the whole model sits inside the view with air all round. Every case is checked
 * with a real three.js camera placed from the answer, so the maths is judged by the renderer's own projection.
 */

const FOV = 24;
const ELEVATION = 0.45;
/** What every point may reach, as a share of the half-view, with the default margin */
const REACH = 1 - FIT_MARGIN;
/** Floating point and the centring iterations are not exact */
const SLACK = 0.004;

const box = (w: number, h: number, d: number, y0 = 0): Bounds => ({
  min: { x: -w / 2, y: y0, z: -d / 2 },
  max: { x: w / 2, y: y0 + h, z: d / 2 },
});

const corners = (b: Bounds): THREE.Vector3[] => {
  const out: THREE.Vector3[] = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) out.push(new THREE.Vector3(x, y, z));
  return out;
};

/** The renderer's own answer: where each point lands on screen, -1..1 on both axes, from the camera the fit describes */
const screenOf = (points: THREE.Vector3[], input: Omit<FitInput, "bounds">, bounds: Bounds): THREE.Vector2[] => {
  const fit = fitCamera({ ...input, bounds });
  const camera = new THREE.PerspectiveCamera(input.fov, input.aspect, 0.1, 1000);
  const at = fitPosition(fit, input.elevation);
  camera.position.set(at.x, at.y, at.z);
  camera.lookAt(fit.target.x, fit.target.y, fit.target.z);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return points.map((p) => {
    const ndc = p.clone().project(camera);
    return new THREE.Vector2(ndc.x, ndc.y);
  });
};

const widest = (screen: THREE.Vector2[]): { x: number; y: number } => ({
  x: Math.max(...screen.map((p) => Math.abs(p.x))),
  y: Math.max(...screen.map((p) => Math.abs(p.y))),
});

const lens = (aspect: number, elevation = ELEVATION): Omit<FitInput, "bounds"> => ({ aspect, fov: FOV, elevation });

describe("fitCamera", () => {
  it("fits a tall model in a phone view: every corner inside with the margin, the height is what limits", () => {
    const bounds = box(6, 30, 6);
    const screen = screenOf(corners(bounds), lens(390 / 844), bounds);
    const { x, y } = widest(screen);
    expect(x).toBeLessThanOrEqual(REACH + SLACK);
    expect(y).toBeLessThanOrEqual(REACH + SLACK);
    // The limiting axis is used up, not wasted: the model is as big as the margin allows
    expect(y).toBeGreaterThan(REACH - 0.02);
  });

  it("fits a wide model in a square view: the width is what limits", () => {
    const bounds = box(34, 6, 6);
    const screen = screenOf(corners(bounds), lens(1), bounds);
    const { x, y } = widest(screen);
    expect(x).toBeLessThanOrEqual(REACH + SLACK);
    expect(y).toBeLessThanOrEqual(REACH + SLACK);
    expect(x).toBeGreaterThan(REACH - 0.02);
  });

  it.each([
    ["a phone", 390 / 844],
    ["a square", 1],
    ["a landscape", 16 / 9],
  ])("fits a cube in %s view on every side", (_name, aspect) => {
    const bounds = box(10, 10, 10);
    const screen = screenOf(corners(bounds), lens(aspect), bounds);
    const { x, y } = widest(screen);
    expect(x).toBeLessThanOrEqual(REACH + SLACK);
    expect(y).toBeLessThanOrEqual(REACH + SLACK);
    // one of the two axes is used up whichever way the view is shaped
    expect(Math.max(x, y)).toBeGreaterThan(REACH - 0.02);
  });

  it("centres the model: top and bottom, left and right keep the same air", () => {
    const bounds = box(8, 24, 8);
    const screen = screenOf(corners(bounds), lens(0.8), bounds);
    const ys = screen.map((p) => p.y);
    const xs = screen.map((p) => p.x);
    expect(Math.abs(Math.max(...ys) + Math.min(...ys))).toBeLessThan(0.02);
    expect(Math.abs(Math.max(...xs) + Math.min(...xs))).toBeLessThan(0.02);
  });

  it("follows the aspect: a narrower view backs a wide model off, a taller one leaves a tall model alone", () => {
    const wide = box(30, 6, 6);
    const tall = box(6, 30, 6);
    const dist = (b: Bounds, aspect: number): number => fitCamera({ ...lens(aspect), bounds: b }).distance;
    expect(dist(wide, 0.5)).toBeGreaterThan(dist(wide, 1) * 1.5);
    // the tall model is limited by its height in both views, so the width of the view does not matter
    expect(dist(tall, 1)).toBeCloseTo(dist(tall, 1.6), 0);
    expect(dist(tall, 0.2)).toBeGreaterThan(dist(tall, 1));
  });

  it("takes a THREE.Box3 as well as a plain {min,max}", () => {
    const plain = box(12, 20, 9, 3);
    const three = new THREE.Box3(new THREE.Vector3(-6, 3, -4.5), new THREE.Vector3(6, 23, 4.5));
    const a = fitCamera({ ...lens(0.7), bounds: plain });
    const b = fitCamera({ ...lens(0.7), bounds: three });
    expect(b.distance).toBeCloseTo(a.distance, 6);
    expect(b.target.y).toBeCloseTo(a.target.y, 6);
  });

  it("keeps a model off the floor in the view: the lowest point is the one nearest the camera", () => {
    // A flat slab standing on the floor looks down at it: its near bottom edge is what reaches the bottom of the view
    const bounds = box(30, 2, 30);
    const screen = screenOf(corners(bounds), lens(1, 0.6), bounds);
    expect(widest(screen).y).toBeLessThanOrEqual(REACH + SLACK);
    expect(widest(screen).x).toBeLessThanOrEqual(REACH + SLACK);
  });

  it("honours another margin and none at all", () => {
    const bounds = box(10, 18, 10);
    const tight = screenOf(corners(bounds), { ...lens(0.9), margin: 0 }, bounds);
    const airy = screenOf(corners(bounds), { ...lens(0.9), margin: 0.25 }, bounds);
    expect(Math.max(widest(tight).x, widest(tight).y)).toBeLessThanOrEqual(1 + SLACK);
    expect(Math.max(widest(tight).x, widest(tight).y)).toBeGreaterThan(0.97);
    expect(Math.max(widest(airy).x, widest(airy).y)).toBeLessThanOrEqual(0.75 + SLACK);
    expect(Math.max(widest(airy).x, widest(airy).y)).toBeGreaterThan(0.72);
  });

  it("fits a model turned about the vertical axis", () => {
    // A long hall seen end on after a quarter turn: its length now runs into the screen, its width across
    const hall = box(8, 10, 40);
    const input = { ...lens(1), yaw: Math.PI / 2 };
    const turned = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    const points = corners(hall).map((p) => p.applyMatrix4(turned));
    const screen = screenOf(points, input, hall);
    expect(widest(screen).x).toBeLessThanOrEqual(REACH + SLACK);
    expect(widest(screen).y).toBeLessThanOrEqual(REACH + SLACK);
  });

  it("fits a model that turns: no yaw the model can take pokes out", () => {
    const radius = 12;
    const bounds = box(2 * radius, 20, 2 * radius);
    const input = { ...lens(0.62), turns: radius };
    const ring: THREE.Vector3[] = [];
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      for (const y of [bounds.min.y, bounds.max.y]) ring.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
    }
    const screen = screenOf(ring, input, bounds);
    expect(widest(screen).x).toBeLessThanOrEqual(REACH + SLACK);
    expect(widest(screen).y).toBeLessThanOrEqual(REACH + SLACK);
    // and it did not back off further than it had to for a circle: some point of the ring reaches the limit
    expect(Math.max(widest(screen).x, widest(screen).y)).toBeGreaterThan(REACH - 0.02);
  });

  it("a turning model needs the room of its circle, a still one only that of its box", () => {
    const bounds = box(10, 20, 10);
    const still = fitCamera({ ...lens(0.5), bounds });
    const turning = fitCamera({ ...lens(0.5), bounds, turns: Math.hypot(5, 5) });
    expect(turning.distance).toBeGreaterThan(still.distance);
  });

  it("gives a spire no more room than its thin top asks for: rings beat a cylinder of the widest floor", () => {
    // A wide base and a narrow tower: a cylinder of the base's radius would add air above the tower for nothing
    const bounds = box(20, 32, 20);
    const rings = [
      { y: 0, radius: 10 },
      { y: 4, radius: 10 },
      { y: 4, radius: 2 },
      { y: 32, radius: 2 },
    ];
    const profile = fitCamera({ ...lens(1), bounds, turns: rings });
    const cylinder = fitCamera({ ...lens(1), bounds, turns: 10 });
    expect(profile.distance).toBeLessThan(cylinder.distance);

    const points: THREE.Vector3[] = [];
    for (const { y, radius } of rings) {
      for (let i = 0; i < 72; i++) points.push(new THREE.Vector3(Math.cos((i / 72) * 6.2832) * radius, y, Math.sin((i / 72) * 6.2832) * radius));
    }
    const screen = screenOf(points, { ...lens(1), turns: rings }, bounds);
    expect(widest(screen).x).toBeLessThanOrEqual(REACH + SLACK);
    expect(widest(screen).y).toBeLessThanOrEqual(REACH + SLACK);
  });

  it("looks at the middle of the model, with the camera above it on the +Z side", () => {
    const fit = fitCamera({ ...lens(1), bounds: box(10, 20, 10, 4) });
    expect(fit.target.x).toBeCloseTo(0, 3);
    expect(fit.target.y).toBeGreaterThan(10);
    expect(fit.target.y).toBeLessThan(18);
    const at = fitPosition(fit, ELEVATION);
    expect(at.y).toBeGreaterThan(fit.target.y);
    expect(at.z).toBeGreaterThan(fit.target.z);
    // the camera looks at the target along the elevation: distance and direction round-trip
    expect(Math.hypot(at.x - fit.target.x, at.y - fit.target.y, at.z - fit.target.z)).toBeCloseTo(fit.distance, 6);
    expect((at.y - fit.target.y) / fit.distance).toBeCloseTo(Math.sin(ELEVATION), 6);
  });

  it("never answers with NaN or a camera inside the model, whatever it is handed", () => {
    const cases: Array<Omit<FitInput, "bounds"> & { bounds: Bounds }> = [
      { ...lens(1), bounds: box(0, 0, 0) },
      { ...lens(0), bounds: box(10, 10, 10) },
      { ...lens(-2), bounds: box(10, 10, 10) },
      { ...lens(Number.NaN), bounds: box(10, 10, 10) },
      { ...lens(1, 0), bounds: box(10, 10, 10) },
      { ...lens(1, Math.PI / 2 - 0.0001), bounds: box(10, 10, 10) },
    ];
    for (const input of cases) {
      const fit = fitCamera(input);
      expect(Number.isFinite(fit.distance)).toBe(true);
      expect(fit.distance).toBeGreaterThan(0);
      expect(Number.isFinite(fit.target.x + fit.target.y + fit.target.z)).toBe(true);
    }
  });
});

describe("measurePositions", () => {
  it("measures the bounds and how far the model reaches at each height", () => {
    // Two vertices of a wide foot at y 0 and one of a thin top at y 10
    const measured = measurePositions([6, 0, 0, -6, 0, 0, 1, 10, 1]);
    expect(measured?.bounds.min).toEqual({ x: -6, y: 0, z: 0 });
    expect(measured?.bounds.max).toEqual({ x: 6, y: 10, z: 1 });
    const rings = measured?.rings ?? [];
    expect(Math.max(...rings.filter((r) => r.y === 0).map((r) => r.radius))).toBe(6);
    expect(Math.max(...rings.filter((r) => r.y === 10).map((r) => r.radius))).toBeCloseTo(Math.SQRT2, 6);
  });

  it("says nothing for an empty list and copes with a model one level high", () => {
    expect(measurePositions([])).toBeNull();
    const flat = measurePositions([1, 2, 0, -1, 2, 0, 0, 2, 3]);
    expect(flat?.rings.every((r) => r.y === 2)).toBe(true);
    expect(Math.max(...(flat?.rings ?? []).map((r) => r.radius))).toBe(3);
  });
});
