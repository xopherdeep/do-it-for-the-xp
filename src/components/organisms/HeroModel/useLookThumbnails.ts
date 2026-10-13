import * as THREE from "three";
import { onBeforeUnmount, ref, shallowReactive } from "vue";
import type { Ref } from "vue";
import type { HeroLook } from "@/lib/hero-look/types";
import debug from "@/lib/utils/debug";
import { addHeroLights, renderHeroSnapshot } from "./heroCamera";
import type { SnapshotFraming } from "./heroCamera";
import { withoutHands } from "./lookEditor";
import { buildHero, disposeHero } from "./voxel/build";

/**
 * The builder's option tiles show the player's own hero with that option, drawn by ONE hidden WebGL renderer: a
 * phone only gives a page a handful of GL contexts, so a live canvas per tile would run out. Tiles ask `get`, which
 * answers from the cache or queues a draw; a few draws happen per animation frame so the screen never stalls.
 */

export type ThumbDraw = (look: HeroLook, framing: SnapshotFraming, size: number) => string;

export interface LookThumbnailer {
  /** False once drawing is impossible (no WebGL, a lost context): the page falls back to 2D portraits */
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
const PER_FRAME = 3;
const CACHE_SIZE = 200;

/** One renderer on a detached canvas and one lit scene; every look is built, shot and thrown away. null without WebGL */
export const createThreeDraw = (): { draw: ThumbDraw; dispose: () => void } | null => {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: document.createElement("canvas"),
      alpha: true,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
  const scene = new THREE.Scene();
  addHeroLights(scene);

  return {
    draw: (look, framing, size) => {
      const hero = buildHero(look);
      scene.add(hero);
      try {
        return renderHeroSnapshot(renderer, scene, hero, size, framing);
      } finally {
        disposeHero(hero); // takes it out of the scene as well
      }
    },
    dispose: () => {
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
  const perFrame = options.perFrame ?? PER_FRAME;
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
    if (options.draw !== undefined) return options.draw;
    if (three === undefined) three = createThreeDraw();
    return three ? three.draw : null;
  };

  const keep = (key: string, picture: string): void => {
    pictures.set(key, picture);
    if (pictures.size > cacheSize) pictures.delete(pictures.keys().next().value as string);
  };

  const frame = (): void => {
    waiting = false;
    if (disposed || !supported.value) return;
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
    if (queue.length > 0) requestFrame();
  };

  const requestFrame = (): void => {
    if (waiting) return;
    waiting = true;
    schedule(frame);
  };

  const get = (look: HeroLook, framing: SnapshotFraming, size = DEFAULT_SIZE): string => {
    if (disposed || !supported.value) return "";
    const stored = withoutHands(look);
    const key = `${framing}|${size}|${JSON.stringify(stored)}`;
    const picture = pictures.get(key);
    if (picture !== undefined) return picture;

    // Asking again moves a look to the front: what is on screen now draws before what was asked for earlier
    const queued = queue.findIndex((request) => request.key === key);
    if (queued >= 0) queue.splice(queued, 1);
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
