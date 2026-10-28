import * as THREE from "three";
import type { HeroAnimation } from "@/lib/hero-look/types";
import { fitCamera, fitPosition } from "@/components/organisms/voxel/fitCamera";
import { animateHero } from "./voxel/animate";

/**
 * The hero's camera, shared by the live stage (useHeroScene) and anything that draws a still of the hero (avatar
 * snapshots, the builder's thumbnails): the frames, the tween between them, the lights and the pixel read-back.
 */

/** The hero stands at a 3/4 turn; the camera is a narrow lens far away so it reads almost orthographic */
export const DEFAULT_YAW = 0.5;
export const FOV = 18;
const ELEVATION = 0.2;
/** The least width a frame keeps across the view: arms out and a sword at the hip. A hero that reaches farther widens it (see fullFrame). */
export const FRAME_WIDTH = 15;
/** How much of the width the head close-up keeps: tighter than the whole body so the stage really zooms in */
const BUST_STAGE_WIDTH = 11;
/** The top of a bare head: a frame is never tighter than this, so a hero without a hat is not zoomed in on */
const BARE_HEAD_TOP = 16.6;
/** Where the head close-up ends: the chest */
const BUST_BOTTOM = 3.6;

export type SnapshotFraming = "bust" | "full";

export interface Frame {
  centerY: number;
  height: number;
  /** World units that must fit across the view; FRAME_WIDTH when missing */
  width?: number;
  /**
   * How far the hero's top and bottom reach toward and away from the camera: the feet and shadow in front sit lower in
   * the picture than the heels, a hat behind sits higher. A flat frame (0 when missing) misses that.
   */
  depth?: number;
}

/**
 * Stand the camera so the frame's rectangle (its width across, its height up, centred on the hero's axis) sits inside the
 * view with the fit's air round it. The distance comes from the shared fit, so a narrow view backs off for the width
 * and a wide one for the height; the lens and the elevation stay the hero's.
 */
export const placeCamera = (camera: THREE.PerspectiveCamera, frame: Frame, aspect: number): void => {
  const width = frame.width ?? FRAME_WIDTH;
  const depth = frame.depth ?? 0;
  const fit = fitCamera({
    bounds: {
      min: { x: -width / 2, y: frame.centerY - frame.height / 2, z: -depth },
      max: { x: width / 2, y: frame.centerY + frame.height / 2, z: depth },
    },
    aspect,
    fov: FOV,
    elevation: ELEVATION,
  });
  const at = fitPosition(fit, ELEVATION);
  camera.aspect = aspect;
  camera.fov = FOV;
  camera.position.set(at.x, at.y, at.z);
  camera.lookAt(fit.target.x, fit.target.y, fit.target.z);
  camera.near = 1;
  camera.far = fit.distance * 2 + 40;
  camera.updateProjectionMatrix();
};

/** What a hero fills while an animation plays: its box, how far it reaches from its axis, and how its head does */
export interface HeroExtent {
  box: THREE.Box3;
  /** The farthest any part strays from the hero's vertical axis: what it sweeps when it turns */
  reach: number;
  headTop: number;
  /** The same for the head alone (hair and hat included) */
  headReach: number;
}

/** The floor shadow's radius (build.ts): the near edge of it is the lowest the picture gets */
const SHADOW_REACH = 4.8;

/** Seconds between samples of a loop, and how many: 1.4s holds a whole cycle of every animation */
const LOOP_STEP = 0.1;
const LOOP_SAMPLES = 15;

const extents = new WeakMap<THREE.Object3D, Map<HeroAnimation, HeroExtent>>();
const corner = new THREE.Vector3();

/** How far a group's parts reach from the vertical axis, by their boxes' corners; the floor shadow is a disc, not a box, and is left out */
const reachOf = (root: THREE.Object3D): number => {
  let reach = 0;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    const isLeftOut = !mesh.isMesh || mesh.name === "shadow";
    if (isLeftOut) return;
    const isUnmeasured = !mesh.geometry.boundingBox;
    if (isUnmeasured) mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox;
    if (!bounds) return;
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          corner.set(x, y, z).applyMatrix4(mesh.matrixWorld);
          reach = Math.max(reach, Math.hypot(corner.x, corner.z));
        }
      }
    }
  });
  return reach;
};

