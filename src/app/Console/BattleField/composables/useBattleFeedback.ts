import { onUnmounted, ref } from "vue";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import debug from "@/lib/utils/debug";

const SHAKE_MS = 500;
const FLASH_MS = 320;

/** True when the player asked the OS for less motion: the arena then skips the shake and the flash. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

/** Haptics reject on the web and in jsdom; a fight must never care. */
const buzz = (run: () => Promise<unknown>) => {
  try {
    run().catch(() => undefined);
  } catch (error) {
    // no haptics on this platform: a rejected promise is the normal web case and stays silent
    debug.warn("[BattleFeedback] haptics threw synchronously", error);
  }
};

/**
 * What the hero's body feels: the screen shakes and flashes red when the beast lands a hit, the
 * phone buzzes for hits and for the win, and the hero card gets a signal it can shake on.
 */
export const useBattleFeedback = () => {
  const shaking = ref(false);
  const flashing = ref(false);
  /** Increments once per hit the hero takes; the hero card watches it. */
  const hitSignal = ref(0);
  let shakeTimer: number | undefined;
  let flashTimer: number | undefined;

  const heroHit = () => {
    hitSignal.value += 1;
    buzz(() => Haptics.impact({ style: ImpactStyle.Heavy }));
    if (prefersReducedMotion()) return;
    shaking.value = true;
    flashing.value = true;
    window.clearTimeout(shakeTimer);
    window.clearTimeout(flashTimer);
    shakeTimer = window.setTimeout(() => (shaking.value = false), SHAKE_MS);
    flashTimer = window.setTimeout(() => (flashing.value = false), FLASH_MS);
  };

  const beastHit = () => buzz(() => Haptics.impact({ style: ImpactStyle.Medium }));
  const tap = () => buzz(() => Haptics.impact({ style: ImpactStyle.Light }));
  /** One light pulse per second while the clock is in its last ten seconds. */
  const tick = () => buzz(() => Haptics.impact({ style: ImpactStyle.Light }));
  /** The beast winds up: the clock ran out. */
  const windUp = () => buzz(() => Haptics.impact({ style: ImpactStyle.Heavy }));
  const victory = () => buzz(() => Haptics.notification({ type: NotificationType.Success }));

  onUnmounted(() => {
    window.clearTimeout(shakeTimer);
    window.clearTimeout(flashTimer);
  });

  return { shaking, flashing, hitSignal, heroHit, beastHit, tap, tick, windUp, victory };
};

export type BattleFeedback = ReturnType<typeof useBattleFeedback>;
