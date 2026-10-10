import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';

/**
 * Random-encounter pacing. One step is one second of walking on plains (see randomEncounter),
 * so this window is also the wait between two encounters: 2 to 4 minutes, rolled again after each.
 */
const ENCOUNTER_STEPS_MIN = 120;
const ENCOUNTER_STEPS_MAX = 240;

/** A fresh random wait, in steps, anywhere inside [min, max]. */
const rollSteps = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const useBattleStore = defineStore('battle', () => {
  // --- State ---
  const active = ref(false);
  const interval = ref<number | null>(null);
  // Length of one exploration tick in ms: one tick, one step on plains, one second.
  const timer = ref(1000);
  const bgmWaitToStart = ref(4200);

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
    }
  }

  function stopBattleTimer() {
    if (interval.value) {
      clearInterval(interval.value);
      interval.value = null;
    }
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

  function randomEncounter() {
    // Steps walked this tick. Plains (the default terrain) is the baseline, 1 step a tick;
    // every other terrain counts double, so the next encounter comes in half the time.
    const minus = terrain.plains + (terrain.swamp + terrain.forest + terrain.mountain + terrain.island) * 2;
    steps.counter -= minus;

    const isBattleTimerUp = steps.counter <= 0;
    if (isBattleTimerUp && !active.value) {
      // The caller (battle.guard) sends the hero into the fight and re-arms the counter.
      return true;
    }
    return false;
  }

  return {
    // State
    active,
    interval,
    timer,
    bgmWaitToStart,
    terrain,
    steps,
    
    // Actions
    deactivateBattle,
    startBattleTimer,
    stopBattleTimer,
    setTerrainForRoute,
    resetBattleTimer,
    randomEncounter
  };
});
