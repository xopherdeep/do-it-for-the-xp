/**
 * useBattleAnimations
 * 
 * Composable for battle animation effects.
 * Extracted from BattleGround.ts to preserve animation work.
 * 
 * Features preserved:
 * - Player attack animation
 * - Enemy hit animation with damage display
 * - Player hit animation with screen shake
 * - Victory animation sequence with strobe and fadeout
 * - Defeat animation sequence
 * 
 * @see BattleGround.ts (original source - lines 1062-1288)
 */

import { ref, type Ref } from 'vue';
import { backgroundManager } from '@/lib/engine/core/BackgroundManager';

export interface BattleAnimationRefs {
  /** Ref to the page element for screen shake */
  pageRef: Ref<HTMLElement | null>;
  /** Ref to the enemy element for animations */
  enemyRef?: Ref<HTMLElement | null>;
}

export interface BattleAnimationOptions {
  /** Current enemy data (for damage calculations) */
  currentEnemy?: Ref<{
    name: string;
    health: number;
    maxHealth: number;
    isBoss?: boolean;
    type?: string;
  } | null>;
  /** Callback when enemy health changes */
  onHealthChange?: () => void;
  /** Callback when enemy is defeated */
  onEnemyDefeated?: () => void;
  /** Callback to show battle message */
  onBattleMessage?: (message: string) => void;
  /** Callback to queue dialog messages */
  onQueueDialog?: (messages: string[]) => void;
  /** Audio effects object */
  audioFx?: {
    playConfirm?: () => void;
    playCancel?: () => void;
    playHit?: () => void;
  };
}

/**
 * Battle animations composable
 * 
 * @param refs - DOM refs for animation targets
 * @param options - Configuration and callbacks
 */
