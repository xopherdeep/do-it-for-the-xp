// The "Test this device" runner: builds and draws the real voxel hero on a throwaway canvas under four render
// configs, one WebGL context alive at a time, and times the renderer, the build, the first render (shader compile
// included) and the per-frame work. Frames are timed by their own render plus gl.finish, never by the gap between
// animation frames, which would read slow under the tiers' own 30 and 20 fps caps.
// PRIVACY: memory only, the result is never stored or sent.
import * as THREE from "three";
import { DEFAULT_YAW, FOV, addHeroLights, placeCamera, stageFrame } from "@/components/organisms/HeroModel/heroCamera";
import { animateHero } from "@/components/organisms/HeroModel/voxel/animate";
import { buildHero, disposeHero } from "@/components/organisms/HeroModel/voxel/build";
import { BENCH_LOOKS } from "@/components/organisms/HeroModel/voxel/benchLooks";
import { measureHero } from "@/components/organisms/HeroModel/voxel/measure";
import { createVoxelMaterial } from "@/components/organisms/voxel/voxelMaterial";
import type { HeroLook } from "@/lib/hero-look/types";
import { createSampleMeter } from "@/lib/services/graphics/frameMeter";
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
  /** false: the renderer's own pixel ratio rule (min of the screen's and 2) with MSAA only at 1.5 or less. */
  isToday: boolean;
  pixelRatio: number | null;
  isSimple: boolean;
}

const CONFIGS: ConfigSpec[] = [
  { id: "today", label: "Today's settings", isToday: true, pixelRatio: null, isSimple: false },
  { id: "noMsaa", label: "No smoothing (MSAA off)", isToday: false, pixelRatio: null, isSimple: false },
  { id: "noMsaaDpr1", label: "No smoothing, 1x pixels", isToday: false, pixelRatio: 1, isSimple: false },
  { id: "noMsaaDpr1Simple", label: "No smoothing, 1x pixels, simple shading", isToday: false, pixelRatio: 1, isSimple: true },
];

/** A small square, like a hero in the party row: the test is about the device, not the layout */
const STAGE_CSS_PX = 160;
const DEFAULT_FRAMES = 60;
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

  const result: DeviceTestResult = { configs: [], coldBuildMs: null, tier: null, aborted: false };
  if (shouldStop()) return { ...result, aborted: true };

  result.coldBuildMs = measureHero(buildLook).ms;

  /** One config on a fresh detached canvas; null when the run was stopped part way (that config is dropped) */
  const runConfig = async (spec: ConfigSpec): Promise<DeviceTestConfigResult | null> => {
    const canvas = createCanvas();
    const rendererStart = now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelRatio = spec.pixelRatio ?? dpr;
    let renderer: THREE.WebGLRenderer;
    try {
      // VQ16: use rendererOptionsFor
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: spec.isToday && dpr <= 1.5,
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
      const built = buildHero(buildLook);
      const buildMs = now() - buildStart;
      disposeHero(built);

      hero = buildHero(frameLook);
      if (spec.isSimple) {
        const simple = createVoxelMaterial({ simple: true });
        hero.traverse((node) => {
          const mesh = node as THREE.Mesh;
          const isShadow = !mesh.isMesh || mesh.name === "shadow";
          if (!isShadow) mesh.material = simple;
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
      const meter = createSampleMeter();
      const runStart = now();
      let drawn = 0;
      for (let i = 0; i < frames; i++) {
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

  for (let index = 0; index < CONFIGS.length; index++) {
    const spec = CONFIGS[index];
    if (shouldStop()) return { ...result, aborted: true };
    onProgress?.({ id: spec.id, label: spec.label, index, count: CONFIGS.length });
    // The progress callback may be what aborts the run
    if (shouldStop()) return { ...result, aborted: true };
    const config = await runConfig(spec);
    if (!config) return { ...result, aborted: true };
    result.configs.push(config);
    if (!config.supported) break;
  }
  return result;
}
