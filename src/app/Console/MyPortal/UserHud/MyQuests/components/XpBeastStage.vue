<template>
  <div class="beast-stage" :class="{ 'beast-stage--still': !live }">
    <canvas v-if="live" ref="backdrop" class="beast-stage__backdrop" aria-hidden="true"></canvas>
    <img v-if="portrait" :src="portrait" :alt="alt" class="beast-stage__portrait" data-test="stage-portrait" draggable="false" />
    <i v-else class="fad fa-dragon beast-stage__placeholder" aria-hidden="true"></i>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";

/**
 * A beast standing on its Earthbound battlefield, as the Beast Card draws it: the background engine paints the canvas
 * while the stage is on screen and rests when it leaves, and a new pair of layers repaints it. `live` off is a still
 * night with no engine (after a send, when the engine has nothing more to show).
 */
interface BeastStageProps {
  /** The beast's picture: a drawing's data URL or a library portrait; none shows a placeholder */
  portrait: string;
  alt?: string;
  /** The two layers of the Earthbound battle backdrop (0 to 327) */
  bg1: number;
  bg2: number;
  /** False after a send: a still night, no engine */
  live?: boolean;
}

const props = withDefaults(defineProps<BeastStageProps>(), { alt: "", live: true });

/** The page id the background engine knows this canvas by */
const PAGE_ID = "beast-stage";

const backdrop = ref<HTMLCanvasElement | null>(null);

const paint = () => {
  const canvas = backdrop.value;
  if (!canvas) return;
  backgroundManager.initBackground({
    canvasElement: canvas,
    bg1: props.bg1,
    bg2: props.bg2,
    aspectRatio: 0,
    handleResize: false,
    page: PAGE_ID,
  });
};

const rest = () => {
  if (backgroundManager.isActiveFor(PAGE_ID)) backgroundManager.cleanupBackground();
};

onMounted(paint);
onBeforeUnmount(rest);
watch(
  () => [props.bg1, props.bg2],
  () => {
    if (backgroundManager.isActiveFor(PAGE_ID)) void nextTick(paint);
  }
);
</script>

<style lang="scss" scoped>
.beast-stage {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 168px;
  overflow: hidden;
  background: #000;

  &__backdrop {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: pixelated;
    pointer-events: none;
  }

  &__portrait {
    position: relative;
    z-index: 1;
    height: 92%;
    max-width: 78%;
    object-fit: contain;
    filter: drop-shadow(0 6px 0 rgba(0, 0, 0, 0.45));
    user-select: none;
  }

  &__placeholder {
    position: relative;
    z-index: 1;
    align-self: center;
    color: var(--xp-app-tile-fg);
    font-size: 5rem;
    opacity: 0.8;
  }

  // The engine at rest: a still night stands in for the battlefield
  &--still {
    background: radial-gradient(circle at 50% 70%, var(--xp-app-surface-2), #000);
  }
}
</style>
