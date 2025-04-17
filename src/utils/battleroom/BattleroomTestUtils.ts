/**
 * BattleroomTestUtils provides utilities for testing and debugging 
 * the battleroom component in development environments.
 */
import { Store } from 'vuex';
import { RootState } from '@/types/store';

export class BattleroomTestUtils {
  private store: Store<RootState>;

  constructor(store: Store<RootState>) {
    this.store = store;
  }

  /**
   * Gets the current battle state from the store
   */
  getBattleState() {
    return this.store.getters.battleState;
  }

  /**
   * Triggers a battle manually with customizable parameters
   */
  triggerBattle(options: { enemyType?: string; bgIndex?: number } = {}) {
    // Activate battle in store
    this.store.commit('ACTIVATE_BATTLE');
    
    // Set terrain type if specified
    if (options.bgIndex !== undefined) {
      const terrainTypes = ['plains', 'forest', 'mountain', 'swamp', 'island'];
      const terrain = terrainTypes[options.bgIndex % terrainTypes.length];
      
      const terrainSettings = {
        plains: 0,
        forest: 0,
        mountain: 0,
        swamp: 0,
        island: 0
      };
      
      terrainSettings[terrain] = 1;
      this.store.commit('SET_BATTLE_TERRAIN', terrainSettings);
    }
    
    // Enter battle mode
    this.store.dispatch('enterBattle');
    
    return this.getBattleState();
  }

  /**
   * Ends the current battle
   */
  endBattle() {
    this.store.dispatch('leaveBattle');
    return this.getBattleState();
  }

  /**
   * Logs the current battle state to console
   */
  logBattleState() {
    const battleState = this.getBattleState();
    console.log('Current Battle State:', battleState);
    return battleState;
  }

  /**
   * Resets the battle counter/timer
   */
  resetBattleTimer() {
    this.store.dispatch('resetBattleTimer');
  }

  /**
   * Simulates a random encounter by reducing the battle counter
   * @param steps Number of steps to simulate
   */
  simulateSteps(steps: number) {
    // Get current counter value
    const currentCounter = this.store.getters.battleState('steps').counter;
    
    // Reduce counter by specified number of steps
    this.store.commit('SET_BATTLE_COUNTER', currentCounter - steps);
    
    // Check if battle should trigger
    this.store.dispatch('randomEncounter');
    
    return this.getBattleState();
  }
}