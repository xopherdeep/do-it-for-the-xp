/**
 * An audio element's play() returns a promise that rejects when the browser says no: the sound was cut short by a
 * pause() ("The play() request was interrupted by a call to pause()"), or the page has not had a tap yet ("play() failed
 * because the user didn't interact"). Menu clicks, typing blips and page sounds call play() and ignore the promise, so
 * each refusal surfaced as an unhandled rejection and, in development, the webpack overlay covered the screen. The
 * engine guards play() once for every audio element: a refusal is noted with the dev-only logger, and callers that do
 * care (the engine's own music start, the fx player) still get the same rejecting promise to catch.
 */
import debug from '@/lib/utils/debug';

/** The part of HTMLMediaElement's prototype the guard touches. */
interface Playable {
  play?: (...args: unknown[]) => unknown;
}

type GuardedPlay = ((...args: unknown[]) => unknown) & { isPlayGuard?: boolean };

/** Whether this prototype's play() already carries the guard. */
export const isPlayGuarded = (proto: Playable): boolean => Boolean((proto.play as GuardedPlay | undefined)?.isPlayGuard);

const isThenable = (value: unknown): value is Promise<unknown> =>
  Boolean(value) && typeof (value as Promise<unknown>).catch === 'function';

/**
 * Wrap `proto.play` so a rejected play() is seen (and `onRefused` told) instead of left unhandled. Returns whether it
 * guarded: false when there is no play() to guard or it already was.
 */
export const guardMediaPlay = (proto: Playable, onRefused: (reason: unknown) => void): boolean => {
  const original = proto.play;
  const isPlayMissing = typeof original !== 'function';
  if (isPlayMissing) return false;
  if (isPlayGuarded(proto)) return false;

  const guarded: GuardedPlay = function guardedPlay(this: unknown, ...args: unknown[]) {
    const result = original.apply(this, args);
    // Handling the promise here keeps the browser from calling it unhandled; the caller still gets it to catch
    if (isThenable(result)) result.catch(onRefused);
    return result;
  };
  guarded.isPlayGuard = true;
  proto.play = guarded;
  return true;
};

/** Guard every audio and video element on the page (a page with no media elements, as in a worker, is left alone). */
export const installPlayGuard = (): boolean => {
  const hasMediaElements = typeof window !== 'undefined' && typeof window.HTMLMediaElement !== 'undefined';
  if (!hasMediaElements) return false;
  return guardMediaPlay(window.HTMLMediaElement.prototype as unknown as Playable, (reason) => {
    debug.warn('[audio] a sound was not played:', reason);
  });
};
