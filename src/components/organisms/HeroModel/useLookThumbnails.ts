import * as THREE from "three";
import { onBeforeUnmount, ref, shallowReactive } from "vue";
import type { Ref } from "vue";
import type { HeroLook } from "@/lib/hero-look/types";
import { currentKnobs, currentTier } from "@/lib/services/graphics/deviceQuality";
import type { VoxelKnobs } from "@/lib/services/graphics/voxelQuality";
import debug from "@/lib/utils/debug";
import { addHeroLights, renderHeroSnapshot } from "./heroCamera";
import type { SnapshotFraming } from "./heroCamera";
import { withoutHands } from "./lookEditor";
import { buildHero, disposeHero } from "./voxel/build";
import { detailOf } from "./voxel/detail";

/**
 * The builder's option tiles show the player's own hero with that option, drawn by ONE hidden WebGL renderer: a
 * phone only gives a page a handful of GL contexts, so a live canvas per tile would run out. Tiles ask `get`, which
 * answers from the cache or queues a draw; a few draws happen per animation frame so the screen never stalls.
 * When drawing stops working (no WebGL, a draw that throws, a lost GL context) the thumbnailer gives up for good:
 * `get` answers "" for everything, so each tile falls back to showing its option's name. A picture drawn from a lost
 * context is blank (three.js skips the render without throwing), so the draw checks the context and throws instead.
 */

export type ThumbDraw = (look: HeroLook, framing: SnapshotFraming, size: number) => string;

export interface LookThumbnailer {
  /** False once drawing is impossible (no WebGL, a failed draw, a lost context); `get` then answers "" and the tiles show names */
  supported: Ref<boolean>;
  /** The picture as a data URL, or "" while it waits for its frame; reactive, so a tile re-renders when it lands */
  get(look: HeroLook, framing: SnapshotFraming, size?: number): string;
  /** Stops drawing and frees the renderer's GL context */
  dispose(): void;
}

export interface ThumbnailerOptions {
  /** How to draw one look; the one three.js renderer when left out, `null` for none (then nothing is supported) */
  draw?: ThumbDraw | null;
  perFrame?: number;
  cacheSize?: number;
  schedule?: (run: () => void) => void;
}

const DEFAULT_SIZE = 96;
const CACHE_SIZE = 200;

/** A tier with a thumbnail cap never asks for a larger picture than that; 0 means no cap */
const cappedSize = (size: number, knobs: VoxelKnobs): number =>
  knobs.thumbMaxPx > 0 ? Math.min(size, knobs.thumbMaxPx) : size;

/**
 * One renderer on a detached canvas and one lit scene; every look is built, shot and thrown away. null without WebGL.
 * `onContextLost` is called when the browser takes the GL context away (a phone does that under memory pressure).
 */
export const createThreeDraw = (
  onContextLost?: () => void,
  knobs: VoxelKnobs = currentKnobs(),
): { draw: ThumbDraw; dispose: () => void } | null => {
  const canvas = document.createElement("canvas");
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, powerPreference: "low-power" });
  } catch {
    return null;
  }
  const scene = new THREE.Scene();
  addHeroLights(scene);

  const handleLost = (): void => onContextLost?.();
  canvas.addEventListener("webglcontextlost", handleLost);

  const isLost = (): boolean => renderer.getContext().isContextLost();

  return {
    draw: (look, framing, size) => {
      // three.js renders nothing on a lost context and does not throw: a picture from one is blank, so refuse it
      if (isLost()) throw new Error("WebGL context lost");
      const hero = buildHero(look, detailOf(knobs));
      scene.add(hero);
      try {
        const shot = cappedSize(size, knobs);
        const picture = renderHeroSnapshot(renderer, scene, hero, shot, framing, knobs.snapshotSamples);
        if (isLost()) throw new Error("WebGL context lost while drawing");
        return picture;
      } finally {
        disposeHero(hero); // takes it out of the scene as well
      }
    },
    dispose: () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
      renderer.dispose();
      // dispose() leaves the context alive until the garbage collector comes; a phone cannot wait for that
      renderer.forceContextLoss();
    },
  };
};

