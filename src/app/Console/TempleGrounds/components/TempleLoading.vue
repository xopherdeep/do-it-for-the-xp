<template>
  <transition name="temple-loading">
    <div
      v-if="open"
      class="temple-loading"
      :class="`temple-loading--${element}`"
      role="status"
      aria-live="polite"
      data-cy="temple-loading"
    >
      <i class="fad fa-place-of-worship temple-loading__icon" aria-hidden="true" />
      <p class="temple-loading__name">{{ name || 'The Temple' }}</p>
      <p class="temple-loading__line">Lighting the torches<span class="temple-loading__dots" /></p>
      <div class="temple-loading__bar" :aria-label="`${done} of ${total} rooms ready`">
        <span class="temple-loading__fill" :style="{ width: `${percent}%` }" />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    name?: string;
    element?: string;
    done?: number;
    total?: number;
  }>(),
  { name: "", element: "wind", done: 0, total: 0 }
);

const percent = computed(() => (props.total > 0 ? Math.round((props.done / props.total) * 100) : 0));
</script>

<style lang="scss" scoped>
.temple-loading {
  --glow: #f0d890;
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: radial-gradient(circle at 50% 45%, #2a1d36 0%, #0d0812 72%);
  color: #f4ecd8;
  font-family: "StatusPlz", var(--gs-font, monospace);
  text-align: center;

  &--fire { --glow: #ff8a3c; }
  &--ice { --glow: #bfe6ff; }
  &--water { --glow: #7fe0ea; }
  &--earth { --glow: #a8d070; }
  &--light { --glow: #ffe9a0; }
  &--shadow { --glow: #b48cff; }
  &--moon { --glow: #dcdcff; }
  &--storm { --glow: #ffe45c; }

  &__icon {
    font-size: 64px;
    color: var(--glow);
    filter: drop-shadow(0 0 12px var(--glow));
    animation: temple-loading-breathe 1.6s ease-in-out infinite;
  }

  &__name {
    margin: 0;
    font-size: 22px;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-shadow: 2px 2px 0 #000;
  }

  &__line {
    margin: 0;
    font-size: 14px;
    opacity: 0.8;
  }

  &__dots::after {
    content: "";
    animation: temple-loading-dots 1.2s steps(4) infinite;
  }

  &__bar {
    width: min(240px, 70vw);
    height: 12px;
    border: 2px solid #f4ecd8;
    box-shadow: 0 0 0 2px #000;
    background: #000;
    image-rendering: pixelated;
  }

  &__fill {
    display: block;
    height: 100%;
    background: repeating-linear-gradient(90deg, var(--glow) 0 8px, transparent 8px 10px);
    transition: width 0.2s steps(4);
  }
}

.temple-loading-leave-active {
  transition: opacity 0.35s ease;
}

.temple-loading-leave-to {
  opacity: 0;
}

@keyframes temple-loading-breathe {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.08); opacity: 1; }
}

@keyframes temple-loading-dots {
  0% { content: ""; }
  25% { content: "."; }
  50% { content: ".."; }
  75% { content: "..."; }
}

@media (prefers-reduced-motion: reduce) {
  .temple-loading__icon,
  .temple-loading__dots::after {
    animation: none;
  }
}
</style>
