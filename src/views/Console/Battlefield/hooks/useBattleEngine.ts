import { ref, computed, reactive } from 'vue';
import { useBattleDialog } from './useBattleDialog';
import { useVictoryDialog, VictoryRewards } from './useVictoryDialog';
// import debug from '@/lib/utils/debug';

// Types
export interface Enemy {
  id?: number;
  name: string;
  type: string;
  health: number;
  maxHealth: number;
  avatar?: string | number;
  imageUrl?: string;
  emoji?: string;
  attack: number;
  defense: number;
  speed: number;
  xpReward?: number;
  goldReward?: number;
  itemReward?: string;
}

export interface BattleAction {
  id: string;
  name: string;
  type: 'attack' | 'defend' | 'special' | 'item' | 'escape';
  damage?: number;
  description?: string;
  mpCost?: number;
  hpCost?: number;
  icon?: string;
}

export interface BattleState {
  battleStarted: boolean;
  isPlayerTurn: boolean;
  isDefending: boolean;
  enemyAnimationClass: string;
  battleMessage: string;
  playerStats: {
    health: number;
    maxHealth: number;
    mp: number;
    maxMp: number;
    attack: number;
    defense: number;
    speed: number;
  };
}

/**
 * Core battle engine hook
 * This is the central controller for battle state and actions
 */