interface Request {
  key: string;
  look: HeroLook;
  framing: SnapshotFraming;
  size: number;
}

export const createLookThumbnailer = (options: ThumbnailerOptions = {}): LookThumbnailer => {
  const knobs = currentKnobs();
  /** Captured with the knobs: a picture is keyed by the tier whose knobs drew it, even if the stored tier changes later */
  const tier = currentTier();
  const perFrame = options.perFrame ?? knobs.thumbPerFrame;
  const defaultSize = cappedSize(DEFAULT_SIZE, knobs);
  const cacheSize = options.cacheSize ?? CACHE_SIZE;
  const schedule =
    options.schedule ??
    ((run: () => void): void => {
      requestAnimationFrame(run);
    });

  const supported = ref(true);
  /** Reactive so a template calling `get` re-renders when its picture lands; Map order is age, oldest first */
  const pictures = shallowReactive(new Map<string, string>());
  /** Waiting for a frame; the end of the array is the front of the line (newest request draws first) */
  const queue: Request[] = [];
  let waiting = false;
  let disposed = false;
  /** undefined until the first frame needs it, null if the renderer would not start */
  let three: ReturnType<typeof createThreeDraw> | undefined;

  const release = (): void => {
    three?.dispose();
    three = null;
  };

  const giveUp = (): void => {
    supported.value = false;
    queue.length = 0;
    release();
  };

  const drawer = (): ThumbDraw | null => {
    const customDraw = options.draw;
    const hasCustomDraw = customDraw !== undefined;
    if (hasCustomDraw) return customDraw;
    const isRendererUntried = three === undefined;
    if (isRendererUntried) three = createThreeDraw(giveUp, knobs);
    return three ? three.draw : null;
  };

  const keep = (key: string, picture: string): void => {
    pictures.set(key, picture);
    const isOverCache = pictures.size > cacheSize;
    if (isOverCache) pictures.delete(pictures.keys().next().value as string);
  };

  const isShutDown = (): boolean => disposed || !supported.value;

  const frame = (): void => {
    waiting = false;
    if (isShutDown()) return;
    const draw = drawer();
    if (!draw) {
      giveUp();
      return;
    }
    try {
      for (let drawn = 0; drawn < perFrame && queue.length > 0; drawn++) {
        const next = queue.pop() as Request;
        keep(next.key, draw(next.look, next.framing, next.size));
      }
    } catch (error) {
      debug.warn("Look thumbnails: drawing failed, falling back to portraits", error);
      giveUp();
      return;
    }
    const hasMoreQueued = queue.length > 0;
    if (hasMoreQueued) requestFrame();
  };

  const requestFrame = (): void => {
    if (waiting) return;
    waiting = true;
    schedule(frame);
  };

  const get = (look: HeroLook, framing: SnapshotFraming, size = defaultSize): string => {
    if (isShutDown()) return "";
    const stored = withoutHands(look);
    const key = `${tier}|${framing}|${size}|${JSON.stringify(stored)}`;
    const picture = pictures.get(key);
    const isDrawn = picture !== undefined;
    if (isDrawn) return picture;

    // Asking again moves a look to the front: what is on screen now draws before what was asked for earlier
    const queued = queue.findIndex((request) => request.key === key);
    const isQueued = queued >= 0;
    if (isQueued) queue.splice(queued, 1);
    queue.push({ key, look: stored, framing, size });
    requestFrame();
    return "";
  };

  const dispose = (): void => {
    disposed = true;
    queue.length = 0;
    pictures.clear();
    release();
  };

  return { supported, get, dispose };
};

/** A thumbnailer that lives and dies with the component that calls this */
export const useLookThumbnails = (): LookThumbnailer => {
  const thumbnailer = createLookThumbnailer();
  onBeforeUnmount(thumbnailer.dispose);
  return thumbnailer;
};
