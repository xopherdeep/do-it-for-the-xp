import type { EngineMessage } from "@/app/Console/BattleField/battle/battleView";
import type { ClassPassive } from "@/lib/services/stats/ClassPassives";

// Define interfaces for the battle system
export interface Enemy {
  id: string;
  name: string;
  type: string;
  isBoss: boolean;
  health: number;
  maxHealth: number;
  avatar?: number;
  imageUrl?: string;
  emoji?: string;
  attack: number;
  defense: number;
  speed: number;
  bg1?: number;
  bg2?: number;
  aspectRatio?: number;
  /** Minutes the hero gets per remaining chore before this beast strikes. Defaults to 3. */
  attackCooldown?: number;
  tasks?: CombatTask[];
}

export interface CombatTask {
  id: string;
  name: string;
  isCompleted: boolean;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  stats: {
    level: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    strength: number;
    defense: number;
    speed: number;
  }
}

export interface BattleState {
  battleStarted: boolean;
  isPlayerTurn: boolean;
  turnCounter: number;
  isDefending: boolean;
  currentEnemy: Enemy | null;
  participants: {
    enemies: Enemy[];
    users: User[];
    activeEnemyIndex: number;
    activeUserIndex: number;
  };
  enemyAttackTimer: number; // 100 (full clock) down to 0 (the beast strikes)
  timeRemaining: number; // ms left on the clock
  attackDuration: number; // ms the current clock started with
  combatTasks: CombatTask[];
  pendingPlayerDamage: number; // Damage waiting for the hero to tap through "{Beast} attacks!"
  pendingStrikeBraced: boolean; // The waiting strike was met with a brace
}

export interface BattleResult {
  success: boolean;
  message: string;
}

/**
 * Everything the page can listen for. Lines for the message box are EngineMessages: plain strings
 * wait for a tap, `{ text, auto: true }` lines move on by themselves once typed.
 */
export interface BattleCallbacks {
  onDialogMessage?: (messages: EngineMessage[]) => void;
  onEnemyHealthChange?: () => void;
  onDefendStateChange?: (isDefending: boolean) => void;
  onPlayerTurnChange?: (isPlayerTurn: boolean) => void;
  onEnemyDefeated?: (enemy: Enemy) => void;
  onEnemyChange?: (enemy: Enemy) => void;
  onCombatTasksChange?: (tasks: CombatTask[]) => void;
  onPlayerDefeated?: () => void;
  onAttack?: (attacker: 'player' | 'enemy') => void;
  /** `isFinalBlow` is set on the chore that finishes the beast on screen ("SMAAAASH!!"). */
  onDamage?: (target: 'player' | 'enemy', amount: number, isFinalBlow?: boolean) => void;
}

/**
 * The part of a hero's passive the engine reads: the class table (docs/Items-And-Classes-Contract.md, C)
 * with the trained stats laid over it (docs/Stats-Contract.md): strength's strike share, agility's run bonus
 * and seconds, guts in the brace factor.
 */
export type BattlePassive = Pick<
  ClassPassive,
  'braceFactor' | 'strikeFactor' | 'runChance' | 'runChanceBonus' | 'cooldownMinutesBonus' | 'skipFirstStrike'
>;

export interface BattleServiceOptions {
  /**
   * A free fight (random encounter, Test Fight): there is nothing to lose by leaving, so
   * Run Away always works.
   */
  freeFight?: boolean;
  /**
   * The hero's passive: how much of a strike lands at all and how much the brace lets through, the Run
   * Away odds against monsters and what is added to them, extra minutes per chore and whether the beast's
   * first strike misses. Anything left out keeps the default rule.
   */
  passive?: Partial<BattlePassive>;
}
