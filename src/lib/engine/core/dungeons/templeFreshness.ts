/**
 * Temple freshness: what the engine plays is what the Game Master last saved, without reloading the app.
 *
 * The engine (DungeonManager) holds a copy of each temple. The temple editor saves to the TempleDb, so two things
 * keep the copy from going stale:
 * - startTempleSync(): once, at app start. Every save in the TempleDb (templeChanges) re-registers that temple
 *   from the saved record. A layout the engine already runs is kept (TempleAdapter.registerTemple compares them),
 *   so a save of a name or an icon changes nothing.
 * - ensureTempleFresh(templeId): the temple screen awaits it before it starts a run. It reads the temple's record
 *   and registers it, which also catches a change no event announced (a restored backup). A shipped temple with no
 *   record in the TempleDb is played from the copy in code.
 * A hero's run in a temple whose layout changed is kept (registerTemple calls TempleSystem.refreshRun).
 */
import { DungeonManager } from './DungeonManager';
import { registerTemple, registerTempleRecord } from './TempleAdapter';
import { TempleSystem } from './TempleSystem';
import { TempleDb, templeStorage } from '@/lib/databases/TempleDb';
import type { TempleInterface } from '@/lib/databases/TempleDb';
import shippedTemples from '@/lib/engine/temples';
import { onTempleChanged } from '@/lib/engine/temples/templeChanges';
import { forgetGeneratedMetadata } from '@/lib/engine/temples/templeRegistry';
import debug from '@/lib/utils/debug';

/** A temple's record in the TempleDb: null when it has none. Throws when the storage can not be read. */
async function readTempleRecord(templeId: string): Promise<TempleInterface | null> {
  // The storage has to be created before it is read
  await templeStorage.create();
  return new TempleDb(templeStorage).getTempleById(templeId);
}

/** The record when it holds a layout to play (settings saved before the layout was ever imported hold none) */
const withLayout = (record: TempleInterface | null): TempleInterface | null => (record?.dungeonLayout ? record : null);

/**
 * Make the engine's copy of a temple the one the Game Master last saved. Never throws: when the TempleDb can not be
 * read, the copy the engine has stays (and a shipped temple the engine has none of is played from code).
 */
export async function ensureTempleFresh(templeId: string): Promise<void> {
  try {
    const saved = withLayout(await readTempleRecord(templeId));
    if (saved) {
      registerTempleRecord(templeId, saved);
      return;
    }
  } catch (error) {
    // No readable TempleDb (private mode, a broken store): the shipped copy below still opens the temple
    debug.warn(`[templeFreshness] could not read ${templeId} from the TempleDb`, error);
  }

  const shipped = (shippedTemples as Record<string, unknown>)[templeId];
  const needsShippedCopy = shipped && !DungeonManager.getInstance().getDungeon(templeId);
  if (needsShippedCopy) registerTemple(templeId, shipped);
}

/** A temple was saved: forget what was cached of it and play the saved layout. */
async function followTempleChange(templeId: string): Promise<void> {
  // A generated temple's name and element are read from its record again the next time they are asked for
  forgetGeneratedMetadata(templeId);
  try {
    const saved = withLayout(await readTempleRecord(templeId));
    if (saved) registerTempleRecord(templeId, saved);
  } catch (error) {
    debug.warn(`[templeFreshness] could not follow the change of ${templeId}`, error);
  }
}

let stopListening: (() => void) | undefined;

/**
 * E2E seam, development builds only (like window.__xp in main.ts): tests/e2e/specs/temple-edit.spec.js saves a temple
 * the way the temple editor does (TempleDb.setTemple) without driving the editor screens, and classic-hera.spec.js
 * reads where a hero's run stands (`state`: the floor and the cell, as the engine holds them) to follow a long walk.
 */
function exposeDevSeam(): void {
  const isUnavailable = process.env.NODE_ENV === 'production' || typeof window === 'undefined';
  if (isUnavailable) return;
  (window as unknown as { __xpTemples: unknown }).__xpTemples = {
    save: (record: TempleInterface) => new TempleDb(templeStorage).setTemple(record),
    state: (templeId: string) => {
      const run = TempleSystem.getInstance().getTempleState(templeId);
      return run ? { currentLevel: run.currentLevel, currentPosition: [...run.currentPosition], playerKeys: run.playerKeys, hasMasterKey: run.hasMasterKey } : null;
    }
  };
}

/** Start following the TempleDb. Safe to call as often as you like: it listens once. */
export function startTempleSync(): void {
  const isListening = Boolean(stopListening);
  if (isListening) return;
  stopListening = onTempleChanged((templeId) => {
    void followTempleChange(templeId);
  });
  exposeDevSeam();
}

/** Stop following the TempleDb (tests; the app listens for as long as it runs). */
export function stopTempleSync(): void {
  stopListening?.();
  stopListening = undefined;
}
