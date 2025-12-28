/**
 * BattleState - Reactive battle state management
 * 
 * Manages the current state of a battle including:
 * - Active enemies with individual attack timers
 * - Player HP affected by stats/defense
 * - Real-time attack intervals
 */

import { reactive, computed, ref } from 'vue';
import type { 
  BattleState, 
  BattlePhase, 
  ActiveEnemy, 
  Beast,
  PlayerStats,
  CombatConfig,
} from './types';
import { DEFAULT_COMBAT_CONFIG } from './types';

// ============================================
// DEFAULT STATE
// ============================================

const createDefaultState = (): BattleState => ({
  isActive: false,
  phase: 'intro',
  enemies: [],
  playerHP: 100,
  playerMaxHP: 100,
  isDefending: false,
  turnCount: 0,
  countdown: 0,
  xpEarned: 0,
  gpEarned: 0,
  fledFrom: [],
});

// ============================================
// REACTIVE STATE
// ============================================

const state = reactive<BattleState>(createDefaultState());
const battleInterval = ref<ReturnType<typeof setInterval> | null>(null);
const playerStats = ref<PlayerStats | null>(null);
const config = ref<CombatConfig>(DEFAULT_COMBAT_CONFIG);

// ============================================
// COMPUTED
// ============================================

const isPlayerTurn = computed(() => state.phase === 'player_turn');
const isEnemyTurn = computed(() => state.phase === 'enemy_turn');
const isBattleOver = computed(() => 
  state.phase === 'victory' || 
  state.phase === 'defeat' || 
  state.phase === 'fled'
);
const activeEnemies = computed(() => 
  state.enemies.filter(e => !e.isDefeated)
);
const allEnemiesDefeated = computed(() => 
  state.enemies.length > 0 && activeEnemies.value.length === 0
);
const playerHPPercent = computed(() => 
  Math.round((state.playerHP / state.playerMaxHP) * 100)
);

// ============================================
// ACTIONS
// ============================================

/**
 * Start a new battle with the given beasts
 */
function startBattle(beasts: Beast[], stats: PlayerStats): void {
  // Reset state
  Object.assign(state, createDefaultState());
  
  // Set player stats
  playerStats.value = stats;
  state.playerHP = stats.hp;
  state.playerMaxHP = stats.maxHp;
  
  // Convert beasts to active enemies with attack timers
  state.enemies = beasts.map(beast => ({
    beast,
    currentHP: calculateBeastHP(beast),
    maxHP: calculateBeastHP(beast),
    isDefeated: false,
    nextAttackIn: getAttackInterval(beast),
    attackCount: 0,
  }));
  
  state.isActive = true;
  state.phase = 'intro';
  
  // After intro, start battle loop
  setTimeout(() => {
    state.phase = 'player_turn';
    startBattleLoop();
  }, 2000);
}

/**
 * Get attack interval for a beast (seconds between attacks)
 */
function getAttackInterval(beast: Beast): number {
  if (beast.attackInterval) return beast.attackInterval;
  
  // Default based on difficulty
  switch (beast.difficulty) {
    case 'easy': return 45;
    case 'normal': return 30;
    case 'hard': return 20;
    case 'boss': return 15;
    default: return config.value.baseAttackInterval;
  }
}

/**
 * Calculate beast HP based on checklist length
 */
function calculateBeastHP(beast: Beast): number {
  if (beast.baseHP) return beast.baseHP;
  // Default: 20 HP per checklist item
  return (beast.checklist?.length || 1) * 20;
}

/**
 * Start the battle loop - ticks every second
 * Each enemy has their own attack timer
 */
function startBattleLoop(): void {
  if (battleInterval.value) {
    clearInterval(battleInterval.value);
  }
  
  battleInterval.value = setInterval(() => {
    if (!state.isActive || isBattleOver.value) {
      stopBattleLoop();
      return;
    }
    
    // Tick each enemy's attack timer
    for (const enemy of activeEnemies.value) {
      enemy.nextAttackIn--;
      
      // Time to attack!
      if (enemy.nextAttackIn <= 0) {
        enemyAttacks(enemy);
        enemy.nextAttackIn = getAttackInterval(enemy.beast);
        enemy.attackCount++;
      }
    }
  }, 1000);
}

/**
 * Stop the battle loop
 */
