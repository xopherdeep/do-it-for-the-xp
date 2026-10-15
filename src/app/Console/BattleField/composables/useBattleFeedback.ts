import { onUnmounted, ref } from "vue";
import { feel } from "@/lib/services/feedback/haptics";

const SHAKE_MS = 500;
const FLASH_MS = 320;

/** True when the player asked the OS for less motion: the arena then skips the shake and the flash. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

/**
 * What the hero's body feels: the screen shakes and flashes red when the beast lands a hit, the
 * phone buzzes for hits and for the win, and the hero card gets a signal it can shake on.
 * The buzzes go through the game's one haptics vocabulary, so the Vibration switch in Settings mutes them here too.
 */
export const useBattleFeedback = () => {
  const shaking = ref(false);
  const flashing = ref(false);
  /** Increments once per hit the hero takes; the hero card watches it. */
  const hitSignal = ref(0);
  let shakeTimer: number | undefined;
  let flashTimer: number | undefined;

  const playHeroHit = () => {
    hitSignal.value += 1;
    feel("thud");
    if (prefersReducedMotion()) return;
    shaking.value = true;
    flashing.value = true;
    window.clearTimeout(shakeTimer);
    window.clearTimeout(flashTimer);
    shakeTimer = window.setTimeout(() => (shaking.value = false), SHAKE_MS);
    flashTimer = window.setTimeout(() => (flashing.value = false), FLASH_MS);
  };

  const playBeastHit = () => feel("grab");
  const playTap = () => feel("tap");
  /** One light pulse per second while the clock is in its last ten seconds. */
  const playTick = () => feel("tick");
  /** The beast winds up: the clock ran out. */
  const playWindUp = () => feel("thud");
  const playVictory = () => feel("success");

  onUnmounted(() => {
    window.clearTimeout(shakeTimer);
    window.clearTimeout(flashTimer);
  });

  return { shaking, flashing, hitSignal, playHeroHit, playBeastHit, playTap, playTick, playWindUp, playVictory };
};

export type BattleFeedback = ReturnType<typeof useBattleFeedback>;
