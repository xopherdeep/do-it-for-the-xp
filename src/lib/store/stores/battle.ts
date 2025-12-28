import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';

export const useBattleStore = defineStore('battle', () => {
  // --- State ---
  const active = ref(false);
  const interval = ref<number | null>(null);
  const timer = ref(500);
  const bgmWaitToStart = ref(4200);

  const terrain = reactive({
    plains: 1,
    swamp: 0,
    forest: 0,
    mountain: 0,
    island: 0
  });

  const steps = reactive({
    min: 64,
    max: 255,
    counter: 155
  });

  const currentEncounter = ref<{
    beastIds: string[];
    userIds: string[];
    bgConfig?: { bg1?: number; bg2?: number };
  } | null>(null);

  // --- Actions ---

  function deactivateBattle() {
    active.value = false;
  }

  function activateBattle() {
    active.value = true;
  }

  function enterBattle() {
    // Note: This formerly dispatched to audio actions. 
    // In Pinia, we can import useAudioStore() here if multi-store interaction is needed,
    // or keep it simple for now.
    activateBattle();
  }

  function startBattleTimer(options: { onEncounter: () => void } ) {
    if (steps.counter <= 0) {
      steps.counter = Math.floor(Math.random() * (steps.max - steps.min + 1) + steps.min);
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

  function resetBattleTimer() {
    steps.counter = steps.max;
  }

  function randomEncounter() {
    const minus = terrain.plains * 4 + (terrain.swamp + terrain.forest + terrain.mountain + terrain.island) * 8;
    steps.counter -= minus;

    const isBattleTimerUp = steps.counter < 0;
    if (isBattleTimerUp && !active.value) {
      // Logic for triggering battle would go here or be handled by the caller
      return true; // Indicate encounter triggered
    }
    return false;
  }

  function setTerrain(newTerrain: Partial<typeof terrain>) {
    Object.assign(terrain, newTerrain);
  }

  function setEncounter(encounter: { beastIds: string[]; userIds?: string[]; bgConfig?: { bg1?: number; bg2?: number } }) {
    currentEncounter.value = {
      beastIds: encounter.beastIds,
      userIds: encounter.userIds || [],
      bgConfig: encounter.bgConfig
    };
  }

  function clearEncounter() {
    currentEncounter.value = null;
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
    activateBattle,
    deactivateBattle,
    enterBattle,
    startBattleTimer,
    stopBattleTimer,
    resetBattleTimer,
    randomEncounter,
    setTerrain,
    currentEncounter,
    setEncounter,
    clearEncounter
  };
});
