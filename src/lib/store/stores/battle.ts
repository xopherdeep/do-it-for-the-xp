import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { nextEncounterAt as encounterDueAt, stepsPerSecond, stepsWalked } from '@/lib/services/battle/encounterClock';

/**
 * Random-encounter pacing. One step is one second of walking on plains (see randomEncounter),
 * so this window is also the wait between two encounters: 2 to 4 minutes, rolled again after each.
 * The clock is wall-clock time (see encounterClock), so time spent in the background still walks.
 */
const ENCOUNTER_STEPS_MIN = 120;
const ENCOUNTER_STEPS_MAX = 240;

/** A fresh random wait, in steps, anywhere inside [min, max]. */
const rollSteps = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const useBattleStore = defineStore('battle', () => {
  // --- State ---
  const active = ref(false);
  const interval = ref<number | null>(null);
  // Length of one exploration tick in ms. A tick only wakes the guard; the steps it walks come from the
  // wall clock (lastWalkAt), so a throttled or paused timer does not slow the walk down.
  const timer = ref(1000);
  const bgmWaitToStart = ref(4200);
  // When the hero last walked or rested, as Date.now(); null while the timer is not running.
  // randomEncounter walks the time since this moment, restWalk moves it up without walking.
  const lastWalkAt = ref<number | null>(null);

  const terrain = reactive({
    plains: 1,
    swamp: 0,
    forest: 0,
    mountain: 0,
    island: 0
  });

  // counter = steps left until the next encounter; it starts on a roll inside the min..max window.
  const steps = reactive({
    min: ENCOUNTER_STEPS_MIN,
    max: ENCOUNTER_STEPS_MAX,
    counter: rollSteps(ENCOUNTER_STEPS_MIN, ENCOUNTER_STEPS_MAX)
  });

  // --- Actions ---

  function deactivateBattle() {
    active.value = false;
  }

  function startBattleTimer(options: { onEncounter: () => void } ) {
    if (steps.counter <= 0) {
      steps.counter = rollSteps(steps.min, steps.max);
    }

    if (!interval.value) {
      interval.value = window.setInterval(options.onEncounter, timer.value);
      lastWalkAt.value = Date.now();
    }
  }

  function stopBattleTimer() {
    if (interval.value) {
      clearInterval(interval.value);
      interval.value = null;
    }
    lastWalkAt.value = null;
  }

  /** Weigh the terrain the hero walks on: `key` counts double, null (or an unknown key) is plains. */
  function setTerrainForRoute(key: string | null) {
    const walked = key && key !== 'plains' && key in terrain ? key : 'plains';
    (Object.keys(terrain) as Array<keyof typeof terrain>).forEach((k) => {
      terrain[k] = k === walked ? 1 : 0;
    });
  }

  /** Re-arm after an encounter: a new random wait inside the steps.min..steps.max window. */
  function resetBattleTimer() {
    steps.counter = rollSteps(steps.min, steps.max);
  }

  /**
   * Walk the time since the hero last walked, then say whether an encounter is due. The clock is wall-clock
   * time: plains (the default terrain) is the baseline, 1 step a second, and every other terrain counts
   * double, so the next encounter comes in half the time. Without a running timer (lastWalkAt is null)
   * one call is one second of walking, a single tick.
   */
  function randomEncounter(now: number = Date.now()) {
    const perSecond = stepsPerSecond(terrain);
    if (lastWalkAt.value === null) {
      steps.counter -= perSecond;
    } else {
      steps.counter -= stepsWalked(now - lastWalkAt.value, perSecond);
      lastWalkAt.value = now;
    }

    const isBattleTimerUp = steps.counter <= 0;
    if (isBattleTimerUp && !active.value) {
      // The caller (battle.guard) sends the hero into the fight and re-arms the counter.
      return true;
    }
    return false;
  }

  /** A tick that could not start a fight spends no steps: move the walk clock up to `now` without walking. */
  function restWalk(now: number = Date.now()) {
    if (lastWalkAt.value !== null) {
      lastWalkAt.value = now;
    }
  }

  /**
   * When the step counter runs out if the hero keeps walking from `now` (after `invisibleUntil`, when X's
   * Invisibility holds the walk back); null when the hero covers no ground.
   */
  function nextEncounterAt(now: Date, invisibleUntil?: Date | null): Date | null {
    return encounterDueAt(steps.counter, stepsPerSecond(terrain), now, invisibleUntil);
  }

  return {
    // State
    active,
    interval,
    timer,
    bgmWaitToStart,
    lastWalkAt,
    terrain,
    steps,
    
    // Actions
    deactivateBattle,
    startBattleTimer,
    stopBattleTimer,
    setTerrainForRoute,
    resetBattleTimer,
    randomEncounter,
    restWalk,
    nextEncounterAt
  };
});
