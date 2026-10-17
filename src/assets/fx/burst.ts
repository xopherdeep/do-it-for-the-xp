/**
 * Sounds that tick for a moment and then stop on their own, like the coin counter while a balance rolls. The coin tick
 * is one short clip, so it loops for the burst and is stopped by a timer: a sound left looping would tick on forever.
 * A second burst before the first ends keeps ticking and restarts the clock, so quick moves never cut each other off.
 */

/** How long each burst sound ticks, in ms: a little past the wallet's count-up (useCountUp, 700 ms) */
export const BURST_MS: Record<string, number> = {
  countCoins: 900,
};

type Burstable = Pick<HTMLAudioElement, "play" | "pause" | "paused" | "loop" | "currentTime">;

interface Burst {
  timer?: ReturnType<typeof setTimeout>;
}

const bursts = new Map<Burstable, Burst>();

const burstOf = (audio: Burstable): Burst => {
  const burst = bursts.get(audio) ?? {};
  bursts.set(audio, burst);
  return burst;
};

/** Stop a burst now, if one is ticking */
export function endBurst(audio: Burstable): void {
  const burst = burstOf(audio);
  clearTimeout(burst.timer);
  burst.timer = undefined;
  audio.pause();
  audio.currentTime = 0;
  audio.loop = false;
}

/** Tick `audio` for `ms`, then stop it. Returns the play() promise so the caller can report a refusal. */
export function playBurst(audio: Burstable, ms: number): Promise<void> {
  const burst = burstOf(audio);
  clearTimeout(burst.timer);
  burst.timer = setTimeout(() => endBurst(audio), ms);
  audio.loop = true;
  const isTicking = !audio.paused;
  if (isTicking) return Promise.resolve();
  audio.currentTime = 0;
  return audio.play();
}
