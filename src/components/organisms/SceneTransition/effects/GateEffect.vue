<template>
  <div
    class="gate-effect"
    :class="[`is-${phase}`, { 'is-calm': calm }]"
    :style="{ '--gate-glow': glow, '--gate-stone': stone, '--gate-stone-dark': stoneDark }"
  >
    <template v-if="!calm">
      <!-- The light inside the temple, seen through the seam as the doors part -->
      <div class="gate-light" />
      <div class="gate-door gate-door--left">
        <span class="gate-door__band" />
        <span class="gate-door__band gate-door__band--low" />
        <span class="gate-door__ring" />
      </div>
      <div class="gate-door gate-door--right">
        <span class="gate-door__band" />
        <span class="gate-door__band gate-door__band--low" />
        <span class="gate-door__ring" />
      </div>
      <!-- A line of light along the seam, and the temple's sigil lighting up across it, as the lock gives -->
      <span class="gate-seam" />
      <svg
        v-if="isEntering"
        class="gate-sigil"
        :viewBox="`0 0 ${IRIS_SPRITE_W} ${IRIS_SPRITE_H}`"
        shape-rendering="crispEdges"
        aria-hidden="true"
      >
        <pixel-runs :runs="sigil" />
      </svg>
      <!-- Dust shaken loose as the doors grind apart -->
      <span v-for="mote in DUST" :key="mote" class="gate-dust" :class="`gate-dust--${mote}`" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import type { TransitionPlan } from "@/lib/services/transitions/sceneTransitions";
import { prefersReducedMotion } from "../sceneTransitionController";
import { feel, rumble } from "@/lib/services/feedback/haptics";
import { play$fx } from "@/assets/fx";
import { useTimers } from "@/hooks/useTimers";
import PixelRuns from "@/app/Console/TempleGrounds/components/PixelRuns.vue";
import { irisTemple, IRIS_SPRITE_H, IRIS_SPRITE_W } from "./irisSprite";

const props = defineProps<{ plan: TransitionPlan; phase: "cover" | "covered" | "reveal" }>();
const emit = defineEmits<{ (e: "covered"): void; (e: "revealed"): void }>();

/** Each element's temple doors: the glow through the seam, the stone, and its shadow. */
const PALETTE: Record<string, [string, string, string]> = {
  wind: ["#fff2d0", "#8a7c6a", "#4e4436"],
  fire: ["#ff7828", "#6a3a30", "#3a1c18"],
  ice: ["#f0faff", "#7c98b3", "#405870"],
  water: ["#96e6f0", "#3e6470", "#1c333c"],
  earth: ["#b4d26e", "#6a5a40", "#382c1e"],
  light: ["#fff0b4", "#b4a27c", "#70624a"],
  shadow: ["#b48cff", "#46365a", "#1e1628"],
  moon: ["#dcdcff", "#6e7088", "#3a3c50"],
  storm: ["#ffe45c", "#4e5a70", "#28303e"],
};
const palette = computed(() => PALETTE[props.plan.element ?? "wind"] ?? PALETTE.wind);
/** Leaving, the hero is inside: what shows through the seam is daylight, and the sigil is on the other face */
const DAYLIGHT = "#fff6dc";
const isEntering = computed(() => props.plan.direction !== "out");
const glow = computed(() => (isEntering.value ? palette.value[0] : DAYLIGHT));
const stone = computed(() => palette.value[1]);
const stoneDark = computed(() => palette.value[2]);
const sigil = computed(() => irisTemple(props.plan.element ?? "wind"));

const DUST = [1, 2, 3, 4, 5, 6];

/** The hero walks up to the shut doors out of the dark; the hold lets the sigil (or daylight) flare; then they grind apart. */
const APPROACH_MS = 520;
const OPEN_MS = 680;
const CALM_MS = 150;

const calm = computed(() => prefersReducedMotion());
const timers = useTimers();

const cover = () => {
  const isCalm = calm.value;
  if (isCalm) {
    timers.startTimeout(CALM_MS, () => emit("covered"));
    return;
  }
  // Two footsteps up to the doors, then the lock clunks as the sigil lights
  rumble([[0, "tick"], [260, "tick"]]);
  timers.startTimeout(APPROACH_MS, () => {
    feel("thud");
    emit("covered");
  });
};

const reveal = () => {
  const isCalm = calm.value;
  if (isCalm) {
    feel("tap");
    timers.startTimeout(CALM_MS, () => emit("revealed"));
    return;
  }
  play$fx("doorStone");
  rumble([[0, "tick"], [160, "tick"], [320, "tick"], [480, "thud"]]);
  timers.startTimeout(OPEN_MS, () => emit("revealed"));
};

const PHASES: Record<string, () => void> = { cover, reveal };

watch(
  () => props.phase,
  (phase) => {
    timers.cancelAll();
    PHASES[phase]?.();
  },
  { immediate: true }
);
</script>

<style scoped>
.gate-effect {
  position: fixed;
  inset: 0;
  z-index: 19000;
  overflow: hidden;
  pointer-events: all;
}

