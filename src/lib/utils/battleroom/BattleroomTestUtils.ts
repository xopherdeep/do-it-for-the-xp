/**
 * BattleroomTestUtils provides utilities for testing and debugging 
 * the battleroom component in development environments.
 */
import { useBattleStore } from '@/lib/store/stores/battle';
import debug from '@/lib/utils/debug';

export class BattleroomTestUtils {
  private battleStore: ReturnType<typeof useBattleStore>;

  constructor() {
    this.battleStore = useBattleStore();
  }

  /**
   * Gets the current battle state from the store
   */
  getBattleState() {
    return {
      active: this.battleStore.active,
      timer: this.battleStore.timer,
      steps: this.battleStore.steps,
      terrain: this.battleStore.terrain
    };
  }

  /**
   * Triggers a battle manually with customizable parameters
   */
  triggerBattle(options: { enemyType?: string; bgIndex?: number } = {}) {
    // Activate battle in store
    this.battleStore.activateBattle();
    
    // Set terrain type if specified
    if (options.bgIndex !== undefined) {
      const terrainTypes = ['plains', 'forest', 'mountain', 'swamp', 'island'];
      const terrain = terrainTypes[options.bgIndex % terrainTypes.length];
      
      const terrainSettings: Record<string, number> = {
        plains: 0,
        forest: 0,
        mountain: 0,
        swamp: 0,
        island: 0
      };
      
      if (terrain) {
        terrainSettings[terrain] = 1;
      }
      this.battleStore.setTerrain(terrainSettings);
    }
    
    // Enter battle mode
    this.battleStore.enterBattle();
    
    return this.getBattleState();
  }

  /**
   * Ends the current battle
   */
  endBattle() {
    this.battleStore.deactivateBattle();
    return this.getBattleState();
  }

  /**
   * Logs the current battle state to console
   */
  logBattleState() {
    const battleState = this.getBattleState();
    debug.log('Current Battle State:', battleState);
    return battleState;
  }

  /**
   * Resets the battle counter/timer
   */
  resetBattleTimer() {
    this.battleStore.resetBattleTimer();
  }

  /**
   * Simulates a random encounter by reducing the battle counter
   * @param steps Number of steps to simulate
   */
  simulateSteps(steps: number) {
    // Get current counter value
    const currentCounter = this.battleStore.steps.counter;
    
    // Reduce counter by specified number of steps
    // Pinia store state is reactive, but better to use an action if available, 
    // or direct modification if no specific setter exists
    this.battleStore.steps.counter = currentCounter - steps;
    
    // Check if battle should trigger
    this.battleStore.randomEncounter();
    
    return this.getBattleState();
  }
}