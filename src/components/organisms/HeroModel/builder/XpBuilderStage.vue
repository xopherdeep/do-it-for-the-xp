<template>
  <section
    class="builder-stage bg-slide bg-slide-equipment"
    data-cy="builder-stage"
  >
    <XpHeroModel
      ref="model"
      class="stage-model"
      :look="look"
      :animation="animation"
      :focus="focus"
      interactive
    />

    <button
      type="button"
      class="corner-button corner-undo"
      :class="{ 'is-dim': !canUndo }"
      data-cy="builder-undo"
      aria-label="Undo"
      @click="emit('undo')"
    >
      <i class="fad fa-undo"></i>
    </button>

    <button
      type="button"
      class="corner-button corner-random"
      data-cy="builder-random"
      aria-label="Random hero"
      @click="emit('random')"
    >
      <i class="fad fa-dice"></i>
    </button>

    <button
      type="button"
      class="corner-button corner-pose"
      data-cy="builder-pose"
      aria-label="Change pose"
      @click="emit('pose')"
    >
      <i class="fad fa-running"></i>
    </button>
  </section>
</template>

<script setup lang="ts">
  import { ref } from "vue";
  import XpHeroModel from "../XpHeroModel.vue";
  import type { LookFocus } from "../lookEditor";
  import type { HeroAnimation, HeroLook } from "@/lib/hero-look/types";

  /**
   * The hero builder's stage: the voxel hero on the sliding checker, filling its parent, with three round buttons
   * in the corners (Undo bottom-left, Random bottom-right, Pose top-right). It only draws what it is given and
   * emits; `look` is already the display look (hands and bare head applied by the caller). Undo is dimmed when
   * there is nothing to undo but still emits, so the builder can answer the tap. No sounds in here.
   */
  defineProps<{
    look: HeroLook;
    focus: LookFocus;
    animation: HeroAnimation;
    canUndo: boolean;
  }>();

  const emit = defineEmits<{
    (e: "undo"): void;
    (e: "random"): void;
    (e: "pose"): void;
  }>();

  const model = ref<{ snapshot: (size?: number) => string; flick: (velocity?: number) => void } | null>(null);

  /** A picture of the hero (PNG data URL). May throw (no WebGL, say): callers decide what a failure costs. */
  const snapshot = (size?: number): string => model.value?.snapshot(size) ?? "";

  /** Give the hero a spin that coasts to a stop */
  const flick = (): void => model.value?.flick();

  defineExpose({ snapshot, flick });
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  .builder-stage {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .stage-model {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  // Round, 44px, at the corners where a thumb rests
  .corner-button {
    position: absolute;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    font-size: 1.25rem;
    color: $eb-color-pale-yellow;
    background: rgba($eb-color-dark-purple, 0.82);
    border: 2px solid $eb-color-pale-yellow;
    border-radius: 50%;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:active {
      background: $eb-color-medium-purple;
    }

    &:focus-visible {
      outline: 2px solid $eb-color-white;
      outline-offset: 2px;
    }

    &.is-dim {
      opacity: 0.45;
    }

    i {
      --fa-primary-color: currentColor;
      --fa-secondary-color: currentColor;
      --fa-secondary-opacity: 0.55;
    }
  }

  .corner-undo {
    bottom: 10px;
    left: 10px;
  }

  .corner-random {
    right: 10px;
    bottom: 10px;
  }

  .corner-pose {
    top: 10px;
    right: 10px;
  }
</style>