export function useBattleEngine() {
  // Use the dialog hooks
  const battleDialog = useBattleDialog();
  const victoryDialog = useVictoryDialog();
  
  // Enemy state
  const currentEnemy = ref<Enemy | null>(null);
  
  // Battle state
  const state = reactive<BattleState>({
    battleStarted: false,
    isPlayerTurn: true,
    isDefending: false,
    enemyAnimationClass: '',
    battleMessage: '',
    playerStats: {
      health: 100,
      maxHealth: 100,
      mp: 50,
      maxMp: 50,
      attack: 10, 
      defense: 5,
      speed: 8
    }
  });
  
  // Available player actions
  const userActions = ref<BattleAction[]>([
    { id: 'attack', name: 'Attack', type: 'attack', damage: 10 },
    { id: 'defend', name: 'Defend', type: 'defend' },
    { id: 'special', name: 'Fireball', type: 'special', damage: 15, mpCost: 10 },
    { id: 'escape', name: 'Escape', type: 'escape' }
  ]);
  
  // Computed properties
  const enemyHealthColor = computed(() => {
    if (!currentEnemy.value) return '#4CAF50';
    
    const healthPercent = currentEnemy.value.health / currentEnemy.value.maxHealth;
    if (healthPercent > 0.6) return '#4CAF50'; // Green
    if (healthPercent > 0.3) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  });
  
  /**
   * Start a new battle with an enemy
   */
  const startBattle = (enemy: Enemy) => {
    currentEnemy.value = {...enemy};
    state.battleStarted = true;
    state.isPlayerTurn = true;
    state.enemyAnimationClass = '';
    state.battleMessage = '';
    
    // Based on speed, determine who goes first
    if (currentEnemy.value.speed > state.playerStats.speed) {
      state.isPlayerTurn = false;
      setTimeout(() => enemyTurn(), 1000);
    } else {
      battleDialog.queueBattleDialog([
        `A wild ${enemy.name} appears!`,
        `What will you do?`
      ]);
    }
  };
  
  /**
   * Handle player action selection
   */
  const handlePlayerAction = (action: BattleAction) => {
    if (!state.isPlayerTurn || !currentEnemy.value) return;
    
    switch (action.type) {
      case 'attack':
        handlePlayerAttack(action);
        break;
      case 'defend':
        handlePlayerDefend();
        break;
      case 'special':
        handlePlayerSpecial(action);
        break;
      case 'escape':
        handlePlayerEscape();
        break;
    }
  };
  
  /**
   * Handle regular player attack
   */
  const handlePlayerAttack = (action: BattleAction) => {
    if (!currentEnemy.value) return;
    
    // Show attack message
    battleDialog.showPlayerAttack(action.name);
    
    // Calculate damage
    const damage = calculateDamage(state.playerStats.attack, currentEnemy.value.defense, action.damage || 0);
    
    // Set a short timeout to show the enemy taking damage
    setTimeout(() => {
      state.enemyAnimationClass = 'hit';
      
      // Apply damage to enemy
      if (currentEnemy.value) {
        currentEnemy.value.health = Math.max(0, currentEnemy.value.health - damage);
        battleDialog.showEnemyDamage(currentEnemy.value.name, damage);
      }
      
      // Reset animation class after a short time
      setTimeout(() => {
        if (state.enemyAnimationClass === 'hit') {
          state.enemyAnimationClass = '';
        }
      }, 500);
      
      // Check if enemy is defeated
      if (currentEnemy.value && currentEnemy.value.health <= 0) {
        handleVictory();
      } else {
        // End player's turn and start enemy turn after dialog finishes
        state.isPlayerTurn = false;
        setTimeout(() => {
          enemyTurn();
        }, 1500);
      }
    }, 1000);
  };
  
  /**
   * Handle player defend action
   */
  const handlePlayerDefend = () => {
    // Enable defending state
    state.isDefending = true;
    battleDialog.showDefend();
    
    // End player's turn and start enemy turn after dialog finishes
    state.isPlayerTurn = false;
    setTimeout(() => {
      enemyTurn();
    }, 1500);
  };
  
  /**
   * Handle player special ability
   */
  const handlePlayerSpecial = (action: BattleAction) => {
    if (!currentEnemy.value || !action.mpCost) return;
    
    // Check if player has enough MP
    if (state.playerStats.mp < action.mpCost) {
      battleDialog.queueBattleDialog(['Not enough MP!']);
      return;
    }
    
    // Use MP
    state.playerStats.mp -= action.mpCost;
    
    // Show special attack message
    battleDialog.showSpecialAbility(action.name);
    
    // Calculate damage
    const damage = calculateDamage(state.playerStats.attack, currentEnemy.value.defense, action.damage || 0, 1.5);
    
    // Set a short timeout to show the enemy taking damage
    setTimeout(() => {
      state.enemyAnimationClass = 'hit';
      
      // Apply damage to enemy
      if (currentEnemy.value) {
        currentEnemy.value.health = Math.max(0, currentEnemy.value.health - damage);
        battleDialog.showEnemyDamage(currentEnemy.value.name, damage);
      }
      
      // Reset animation class after a short time
      setTimeout(() => {
        if (state.enemyAnimationClass === 'hit') {
          state.enemyAnimationClass = '';
        }
      }, 500);
      
      // Check if enemy is defeated
      if (currentEnemy.value && currentEnemy.value.health <= 0) {
        handleVictory();
      } else {
        // End player's turn and start enemy turn after dialog finishes
        state.isPlayerTurn = false;
        setTimeout(() => {
          enemyTurn();
        }, 1500);
      }
    }, 1000);
  };
  
  /**
   * Handle player escape attempt
   */
  const handlePlayerEscape = () => {
    // 50% chance to escape
    const success = Math.random() > 0.5;
    battleDialog.showEscapeAttempt(success);
    
    if (success) {
      // End battle after a short delay
      setTimeout(() => {
        endBattle();
      }, 1500);
    } else {
      // Failed to escape, enemy's turn
      state.isPlayerTurn = false;
      setTimeout(() => {
        enemyTurn();
      }, 1500);
    }
  };
  
  /**
   * Enemy turn logic
   */
  const enemyTurn = () => {
    if (!currentEnemy.value) return;
    
    // Show enemy attack message
    battleDialog.showEnemyAttack(currentEnemy.value.name);
    
    // Set attack animation
    state.enemyAnimationClass = 'attack';
    
    // Calculate damage based on if player is defending
    const damage = calculateDamage(
      currentEnemy.value.attack, 
      state.playerStats.defense, 
      0, 
      state.isDefending ? 0.5 : 1
    );
    
    // Apply damage after a short delay
    setTimeout(() => {
      state.playerStats.health = Math.max(0, state.playerStats.health - damage);
      battleDialog.showPlayerDamage(damage);
      
      // Reset enemy animation
      state.enemyAnimationClass = '';
      
      // Reset defend state
      state.isDefending = false;
      
      // Check if player is defeated
      if (state.playerStats.health <= 0) {
        handleDefeat();
      } else {
        // End enemy's turn and start player turn
        state.isPlayerTurn = true;
      }
    }, 1000);
  };
  
  /**
   * Handle player victory
   */
  const handleVictory = () => {
    if (!currentEnemy.value) return;
    
    const rewards: VictoryRewards = {
      xp: currentEnemy.value.xpReward || 10,
      gold: currentEnemy.value.goldReward || 5,
      items: currentEnemy.value.itemReward ? [currentEnemy.value.itemReward] : undefined
    };
    
    // Show victory dialog
    victoryDialog.showVictory(currentEnemy.value.name, rewards);
    
    // End battle after dialog sequence (would be triggered by a dialog completion event)
    setTimeout(() => {
      endBattle();
    }, 5000);
  };
  
  /**
   * Handle player defeat
   */
  const handleDefeat = () => {
    battleDialog.queueBattleDialog([
      'You were defeated!',
      'Game over!'
    ]);
    
    // End battle after a short delay
    setTimeout(() => {
      endBattle();
    }, 3000);
  };
  
  /**
   * End the current battle
   */
  const endBattle = () => {
    currentEnemy.value = null;
    state.battleStarted = false;
    state.isPlayerTurn = false;
    state.enemyAnimationClass = '';
    state.battleMessage = '';
    battleDialog.clearBattleDialog();
    victoryDialog.clearVictoryDialog();
  };
  
  /**
   * Calculate damage with attack, defense and modifier values
   */
  const calculateDamage = (
    attackValue: number, 
    defenseValue: number, 
    baseDamage: number = 0,
    damageMultiplier: number = 1
  ) => {
    // Base calculation using attack, defense and random factor
    const baseCalculation = attackValue - (defenseValue * 0.5);
    const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
    let damage = Math.max(1, Math.floor((baseCalculation + baseDamage) * randomFactor));
    
    // Apply final multiplier (for special attacks or defense)
    damage = Math.floor(damage * damageMultiplier);
    
    return damage;
  };
  
  /**
   * Reset player stats to default values
   */
  const resetPlayerStats = () => {
    state.playerStats = {
      health: 100,
      maxHealth: 100,
      mp: 50,
      maxMp: 50,
      attack: 10,
      defense: 5,
      speed: 8
    };
  };
  
  /**
   * Update player stats (for dev tools)
   */
  const setPlayerStats = (stats: Partial<BattleState['playerStats']>) => {
    state.playerStats = {
      ...state.playerStats,
      ...stats
    };
  };
  
  /**
   * Set available battle actions (for dev tools)
   */
  const setUserActions = (actions: BattleAction[]) => {
    userActions.value = actions;
  };
  
  return {
    // State
    currentEnemy,
    state,
    userActions,
    enemyHealthColor,
    
    // Dialog hooks
    battleDialog,
    victoryDialog,
    
    // Battle methods
    startBattle,
    endBattle,
    handlePlayerAction,
    enemyTurn,
    
    // Dev tool methods
    resetPlayerStats,
    setPlayerStats,
    setUserActions
  };
}