/**
 * A tiny bus that says "this temple was saved": the TempleDb emits after every write, the engine listens
 * (src/lib/engine/core/dungeons/templeFreshness.ts) and plays the new layout without an app reload.
 * It holds no temple data, only the id, so the database layer does not have to know the engine.
 */
import debug from "@/lib/utils/debug";

export type TempleChangeListener = (templeId: string) => void;

const listeners = new Set<TempleChangeListener>();

/** Call `listener` with the id of every temple saved from now on. Returns the function that stops listening. */
export function onTempleChanged(listener: TempleChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tell the listeners a temple was saved (or removed). One listener failing never keeps the others from hearing it. */
export function emitTempleChanged(templeId: string): void {
  // A copy: a listener that unsubscribes while being called must not skip the next one
  for (const listener of Array.from(listeners)) {
    try {
      listener(templeId);
    } catch (error) {
      debug.warn("[templeChanges] a listener failed", templeId, error);
    }
  }
}
