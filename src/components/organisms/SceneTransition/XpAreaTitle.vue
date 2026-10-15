<template>
  <div class="area-title" :style="{ '--area-glow': glow }" aria-hidden="true">
    <div class="area-title__box">
      <div class="area-title__name">{{ title }}</div>
      <div v-if="subtitle" class="area-title__sub">{{ subtitle }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { feel } from "@/lib/services/feedback/haptics";

const props = defineProps<{ title: string; subtitle?: string; element?: string }>();

// The box edge takes the element's colour; no element, the usual EarthBound mint
const GLOWS: Record<string, string> = {
  wind: "#8fe3d0",
  fire: "#ff7a45",
  ice: "#a8e4ff",
  water: "#5aa8ff",
  earth: "#8fcf5a",
  light: "#ffe98a",
  shadow: "#b07aff",
  storm: "#c8b8ff",
  moon: "#d8d8f0",
};
const glow = computed(() => (props.element && GLOWS[props.element]) || "#68d0b8");

onMounted(() => feel("tick"));
</script>

<style scoped lang="scss">
@use "@/styles/themes/earthbound.scss" as *;

// The place-name card: slides down, holds, fades out (~1.4 s). It never takes a tap.
.area-title {
  position: fixed;
  top: max(18%, calc(env(safe-area-inset-top) + 64px));
  left: 0;
  right: 0;
  z-index: 19001;
  display: flex;
  justify-content: center;
  padding: 0 28px;
  pointer-events: none;
  animation: area-title-life 1.4s ease-in-out both;

  &__box {
    @include eb-box();
    box-shadow: 0 0 0 5px $eb-color-medium-purple, 0 0 0 10px var(--area-glow),
      0 0 0 12px $eb-color-pale-yellow, 0 0 0 16px $eb-color-slate;
    min-width: 200px;
    max-width: 100%;
    padding: 12px 22px;
    text-align: center;
  }

  &__name {
    font-family: $eb-font-status;
    font-size: 22px;
    letter-spacing: 1px;
    color: $eb-color-pale-yellow;
    text-shadow: 2px 2px 0 #000;
  }

  &__sub {
    margin-top: 6px;
    font-family: $eb-font-primary;
    font-size: 16px;
    color: var(--area-glow);
    text-shadow: 1px 1px 0 #000;
  }
}

@keyframes area-title-life {
  0% { opacity: 0; transform: translateY(-14px); }
  18% { opacity: 1; transform: translateY(0); }
  78% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .area-title {
    animation-name: area-title-fade;
  }
  @keyframes area-title-fade {
    0%, 100% { opacity: 0; }
    15%, 80% { opacity: 1; }
  }
}
</style>