.gate-effect.is-reveal {
  pointer-events: none;
}

/* The temple's light, behind the doors: it floods out of the seam as they part */
.gate-light {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 30% 70% at 50% 50%, var(--gate-glow) 0%, transparent 70%), #000;
  opacity: 0;
}

.is-covered .gate-light {
  opacity: 1;
}

.is-reveal .gate-light {
  animation: gate-light-flood 680ms steps(8, end) both;
}

/* The doors are already shut: the hero steps up to them out of the dark */
.is-cover {
  animation: gate-approach 520ms steps(6, end) both;
}

/* Each door is half the screen of carved stone */
.gate-door {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50.5%;
  background:
    repeating-linear-gradient(0deg, transparent 0 46px, var(--gate-stone-dark) 46px 50px),
    repeating-linear-gradient(90deg, transparent 0 62px, rgba(0, 0, 0, 0.25) 62px 66px),
    linear-gradient(180deg, var(--gate-stone) 0%, var(--gate-stone-dark) 100%);
  box-shadow: inset 0 0 0 6px var(--gate-stone-dark), inset 0 0 40px rgba(0, 0, 0, 0.6);
}

.gate-door--left {
  left: 0;
}

.gate-door--right {
  right: 0;
}

.is-reveal .gate-door--left {
  animation: gate-open-left 680ms cubic-bezier(0.5, 0, 0.9, 0.6) both;
}

.is-reveal .gate-door--right {
  animation: gate-open-right 680ms cubic-bezier(0.5, 0, 0.9, 0.6) both;
}

/* Metal bands across each door and a heavy ring at the seam */
.gate-door__band {
  position: absolute;
  left: 0;
  right: 0;
  top: 22%;
  height: 14px;
  background: linear-gradient(180deg, #d9a54a 0%, #8a5a20 100%);
  box-shadow: 0 2px 0 #000;
}

.gate-door__band--low {
  top: auto;
  bottom: 22%;
}

.gate-door__ring {
  position: absolute;
  top: 50%;
  width: 34px;
  height: 34px;
  margin-top: -17px;
  border: 6px solid #d9a54a;
  border-radius: 50%;
  box-shadow: 0 2px 0 #000;
}

.gate-door--left .gate-door__ring {
  right: 22px;
}

.gate-door--right .gate-door__ring {
  left: 22px;
}

/* Light leaks through the seam once the lock gives */
.gate-seam {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 4px;
  margin-left: -2px;
  background: var(--gate-glow);
  box-shadow: 0 0 12px var(--gate-glow);
  opacity: 0;
}

.is-covered .gate-seam {
  animation: gate-seam-leak 600ms steps(6, end) both;
}

.is-reveal .gate-seam {
  opacity: 1;
  animation: gate-sigil-fade 200ms steps(3, end) both;
}

/* The sigil flares across the seam while the doors are shut */
.gate-sigil {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 112px;
  height: 88px;
  margin: -44px 0 0 -56px;
  opacity: 0;
  filter: drop-shadow(0 0 10px var(--gate-glow));
}

.is-covered .gate-sigil {
  animation: gate-sigil-flare 600ms steps(6, end) both;
}

.is-reveal .gate-sigil {
  animation: gate-sigil-fade 200ms steps(3, end) both;
}

/* Dust drops from the lintel as the doors start to move */
.gate-dust {
  position: absolute;
  top: -8px;
  width: 6px;
  height: 6px;
  background: var(--gate-glow);
  opacity: 0;
}

.gate-dust--1 { left: 44%; }
.gate-dust--2 { left: 47%; animation-delay: 60ms !important; }
.gate-dust--3 { left: 50%; animation-delay: 20ms !important; }
.gate-dust--4 { left: 52%; animation-delay: 100ms !important; }
.gate-dust--5 { left: 55%; animation-delay: 40ms !important; }
.gate-dust--6 { left: 58%; animation-delay: 80ms !important; }

.is-reveal .gate-dust {
  animation: gate-dust-fall 680ms steps(10, end) both;
}

@keyframes gate-approach {
  from { opacity: 0; transform: scale(1.3); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes gate-seam-leak {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes gate-open-left {
  0% { transform: translateX(0); }
  15% { transform: translateX(-2%); }
  100% { transform: translateX(-102%); }
}

@keyframes gate-open-right {
  0% { transform: translateX(0); }
  15% { transform: translateX(2%); }
  100% { transform: translateX(102%); }
}

@keyframes gate-light-flood {
  0% { opacity: 1; }
  60% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes gate-sigil-flare {
  0% { opacity: 0; transform: scale(0.6); }
  50% { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes gate-sigil-fade {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes gate-dust-fall {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(70vh); }
}

/* Reduced motion: a plain 150 ms fade each way */
.gate-effect.is-calm {
  background: #000;
}

.is-calm.is-cover {
  animation: gate-calm-in 150ms linear both;
}

.is-calm.is-reveal {
  animation: gate-calm-out 150ms linear both;
}

@keyframes gate-calm-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes gate-calm-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
