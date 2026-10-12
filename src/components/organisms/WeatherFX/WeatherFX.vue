<template>
  <div class="weather-fx" :class="[type, { active }]" aria-hidden="true">
    <canvas ref="canvasRef" class="weather-canvas"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref, toRef, watch } from "vue";
import type { PropType } from "vue";
import { useWeatherCanvas } from "./engine/useWeatherCanvas";
import { weatherPresets } from "./presets";
import { useWeatherFX } from "./useWeatherFX";
import type { WeatherType } from "./types";

export default defineComponent({
  name: "weather-fx",
  props: {
    type: {
      type: String as PropType<WeatherType>,
      default: "tropical",
    },
    active: {
      type: Boolean,
      default: true,
    },
    intensity: {
      type: Number,
      default: 5,
      validator: (value: number) => value >= 0 && value <= 10,
    },
    soundEnabled: {
      type: Boolean,
      default: true,
    },
    soundVolume: {
      type: Number,
      default: 0.3,
      validator: (value: number) => value >= 0 && value <= 1,
    },
    /** Kept for API compatibility with the DOM based effects; the canvas presets ignore it. */
    customEffectProps: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },
  },
  emits: ["effect-loaded", "effect-changed"],
  setup(props, { emit }) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const { playSound, stopSound, setVolume } = useWeatherFX();

    const engine = useWeatherCanvas(
      canvasRef,
      toRef(props, "type"),
      toRef(props, "intensity"),
      toRef(props, "active")
    );

    /** The ambient loop the current preset asks for, or null when it is silent. */
    const presetSound = () => weatherPresets[props.type]?.sound ?? null;

    const syncSound = () => {
      const sound = presetSound();
      const shouldPlayLoop = props.active && props.soundEnabled && !!sound;
      if (shouldPlayLoop) {
        playSound(sound, props.soundVolume);
      } else {
        stopSound();
      }
    };

    // Re-evaluate the loop when the weather, the on/off switches or the preset change.
    watch(() => [props.type, props.active, props.soundEnabled] as const, syncSound);
    watch(
      () => props.soundVolume,
      (volume) => setVolume(volume)
    );

    watch(
      () => [props.type, props.active] as const,
      ([type, active]) => emit("effect-changed", { type, active }),
      { immediate: true }
    );

    // The first painted frame after mount (or after the layer is switched on) counts as loaded.
    let frameHandle: number | null = null;
    const cancelFrame = () => {
      if (frameHandle !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(frameHandle);
      }
      frameHandle = null;
    };
    const announceLoaded = () => {
      cancelFrame();
      if (typeof requestAnimationFrame !== "function") {
        emit("effect-loaded");
        return;
      }
      // Two frames: one for the engine to start, one for its first draw to land.
      frameHandle = requestAnimationFrame(() => {
        frameHandle = requestAnimationFrame(() => {
          frameHandle = null;
          emit("effect-loaded");
        });
      });
    };

    onMounted(() => {
      if (props.active) announceLoaded();
      // Never autoplay on mount unless the preset asks for it and sound is enabled.
      nextTick(syncSound);
    });
    watch(
      () => props.active,
      (active) => {
        if (active) announceLoaded();
      }
    );
    onBeforeUnmount(cancelFrame);

    return { canvasRef, engine };
  },
});
</script>

<style lang="scss">
.weather-fx {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;

  &:not(.active) {
    display: none;
  }

  .weather-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
}
</style>
