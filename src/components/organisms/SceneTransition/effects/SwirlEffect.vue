<template>
  <div class="swirl-effect" :class="[`is-${phase}`, { 'is-calm': calm }]" :style="{ '--swirl-ms': `${calm ? 150 : REVEAL_MS}ms` }">
    <canvas v-if="!calm" ref="canvasEl" class="swirl-canvas" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { TransitionPlan } from "@/lib/services/transitions/sceneTransitions";
import { rumble } from "@/lib/services/feedback/haptics";
import { prefersReducedMotion } from "../sceneTransitionController";

// The EarthBound battle swirl: a spinning multi-arm spiral whose arms widen until the screen is solid.
const props = defineProps<{ plan: TransitionPlan; phase: "cover" | "covered" | "reveal" }>();
const emit = defineEmits<{ (e: "covered"): void; (e: "revealed"): void }>();

const COVER_MS = 700;
const REVEAL_MS = 200;
const CALM_MS = 150;
const TICK_MS = 120;
const PIXEL = 3; // the canvas is drawn at 1/3 size so the spiral reads as chunky pixels
const ARMS = 5;
const TWIST = 2.4; // turns of curl from centre to corner
const SPIN = 0.0016; // turns per ms

// EarthBound battle colours
const PALETTE: Array<[number, number, number]> = [
  [0x28, 0x08, 0x28],
  [0x38, 0x30, 0x50],
  [0x68, 0xa8, 0xd8],
  [0x80, 0xd8, 0x90],
  [0xf7, 0xe8, 0xa8],
];

const calm = ref(prefersReducedMotion());
const canvasEl = ref<HTMLCanvasElement | null>(null);

let raf = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let stopTicks: (() => void) | undefined;
let started = 0;
let covered = false;

let image: ImageData | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let cols = 0;
let rows = 0;
// Per-pixel polar data, built once per size: turns around the centre and normalised distance
let angle = new Float32Array(0);
let dist = new Float32Array(0);

const size = () => {
  const canvas = canvasEl.value;
  if (!canvas) return;
  cols = Math.max(1, Math.ceil(window.innerWidth / PIXEL));
  rows = Math.max(1, Math.ceil(window.innerHeight / PIXEL));
  canvas.width = cols;
  canvas.height = rows;
  ctx = canvas.getContext("2d");
  image = ctx ? ctx.createImageData(cols, rows) : null;
  angle = new Float32Array(cols * rows);
  dist = new Float32Array(cols * rows);
  const cx = cols / 2;
  const cy = rows / 2;
  const far = Math.hypot(cx, cy);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      angle[i] = Math.atan2(y - cy, x - cx) / (Math.PI * 2);
      dist[i] = Math.hypot(x - cx, y - cy) / far;
    }
  }
};

/** Paint one frame. `fill` is how wide the arms are, 0 (none) to 1 (solid). */
const draw = (now: number, fill: number) => {
  if (!ctx || !image) return;
  const data = image.data;
  const spin = now * SPIN;
  const shimmer = Math.floor(now / 90);
  for (let i = 0; i < angle.length; i++) {
    const t = angle[i] * ARMS + dist[i] * TWIST * ARMS * 0.5 - spin * ARMS;
    const phase = t - Math.floor(t);
    const o = i * 4;
    const isBetweenArms = fill < 1 && phase > fill;
    if (isBetweenArms) {
      data[o + 3] = 0;
      continue;
    }
    const band = (((Math.floor(t * 2) + shimmer + Math.floor(dist[i] * 6)) % PALETTE.length) + PALETTE.length) % PALETTE.length;
    const c = PALETTE[band];
    data[o] = c[0];
    data[o + 1] = c[1];
    data[o + 2] = c[2];
    data[o + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
};

const stopLoop = () => {
  cancelAnimationFrame(raf);
  raf = 0;
};

const frame = (now: number) => {
  const elapsed = now - started;
  // Ease-in: the arms creep, then swallow the screen
  const t = Math.min(1, elapsed / COVER_MS);
  draw(now, t * t * 0.5 + t * 0.55);
  if (t >= 1) {
    if (!covered) {
      covered = true;
      stopTicks?.();
      emit("covered");
    }
  }
  raf = requestAnimationFrame(frame);
};

const startCover = () => {
  if (calm.value) {
    timer = setTimeout(() => emit("covered"), CALM_MS);
    return;
  }
  size();
  started = performance.now();
  covered = false;
  // The guard fires the slam; these ticks mark the swirl closing in
  const beats: Array<[number, "tick"]> = [];
  for (let at = TICK_MS; at < COVER_MS; at += TICK_MS) beats.push([at, "tick"]);
  stopTicks = rumble(beats);
  raf = requestAnimationFrame(frame);
};

const startReveal = () => {
  clearTimeout(timer);
  stopTicks?.();
  // The canvas keeps spinning solid under a quick CSS flash-and-fade; the battle screen does the rest
  timer = setTimeout(() => {
    stopLoop();
    emit("revealed");
  }, calm.value ? CALM_MS : REVEAL_MS);
};

watch(
  () => props.phase,
  (phase) => {
    if (phase === "reveal") startReveal();
  }
);

onMounted(() => {
  if (props.phase === "reveal") startReveal();
  else startCover();
});

onBeforeUnmount(() => {
  clearTimeout(timer);
  stopLoop();
  stopTicks?.();
});
</script>

<style scoped>
.swirl-effect {
  position: fixed;
  inset: 0;
  z-index: 19000;
  pointer-events: all;
}
.swirl-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}
.swirl-effect.is-reveal {
  pointer-events: none;
  animation: swirl-flash var(--swirl-ms) linear both;
}
/* Calm: a plain black fade, no canvas */
.swirl-effect.is-calm {
  background: #000;
}
.swirl-effect.is-calm.is-cover {
  animation: swirl-in var(--swirl-ms) linear both;
}
.swirl-effect.is-calm.is-reveal {
  animation: swirl-out var(--swirl-ms) linear both;
}
@keyframes swirl-flash {
  0% { opacity: 1; filter: brightness(1.8); }
  100% { opacity: 0; filter: brightness(1); }
}
@keyframes swirl-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes swirl-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
