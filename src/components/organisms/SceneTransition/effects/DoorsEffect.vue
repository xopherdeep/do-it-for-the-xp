<template>
  <div class="doors-effect" :class="[`is-${phase}`, `is-${plan.direction}`, { 'is-reduced': reduced }]">
    <div class="doors-glow" />
    <div class="doors-leaf is-left">
      <svg viewBox="0 0 48 96" preserveAspectRatio="none" shape-rendering="crispEdges">
        <pixel-runs :runs="leftRuns" />
      </svg>
    </div>
    <div class="doors-leaf is-right">
      <svg viewBox="0 0 48 96" preserveAspectRatio="none" shape-rendering="crispEdges">
        <pixel-runs :runs="rightRuns" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import type { TransitionPlan } from "@/lib/services/transitions/sceneTransitions";
import PixelRuns from "@/app/Console/TempleGrounds/components/PixelRuns.vue";
import { feel } from "@/lib/services/feedback/haptics";
import { play$fx } from "@/assets/fx";
import { useTimers } from "@/hooks/useTimers";
import { prefersReducedMotion } from "../sceneTransitionController";
import { screenLeafLeft, screenLeafRight } from "./screenDoorSprite";

const props = defineProps<{ plan: TransitionPlan; phase: "cover" | "covered" | "reveal" }>();
const emit = defineEmits<{ (e: "covered"): void; (e: "revealed"): void }>();

/** The shut doors come up in front of the hero: they are never seen closing, only opening */
const COVER_MS = 280;
const REVEAL_MS = 480;
const FADE_MS = 150;

const reduced = prefersReducedMotion();
// The plan's variant names the building, in either direction (its title is the town on the way out)
const leftRuns = computed(() => screenLeafLeft(props.plan.variant ?? props.plan.title));
const rightRuns = computed(() => screenLeafRight(props.plan.variant ?? props.plan.title));

const timers = useTimers();
const later = (fn: () => void, ms: number) => timers.startTimeout(ms, fn);

// The animations are CSS keyframes; these timers line the events and beats up with them
watch(
  () => props.phase,
  (phase) => {
    if (phase === "cover") {
      later(() => emit("covered"), reduced ? FADE_MS : COVER_MS);
    }
    if (phase === "reveal") {
      // The hero pushes the doors open: one heavy beat with the creak
      feel("thud");
      play$fx("openDoor");
      later(() => emit("revealed"), reduced ? FADE_MS : REVEAL_MS);
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.doors-effect {
  position: fixed;
  inset: 0;
  z-index: 19000;
  overflow: hidden;
  pointer-events: all;
  perspective: 900px;
}
.doors-effect.is-reveal {
  pointer-events: none;
}

/* What lies beyond: warm lamplight going in, daylight coming out */
.doors-glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  background: radial-gradient(ellipse at 50% 55%, #fff1b0 0%, #f0b050 38%, #8a4a1c 100%);
}
.is-out .doors-glow {
  background: radial-gradient(ellipse at 50% 55%, #f4fbff 0%, #8cc8f4 40%, #3c78c0 100%);
}

.doors-leaf {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  image-rendering: pixelated;
  backface-visibility: hidden;
}
.doors-leaf svg {
  display: block;
  width: 100%;
  height: 100%;
}
.doors-leaf.is-left {
  left: 0;
  transform-origin: 0 50%;
}
.doors-leaf.is-right {
  right: 0;
  transform-origin: 100% 50%;
}

/* Cover: the hero steps up to the shut doors. They come up out of the dark already closed, with a small step forward */
.is-cover { animation: doors-approach 280ms ease-out both; }
@keyframes doors-approach {
  from { opacity: 0; transform: scale(1.06); }
  to { opacity: 1; transform: none; }
}

/* Reveal in: the leaves swing away into the building, light spilling out behind them */
.is-reveal.is-in .doors-leaf.is-left { animation: open-in-left 480ms ease-in both; }
.is-reveal.is-in .doors-leaf.is-right { animation: open-in-right 480ms ease-in both; }
@keyframes open-in-left {
  from { transform: scaleX(1) skewY(0deg); }
  to { transform: scaleX(0) skewY(6deg); }
}
@keyframes open-in-right {
  from { transform: scaleX(1) skewY(0deg); }
  to { transform: scaleX(0) skewY(-6deg); }
}

/* Reveal out: the leaves swing open toward the viewer, growing as they come */
.is-reveal.is-out .doors-leaf.is-left { animation: open-out-left 480ms ease-in both; }
.is-reveal.is-out .doors-leaf.is-right { animation: open-out-right 480ms ease-in both; }
@keyframes open-out-left {
  from { transform: scaleX(1) scaleY(1); opacity: 1; }
  70% { opacity: 1; }
  to { transform: scaleX(0.05) scaleY(1.25) skewY(-8deg); opacity: 0; }
}
@keyframes open-out-right {
  from { transform: scaleX(1) scaleY(1); opacity: 1; }
  70% { opacity: 1; }
  to { transform: scaleX(0.05) scaleY(1.25) skewY(8deg); opacity: 0; }
}

.is-reveal .doors-glow { animation: glow-out 480ms linear both; }
@keyframes glow-out {
  0% { opacity: 1; }
  60% { opacity: 1; }
  100% { opacity: 0; }
}

/* Reduced motion: the shut doors fade in and out, nothing swings */
.is-reduced .doors-leaf,
.is-reduced .doors-glow { animation: none !important; transform: none !important; }
.is-reduced.is-cover { animation: doors-fade-in 150ms linear both; }
.is-reduced.is-reveal { animation: doors-fade-out 150ms linear both; }
.is-reduced .doors-glow { display: none; }
@keyframes doors-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes doors-fade-out { from { opacity: 1; } to { opacity: 0; } }
</style>
