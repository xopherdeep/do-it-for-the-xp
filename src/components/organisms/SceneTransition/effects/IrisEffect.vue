<template>
  <div
    class="iris-effect"
    :class="[`is-${phase}`, `dir-${plan.direction}`, { 'is-calm': calm }]"
    :style="{ '--iris-ring': ring, '--iris-flash': flash, '--iris-r': `${radius}px` }"
  >
    <template v-if="!calm">
      <div class="iris-disc" />
      <svg
        v-if="plan.direction === 'in'"
        class="iris-glyph"
        :class="{ 'is-shown': phase === 'covered' }"
        :viewBox="`0 0 ${IRIS_SPRITE_W} ${IRIS_SPRITE_H}`"
        shape-rendering="crispEdges"
        aria-hidden="true"
      >
        <pixel-runs :runs="temple" />
      </svg>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { TransitionPlan } from "@/lib/services/transitions/sceneTransitions";
import { prefersReducedMotion } from "../sceneTransitionController";
import { feel } from "@/lib/services/feedback/haptics";
import { play$fx } from "@/assets/fx";
import PixelRuns from "@/app/Console/TempleGrounds/components/PixelRuns.vue";
import { irisTemple, IRIS_SPRITE_H, IRIS_SPRITE_W } from "./irisSprite";

const props = defineProps<{ plan: TransitionPlan; phase: "cover" | "covered" | "reveal" }>();
const emit = defineEmits<{ (e: "covered"): void; (e: "revealed"): void }>();

// The glowing band around the iris, per element
const RINGS: Record<string, string> = {
  wind: "#fff2d0",
  fire: "#ff7828",
  ice: "#f0faff",
  water: "#96e6f0",
  earth: "#96be5a",
  light: "#fff0b4",
  shadow: "#aa6eff",
  moon: "#aa6eff",
  storm: "#fff2d0",
};
const ring = computed(() => (props.plan.element && RINGS[props.plan.element]) || RINGS.wind);
// Leaving a temple bursts white first, then the element's colour
const flash = "#ffffff";
const temple = computed(() => irisTemple(props.plan.element ?? "wind"));

const STEPS = 9;
const CLOSE_MS = 480; // cover (in): the circle closes in 9 hard steps
const OPEN_MS = 450; // reveal (in): it opens again
const BURST_MS = 400; // cover (out): the flash bursts outward
const FADE_OUT_MS = 450; // reveal (out): the flash fades to the region in hard steps
const CALM_MS = 150;

const calm = computed(() => prefersReducedMotion());
const maxRadius = () => Math.ceil(Math.hypot(window.innerWidth, window.innerHeight) / 2) + 12;

// Radius of the iris circle in px. 'in' starts open and closes; 'out' starts at 0 and bursts.
const radius = ref(props.plan.direction === "in" ? maxRadius() : 0);
const timers = new Set<ReturnType<typeof setTimeout>>();

const later = (fn: () => void, ms: number) => {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
};
const clearAll = () => {
  timers.forEach(clearTimeout);
  timers.clear();
};

/** Walk the radius from one value to another in hard steps, then call done. */
const stepRadius = (from: number, to: number, ms: number, done: () => void) => {
  for (let i = 1; i <= STEPS; i++) {
    later(() => (radius.value = Math.round(from + ((to - from) * i) / STEPS)), (ms * i) / STEPS - ms / STEPS);
  }
  later(done, ms);
};

const run = (phase: string) => {
  clearAll();
  if (calm.value) {
    if (phase === "cover") later(() => emit("covered"), CALM_MS);
    if (phase === "reveal") {
      feel("tap");
      later(() => emit("revealed"), CALM_MS);
    }
    return;
  }
  const max = maxRadius();
  const entering = props.plan.direction === "in";
  if (phase === "cover") {
    if (entering && !props.plan.sound) play$fx("openDoor");
    if (entering) stepRadius(max, 0, CLOSE_MS, () => emit("covered"));
    else stepRadius(0, max, BURST_MS, () => emit("covered"));
  }
  if (phase === "reveal") {
    feel("tap");
    if (entering) stepRadius(0, max, OPEN_MS, () => emit("revealed"));
    else later(() => emit("revealed"), FADE_OUT_MS);
  }
};

watch(() => props.phase, run, { immediate: true });
onBeforeUnmount(clearAll);
</script>

<style scoped>
.iris-effect {
  position: fixed;
  inset: 0;
  z-index: 19000;
  overflow: hidden;
  pointer-events: all;
}
.iris-effect.is-reveal {
  pointer-events: none;
}
/* Entering: the disc is the hole; its huge shadow is the black field closing around it. */
.iris-disc {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--iris-r) * 2);
  height: calc(var(--iris-r) * 2);
  margin: calc(var(--iris-r) * -1) 0 0 calc(var(--iris-r) * -1);
  border-radius: 50%;
  box-sizing: border-box;
}
.dir-in .iris-disc {
  background: transparent;
  box-shadow:
    0 0 0 6px var(--iris-ring),
    0 0 14px 8px var(--iris-ring),
    0 0 0 200vmax #000;
}
/* Leaving: a white disc with an element band bursts outward, then the whole flash fades in steps. */
.dir-out .iris-disc {
  background: var(--iris-flash);
  box-shadow:
    0 0 0 6px var(--iris-ring),
    0 0 14px 8px var(--iris-ring);
}
.dir-out.is-covered {
  background: var(--iris-flash);
}
.dir-out.is-reveal {
  background: var(--iris-flash);
  animation: iris-fade-out 450ms steps(6, end) both;
}
@keyframes iris-fade-out {
  from { opacity: 1; background: var(--iris-flash); }
  to { opacity: 0; background: var(--iris-ring); }
}
/* The pixel temple fades in over the black at full cover */
.iris-glyph {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 112px;
  height: 88px;
  margin: -44px 0 0 -56px;
  opacity: 0;
  transition: opacity 200ms steps(4, end);
}
.iris-glyph.is-shown {
  opacity: 1;
}
.dir-in.is-reveal .iris-glyph {
  display: none;
}
/* Reduced motion: plain 150 ms fade */
.iris-effect.is-calm,
.iris-effect.is-calm.is-covered,
.iris-effect.is-calm.is-reveal {
  background: #000;
}
.is-calm.is-cover {
  animation: iris-calm-in 150ms linear both;
}
.is-calm.is-reveal {
  animation: iris-calm-out 150ms linear both;
}
@keyframes iris-calm-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes iris-calm-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
