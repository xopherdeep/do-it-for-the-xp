// The "Test this device" runner: builds and draws the real voxel hero on a throwaway canvas under five fixed render
// configs plus the chosen tier's own (when it is not Super), one WebGL context alive at a time, and times the renderer, the build, the first render (shader compile
// included) and the per-frame work. Frames are timed by their own render plus gl.finish, never by the gap between
// animation frames, which would read slow under the tiers' own 30 and 20 fps caps.
// Each config draws against a clock: a fast device draws every frame, a slow one stops once a time budget is spent and
// enough frames are kept to read, and a hopeless one at a hard cap (its numbers then read "unknown"), so the whole run
// is bounded instead of waiting out every frame at hundreds of milliseconds each.
// PRIVACY: memory only, the result is never stored or sent.
import * as THREE from "three";
import { DEFAULT_YAW, FOV, addHeroLights, placeCamera, stageFrame } from "@/components/organisms/HeroModel/heroCamera";
import { animateHero } from "@/components/organisms/HeroModel/voxel/animate";
import { buildHero, disposeHero } from "@/components/organisms/HeroModel/voxel/build";
import { BENCH_LOOKS } from "@/components/organisms/HeroModel/voxel/benchLooks";
import { measureHero } from "@/components/organisms/HeroModel/voxel/measure";
import { DEFAULT_DETAIL, detailOf, materialOptionsOf } from "@/components/organisms/HeroModel/voxel/detail";
import { createVoxelMaterial } from "@/components/organisms/voxel/voxelMaterial";
import type { HeroLook } from "@/lib/hero-look/types";
import { currentKnobs, currentTier } from "@/lib/services/graphics/deviceQuality";
import { createSampleMeter } from "@/lib/services/graphics/frameMeter";
import { KNOBS, rendererOptionsFor, TIER_NAMES, type VoxelKnobs } from "@/lib/services/graphics/voxelQuality";
import type { DeviceTestConfigId, DeviceTestConfigResult, DeviceTestResult } from "@/lib/services/graphics/deviceTestTypes";

export interface DeviceTestProgress {
  id: DeviceTestConfigId;
  label: string;
  /** Zero-based position of the config about to run. */
  index: number;
  count: number;
}

export interface DeviceTestOptions {
  /** The look drawn for the frames; the heaviest bench look when missing. */
  look?: HeroLook;
  now?: () => number;
  raf?: (callback: FrameRequestCallback) => number;
  createCanvas?: () => HTMLCanvasElement;
  framesPerConfig?: number;
  signal?: AbortSignal;
  onProgress?: (progress: DeviceTestProgress) => void;
}

interface ConfigSpec {
  id: DeviceTestConfigId;
  label: string;
  /**
   * The tier knobs the renderer and the hero are set up from, exactly as the app would; null for the fixed grid
   * configs, which turn MSAA off and draw today's hero.
   */
  knobs: VoxelKnobs | null;
  /** Overrides the renderer's own pixel ratio; null keeps what the knobs (or Super's rule) give. */
  pixelRatio: number | null;
  /** The material put on a hero built with today's detail; null leaves it as built. */
  material: "simple" | "flat" | null;
}

const GRID: ConfigSpec[] = [
  { id: "today", label: "Today's settings", knobs: KNOBS.super, pixelRatio: null, material: null },
  { id: "noMsaa", label: "No smoothing (MSAA off)", knobs: null, pixelRatio: null, material: null },
  { id: "noMsaaDpr1", label: "No smoothing, 1x pixels", knobs: null, pixelRatio: 1, material: null },
  { id: "noMsaaDpr1Simple", label: "No smoothing, 1x pixels, simple shading", knobs: null, pixelRatio: 1, material: "simple" },
  { id: "noMsaaDpr1Flat", label: "No smoothing, 1x pixels, flat shading", knobs: null, pixelRatio: 1, material: "flat" },
];

/** The grid, plus the tier in use when it is not Super: Super equals today's line, so it would only repeat it */
const configsFor = (): ConfigSpec[] => {
  const isSuper = currentTier() === "super";
  if (isSuper) return GRID;
  const label = `Your tier: ${TIER_NAMES[currentTier()]}`;
  return [...GRID, { id: "chosen", label, knobs: currentKnobs(), pixelRatio: null, material: null }];
};

