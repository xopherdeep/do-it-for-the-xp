/**
 * The Game Master's blood moons over a hero's run: scheduling one, a weekly cadence, raising one now, and the
 * hero hearing of it. TempleSystem's blood moon methods delegate here; each one documents its contract.
 */

import { getTempleProgressDb } from '@/lib/databases/TempleProgressDb';
import type { TempleProgressEntry } from '@/lib/databases/TempleProgressDb';
import { resetTempleProgress } from '../templeReset';
import { nextWeekly } from '../bloodMoonSchedule';
import type { BloodMoonCadence } from '../bloodMoonSchedule';
import { getTempleMetadata } from '@/lib/engine/temples/templeRegistry';
import { bloodMoon as notifyBloodMoon } from '@/lib/services/notifications/notify';
import debug from '@/lib/utils/debug';
import { bloodMoonRisen } from './runState';
import type { TempleRuns } from './runState';
import { forgetRun, openState, progressSnapshot, readSavedProgress, whenProgressReady } from './heroRuns';

export async function scheduleBloodMoon(runs: TempleRuns, templeId: string, userId: string, whenISO: string | null): Promise<TempleProgressEntry | null> {
  await whenProgressReady(runs, templeId);
  await runs.flushProgress();

  const entry = await getTempleProgressDb().scheduleBloodMoon(userId, templeId, whenISO);
  const state = runs.templeStates[templeId];
  const isHeroRunOpen = entry && state && runs.heroByTemple.get(templeId) === userId;
  if (isHeroRunOpen) state.bloodMoonAt = entry.bloodMoonAt;
  return entry;
}

export async function setBloodMoonEvery(runs: TempleRuns, templeId: string, userId: string, every: BloodMoonCadence | null): Promise<TempleProgressEntry | null> {
  await whenProgressReady(runs, templeId);
  await runs.flushProgress();

  let entry = await getTempleProgressDb().setBloodMoonEvery(userId, templeId, every);
  const isMissingFirstMoon = entry && every === 'weekly' && !entry.bloodMoonAt;
  if (isMissingFirstMoon) {
    entry = await getTempleProgressDb().scheduleBloodMoon(userId, templeId, nextWeekly(new Date().toISOString()));
  }
  const state = runs.templeStates[templeId];
  if (entry && state && runs.heroByTemple.get(templeId) === userId) {
    state.bloodMoonEvery = entry.bloodMoonEvery;
    state.bloodMoonAt = entry.bloodMoonAt;
  }
  return entry;
}

export async function bloodMoon(runs: TempleRuns, templeId: string, userId: string): Promise<TempleProgressEntry | null> {
  await whenProgressReady(runs, templeId);
  await runs.flushProgress();

  const saved = await readSavedProgress(userId, templeId);
  if (saved === undefined) return null;

  const open = runs.heroByTemple.get(templeId) === userId;
  const before = saved ?? (open ? progressSnapshot(runs, templeId) : undefined);
  if (!before) return null;

  const reset = resetTempleProgress(before);
  // A weekly moon keeps its cadence: the next one a week on from the one spent (or from tonight)
  if (before.bloodMoonEvery === 'weekly') reset.bloodMoonAt = nextWeekly(before.bloodMoonAt ?? new Date().toISOString());
  if (open) forgetRun(runs, templeId, true);

  let entry: TempleProgressEntry;
  try {
    entry = await getTempleProgressDb().saveProgress(reset);
  } catch (error) {
    debug.error(`Failed to save the blood moon of ${userId} in ${templeId}`, error);
    return null;
  }

  // The screen keeps its temple: the run starts over from the reset record, read back like any other
  if (open) openState(runs, templeId, userId, [reset.currentPosition[0], reset.currentPosition[1]], reset.currentLevel, true);
  // The hero hears of it when they next stand in the temple (the screen reads this flag on mount)
  runs.risen.set(templeId, userId);
  bloodMoonRisen.value = true;
  notifyBloodMoon(userId, { id: templeId, name: getTempleMetadata(templeId).name });
  return entry;
}

export function bloodMoonRose(runs: TempleRuns, templeId: string): boolean {
  const hero = runs.heroByTemple.get(templeId);
  const hasNoMoonForHero = !hero || runs.risen.get(templeId) !== hero;
  if (hasNoMoonForHero) return false;
  const rose = runs.risen.delete(templeId);
  bloodMoonRisen.value = runs.risen.size > 0;
  return rose;
}
