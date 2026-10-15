import type { EffectFrame } from "../types";

/** Deterministic, fast PRNG so a preset looks the same every time it is built. */
export function makeRng(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Particle count between `min` and `max` from the intensity, scaled by the budget (and halved for reduced motion). */
export function countFor(frame: EffectFrame, min: number, max: number): number {
  const base = min + ((max - min) * frame.intensity) / 10;
  const scaled = base * frame.budget * (frame.reducedMotion ? 0.5 : 1);
  return Math.max(0, Math.round(scaled));
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** 0..1..0 pulse */
export const pulse = (t: number, period: number, phase = 0) => 0.5 + 0.5 * Math.sin((t / period) * Math.PI * 2 + phase);

/** A soft radial blob drawn once onto an offscreen canvas, reused by clouds, fog and glows. */
export function softBlob(size: number, r: number, g: number, b: number, alpha = 1): HTMLCanvasElement | null {
  const isServerSide = typeof document === "undefined";
  if (isServerSide) return null;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
  grad.addColorStop(0.55, `rgba(${r},${g},${b},${alpha * 0.35})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return c;
}
