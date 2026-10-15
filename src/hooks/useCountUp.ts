import { getCurrentInstance, onBeforeUnmount, ref, watch, type Ref } from "vue";

/** Fast at first, settling at the end: a counter that lands rather than stops */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** The number a counter shows `elapsed` ms into a count from `from` to `to` lasting `duration` ms (whole numbers only). */
export const countAt = (from: number, to: number, elapsed: number, duration: number): number =>
  duration <= 0 || elapsed >= duration ? to : Math.round(from + (to - from) * easeOutCubic(elapsed / duration));

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

export interface CountUp {
  /** What the counter shows right now */
  shown: Ref<number>;
  /** The last change: positive for a gain, negative for a spend, 0 before the first one */
  delta: Ref<number>;
  /** Bumped once per change, so a template can key a pop animation on it */
  pulse: Ref<number>;
}

/**
 * A number that rolls to its new value instead of jumping, the way the battle's odometers do: XP and GP count up on a
 * win and down on a purchase. The first value is shown as it is (nothing counts up from zero when a page opens), and a
 * player who asked the OS for less motion sees the new number at once (the delta and pulse still change).
 */
export function useCountUp(source: Ref<number> | (() => number), duration = 700): CountUp {
  const read = typeof source === "function" ? source : () => source.value;
  const shown = ref(read());
  const delta = ref(0);
  const pulse = ref(0);
  let frame = 0;

  const stop = () => {
    if (frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
    frame = 0;
  };

  watch(read, (to, from) => {
    if (to === from) return;
    delta.value = to - from;
    pulse.value += 1;
    stop();
    const canAnimate = typeof requestAnimationFrame === "function" && !prefersReducedMotion();
    if (!canAnimate) {
      shown.value = to;
      return;
    }
    const start = shown.value;
    const startedAt = performance.now();
    const step = (now: number) => {
      shown.value = countAt(start, to, now - startedAt, duration);
      frame = shown.value === to ? 0 : requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  });

  if (getCurrentInstance()) onBeforeUnmount(stop);
  return { shown, delta, pulse };
}
