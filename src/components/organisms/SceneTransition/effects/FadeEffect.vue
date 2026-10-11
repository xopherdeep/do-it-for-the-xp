<template>
  <div class="fade-effect" :class="`is-${phase}`" :style="{ '--fade-ms': `${duration}ms`, '--fade-color': tint }" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import type { TransitionPlan } from "@/lib/services/transitions/sceneTransitions";
import { prefersReducedMotion } from "../sceneTransitionController";

const props = defineProps<{ plan: TransitionPlan; phase: "cover" | "covered" | "reveal" }>();
const emit = defineEmits<{ (e: "covered"): void; (e: "revealed"): void }>();

// Black, with a breath of the element's colour when the plan has one
const TINTS: Record<string, string> = {
  wind: "#06161a",
  fire: "#1a0604",
  ice: "#061220",
  water: "#041420",
  earth: "#0e1204",
  light: "#1c1a0a",
  shadow: "#0a0412",
  storm: "#0c0c1c",
  moon: "#0a0a18",
};
const tint = computed(() => (props.plan.element && TINTS[props.plan.element]) || "#000");
const duration = computed(() => (prefersReducedMotion() ? 150 : 220));

let timer: ReturnType<typeof setTimeout> | undefined;

// The fade is a CSS transition; the event fires when its time is up
watch(
  () => props.phase,
  (phase) => {
    clearTimeout(timer);
    if (phase === "cover") timer = setTimeout(() => emit("covered"), duration.value);
    if (phase === "reveal") timer = setTimeout(() => emit("revealed"), duration.value);
  },
  { immediate: true }
);

onBeforeUnmount(() => clearTimeout(timer));
</script>

<style scoped>
/* Keyframes, not a transition: the element mounts already in its cover phase */
.fade-effect {
  position: fixed;
  inset: 0;
  z-index: 19000;
  background: var(--fade-color);
  pointer-events: all;
}
.fade-effect.is-cover {
  animation: fade-cover var(--fade-ms) linear both;
}
.fade-effect.is-covered {
  opacity: 1;
}
.fade-effect.is-reveal {
  animation: fade-reveal var(--fade-ms) linear both;
  pointer-events: none;
}
@keyframes fade-cover {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fade-reveal {
  from { opacity: 1; }
  to { opacity: 0; }
}
</style>
