<template>
  <transition name="boss-banner">
    <div
      v-if="banner"
      class="boss-banner"
      :class="`boss-banner--${banner.tier}`"
      :style="{ '--boss-glow': glow }"
      role="alert"
      data-cy="boss-banner"
      @click="emit('dismiss')"
    >
      <div class="boss-banner__dim" />
      <div class="boss-banner__strip">
        <span class="boss-banner__label">{{ label }}</span>
        <span class="boss-banner__name">{{ banner.name }}</span>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { BossBanner } from "../templeGrounds/useBossEntrance";

const props = defineProps<{ banner: BossBanner | null; element?: string }>();
const emit = defineEmits<{ (e: "dismiss"): void }>();

/** The glow around the banner, per temple element */
const GLOWS: Record<string, string> = {
  wind: "#fff2d0",
  fire: "#ff7828",
  ice: "#bfe6ff",
  water: "#7fe0ea",
  earth: "#b4d26e",
  light: "#ffe9a0",
  shadow: "#b48cff",
  moon: "#dcdcff",
  storm: "#ffe45c",
};
const glow = computed(() => GLOWS[props.element ?? "wind"] ?? GLOWS.wind);
const label = computed(() => (props.banner?.tier === "boss" ? "Boss" : "Guardian"));
</script>

<style lang="scss" scoped>
.boss-banner {
  position: absolute;
  inset: 0;
  z-index: 1001; /* above the room's move buttons */
  display: flex;
  align-items: center;
  justify-content: center;
  animation: boss-banner-quake 480ms steps(6, end) both;

  &__dim {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, transparent 0%, rgba(0, 0, 0, 0.7) 40%, rgba(0, 0, 0, 0.92) 100%);
    animation: boss-banner-dim 400ms steps(5, end) both;
  }

  &__strip {
    position: relative;
    width: 100%;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: linear-gradient(180deg, rgba(20, 4, 8, 0.92), rgba(60, 8, 16, 0.92));
    border-top: 4px solid var(--boss-glow);
    border-bottom: 4px solid var(--boss-glow);
    box-shadow: 0 0 24px var(--boss-glow), inset 0 0 18px rgba(0, 0, 0, 0.8);
    animation: boss-banner-slam 360ms cubic-bezier(0.2, 1.4, 0.4, 1) both;
  }

  &__label {
    font-family: "StatusPlz", var(--gs-font, monospace);
    font-size: 14px;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: var(--boss-glow);
    animation: boss-banner-blink 600ms steps(2, end) 3;
  }

  &__name {
    font-family: "StatusPlz", var(--gs-font, monospace);
    font-size: clamp(20px, 7vw, 30px);
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: center;
    color: #fff;
    text-shadow: 3px 3px 0 #000, 0 0 12px var(--boss-glow);
  }

  &--miniboss &__strip {
    background: linear-gradient(180deg, rgba(14, 10, 24, 0.92), rgba(40, 24, 60, 0.92));
  }
}

.boss-banner-leave-active {
  transition: opacity 0.35s steps(4, end);
}

.boss-banner-leave-to {
  opacity: 0;
}

@keyframes boss-banner-dim {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes boss-banner-slam {
  0% { transform: scaleY(0) scaleX(1.4); opacity: 0; }
  60% { transform: scaleY(1.2) scaleX(1); opacity: 1; }
  100% { transform: none; opacity: 1; }
}

@keyframes boss-banner-quake {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(-6px, 4px); }
  40% { transform: translate(5px, -3px); }
  60% { transform: translate(-4px, 2px); }
  80% { transform: translate(2px, -1px); }
}

@keyframes boss-banner-blink {
  50% { opacity: 0.2; }
}

@media (prefers-reduced-motion: reduce) {
  .boss-banner,
  .boss-banner__dim,
  .boss-banner__strip,
  .boss-banner__label {
    animation: none;
  }
}
</style>