/** A small square, like a hero in the party row: the test is about the device, not the layout */
const STAGE_CSS_PX = 160;
const DEFAULT_FRAMES = 60;
/** Frames dropped as warm-up: the first render already paid the shader compile, and a slow device draws few frames */
const WARMUP_FRAMES = 3;
/**
 * A work time over this is the OS suspending the app, not the device. Work is timed around the render itself, which a
 * hidden tab cannot inflate, so the meter's 250 ms default would only throw away the frames of the slow phones.
 */
const STALL_MS = 5000;
/** A config stops drawing after this long once it has enough frames: at 600 ms a frame, 60 frames would be 40 s */
const CONFIG_BUDGET_MS = 3000;
/** Frames the budget waits to keep after the warm-up: the meter reports unknown under five kept samples */
const MIN_KEPT_FRAMES = 5;
/** Even short of those frames a config stops here, so a hopeless device reads "unknown" instead of looking frozen */
const HARD_CAP_MS = 10000;
const NO_STATS = { count: 0, medianMs: null, p95Ms: null, worstMs: null };

const unsupported = ({ id, label }: ConfigSpec): DeviceTestConfigResult => ({
  id,
  label,
  supported: false,
  rendererMs: null,
  buildMs: null,
  firstRenderMs: null,
  work: NO_STATS,
  fps: null,
});

/** The GPU is asynchronous: finish (and a one pixel read) makes the clock stop after the work, not after the submit */
const waitForGpu = (renderer: THREE.WebGLRenderer, pixel?: Uint8Array): void => {
  const gl = renderer.getContext() as WebGLRenderingContext | null;
  if (!gl) return;
  gl.finish();
  if (pixel) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
};

/** The measuring loop's clock: the budget is spent with enough frames to read, or the hard cap is passed regardless */
const isTimeUp = (spentMs: number, drawn: number): boolean => {
  const hasEnoughFrames = drawn >= WARMUP_FRAMES + MIN_KEPT_FRAMES;
  const isOverBudget = spentMs > CONFIG_BUDGET_MS;
  const isBudgetSpent = isOverBudget && hasEnoughFrames;
  const isOverHardCap = spentMs > HARD_CAP_MS;
  return isBudgetSpent || isOverHardCap;
};

