export * from './BattleService';
export * from './BestiaryService';

// Factory functions to create service instances
import { BattleService } from './BattleService';
import { BestiaryService } from './BestiaryService';

/**
 * Create a battle service instance
 * @param devMode Whether to enable dev mode (optional)
 */
export const createBattleService = (devMode: boolean = false): BattleService => {
  return new BattleService(devMode);
};

/**
 * Create a bestiary service instance
 */
export const createBestiaryService = (): BestiaryService => {
  return new BestiaryService();
};