import * as THREE from "three";
import { animateHero } from "./voxel/animate";

/**
 * The hero's camera, shared by the live stage (useHeroScene) and anything that draws a still of the hero (avatar
 * snapshots, the builder's thumbnails): the frames, the tween between them, the lights and the pixel read-back.
 */

/** The hero stands at a 3/4 turn; the camera is a narrow lens far away so it reads almost orthographic */
export const DEFAULT_YAW = 0.5;
export const FOV = 18;
const ELEVATION = 0.2;
/** Widest the hero gets with arms out and a sword, plus air */
export const FRAME_WIDTH = 15;
/** How much of the width the head close-up keeps: tighter than the whole body so the stage really zooms in */
const BUST_STAGE_WIDTH = 11;

export type SnapshotFraming = "bust" | "full";

export interface Frame {
  centerY: number;
  height: number;
  /** World units that must fit across the view; FRAME_WIDTH when missing */
  width?: number;
}

export const placeCamera = (camera: THREE.PerspectiveCamera, frame: Frame, aspect: number): void => {
  const width = frame.width ?? FRAME_WIDTH;
  const halfH = Math.max(frame.height / 2, width / 2 / Math.max(aspect, 0.01));
  const distance = halfH / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  camera.aspect = aspect;
  camera.fov = FOV;
  camera.position.set(0, frame.centerY + Math.sin(ELEVATION) * distance, Math.cos(ELEVATION) * distance);
  camera.lookAt(0, frame.centerY, 0);
  camera.near = 1;
  camera.far = distance * 2 + 40;
  camera.updateProjectionMatrix();
};

/** Whole body: from the floor shadow to a little above the tallest hat, never tighter than a bare head */
export const fullFrame = (hero: THREE.Object3D): Frame => {
  const box = new THREE.Box3().setFromObject(hero);
  const top = Math.max(box.max.y + 0.8, 17.4);
  const bottom = -1.2;
  return { centerY: (top + bottom) / 2, height: top - bottom };
};

/** Head and shoulders: what an avatar circle wants */
export const bustFrame = (hero: THREE.Object3D): Frame => {
  const head = hero.getObjectByName("head");
  const headTop = head ? new THREE.Box3().setFromObject(head).max.y : 15;
  const top = Math.min(Math.max(headTop + 0.7, 16.6), 20.5);
  const bottom = 3.6;
  return { centerY: (top + bottom) / 2, height: top - bottom };
};

/** The live stage: the same frames as a snapshot, but the close-up also narrows its width so it zooms on any aspect */
export const stageFrame = (hero: THREE.Object3D, focus: SnapshotFraming): Frame =>
  focus === "full" ? fullFrame(hero) : { ...bustFrame(hero), width: BUST_STAGE_WIDTH };

/** A frame between two others; t is clamped to 0..1 and every field moves linearly */
export const lerpFrame = (from: Frame, to: Frame, t: number): Frame => {
  const k = Math.min(1, Math.max(0, t));
  const mix = (a: number, b: number): number => a + (b - a) * k;
  return {
    centerY: mix(from.centerY, to.centerY),
    height: mix(from.height, to.height),
    width: mix(from.width ?? FRAME_WIDTH, to.width ?? FRAME_WIDTH),
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
  if (k >= 1) return { frame: to, done: true };
  return { frame: lerpFrame(from, to, easeOutCubic(k)), done: false };
};

export const addHeroLights =(scene: THREE.Scene): void => {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(6, 12, 10);
  scene.add(sun);
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
): string => {
  const target = new THREE.WebGLRenderTarget(size, size, { samples: 4, colorSpace: THREE.SRGBColorSpace });
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
