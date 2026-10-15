/**
 * What the hero feels in their hands: one vocabulary of buzzes for the whole game, so a chest, a door and a scene
 * change all speak the same language as the battle. Built on @capacitor/haptics, which drives the phone's motor in
 * the packaged app and falls back to navigator.vibrate in a mobile browser (Android; iOS Safari has no vibration).
 *
 * Haptics reject on desktop browsers and in jsdom; nothing that calls these may ever care, so every call is
 * fire-and-forget. The player can turn them off in Settings (saved on this device, on by default).
 */
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * - `tick`: the smallest pulse, for a count or a cursor step
 * - `tap`: a button or a choice
 * - `grab`: picking something up
 * - `thud`: something heavy lands or opens (a lid, a lock dropping)
 * - `slam`: a double heavy hit (a battle starting)
 * - `success` / `warning` / `error`: the outcome of an action
 */
export type Feel = 'tick' | 'tap' | 'grab' | 'thud' | 'slam' | 'success' | 'warning' | 'error';

export const HAPTICS_KEY = 'xp.haptics';
/** The gap between the two hits of a slam */
const SLAM_GAP_MS = 70;

const readSetting = (): string | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(HAPTICS_KEY);
  } catch {
    return null;
  }
};

/** On unless the player switched it off on this device. */
export const hapticsEnabled = (): boolean => readSetting() !== 'off';

export const setHapticsEnabled = (on: boolean): void => {
  try {
    localStorage.setItem(HAPTICS_KEY, on ? 'on' : 'off');
  } catch {
    // chemx-allow: best-effort private mode or blocked storage, the setting just does not stick
  }
};

const buzz = (run: () => Promise<unknown>): void => {
  const switchedOff = !hapticsEnabled();
  if (switchedOff) return;
  try {
    run().catch(() => undefined);
  } catch {
    // chemx-allow: best-effort no haptics on this platform (desktop browser, jsdom)
  }
};

const impact = (style: ImpactStyle) => buzz(() => Haptics.impact({ style }));
const notify = (type: NotificationType) => buzz(() => Haptics.notification({ type }));

/** Play one feel. Safe to call anywhere, any time: it never throws and never waits. */
export const feel = (kind: Feel): void => {
  switch (kind) {
    case 'tick':
    case 'tap':
      impact(ImpactStyle.Light);
      return;
    case 'grab':
      impact(ImpactStyle.Medium);
      return;
    case 'thud':
      impact(ImpactStyle.Heavy);
      return;
    case 'slam':
      rumble([[0, 'thud'], [SLAM_GAP_MS, 'thud']]);
      return;
    case 'success':
      notify(NotificationType.Success);
      return;
    case 'warning':
      notify(NotificationType.Warning);
      return;
    case 'error':
      notify(NotificationType.Error);
      return;
  }
};

/**
 * A rumble: a run of feels spaced out in time, for something that lasts (a chest rattling, a door grinding open).
 * Each step is `[delay ms from the start, feel]`. Returns a stop function that cancels the steps still to come.
 */
export const rumble = (steps: Array<[number, Feel]>): (() => void) => {
  const timers = steps.map(([at, kind]) => setTimeout(() => feel(kind), at));
  return () => timers.forEach((timer) => clearTimeout(timer));
};
