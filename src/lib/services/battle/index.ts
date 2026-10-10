export * from './BattleService';
export * from './BestiaryService';

// Factory functions to create service instances
import { BattleService, type BattleServiceOptions } from './BattleService';
import { BestiaryService } from './BestiaryService';

/**
 * Create a battle service instance
 * @param options `freeFight: true` for random encounters and Test Fight, where Run Away always works
 */
export const createBattleService = (options?: BattleServiceOptions): BattleService => {
  return new BattleService(options);
};

/**
 * Create a bestiary service instance
 */
export const createBestiaryService = (): BestiaryService => {
  return new BestiaryService();
};