/** The quick hop is a bounce on the spot: it keeps the idle frame, so a tap in the builder does not pump the camera */
export const framingOf = (animation: HeroAnimation): HeroAnimation => (animation === "hop" ? "idle" : animation);

/**
 * What the hero fills over one loop of `animation`, sampled: a victory hop and raised arms, a leaning hurt, a dance all
 * take more room than standing still, and a frame cut for the rest pose clips them. Turned to face the camera while it
 * is measured. Leaves the hero in the last sampled pose: the caller poses it again before it draws.
 */
export const measureHero = (hero: THREE.Object3D, animation: HeroAnimation = "idle"): HeroExtent => {
  const key = framingOf(animation);
  const cache = extents.get(hero) ?? new Map<HeroAnimation, HeroExtent>();
  extents.set(hero, cache);
  const known = cache.get(key);
  if (known) return known;

  const head = hero.getObjectByName("head");
  const yaw = hero.rotation.y;
  hero.rotation.y = 0;
  const extent: HeroExtent = { box: new THREE.Box3(), reach: 0, headTop: -Infinity, headReach: 0 };
  const sample = new THREE.Box3();
  for (let i = 0; i < LOOP_SAMPLES; i++) {
    animateHero(hero, key, i * LOOP_STEP);
    hero.updateMatrixWorld(true);
    extent.box.union(sample.setFromObject(hero));
    extent.reach = Math.max(extent.reach, reachOf(hero));
    if (head) {
      extent.headTop = Math.max(extent.headTop, sample.setFromObject(head).max.y);
      extent.headReach = Math.max(extent.headReach, reachOf(head));
    }
  }
  hero.rotation.y = yaw;
  cache.set(key, extent);
  return extent;
};

/**
 * Whole body, from the floor shadow to the tallest the hero gets (a hat, a raised arm, the top of a hop), never tighter than
 * a bare head, and as wide as its arms and what it holds reach when it turns. The fit adds the air.
 */
export const fullFrame = (hero: THREE.Object3D, animation: HeroAnimation = "idle"): Frame => {
  const { box, reach, headReach } = measureHero(hero, animation);
  const top = Math.max(box.max.y, BARE_HEAD_TOP);
  const bottom = Math.min(box.min.y, 0);
  return {
    centerY: (top + bottom) / 2,
    height: top - bottom,
    width: Math.max(FRAME_WIDTH, reach * 2),
    // the shadow and feet in front, the head behind: whichever strays farther sets how much the elevation shifts them
    depth: Math.max(SHADOW_REACH, headReach),
  };
};

/** Head and shoulders: what an avatar circle wants. The whole head comes, whatever sits on it, however tall or wide. */
export const bustFrame = (hero: THREE.Object3D, animation: HeroAnimation = "idle"): Frame => {
  const { headTop, headReach } = measureHero(hero, animation);
  const top = Math.max(Number.isFinite(headTop) ? headTop : 15, BARE_HEAD_TOP);
  const bottom = BUST_BOTTOM;
  return { centerY: (top + bottom) / 2, height: top - bottom, width: Math.max(FRAME_WIDTH, headReach * 2), depth: headReach };
};

/** The live stage: the same frames as a snapshot, but the close-up also narrows its width so it zooms on any aspect */
export const stageFrame = (hero: THREE.Object3D, focus: SnapshotFraming, animation: HeroAnimation = "idle"): Frame =>
  focus === "full"
    ? fullFrame(hero, animation)
    : { ...bustFrame(hero, animation), width: Math.max(BUST_STAGE_WIDTH, measureHero(hero, animation).headReach * 2) };

