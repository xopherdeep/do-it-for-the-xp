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
  /** The grudge marks (1 to 3) this beast holds against the hero, for the stage to show; absent for none. */
  grudgeMarks?: number;
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

/** Why a parting strike did not land: X's Invisibility, the Ninja's owed miss, Chronos' ice, Thor's Hammer, or trained agility. */
export type PartingDodge = 'vanish' | 'shadow' | 'frozen' | 'hammer' | 'agility';

/** What cut a parting strike down: a brace the hero was already in, or a class that slips away (Thief, Ninja). */
export type PartingSoftener = 'brace' | 'slip';

/**
 * How a getaway went (docs/Quest-Rooms-Spec.md 5.6). A run always works; this is what it cost, for the page.
 * The seams the page reads: `carriesQuest` (the grudge mark) and `emptied` (the Hospital admits the hero on the way out).
 */
export interface EscapeReport {
  /** A free fight: nothing to lose by leaving, so no parting strike was owed. */
  free: boolean;
  /** HP the parting strike took (0 when it was dodged or none was owed; never more than the hero had). */
  damage: number;
  /** What kept the strike from landing, or null when none did (or none was owed). */
  dodgedBy: PartingDodge | null;
  /** What softened the strike that did land, or null when it landed in full. */
  softener: PartingSoftener | null;
  /** The strike took the hero's last HP: they are at 0, and the page admits them to the Hospital (5.8). */
  emptied: boolean;
  /** The fight being left carries a quest. Leaving it earns the beast a grudge mark. */
  carriesQuest: boolean;
}

export interface BattleResult {
  success: boolean;
  message: string;
  /** Only on a Run Away that worked: what the getaway cost. */
  escape?: EscapeReport;
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
   * A free fight (random encounter, Test Fight): there is nothing to lose by leaving, so Run Away
   * costs nothing at all. Every other fight takes one parting strike first.
   */
  freeFight?: boolean;
  /**
   * The fight carries a quest (a quest from the board, or a quest room in a temple). The service
   * only passes it on, in the escape report; the grudge it earns is not the engine's to keep.
   */
  carriesQuest?: boolean;
  /**
   * The beast's grudge against the hero (docs/Quest-Rooms-Spec.md 5.7): the factor every strike of the fight is multiplied
   * by, 1 (none, the default) to 1.75. The page reads it off the hero's marks for this quest (`grudgeFactorFor`).
   */
  grudge?: number;
  /**
   * The hero's passive: how much of a strike lands at all and how much the brace lets through, whether
   * the class slips away from the parting strike (Thief, Ninja) and the agility that dodges it, extra
   * minutes per chore and whether the beast's first strike misses. Anything left out keeps the default rule.
   */
  passive?: Partial<BattlePassive>;
}
