/**
 * Battle Engine Types
 * 
 * Core type definitions for the battle system
 */

// ============================================
// BEAST / ENEMY TYPES
// ============================================

export type BeastElement = 'water' | 'fire' | 'earth' | 'wind' | 'neutral';

export interface SpawnSchedule {
  frequency: 'daily' | 'weekly' | 'interval' | 'manual';
  times?: string[];         // ["08:00", "18:00"] - spawn times
  daysOfWeek?: number[];    // [0-6] Sunday=0, Saturday=6
  intervalDays?: number;    // Every N days
}

export interface BeastChecklist {
  id: string;
  label: string;
  completed: boolean;
}

export interface Beast {
  id: string;
  name: string;             // "Socktopus"
  checklist: BeastChecklist[];
  element?: BeastElement;
  avatar?: number;          // Beast avatar index
  imageUrl?: string;        // Custom image
  spawn?: SpawnSchedule;
  
  // Combat stats
  baseHP?: number;          // Default HP based on checklist length
  attackPower?: number;     // Base damage per attack
  attackInterval?: number;  // Seconds between attacks (default: 30)
  difficulty?: 'easy' | 'normal' | 'hard' | 'boss';
  xpReward?: number;
  gpReward?: number;
}

// ============================================
// PLAYER STATS (from user profile)
// ============================================

export interface PlayerStats {
  level: number;
  hp: number;
  maxHp: number;
  defense: number;          // Reduces incoming damage
  attack: number;           // Increases checklist completion speed?
  speed: number;            // Affects turn order, escape chance
  equipment?: {
    armorBonus?: number;
    weaponBonus?: number;
  };
}

// ============================================
// COMBAT CONFIG
// ============================================

export interface CombatConfig {
  baseAttackInterval: number;     // Default: 30 seconds
  defendReduction: number;        // Default: 0.5 (50% damage reduction)
  escapeBaseChance: number;       // Default: 0.7 (70%)
  escapeSpeedBonus: number;       // Added per speed point
  damageVariance: number;         // Default: 0.2 (±20%)
}

export const DEFAULT_COMBAT_CONFIG: CombatConfig = {
  baseAttackInterval: 30,
  defendReduction: 0.5,
  escapeBaseChance: 0.7,
  escapeSpeedBonus: 0.02,
  damageVariance: 0.2,
};

// ============================================
// BATTLE STATE TYPES
// ============================================

export type BattlePhase = 
  | 'intro'       // Battle starting animation
  | 'player_turn' // Player choosing action
  | 'enemy_turn'  // Enemy attacking
  | 'victory'     // All enemies defeated
  | 'defeat'      // Player HP = 0
  | 'fled';       // Player ran away

export type PlayerAction = 'attack' | 'defend' | 'run' | 'ability' | 'item';

export interface ActiveEnemy {
  beast: Beast;
  currentHP: number;
  maxHP: number;
  isDefeated: boolean;
  nextAttackIn: number;       // Seconds until next attack
  attackCount: number;        // How many times this enemy has attacked
}

export interface BattleState {
  isActive: boolean;
  phase: BattlePhase;
  
  // Combatants
  enemies: ActiveEnemy[];
  
  // Player state during battle
  playerHP: number;
  playerMaxHP: number;
  isDefending: boolean;
  
  // Turn management
  turnCount: number;
  countdown: number;        // Seconds remaining
  
  // Rewards (accumulated during battle)
  xpEarned: number;
  gpEarned: number;
  
  // Fled enemy tracking
  fledFrom?: string[];      // Beast IDs player ran from
}

// ============================================
// SPAWN SYSTEM TYPES
// ============================================

export interface SpawnedEnemy {
  beast: Beast;
  spawnedAt: Date;
  dueAt: Date;
  isOverdue: boolean;
  hasAttackedPlayer: boolean; // True if player ignored/ran
}

export interface SpawnEvent {
  beastId: string;
  scheduledTime: Date;
  triggered: boolean;
}

// ============================================
// COMBAT ACTION RESULTS
// ============================================

export interface ActionResult {
  action: PlayerAction;
  success: boolean;
  damage?: number;
  message: string;
  checklistItemCompleted?: string;
}

export interface EnemyAttackResult {
  enemyName: string;
  damage: number;
  wasDefended: boolean;
  finalDamage: number;
}
