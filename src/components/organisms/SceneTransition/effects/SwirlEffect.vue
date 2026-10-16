<template>
  <div
    class="swirl-effect"
    :class="[`is-${phase}`, `style-${look}`, { 'is-calm': calm }]"
    :style="{ '--swirl-ms': `${calm ? 150 : REVEAL_MS}ms`, '--cover-ms': `${COVER_MS}ms` }"
  >
    <canvas v-if="!calm && look === 'swirl'" ref="canvasEl" class="swirl-canvas" />
    <!-- CSS covers: a few transformed blocks each, so they stay on the compositor -->
    <template v-else-if="!calm">
      <i v-for="n in pieceCount" :key="n" class="piece" :style="pieceStyle(n - 1)" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { BATTLE_STYLES, type BattleStyle, type TransitionPlan } from "@/lib/services/transitions/sceneTransitions";
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
// The plan's variant picks the look; anything unknown falls back to the canvas swirl
const look: BattleStyle = (BATTLE_STYLES as readonly string[]).includes(props.plan.variant ?? "")
  ? (props.plan.variant as BattleStyle)
  : "swirl";
const CHECKER_COLS = 6;
const CHECKER_ROWS = 10;
const PIECES: Record<BattleStyle, number> = { swirl: 0, blinds: 10, checker: CHECKER_COLS * CHECKER_ROWS, iris: 4, flash: 2, slash: 7 };
const pieceCount = PIECES[look];

/** Each piece's colour and stagger; the per-style keyframes do the moving. */
const pieceStyle = (i: number): Record<string, string> => {
  const [r, g, b] = PALETTE[i % PALETTE.length];
  const color = `rgb(${r}, ${g}, ${b})`;
  if (look === "checker") {
    const col = i % CHECKER_COLS;
    const row = Math.floor(i / CHECKER_COLS);
    // Diagonal sweep from the top-left corner, alternating squares a beat apart
    const step = (col + row + ((col + row) % 2) * 3) / (CHECKER_COLS + CHECKER_ROWS + 3);
    return {
      left: `${(col * 100) / CHECKER_COLS}%`,
      top: `${(row * 100) / CHECKER_ROWS}%`,
      width: `${100 / CHECKER_COLS + 0.5}%`,
      height: `${100 / CHECKER_ROWS + 0.5}%`,
      background: `rgb(${PALETTE[(col + row) % 2].join(",")})`,
      animationDelay: `calc(var(--cover-ms) * ${(step * 0.6).toFixed(3)})`,
    };
  }
  if (look === "blinds") {
    const isEven = i % 2 === 0;
    return {
      top: `${i * 10}%`,
      background: color,
      transformOrigin: isEven ? "left" : "right",
      animationDelay: `calc(var(--cover-ms) * ${((i % 5) * 0.08).toFixed(2)})`,
    };
  }
  if (look === "slash") {
    return { left: `${i * 18 - 20}%`, background: color, animationDelay: `calc(var(--cover-ms) * ${(i * 0.06).toFixed(2)})` };
  }
  if (look === "iris") {
    // Rings close in from the edge, outermost first; the last is the dark bullseye
    const ring = i === pieceCount - 1 ? PALETTE[0] : PALETTE[PALETTE.length - 1 - i];
    return { background: `rgb(${ring.join(",")})`, animationDelay: `calc(var(--cover-ms) * ${(i * 0.14).toFixed(2)})` };
  }
  // flash: a white strobe over a dark slam
  return i === 0 ? { background: "#fff" } : { background: `rgb(${PALETTE[0].join(",")})` };
};
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
  const brush = ctx;
  const frameImage = image;
  const isUnsized = !brush || !frameImage;
  if (isUnsized) return;
  const data = frameImage.data;
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
  brush.putImageData(frameImage, 0, 0);
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
  const isFullyCovered = t >= 1;
  if (isFullyCovered) {
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
  const isCssCover = look !== "swirl";
  if (isCssCover) {
    timer = setTimeout(() => emit("covered"), COVER_MS);
    stopTicks = rumble(Array.from({ length: Math.floor((COVER_MS - 1) / TICK_MS) }, (_, k) => [(k + 1) * TICK_MS, "tick"] as [number, "tick"]));
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
    const isReveal = phase === "reveal";
    if (isReveal) startReveal();
  }
);

onMounted(() => {
  const isRevealing = props.phase === "reveal";
  if (isRevealing) startReveal();
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
/* CSS covers: every piece ends fully opaque at --cover-ms so the screen is solid when 'covered' fires */
.piece {
  position: absolute;
  display: block;
  will-change: transform, opacity;
  animation-duration: calc(var(--cover-ms) * 0.4);
  animation-timing-function: steps(5, end); /* chunky, SNES-ish frames */
  animation-fill-mode: both;
}
.style-blinds .piece {
  left: 0;
  width: 100%;
  height: 10.5%;
  animation-name: piece-blind;
}
.style-checker .piece {
  animation-name: piece-pop;
}
.style-slash .piece {
  top: -20%;
  width: 22%;
  height: 140%;
  transform-origin: top;
  animation-name: piece-slash;
}
.style-iris .piece {
  left: 50%;
  top: 50%;
  width: 160vmax;
  height: 160vmax;
  margin: -80vmax 0 0 -80vmax;
  border-radius: 50%;
  animation-name: piece-iris;
  animation-duration: calc(var(--cover-ms) * 0.5);
}
.style-iris .piece:nth-child(2) { width: 120vmax; height: 120vmax; margin: -60vmax 0 0 -60vmax; }
.style-iris .piece:nth-child(3) { width: 80vmax; height: 80vmax; margin: -40vmax 0 0 -40vmax; }
.style-iris .piece:nth-child(4) { width: 50vmax; height: 50vmax; margin: -25vmax 0 0 -25vmax; animation-name: piece-iris-core; }
.style-flash .piece {
  inset: 0;
  animation-duration: var(--cover-ms);
  animation-timing-function: linear;
}
.style-flash .piece:nth-child(1) { animation-name: piece-strobe; }
.style-flash .piece:nth-child(2) { animation-name: piece-slam; }
@keyframes piece-blind {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes piece-pop {
  from { transform: scale(0) rotate(90deg); }
  to { transform: scale(1) rotate(0); }
}
@keyframes piece-slash {
  from { transform: skewX(-20deg) scaleY(0); }
  to { transform: skewX(-20deg) scaleY(1); }
}
/* The rings grow in from nothing so the centre is last to go dark */
@keyframes piece-iris {
  from { transform: scale(0); }
  to { transform: scale(1); }
}
@keyframes piece-iris-core {
  from { transform: scale(0); }
  to { transform: scale(4); }
}
@keyframes piece-strobe {
  0%, 20%, 40%, 60% { opacity: 0; }
  10%, 30%, 50% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes piece-slam {
  0%, 60% { opacity: 0; transform: scale(0.2); }
  100% { opacity: 1; transform: scale(1); }
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