export async function runDeviceTest(options: DeviceTestOptions = {}): Promise<DeviceTestResult> {
  const now = options.now ?? (() => performance.now());
  const raf = options.raf ?? ((callback: FrameRequestCallback) => requestAnimationFrame(callback));
  const createCanvas = options.createCanvas ?? (() => document.createElement("canvas"));
  const frames = options.framesPerConfig ?? DEFAULT_FRAMES;
  const frameLook = options.look ?? BENCH_LOOKS[4];
  const buildLook = BENCH_LOOKS[0];
  const { signal, onProgress } = options;

  const shouldStop = (): boolean => !!signal?.aborted || document.hidden;
  // A hidden page or a backgrounded app stops firing animation frames, so the wait also ends on the page going hidden
  // or the signal aborting; the loop then sees shouldStop() and the config releases its WebGL context at once.
  const nextFrame = (): Promise<void> =>
    new Promise((resolve) => {
      const finish = (): void => {
        document.removeEventListener("visibilitychange", onVisibility);
        signal?.removeEventListener("abort", finish);
        resolve();
      };
      // Only going hidden ends the wait early: coming back visible would draw a frame without vsync pacing
      const onVisibility = (): void => {
        if (document.hidden) finish();
      };
      document.addEventListener("visibilitychange", onVisibility);
      signal?.addEventListener("abort", finish);
      raf(finish);
    });

  const configs = configsFor();
  const result: DeviceTestResult = { configs: [], coldBuildMs: null, tier: currentTier(), aborted: false };
  if (shouldStop()) return { ...result, aborted: true };

  result.coldBuildMs = measureHero(buildLook).ms;

  /** One config on a fresh detached canvas; null when the run was stopped part way (that config is dropped) */
  const runConfig = async (spec: ConfigSpec): Promise<DeviceTestConfigResult | null> => {
    const canvas = createCanvas();
    const rendererStart = now();
    // The grid configs size the renderer by Super's rule; only the ones that carry knobs keep that rule's MSAA
    const options = rendererOptionsFor(spec.knobs ?? KNOBS.super, window.devicePixelRatio);
    const pixelRatio = spec.pixelRatio ?? options.dpr;
    const detail = spec.knobs ? detailOf(spec.knobs) : DEFAULT_DETAIL;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: spec.knobs !== null && options.antialias,
        powerPreference: "low-power",
      });
    } catch {
      return unsupported(spec);
    }
    // Everything after the constructor sits inside the try so a throw (a context lost at once on an old phone) still
    // releases the WebGL context in the finally below.
    let hero: THREE.Object3D | null = null;
    try {
      renderer.setPixelRatio(pixelRatio);
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.enabled = false;
      renderer.setSize(STAGE_CSS_PX, STAGE_CSS_PX);
      const rendererMs = now() - rendererStart;

      const scene = new THREE.Scene();
      addHeroLights(scene);
      const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 400);
      const buildStart = now();
      const built = buildHero(buildLook, detail);
      const buildMs = now() - buildStart;
      disposeHero(built);

      hero = buildHero(frameLook, detail);
      if (spec.material) {
        const swapped = createVoxelMaterial(materialOptionsOf({ material: spec.material }));
        hero.traverse((node) => {
          const mesh = node as THREE.Mesh;
          const isShadow = !mesh.isMesh || mesh.name === "shadow";
          if (!isShadow) mesh.material = swapped;
        });
      }
      scene.add(hero);
      placeCamera(camera, stageFrame(hero, "full"), 1);

      const pixel = new Uint8Array(4);
      const firstStart = now();
      animateHero(hero, "idle", 0);
      hero.rotation.y = DEFAULT_YAW;
      renderer.render(scene, camera);
      waitForGpu(renderer, pixel);
      const firstRenderMs = now() - firstStart;

      // Frames wait on animation frames, so fps tops out at the display rate: it is headroom below that rate, and the
      // work time per frame is the speed figure (a 60 fps result on a 60 Hz screen does not mean there is spare power).
      // The loop also watches the clock (isTimeUp): a slow device draws fewer than `frames`, fps counts what it drew.
      const meter = createSampleMeter({ warmup: WARMUP_FRAMES, maxMs: STALL_MS });
      const runStart = now();
      let drawn = 0;
      for (let i = 0; i < frames; i++) {
        if (isTimeUp(now() - runStart, drawn)) break;
        await nextFrame();
        if (shouldStop()) return null;
        const seconds = (now() - runStart) / 1000;
        animateHero(hero, "idle", seconds);
        hero.rotation.y = DEFAULT_YAW + seconds * 1.5;
        const start = now();
        renderer.render(scene, camera);
        waitForGpu(renderer);
        meter.push(now() - start);
        drawn += 1;
      }
      const elapsed = now() - runStart;
      const hasElapsed = elapsed > 0 && drawn > 0;
      return {
        id: spec.id,
        label: spec.label,
        supported: true,
        rendererMs,
        buildMs,
        firstRenderMs,
        work: meter.stats(),
        fps: hasElapsed ? (drawn * 1000) / elapsed : null,
      };
    } catch {
      // A throw while building or drawing (shader compile, lost context) keeps the configs already measured
      return unsupported(spec);
    } finally {
      if (hero) disposeHero(hero);
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };

  for (let index = 0; index < configs.length; index++) {
    const spec = configs[index];
    if (shouldStop()) return { ...result, aborted: true };
    onProgress?.({ id: spec.id, label: spec.label, index, count: configs.length });
    // The progress callback may be what aborts the run
    if (shouldStop()) return { ...result, aborted: true };
    const config = await runConfig(spec);
    if (!config) return { ...result, aborted: true };
    result.configs.push(config);
    if (!config.supported) break;
  }
  return result;
}