/** A frame between two others; t is clamped to 0..1 and every field moves linearly */
export const lerpFrame = (from: Frame, to: Frame, t: number): Frame => {
  const k = Math.min(1, Math.max(0, t));
  const mix = (a: number, b: number): number => a + (b - a) * k;
  const hasDepth = from.depth !== undefined || to.depth !== undefined;
  return {
    centerY: mix(from.centerY, to.centerY),
    height: mix(from.height, to.height),
    width: mix(from.width ?? FRAME_WIDTH, to.width ?? FRAME_WIDTH),
    ...(hasDepth ? { depth: mix(from.depth ?? 0, to.depth ?? 0) } : {}),
  };
};

/** Fast start, soft landing: what a camera move wants */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Where a camera move stands `now` (seconds), having left `from` for `to` at `startedAt`: eased, and on the very last
 * step exactly `to` (the same object) with `done` set so the caller can drop the move. Pure: the clock is the caller's.
 */
export const stepFrame = (
  from: Frame,
  to: Frame,
  startedAt: number,
  now: number,
  duration = 0.3,
): { frame: Frame; done: boolean } => {
  const k = duration > 0 ? Math.min(1, Math.max(0, (now - startedAt) / duration)) : 1;
  const isLanded = k >= 1;
  if (isLanded) return { frame: to, done: true };
  return { frame: lerpFrame(from, to, easeOutCubic(k)), done: false };
};

/** A cool sky over a warm floor bounce, a warm key from the camera's upper right and a faint cool fill from behind */
export const addHeroLights = (scene: THREE.Scene): void => {
  scene.add(new THREE.HemisphereLight(0xeef4ff, 0x8a6e58, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.3);
  sun.position.set(6, 12, 10);
  scene.add(sun);
  const back = new THREE.DirectionalLight(0xb8d0ff, 0.3);
  back.position.set(-8, 6, -10);
  scene.add(back);
};

/** Rows come out bottom-up and anti-aliased edges are premultiplied: flip and un-premultiply into a PNG data URL */
export const pixelsToDataUrl = (pixels: Uint8Array, size: number): string => {
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    const src = (size - 1 - y) * size * 4;
    const dst = y * size * 4;
    for (let x = 0; x < size; x++) {
      const a = pixels[src + x * 4 + 3];
      const k = a > 0 ? 255 / a : 0;
      image.data[dst + x * 4] = Math.min(255, pixels[src + x * 4] * k);
      image.data[dst + x * 4 + 1] = Math.min(255, pixels[src + x * 4 + 1] * k);
      image.data[dst + x * 4 + 2] = Math.min(255, pixels[src + x * 4 + 2] * k);
      image.data[dst + x * 4 + 3] = a;
    }
  }
  ctx.putImageData(image, 0, 0);
  return out.toDataURL("image/png");
};

/** One still of the hero at size x size on a transparent background, in a canonical pose whatever the hero is doing */
export const renderHeroSnapshot = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  hero: THREE.Object3D,
  size: number,
  framing: SnapshotFraming,
  /** MSAA samples; the default keeps the saved avatar at full quality on every tier */
  samples = 4,
): string => {
  const target = new THREE.WebGLRenderTarget(size, size, { samples, colorSpace: THREE.SRGBColorSpace });
  const shotCamera = new THREE.PerspectiveCamera(FOV, 1, 1, 400);
  placeCamera(shotCamera, framing === "full" ? fullFrame(hero) : bustFrame(hero), 1);

  // A canonical pose: rest, turned a little, whatever the live animation is doing
  const previousYaw = hero.rotation.y;
  animateHero(hero, "idle", 0);
  hero.rotation.y = DEFAULT_YAW - 0.1;

  const previousTarget = renderer.getRenderTarget();
  const pixels = new Uint8Array(size * size * 4);
  try {
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, shotCamera);
    renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
  } finally {
    renderer.setRenderTarget(previousTarget);
    target.dispose();
    hero.rotation.y = previousYaw;
  }

  return pixelsToDataUrl(pixels, size);
};
