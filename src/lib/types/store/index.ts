/**
 * Type definitions for the Vuex store root state
 */

// Battle state types
export interface BattleStepsState {
  counter: number;
  max: number;
  min: number;
  timer?: number;
}

export interface BattleTerrainState {
  plains: number;
  forest: number;
  mountain: number;
  swamp: number;
  island: number;
}

export interface BattleState {
  active: boolean;
  interval: number | null;
  bgmWaitToStart: number;
  steps: BattleStepsState;
  terrain: BattleTerrainState;
}

// Background music state
export interface BgmState {
  is_on: boolean;
  bookmark: number;
  playlist: any[];
  tracks?: any[];
  track?: number;
  saveBookmark?: boolean;
  startDelay?: number;
}

// User action type
export interface UserAction {
  label: string;
  click?: (event?: any) => void;
  icon?: string;
}

// Root state of the Vuex store
export interface RootState {
  battle: BattleState;
  theme: string;
  bgm: BgmState;
  userActions: UserAction[];
  [key: string]: any; // For other state properties
}