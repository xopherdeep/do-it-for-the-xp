<template>
  <div class="xp-hero-model" :style="boxStyle" role="img" :aria-label="label">
    <canvas ref="canvasRef" class="xp-hero-canvas"></canvas>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRef } from "vue";
import type { PropType } from "vue";
import { DEFAULT_LOOK } from "@/lib/hero-look/types";
import type { HeroAnimation, HeroLook } from "@/lib/hero-look/types";
import { useHeroScene } from "./useHeroScene";
import type { SnapshotFraming } from "./useHeroScene";

/**
 * The voxel hero on a transparent canvas. Fills its parent unless `size` (CSS px) is given.
 * `snapshot(size, framing)` renders a PNG data URL: framing "bust" (default, head and shoulders, made for avatar
 * circles) or "full".
 */
export default defineComponent({
  name: "xp-hero-model",
  props: {
    look: { type: Object as PropType<HeroLook>, default: () => DEFAULT_LOOK },
    animation: { type: String as PropType<HeroAnimation>, default: "idle" },
    interactive: { type: Boolean, default: true },
    size: { type: Number, default: undefined },
  },
  setup(props, { expose }) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const scene = useHeroScene(canvasRef, toRef(props, "look"), toRef(props, "animation"), {
      interactive: props.interactive,
      background: "transparent",
    });

    const boxStyle = computed(() => (props.size ? { width: `${props.size}px`, height: `${props.size}px` } : {}));
    const label = computed(() => `Your hero, ${props.look.outfit} outfit`);

    const snapshot = (size = 256, framing: SnapshotFraming = "bust"): string => scene.snapshot(size, framing);
    expose({ snapshot });

    return { canvasRef, boxStyle, label, snapshot };
  },
});
</script>

<style scoped>
.xp-hero-model {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 1px;
  min-height: 1px;
}

.xp-hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  outline: none;
}
</style>
