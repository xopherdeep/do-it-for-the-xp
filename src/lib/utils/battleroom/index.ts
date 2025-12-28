/**
 * Index file for battleroom utilities
 */
export * from './BattleroomTestUtils';

// Helper function to create and return a new instance of BattleroomTestUtils
import { BattleroomTestUtils } from './BattleroomTestUtils';

/**
 * Creates a new battleroom test utilities instance
 */
export const createBattleroomTestUtils = () => {
  return new BattleroomTestUtils();
};