/**
 * Battle hooks index file
 * Exports all battle-related hooks for easy importing
 */

export { useBattleDialog } from './useBattleDialog';
export { useVictoryDialog, type VictoryRewards } from './useVictoryDialog';
export { 
  useBattleEngine, 
  type Enemy, 
  type BattleAction, 
  type BattleState 
} from './useBattleEngine';

// Add other battle-related hooks here in the future