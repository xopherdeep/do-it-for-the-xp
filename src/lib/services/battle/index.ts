export * from './BattleService';
export * from './BestiaryService';

// Factory functions to create service instances
import { BattleService } from './BattleService';
import { BestiaryService } from './BestiaryService';
import { Store } from 'vuex';
import { RootState } from '@/lib/types/store';

/**
 * Create a battle service instance
 * @param store Vuex store instance
 */
export const createBattleService = (store: Store<RootState>): BattleService => {
  return new BattleService(store);
};

/**
 * Create a bestiary service instance
 */
export const createBestiaryService = (): BestiaryService => {
  return new BestiaryService();
};