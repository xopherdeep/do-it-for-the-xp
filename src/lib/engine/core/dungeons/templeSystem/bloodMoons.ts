/**
 * The Game Master's blood moons over a hero's run: scheduling one, a weekly cadence, raising one now, and the
 * hero hearing of it. TempleSystem's blood moon methods delegate here; each one documents its contract.
 */

import { getTempleProgressDb } from '@/lib/databases/TempleProgressDb';
import type { NewTempleProgress, TempleProgressEntry } from '@/lib/databases/TempleProgressDb';
import { resetTempleProgress } from '../templeReset';
import { nextWeekly } from '../bloodMoonSchedule';
import type { BloodMoonCadence } from '../bloodMoonSchedule';
import { getTempleMetadata } from '@/lib/engine/temples/templeRegistry';
import { bloodMoon as notifyBloodMoon } from '@/lib/services/notifications/notify';
import { forgetVisits } from '@/lib/services/temples/roomInteractions/visitMemory';
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
  const scheduled = entry;
  const isHeroRunOpen = scheduled && state && runs.heroByTemple.get(templeId) === userId;
  if (isHeroRunOpen) {
    state.bloodMoonEvery = scheduled.bloodMoonEvery;
    state.bloodMoonAt = scheduled.bloodMoonAt;
  }
  return entry;
}

export async function bloodMoon(runs: TempleRuns, templeId: string, userId: string): Promise<TempleProgressEntry | null> {
  await whenProgressReady(runs, templeId);
  await runs.flushProgress();

  const saved = await readSavedProgress(userId, templeId);
  const isUnreadable = saved === undefined;
  if (isUnreadable) return null;

  const open = runs.heroByTemple.get(templeId) === userId;
  const before = saved ?? (open ? progressSnapshot(runs, templeId) : undefined);
  if (!before) return null;

  const reset = resetTempleProgress(before);
  // A weekly moon keeps its cadence: the next one a week on from the one spent (or from tonight)
  const isWeekly = before.bloodMoonEvery === 'weekly';
  if (isWeekly) reset.bloodMoonAt = nextWeekly(before.bloodMoonAt ?? new Date().toISOString());

  // Saved before the run is swapped, so a save that fails leaves the hero's run standing (not forgotten and stranded)
  const entry = await saveReset(runs, templeId, userId, reset, open);
  if (!entry) return null;

  // What the visit remembered goes with the run, whether or not the hero is in the temple right now
  forgetVisits(templeId, userId);
  // The screen keeps its temple: the run starts over from the reset record, read back like any other. Not for a run that
  // changed hands while the reset was on its way: the next entry reads the reset record.
  const isRunStillTheirs = open && runs.heroByTemple.get(templeId) === userId;
  if (isRunStillTheirs) {
    forgetRun(runs, templeId, true);
    openState(runs, templeId, userId, [reset.currentPosition[0], reset.currentPosition[1]], reset.currentLevel, true);
  }
  // The hero hears of it when they next stand in the temple (the screen reads this flag on mount)
  runs.risen.set(templeId, userId);
  bloodMoonRisen.value = true;
  notifyBloodMoon(userId, { id: templeId, name: getTempleMetadata(templeId).name });
  return entry;
}

/**
 * Write a reset record. The hero's run in memory saves nothing meanwhile (the way a save on its way back in blocks it,
 * progressSnapshot): an older snapshot of it landing after the reset would undo the moon. When the write fails the run
 * stands as it was and is saved as it stands.
 * @param isRunOpen Whether the hero's run is open in memory
 * @returns The record as saved, or null when it could not be saved
 */
async function saveReset(
  runs: TempleRuns,
  templeId: string,
  userId: string,
  reset: NewTempleProgress,
  isRunOpen: boolean
): Promise<TempleProgressEntry | null> {
  const write = getTempleProgressDb().saveProgress(reset);
  const marker = write.then(() => undefined, () => undefined);
  if (isRunOpen) runs.reads.set(templeId, marker);

  let entry: TempleProgressEntry | null = null;
  try {
    entry = await write;
  } catch (error) {
    debug.error(`Failed to save the blood moon of ${userId} in ${templeId}`, error);
  }

  // Not a read set after this one (the temple went to another hero meanwhile)
  const isMarkerStanding = runs.reads.get(templeId) === marker;
  if (isMarkerStanding) runs.reads.delete(templeId);
  const shouldResave = !entry && isMarkerStanding;
  if (shouldResave) runs.queueSave(templeId);
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
