<template>
  <div class="clouds-effect" :class="[`is-${phase}`, { 'is-pegasus': pegasus, 'is-calm': calm }]" :style="vars">
    <div class="clouds-sky" />
    <template v-if="!calm">
      <div v-for="(layer, i) in layers" :key="i" class="clouds-layer" :class="`layer-${i}`">
        <svg
          :width="layer.cols * layer.scale"
          :height="layer.rows * layer.scale"
          :viewBox="`0 0 ${layer.cols} ${layer.rows}`"
          shape-rendering="crispEdges"
        >
          <pixel-runs :runs="layer.runs" />
        </svg>
      </div>
      <template v-if="pegasus">
        <i v-for="(s, i) in streaks" :key="i" class="clouds-streak" :style="s" />
        <div class="clouds-pegasus">
          <svg :width="PEGASUS_W * 3" :height="PEGASUS_H * 3" :viewBox="`0 0 ${PEGASUS_W} ${PEGASUS_H}`" shape-rendering="crispEdges">
            <pixel-runs :runs="pegasusSprite" />
          </svg>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import type { TransitionPlan } from "@/lib/services/transitions/sceneTransitions";
import PixelRuns from "@/app/Console/TempleGrounds/components/PixelRuns.vue";
import { play$fx } from "@/assets/fx";
import { feel } from "@/lib/services/feedback/haptics";
import { prefersReducedMotion } from "../sceneTransitionController";
import { CLOUD_BANKS, PEGASUS_H, PEGASUS_W, paintCloudLayer, pegasusRuns } from "./cloudSprite";
import { skyGradient } from "./skyBands";

const props = defineProps<{ plan: TransitionPlan; phase: "cover" | "covered" | "reveal" }>();
const emit = defineEmits<{ (e: "covered"): void; (e: "revealed"): void }>();

const pegasus = computed(() => props.plan.variant === "pegasus");
// Reduced motion: just the sky field, fading in and out
const calm = prefersReducedMotion();
const sweepMs = (pegasusMs: number) => {
  if (calm) return 150;
  return pegasus.value ? pegasusMs : 600;
};
const cover = sweepMs(750);
const reveal = sweepMs(650);
const vars = computed(() => ({
  "--cover-ms": `${cover}ms`,
  "--reveal-ms": `${reveal}ms`,
  "--sky": skyGradient(props.plan.element),
}));

const layers = calm
  ? []
  : CLOUD_BANKS.map((spec) => paintCloudLayer(spec, window.innerWidth || 390, window.innerHeight || 844));

const pegasusSprite = pegasus.value ? pegasusRuns() : [];
const streaks = Array.from({ length: 9 }, (_, i) => ({
  top: `${8 + i * 10.5}%`,
  width: `${90 + ((i * 53) % 110)}px`,
  "--streak-delay": `${(i * 37) % 160}ms`,
}));

let timer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.phase,
  (phase) => {
    clearTimeout(timer);
    if (phase === "cover") {
      play$fx((props.plan.sound ?? "map") as Parameters<typeof play$fx>[0]);
      timer = setTimeout(() => emit("covered"), cover);
    }
    if (phase === "reveal") {
      feel("tap");
      timer = setTimeout(() => emit("revealed"), reveal);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => clearTimeout(timer));
</script>

<style scoped>
/* Keyframes, not transitions: the element mounts already in its cover phase. T is the phase length. */
.clouds-effect {
  position: fixed;
  inset: 0;
  z-index: 19000;
  overflow: hidden;
  pointer-events: all;
}
.is-reveal {
  pointer-events: none;
}
.clouds-sky {
  position: absolute;
  inset: 0;
  background: var(--sky);
}
.is-cover .clouds-sky {
  animation: sky-in calc(var(--cover-ms) * 0.5) linear calc(var(--cover-ms) * 0.3) both;
}
.is-reveal .clouds-sky {
  animation: sky-out calc(var(--reveal-ms) * 0.55) linear calc(var(--reveal-ms) * 0.15) both;
}
.is-calm.is-cover .clouds-sky {
  animation: sky-in var(--cover-ms) linear both;
}
.is-calm.is-reveal .clouds-sky {
  animation: sky-out var(--reveal-ms) linear both;
}

.clouds-layer {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}
.clouds-layer svg {
  display: block;
}
/*
 * Flying up into the clouds (cover): the banks rush down the screen, the near bank fastest, and the sky closes in.
 * Coming down out of them (reveal): the banks fall away upward, gathering speed like a drop, and the new place appears.
 * The far bank takes the whole phase, the near bank is quicker and starts later (cover) or leaves first (reveal).
 */
.is-cover .layer-0 { animation: climb-in var(--cover-ms) cubic-bezier(0.2, 0.6, 0.3, 1) both; }
.is-cover .layer-1 { animation: climb-in calc(var(--cover-ms) * 0.9) cubic-bezier(0.2, 0.6, 0.3, 1) calc(var(--cover-ms) * 0.1) both; }
.is-cover .layer-2 { animation: climb-in calc(var(--cover-ms) * 0.8) cubic-bezier(0.2, 0.6, 0.3, 1) calc(var(--cover-ms) * 0.2) both; }
.is-reveal .layer-2 { animation: descend-out calc(var(--reveal-ms) * 0.8) cubic-bezier(0.7, 0.1, 0.8, 0.4) both; }
.is-reveal .layer-1 { animation: descend-out calc(var(--reveal-ms) * 0.9) cubic-bezier(0.7, 0.1, 0.8, 0.4) calc(var(--reveal-ms) * 0.05) both; }
.is-reveal .layer-0 { animation: descend-out calc(var(--reveal-ms) * 0.9) cubic-bezier(0.7, 0.1, 0.8, 0.4) calc(var(--reveal-ms) * 0.1) both; }
.is-covered .clouds-layer { transform: none; }
/* The Pegasus flies between regions at the same height: its banks still sweep sideways */
.is-pegasus.is-cover .clouds-layer { animation-name: sweep-in; }
.is-pegasus.is-reveal .clouds-layer { animation-name: sweep-out; }

.clouds-streak {
  position: absolute;
  left: 100%;
  height: 3px;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35);
  opacity: 0;
}
.is-cover .clouds-streak,
.is-reveal .clouds-streak {
  animation: streak var(--cover-ms) linear var(--streak-delay) both;
}
.is-covered .clouds-streak {
  display: none;
}
.clouds-pegasus {
  position: absolute;
  top: 46%;
  left: 100%;
  display: none;
}
.is-cover .clouds-pegasus {
  display: block;
  animation: glide var(--cover-ms) linear both;
}
.clouds-pegasus svg {
  display: block;
  animation: bob 240ms steps(2) infinite;
}

@keyframes sky-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sky-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes sweep-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes sweep-out { from { transform: translateX(0); } to { transform: translateX(-100%); } }
@keyframes climb-in { from { transform: translateY(-100%); } to { transform: translateY(0); } }
@keyframes descend-out { from { transform: translateY(0); } to { transform: translateY(-100%); } }
@keyframes streak {
  0% { opacity: 0; transform: translateX(0); }
  15% { opacity: 1; }
  100% { opacity: 0.9; transform: translateX(calc(-100vw - 100%)); }
}
@keyframes glide { from { transform: translateX(0); } to { transform: translateX(calc(-100vw - 100%)); } }
@keyframes bob { 0% { transform: translateY(-4px); } 100% { transform: translateY(4px); } }
</style>
