<template>
  <canvas
    ref="canvas"
    class="confetti-burst"
    aria-hidden="true"
  ></canvas>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { useTimers } from "@/hooks/useTimers";
import {
  burstFromEdges,
  chipWidth,
  isBlinkedOut,
  stepChips,
  type Chip,
} from "./confetti";

/**
 * A burst of pixel confetti over the whole screen: small square and diamond chips and a few star sparkles shot in
 * from all four edges toward the middle, tumbling down under gravity and blinking out. One canvas of big cells drawn
 * crisp and scaled up, one animation-frame loop that stops on its own when the last chip is gone (and on unmount).
 * `burst()` fires the first spray at once and a second one a beat later; it does nothing under reduced motion
 * (the page shows a single sparkle instead).
 */

/** CSS pixels per cell of the confetti canvas: chunky on a phone, and a few thousand cells to draw in all */
const CELL = 3;
const FIRST_PER_EDGE = 80;
const SECOND_PER_EDGE = 45;
const THIRD_PER_EDGE = 30;
const SECOND_WAVE_MS = 480;
const THIRD_WAVE_MS = 960;
/** The loop never outlives this, whatever happens to the chips */
const SAFETY_MS = 9000;

const canvas = ref<HTMLCanvasElement | null>(null);
const timers = useTimers();

let chips: Chip[] = [];
let frame = 0;
let lastTime = 0;
let safetyTimer = 0;
let secondWaveTimer = 0;
let thirdWaveTimer = 0;
let size = { width: 0, height: 0 };

const reducedMotion = (): boolean =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const context = (): CanvasRenderingContext2D | null => canvas.value?.getContext("2d") ?? null;

const fit = (): boolean => {
  const el = canvas.value;
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width / CELL));
  const height = Math.max(1, Math.ceil(rect.height / CELL));
  const isWidthStale = el.width !== width;
  if (isWidthStale) el.width = width;
  const isHeightStale = el.height !== height;
  if (isHeightStale) el.height = height;
  size = { width, height };
  return rect.width > 0 && rect.height > 0;
};

const paint = (ctx: CanvasRenderingContext2D, chip: Chip) => {
  const isNotShownNow = chip.delay > 0 || isBlinkedOut(chip);
  if (isNotShownNow) return;
  const x = Math.round(chip.x);
  const y = Math.round(chip.y);
  ctx.fillStyle = chip.color;
  const w = chipWidth(chip);
  switch (chip.shape) {
    case "diamond": {
      // A plus of five cells; edge-on it is a bar
      const arm = Math.max(1, Math.round(chip.size / 2));
      const isFaceOn = w > 1;
      if (isFaceOn) ctx.fillRect(x - arm, y, arm * 2 + 1, 1);
      ctx.fillRect(x, y - arm, 1, arm * 2 + 1);
      break;
    }
    case "star": {
      // A four-point glint that twinkles between its colour and white
      const arm = Math.max(2, Math.round(chip.size));
      ctx.fillRect(x - arm, y, arm * 2 + 1, 1);
      ctx.fillRect(x, y - arm, 1, arm * 2 + 1);
      ctx.fillStyle = Math.floor(chip.spin) % 2 === 0 ? "#ffffff" : chip.color;
      ctx.fillRect(x - 1, y - 1, 3, 3);
      break;
    }
    default: {
      const h = Math.max(1, Math.round(chip.size));
      ctx.fillRect(x, y, w, h);
    }
  }
};

const clearCanvas = () => {
  const ctx = context();
  const el = canvas.value;
  const canClear = ctx && el;
  if (canClear) ctx.clearRect(0, 0, el.width, el.height);
};

const stop = () => {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  timers.cancel(safetyTimer);
  timers.cancel(secondWaveTimer);
  timers.cancel(thirdWaveTimer);
  chips = [];
  clearCanvas();
};

const tick = (now: number) => {
  frame = 0;
  const ctx = context();
  const el = canvas.value;
  const hasNothingToDrawOn = !ctx || !el;
  if (hasNothingToDrawOn) return;
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  chips = stepChips(chips, dt, size);
  ctx.clearRect(0, 0, el.width, el.height);
  chips.forEach((chip) => paint(ctx, chip));
  const hasChipsInPlay = chips.length > 0;
  if (hasChipsInPlay) frame = requestAnimationFrame(tick);
};

const start = () => {
  if (frame) return;
  lastTime = performance.now();
  frame = requestAnimationFrame(tick);
};

const burst = () => {
  const cannotBurst = reducedMotion() || !fit();
  if (cannotBurst) return;
  const ctx = context();
  if (ctx) ctx.imageSmoothingEnabled = false;
  chips = chips.concat(burstFromEdges(size, FIRST_PER_EDGE, chips.length));
  start();
  secondWaveTimer = timers.startTimeout(SECOND_WAVE_MS, () => {
    chips = chips.concat(burstFromEdges(size, SECOND_PER_EDGE, chips.length));
    start();
  });
  thirdWaveTimer = timers.startTimeout(THIRD_WAVE_MS, () => {
    chips = chips.concat(burstFromEdges(size, THIRD_PER_EDGE, chips.length));
    start();
  });
  timers.cancel(safetyTimer);
  safetyTimer = timers.startTimeout(SAFETY_MS, stop);
};

defineExpose({ burst, stop });

onBeforeUnmount(stop);
</script>

<style scoped>
.confetti-burst {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* Above the hero, below the panel's text; it never takes a tap */
  z-index: 3;
  pointer-events: none;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
}
</style>
