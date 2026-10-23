import { feel, type Feel } from "./haptics";

/**
 * The sounds that carry a buzz with them: the money and reward moments of the town (a purchase, coins changing hands, a
 * night at the hotel, a power learned). Playing one of these through play$fx also plays its feel, so every shop, the
 * bank and the hospital feel like the battle without each screen wiring haptics by hand.
 *
 * Menu sounds (`select`, `cursor`, `no`) stay silent in the hand: they fire on every tap and close button. So do the
 * sounds the battle and the temple reveals already pair with their own hand-timed rumbles (`win`, `levelUp`,
 * `openChest`, `openDoor`), which would otherwise buzz twice.
 */
export const SOUND_FEELS: Readonly<Record<string, Feel>> = {
  buyItem: "grab",
  countCoins: "tick",
  coins: "tick",
  gainGP: "grab",
  restoreAll: "success",
  restoreHP: "success",
  learn: "success",
  finish: "success",
};

/** The feel that goes with a sound, if it has one. */
export const feelForSound = (sound: string): Feel | undefined =>
  Object.prototype.hasOwnProperty.call(SOUND_FEELS, sound) ? SOUND_FEELS[sound] : undefined;

/** Buzz along with a one-shot sound. Loops and stops never buzz. */
export const feelSound = (sound: string, options?: { loop?: boolean; stop?: boolean }): void => {
  const isNotOneShot = options?.loop || options?.stop;
  if (isNotOneShot) return;
  const kind = feelForSound(sound);
  if (kind) feel(kind);
};
