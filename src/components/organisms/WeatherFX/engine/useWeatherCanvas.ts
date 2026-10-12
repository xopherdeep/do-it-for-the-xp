import { onBeforeUnmount, onMounted, watch, type Ref } from "vue";
import type { WeatherType } from "../types";
import { createWeatherCanvas, type WeatherCanvasHandle } from "./WeatherCanvas";

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

/** Ties the weather canvas to a component: mounts it, follows the props, tears it down. */
export function useWeatherCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  type: Ref<WeatherType>,
  intensity: Ref<number>,
  active: Ref<boolean>
) {
  let handle: WeatherCanvasHandle | null = null;

  const sync = () => {
    if (!handle) return;
    handle.setType(type.value);
    handle.setIntensity(intensity.value);
    if (active.value) handle.start();
    else handle.stop();
  };

  onMounted(() => {
    const canvas = canvasRef.value;
    const cannotPaint = !canvas || typeof canvas.getContext !== "function" || !canvas.getContext("2d");
    if (cannotPaint) return;
    handle = createWeatherCanvas(canvas, {
      type: type.value,
      intensity: intensity.value,
      reducedMotion: prefersReducedMotion(),
    });
    sync();
  });

  watch([type, intensity, active], sync);

  onBeforeUnmount(() => {
    handle?.dispose();
    handle = null;
  });

  return {
    /** For the dev page: live budget and fps; null before mount. */
    stats: () => (handle ? { budget: handle.budget, fps: handle.fps } : null),
  };
}
