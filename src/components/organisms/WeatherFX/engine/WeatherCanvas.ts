import type { EffectFrame, WeatherEffect, WeatherType } from "../types";
import { weatherPresets } from "../presets";

export interface WeatherCanvasOptions {
  type: WeatherType;
  intensity: number;
  reducedMotion?: boolean;
}

export interface WeatherCanvasHandle {
  setType(type: WeatherType): void;
  setIntensity(intensity: number): void;
  start(): void;
  stop(): void;
  dispose(): void;
  /** The current particle multiplier (0.25-1), for the dev page. */
  readonly budget: number;
  /** Frames per second over the last second, for the dev page. */
  readonly fps: number;
}

const MAX_DPR = 2;
const MAX_DT = 0.05;
const SLOW_FRAME_MS = 24;
const SLOW_FRAMES_BEFORE_DROP = 3;
const FAST_FRAMES_BEFORE_RAISE = 50;
const MIN_BUDGET = 0.25;

/**
 * One canvas, one requestAnimationFrame loop, a stack of effect layers from the presets.
 * The loop pauses when the page is hidden or the canvas is scrolled out of view, and it
 * lowers the particle budget when frames run long, then raises it again once they are quick.
 */
export function createWeatherCanvas(canvas: HTMLCanvasElement, options: WeatherCanvasOptions): WeatherCanvasHandle {
  const ctx = canvas.getContext("2d");
  let type = options.type;
  let intensity = clampIntensity(options.intensity);
  const reducedMotion = Boolean(options.reducedMotion);
  let layers: WeatherEffect[] = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let budget = 1;
  let fps = 0;
  let running = false;
  let visible = true;
  let inView = true;
  let rafId: number | null = null;
  let lastTime = 0;
  let startTime = 0;
  let slowStreak = 0;
  let fastStreak = 0;
  let framesThisSecond = 0;
  let secondStart = 0;
  let needsInit = true;

  const frame: EffectFrame = {
    ctx: ctx as CanvasRenderingContext2D,
    width: 0,
    height: 0,
    dpr: 1,
    intensity,
    time: 0,
    dt: 0,
    budget: 1,
    reducedMotion,
  };

  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  const measure = () => {
    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width || canvas.clientWidth || 1));
    const nextHeight = Math.max(1, Math.round(rect.height || canvas.clientHeight || 1));
    const nextDpr = Math.min(MAX_DPR, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    const isAlreadyMeasured = nextWidth === width && nextHeight === height && nextDpr === dpr && !needsInit;
    if (isAlreadyMeasured) return;
    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    frame.width = width;
    frame.height = height;
    frame.dpr = dpr;
    needsInit = true;
  };

  const buildLayers = () => {
    layers.forEach((layer) => layer.dispose?.());
    const preset = weatherPresets[type] ?? weatherPresets.none;
    layers = preset.layers.map((factory) => factory());
    needsInit = true;
  };

  const initLayers = () => {
    frame.intensity = intensity;
    frame.budget = budget;
    frame.dt = 0;
    layers.forEach((layer) => layer.init(frame));
    needsInit = false;
  };

  const tick = () => {
    rafId = null;
    const cannotDraw = !running || !visible || !inView || !ctx;
    if (cannotDraw) return;
    const t = now();
    if (!startTime) {
      startTime = t;
      lastTime = t;
      secondStart = t;
    }
    const elapsed = t - lastTime;
    lastTime = t;
    frame.dt = Math.min(MAX_DT, elapsed / 1000);
    frame.time = (t - startTime) / 1000;
    frame.intensity = intensity;
    frame.budget = budget;

    measure();
    if (needsInit) initLayers();

    ctx.clearRect(0, 0, width, height);
    for (const layer of layers) {
      layer.update(frame);
      layer.draw(frame);
    }

    // Adaptive budget: long frames shed particles, a run of quick frames earns them back
    const cost = now() - t;
    const isSlowFrame = cost > SLOW_FRAME_MS;
    if (isSlowFrame) {
      slowStreak += 1;
      fastStreak = 0;
      const shouldDropBudget = slowStreak >= SLOW_FRAMES_BEFORE_DROP && budget > MIN_BUDGET;
      if (shouldDropBudget) {
        budget = Math.max(MIN_BUDGET, budget - 0.25);
        slowStreak = 0;
        needsInit = true;
      }
    } else {
      slowStreak = 0;
      fastStreak += 1;
      const shouldRaiseBudget = fastStreak >= FAST_FRAMES_BEFORE_RAISE && budget < 1;
      if (shouldRaiseBudget) {
        budget = Math.min(1, budget + 0.25);
        fastStreak = 0;
        needsInit = true;
      }
    }

    framesThisSecond += 1;
    const isSecondOver = t - secondStart >= 1000;
    if (isSecondOver) {
      fps = framesThisSecond;
      framesThisSecond = 0;
      secondStart = t;
    }

    schedule();
  };

  const schedule = () => {
    const cannotSchedule = rafId !== null || !running || !visible || !inView;
    if (cannotSchedule) return;
    const hasAnimationFrames = typeof requestAnimationFrame === "function";
    if (!hasAnimationFrames) return;
    rafId = requestAnimationFrame(tick);
  };

  const cancel = () => {
    const frameId = rafId;
    const canCancelFrame = frameId !== null && typeof cancelAnimationFrame === "function";
    if (canCancelFrame) cancelAnimationFrame(frameId);
    rafId = null;
  };

  const onVisibility = () => {
    visible = typeof document === "undefined" || document.visibilityState !== "hidden";
    if (visible) {
      lastTime = now();
      schedule();
    } else {
      cancel();
    }
  };

  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;
  const hasResizeObserver = typeof ResizeObserver !== "undefined";
  if (hasResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      needsInit = true;
      measure();
    });
    resizeObserver.observe(canvas.parentElement ?? canvas);
  }
  const hasIntersectionObserver = typeof IntersectionObserver !== "undefined";
  if (hasIntersectionObserver) {
    intersectionObserver = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      if (inView) {
        lastTime = now();
        schedule();
      } else {
        cancel();
      }
    });
    intersectionObserver.observe(canvas);
  }
  const hasDocument = typeof document !== "undefined";
  if (hasDocument) document.addEventListener("visibilitychange", onVisibility);

  buildLayers();

  return {
    get budget() {
      return budget;
    },
    get fps() {
      return fps;
    },
    setType(next: WeatherType) {
      const isSameType = next === type;
      if (isSameType) return;
      type = next;
      buildLayers();
      if (ctx) ctx.clearRect(0, 0, width, height);
    },
    setIntensity(next: number) {
      intensity = clampIntensity(next);
      needsInit = true;
    },
    start() {
      if (running) return;
      running = true;
      startTime = 0;
      schedule();
    },
    stop() {
      running = false;
      cancel();
    },
    dispose() {
      running = false;
      cancel();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (hasDocument) document.removeEventListener("visibilitychange", onVisibility);
      layers.forEach((layer) => layer.dispose?.());
      layers = [];
    },
  };
}

function clampIntensity(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : 5;
}