function stopBattleLoop(): void {
  if (battleInterval.value) {
    clearInterval(battleInterval.value);
    battleInterval.value = null;
  }
}

/**
 * Single enemy attacks the player
 */
function enemyAttacks(enemy: ActiveEnemy): void {
  const baseDamage = enemy.beast.attackPower || 5;
  
  // Apply player defense
  const defense = playerStats.value?.defense || 0;
  const armorBonus = playerStats.value?.equipment?.armorBonus || 0;
  const totalDefense = defense + armorBonus;
  
  // Damage formula: baseDamage - (totalDefense * 0.5), minimum 1
  let damage = Math.max(1, Math.floor(baseDamage - (totalDefense * 0.5)));
  
  // Apply defend reduction if active
  if (state.isDefending) {
    damage = Math.floor(damage * config.value.defendReduction);
  }
  
  // Apply damage variance (±20%)
  const variance = 1 + (Math.random() * 2 - 1) * config.value.damageVariance;
  damage = Math.max(1, Math.floor(damage * variance));
  
  state.playerHP = Math.max(0, state.playerHP - damage);
  
  // Check for defeat
  if (state.playerHP <= 0) {
    state.phase = 'defeat';
    stopBattleLoop();
  }
}

/**
 * Trigger all enemies to attack (legacy - for defend action)
 */
function triggerEnemyTurn(): void {
  state.phase = 'enemy_turn';
  
  // Each active enemy attacks
  for (const enemy of activeEnemies.value) {
    enemyAttacks(enemy);
  }
  
  // Reset defending
  state.isDefending = false;
  state.turnCount++;
  
  // Check for defeat
  if (state.playerHP <= 0) {
    state.phase = 'defeat';
    stopBattleLoop();
    return;
  }
  
  // Back to player turn
  setTimeout(() => {
    state.phase = 'player_turn';
  }, 1500);
}

/**
 * Calculate enemy damage
 */
function calculateEnemyDamage(enemy: ActiveEnemy): number {
  return enemy.beast.attackPower || 5;
}

/**
 * Complete a checklist item (Attack action)
 */
function completeChecklistItem(enemyIndex: number, itemId: string): boolean {
  const enemy = state.enemies[enemyIndex];
  if (!enemy || enemy.isDefeated) return false;
  
  const item = enemy.beast.checklist.find(c => c.id === itemId);
  if (!item || item.completed) return false;
  
  // Mark as completed
  item.completed = true;
  
  // Deal damage (based on checklist proportion)
  const damagePerItem = Math.ceil(enemy.maxHP / enemy.beast.checklist.length);
  enemy.currentHP = Math.max(0, enemy.currentHP - damagePerItem);
  
  // Check if defeated
  if (enemy.currentHP <= 0 || enemy.beast.checklist.every(c => c.completed)) {
    enemy.isDefeated = true;
    state.xpEarned += enemy.beast.xpReward || 10;
    state.gpEarned += enemy.beast.gpReward || 5;
  }
  
  // Check for victory
  if (allEnemiesDefeated.value) {
    state.phase = 'victory';
    stopBattleLoop();
  }
  
  return true;
}

/**
 * Player defends
 */
function defend(): void {
  state.isDefending = true;
  triggerEnemyTurn();
}

/**
 * Player runs from battle
 */
function run(): void {
  // Track that we fled from these enemies
  state.fledFrom = state.enemies.map(e => e.beast.id);
  state.phase = 'fled';
  stopBattleLoop();
}

/**
 * End the battle and reset state
 */
function endBattle(): { xp: number; gp: number; fled: boolean } {
  const result = {
    xp: state.xpEarned,
    gp: state.gpEarned,
    fled: state.phase === 'fled',
  };
  
  stopBattleLoop();
  Object.assign(state, createDefaultState());
  
  return result;
}

// ============================================
// EXPORT COMPOSABLE
// ============================================

export function useBattleState() {
  return {
    // State
    state,
    
    // Computed
    isPlayerTurn,
    isEnemyTurn,
    isBattleOver,
    activeEnemies,
    allEnemiesDefeated,
    playerHPPercent,
    
    // Actions
    startBattle,
    completeChecklistItem,
    defend,
    run,
    triggerEnemyTurn,
    endBattle,
  };
}

export default useBattleState;
