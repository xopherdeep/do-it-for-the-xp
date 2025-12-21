/**
 * Index file for battleroom utilities
 */
export * from './BattleroomTestUtils';

// Helper function to create and return a new instance of BattleroomTestUtils
import { BattleroomTestUtils } from './BattleroomTestUtils';
import { Store } from 'vuex';
import { RootState } from '@/lib/types/store';

/**
 * Creates a new battleroom test utilities instance
 * @param store Vuex store instance
 */
export const createBattleroomTestUtils = (store: Store<RootState>) => {
  return new BattleroomTestUtils(store);
};