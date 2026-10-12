import { getCurrentInstance, onBeforeUnmount } from "vue";

export interface Timers {
  /** Run once after `ms`; returns the id for `cancel`. */
  startTimeout(ms: number, run: () => void): number;
  /** Run every `ms` until cancelled; returns the id for `cancel`. */
  startInterval(ms: number, run: () => void): number;
  cancel(id: number): void;
  cancelAll(): void;
}

/**
 * Timers that clear themselves when the component that called this unmounts, so a delayed
 * callback never fires into a closed modal or a page that is gone. Called outside a component
 * (a service, a store), nothing is cleared for you: call `cancelAll` when the owner is done.
 */
export function useTimers(): Timers {
  const timeouts = new Set<number>();
  const intervals = new Set<number>();

  const startTimeout = (ms: number, run: () => void) => {
    const id = window.setTimeout(() => {
      timeouts.delete(id);
      run();
    }, ms);
    timeouts.add(id);
    return id;
  };

  const startInterval = (ms: number, run: () => void) => {
    const id = window.setInterval(run, ms);
    intervals.add(id);
    return id;
  };

  const cancel = (id: number) => {
    if (timeouts.delete(id)) window.clearTimeout(id);
    if (intervals.delete(id)) window.clearInterval(id);
  };

  const cancelAll = () => {
    timeouts.forEach((id) => window.clearTimeout(id));
    intervals.forEach((id) => window.clearInterval(id));
    timeouts.clear();
    intervals.clear();
  };

  if (getCurrentInstance()) onBeforeUnmount(cancelAll);

  return { startTimeout, startInterval, cancel, cancelAll };
}