export function useBattleAnimations(
  refs: BattleAnimationRefs,
  options: BattleAnimationOptions = {}
) {
  // Animation state
  const enemyAnimationClass = ref('');
  const isVictoryMessage = ref(false);
  const aspectRatio = ref(48);

  /**
   * Apply hit animation to enemy
   * Visual effect when enemy takes damage
   */
  function enemyHit(damage?: number) {
    // Apply damage class for animation
    enemyAnimationClass.value = 'damaged';
    
    // Remove the class after animation completes
    setTimeout(() => {
      enemyAnimationClass.value = '';
    }, 500);
    
    // Apply damage if specified and we have an enemy
    if (typeof damage === 'number' && options.currentEnemy?.value) {
      const enemy = options.currentEnemy.value;
      const actualDamage = Math.min(damage, enemy.health);
      enemy.health = Math.max(0, enemy.health - actualDamage);
      
      // Notify health change
      options.onHealthChange?.();
      
      // Show damage message
      options.onBattleMessage?.(`${enemy.name} takes ${actualDamage} damage!`);
      
      // Check if enemy defeated
      if (enemy.health <= 0) {
        options.onEnemyDefeated?.();
      }
    }
  }

  /**
   * Apply screen shake effect and trigger player hit animation
   * Visual effect when player takes damage
   */
  function playerHit(damage?: number) {
    // Apply screen shake animation
    const pageElement = refs.pageRef.value;
    if (pageElement) {
      pageElement.classList.add('screen-shake');
      
      // Remove the class after animation completes
      setTimeout(() => {
        pageElement.classList.remove('screen-shake');
      }, 500);
    }
    
    // Play hit sound
    options.audioFx?.playCancel?.();
    
    // Show damage message if provided
    if (typeof damage === 'number') {
      options.onBattleMessage?.(`Player takes ${damage} damage!`);
    }
  }

  /**
   * Trigger player attack animation
   * Applies attack animation and triggers hit effect on the enemy
   */
  function playerAttack() {
    // Apply attack animation class to enemy
    enemyAnimationClass.value = 'damaged';
    setTimeout(() => {
      enemyAnimationClass.value = '';
    }, 500);
  }

  /**
   * Calculate XP reward based on enemy difficulty
   */
  function calculateXPReward(): number {
    if (!options.currentEnemy?.value) return 0;
    
    const enemy = options.currentEnemy.value;
    
    // Base XP on enemy type and health
    let baseXP = enemy.maxHealth / 2;
    
    // Bonus for boss types
    if (enemy.isBoss) {
      baseXP *= 1.5;
    } else if (enemy.type === 'miniboss') {
      baseXP *= 1.25;
    }
    
    // Round to nearest integer
    return Math.round(baseXP);
  }

  /**
   * Calculate GP reward based on enemy difficulty
   */
  function calculateGPReward(): number {
    if (!options.currentEnemy?.value) return 0;
    
    const enemy = options.currentEnemy.value;
    
    // Base GP on enemy type and health
    let baseGP = enemy.maxHealth / 4;
    
    // Bonus for boss types
    if (enemy.isBoss) {
      baseGP *= 1.5;
    } else if (enemy.type === 'miniboss') {
      baseGP *= 1.25;
    }
    
    // Round to nearest integer
    return Math.round(baseGP);
  }

  /**
   * Trigger victory animation sequence
   * This method is called when the player wins a battle
   */
  function victoryAnimation(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Apply victory strobe effect to the enemy sprite
      enemyAnimationClass.value = 'victory-strobe';
      
      // Get the current aspect ratio from backgroundManager
      const currentAspectRatio = backgroundManager.getCurrentAspectRatio() || 48;
      aspectRatio.value = currentAspectRatio;
      
      // Start the aspect ratio animation after a short delay for the strobe effect
      setTimeout(() => {
        // Use the smooth aspect ratio animation - first collapse to 0 height
        backgroundManager.animateAspectRatio(0, 750)
          .then(() => {
            // Change enemy animation to fadeout with strobe when aspect ratio animation completes
            enemyAnimationClass.value = 'victory-fadeout';
            
            // Animation complete - set victory message flag
            setTimeout(() => {
              isVictoryMessage.value = true;
              
              // Queue victory dialog messages
              const enemy = options.currentEnemy?.value;
              options.onQueueDialog?.([
                `You Won!`,
                `${enemy?.name || 'Enemy'} was defeated!`,
                `You gained ${calculateXPReward()} XP!`,
                `You earned ${calculateGPReward()} GP!`
              ]);
              
              // Resolve after dialog setup
              setTimeout(() => {
                isVictoryMessage.value = false;
                resolve();
              }, 1000);
            }, 500);
          })
          .catch(error => {
            reject(error);
          });
      }, 1000); // Let the strobe effect run for 1 second before starting the aspect ratio animation
    });
  }

  /**
   * Trigger defeat animation sequence
   * This method is called when the player loses a battle
   */
  function defeatAnimation(): Promise<void> {
    return new Promise((resolve) => {
      // Show defeat message
      options.onBattleMessage?.("You were defeated!");
      
      // Apply screen shake
      const pageElement = refs.pageRef.value;
      if (pageElement) {
        pageElement.classList.add('screen-shake');
        
        setTimeout(() => {
          pageElement.classList.remove('screen-shake');
        }, 500);
      }
      
      // Play defeat sound
      options.audioFx?.playCancel?.();
      
      // Resolve after animation delay
      setTimeout(() => {
        resolve();
      }, 3000);
    });
  }

  /**
   * Reset all animation states
   */
  function resetAnimations() {
    enemyAnimationClass.value = '';
    isVictoryMessage.value = false;
  }

  /**
   * Apply appear animation to enemy
   */
  function enemyAppear() {
    // Reset first
    enemyAnimationClass.value = '';
    
    // Add appear animation after a short delay to ensure DOM is updated
    setTimeout(() => {
      enemyAnimationClass.value = 'appear';
    }, 100);
  }

  return {
    // State
    enemyAnimationClass,
    isVictoryMessage,
    aspectRatio,
    
    // Animation methods
    enemyHit,
    playerHit,
    playerAttack,
    victoryAnimation,
    defeatAnimation,
    enemyAppear,
    resetAnimations,
    
    // Calculation helpers
    calculateXPReward,
    calculateGPReward,
  };
}
