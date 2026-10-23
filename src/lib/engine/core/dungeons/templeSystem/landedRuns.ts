/**
 * A hero's temple progress written on another device landed here (Family Sync downloads it into the raw store): the run
 * the engine holds in memory for that hero in that temple is stale. It is forgotten, a save of it still waiting
 * included, so the next visit reads the landed copy; and a snapshot taken before the landing that is still on its way
 * to storage is never written over it.
 */
import type { NewTempleProgress } from '@/lib/databases/TempleProgressDb';
import { forgetRun } from './heroRuns';
import type { TempleRuns } from './runState';

/** `{userId}:{templeId}`, the progress record's key, as hero and temple; null for a key that names neither */
const heroAndTemple = (key: string): { hero: string; templeId: string } | null => {
  const colon = key.indexOf(':');
  const isProgressKey = colon > 0 && colon < key.length - 1;
  return isProgressKey ? { hero: key.slice(0, colon), templeId: key.slice(colon + 1) } : null;
};

const saveKeyOf = (progress: NewTempleProgress): string => `${progress.userId}:${progress.templeId}`;

export interface LandedRuns {
  /** Progress records landed: each run held for that hero in that temple is forgotten */
  landed(runs: TempleRuns, keys: string[]): void;
  /** A snapshot is queued for saving: it remembers how many landings its record had seen */
  noted(progress: NewTempleProgress): void;
  /** A snapshot taken before its record landed: never written */
  isStale(progress: NewTempleProgress): boolean;
}

export const createLandedRuns = (): LandedRuns => {
  /** `{userId}:{templeId}` -> how many times another device's copy landed */
  const landings = new Map<string, number>();
  const seen = new WeakMap<NewTempleProgress, number>();

  const landed = (runs: TempleRuns, keys: string[]): void => {
    for (const key of keys) {
      landings.set(key, (landings.get(key) ?? 0) + 1);
      const named = heroAndTemple(key);
      const isHeldRun = named !== null && runs.heroByTemple.get(named.templeId) === named.hero;
      if (isHeldRun) forgetRun(runs, (named as { templeId: string }).templeId, true);
    }
  };

  return {
    landed,
    noted: (progress) => seen.set(progress, landings.get(saveKeyOf(progress)) ?? 0),
    isStale: (progress) => (landings.get(saveKeyOf(progress)) ?? 0) !== (seen.get(progress) ?? 0),
  };
};
