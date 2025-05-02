import { Store } from 'vuex';
import { RootState } from '@/lib/types/store';

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
}

export interface CompletedTask {
  name: string;
  xpReward: number;
  gpReward: number;
  itemReward: string | null;
}

export interface BattleAction {
  type: string;
  payload?: any;
}

export interface BattleState {
  battleStarted: boolean;
  isPlayerTurn: boolean;
  turnCounter: number;
  isDefending: boolean;
  defenseMultiplier: number;
  currentEnemy: Enemy | null;
  enemyHealthColor: string;
  battleMessage: string;
}

export interface BattleResult {
  success: boolean;
  message: string;
  dialogMessages?: string[];
}

/**
 * BattleService - Core service for managing battle mechanics
 * 
 * This service encapsulates the battle logic and state management,
 * decoupling it from the UI component for better maintainability.
 */
export class BattleService {
  private store: Store<RootState>;
  private state: BattleState;
  private battleCallbacks: {
    onDialogMessage?: (messages: string[]) => void;
    onBattleMessageChange?: (message: string) => void;
    onEnemyHealthChange?: () => void;
    onDefendStateChange?: (isDefending: boolean) => void;
    onPlayerTurnChange?: (isPlayerTurn: boolean) => void;
    onEnemyDefeated?: (enemy: Enemy) => void;
  };

  constructor(store: Store<RootState>) {
    this.store = store;
    this.state = {
      battleStarted: false,
      isPlayerTurn: false,
      turnCounter: 0,
      isDefending: false,
      defenseMultiplier: 0.5, // Reduces damage by 50% when defending
      currentEnemy: null,
      enemyHealthColor: '#2dd36f',
      battleMessage: '',
    };
    this.battleCallbacks = {};
  }

  /**
   * Register callbacks for battle events
   * @param callbacks Object containing callback functions for different battle events
   */
  public registerCallbacks(callbacks: Partial<typeof this.battleCallbacks>) {
    this.battleCallbacks = { ...this.battleCallbacks, ...callbacks };
  }

  /**
   * Initialize a battle with an enemy
   * @param enemy The enemy to battle
   */
  public initBattle(enemy: Enemy): void {
    // Set initial battle state
    this.state.currentEnemy = enemy;
    this.state.battleStarted = true;
    this.state.isPlayerTurn = false;
    this.state.turnCounter = 1;
    this.updateEnemyHealthColor();
    
    // Queue encounter message
    const playerName = this.getPlayerName();
    this.queueDialogMessages([
      `${playerName} encountered ${enemy.name}!`
    ]);
  }

  /**
   * Handle a battle action from the player
   * @param action The action type (attack, defend, etc.)
   * @returns Result of the action
   */
  public handleBattleAction(action: string): BattleResult {
    // If battle not started or not player's turn, return error
    if (!this.state.battleStarted) {
      return { 
        success: false, 
        message: "Battle not started" 
      };
    }
    
    if (!this.state.isPlayerTurn) {
      this.queueDialogMessages(["It's not your turn yet!"]);
      return { 
        success: false, 
        message: "Not player's turn" 
      };
    }

    // Handle different battle actions
    switch(action) {
      case 'attack':
        return this.handleAttack();
      case 'defend':
        return this.handleDefend();
      case 'run':
        return this.handleRun();
      default:
        return { 
          success: false, 
          message: `Unhandled action: ${action}` 
        };
    }
  }

  /**
   * Handle attack action
   * @returns Result of the attack
   */
  private handleAttack(): BattleResult {
    if (!this.state.currentEnemy) {
      this.queueDialogMessages(["But there's no enemy to attack!"]);
      return { 
        success: false, 
        message: "No enemy present" 
      };
    }

    // Queue attack messages
    this.queueDialogMessages([
      `${this.getPlayerName()} attacks!`,
    ]);
    
    // Calculate damage based on player level
    const userLevel = this.getPlayerLevel();
    const baseDamage = 10 + Math.floor(Math.random() * 20);
    const damage = Math.floor(baseDamage * (1 + userLevel / 20));
    
    // Apply damage
    this.state.currentEnemy.health = Math.max(0, this.state.currentEnemy.health - damage);
    this.updateEnemyHealthColor();
    
    // Queue damage message
    this.queueDialogMessages([
      `${this.state.currentEnemy.name} takes ${damage} damage!`
    ]);
    
    // Check if enemy is defeated
    if (this.state.currentEnemy.health <= 0) {
      this.queueDialogMessages([
        `${this.state.currentEnemy.name} was defeated!`,
        "You've won the battle!"
      ]);
      
      // Handle enemy defeat
      const defeatedEnemy = { ...this.state.currentEnemy };
      if (this.battleCallbacks.onEnemyDefeated) {
        setTimeout(() => {
          if (this.battleCallbacks.onEnemyDefeated && this.state.currentEnemy) {
            this.battleCallbacks.onEnemyDefeated(defeatedEnemy);
          }
        }, 2000);
      }
      
      return { 
        success: true, 
        message: "Enemy defeated",
        dialogMessages: [
          `${this.state.currentEnemy.name} was defeated!`,
          "You've won the battle!"
        ]
      };
    }
    
    // End player turn if enemy still alive
    this.endPlayerTurn();
    return { 
      success: true, 
      message: "Attack successful" 
    };
  }

  /**
   * Handle defend action
   * @returns Result of the defend action
   */
  private handleDefend(): BattleResult {
    // Set the defending flag
    this.setDefendingState(true);
    
    // Queue defend messages
    this.queueDialogMessages([
      `${this.getPlayerName()} takes a defensive stance!`,
      "Defense increased for this turn."
    ]);
    
    // Show immediate feedback message
    this.setBattleMessage("DEFENSE UP!");
    setTimeout(() => {
      if (this.state.battleMessage === "DEFENSE UP!") {
        this.setBattleMessage("");
      }
    }, 2000);
    
    // End player turn
    this.endPlayerTurn();
    return { 
      success: true, 
      message: "Defense activated" 
    };
  }

  /**
   * Handle run action
   * @returns Result of the run action
   */
  private handleRun(): BattleResult {
    // 75% chance of successfully running away
    if (Math.random() < 0.75) {
      this.queueDialogMessages([
        "Running away...",
        "Got away safely!"
      ]);
      
      return { 
        success: true, 
        message: "Escaped successfully" 
      };
    } else {
      this.queueDialogMessages([
        "Couldn't escape!",
        "The enemy blocks your path!"
      ]);
      
      // End player turn
      this.endPlayerTurn();
      return { 
        success: false, 
        message: "Failed to escape" 
      };
    }
  }

  /**
   * Start player's turn
   */
  public startPlayerTurn(): void {
    // Set player turn flag
    this.setPlayerTurnState(true);
    
    // For the very first turn, just clear dialog and don't show any message
    if (this.state.turnCounter === 1) {
      return;
    }
    
    // For subsequent turns, show the turn announcements
    this.queueDialogMessages([
      `Turn ${this.state.turnCounter} - ${this.getPlayerName()}'s turn!`,
      "What will you do?"
    ]);
  }

  /**
   * End player's turn and start enemy's turn
   */
  public endPlayerTurn(): void {
    this.setPlayerTurnState(false);
    this.setBattleMessage('');
    
    // Start enemy turn after a delay
    setTimeout(() => {
      if (this.state.currentEnemy) {
        this.performEnemyTurn();
      } else {
        // If no enemy, just go back to player turn
        this.state.turnCounter++;
        this.startPlayerTurn();
      }
    }, 1000);
  }

  /**
   * Perform enemy's turn
   */
  private performEnemyTurn(): void {
    if (!this.state.currentEnemy) return;
    
    // Queue enemy turn messages
    this.queueDialogMessages([
      `${this.state.currentEnemy.name}'s turn!`
    ]);
    
    // Pick a random enemy action
    const actions = ['attack', 'defend', 'special'];
    const enemyAction = actions[Math.floor(Math.random() * actions.length)];
    
    // Variables for damage calculation
    const userLevel = this.getPlayerLevel();
    const baseDamage = 5 + Math.floor(Math.random() * 10);
    const damageTaken = Math.max(1, Math.floor(baseDamage * (1 + userLevel / 10)));
    const currentHP = this.getPlayerHP();
    
    switch (enemyAction) {
      case 'attack':
        // Enemy attacks
        this.queueDialogMessages([
          `${this.state.currentEnemy.name} attacks!`,
        ]);
        
        // Apply damage after a delay
        setTimeout(() => {
          // Calculate base damage
          let finalDamage = damageTaken;
          
          // Apply defense reduction if player is defending
          if (this.state.isDefending) {
            // Apply defense multiplier (reducing damage by 50%)
            finalDamage = Math.floor(finalDamage * this.state.defenseMultiplier);
            
            // Show defense message
            this.queueDialogMessages([
              `${this.getPlayerName()}'s defense reduces the damage!`,
            ]);
          }
          
          // Reduce player HP (in a real game, this would dispatch to the store)
          const newHP = Math.max(0, currentHP - finalDamage);
          
          // Show damage message
          this.queueDialogMessages([
            `${this.getPlayerName()} takes ${finalDamage} damage!`
          ]);
          
          // Check if player is defeated
          if (newHP <= 0) {
            this.queueDialogMessages([
              `${this.getPlayerName()} is defeated!`,
              "Game Over"
            ]);
          } else {
            // Reset defending flag at end of enemy turn
            this.setDefendingState(false);
            
            // Proceed to next turn
            this.state.turnCounter++;
            // Next turn will start after dialog completes
          }
        }, 1000);
        break;
        
      case 'defend':
        // Enemy defends
        this.queueDialogMessages([
          `${this.state.currentEnemy.name} takes a defensive stance!`
        ]);
        
        // Proceed to next turn after a delay
        setTimeout(() => {
          this.state.turnCounter++;
          // Next turn will start after dialog completes
        }, 1000);
        break;
        
      case 'special':
        // Enemy uses special ability
        this.queueDialogMessages([
          `${this.state.currentEnemy.name} is charging power!`,
          "It seems to be preparing for something..."
        ]);
        
        // Proceed to next turn after a delay
        setTimeout(() => {
          this.state.turnCounter++;
          // Next turn will start after dialog completes
        }, 1000);
        break;
    }
  }

  /**
   * Update the enemy health bar color based on remaining health
   */
  private updateEnemyHealthColor(): void {
    if (!this.state.currentEnemy) return;
    
    const healthPercentage = this.state.currentEnemy.health / this.state.currentEnemy.maxHealth;
    
    if (healthPercentage > 0.6) {
      this.state.enemyHealthColor = '#2dd36f'; // green
    } else if (healthPercentage > 0.3) {
      this.state.enemyHealthColor = '#ffc409'; // yellow
    } else {
      this.state.enemyHealthColor = '#eb445a'; // red
    }
    
    if (this.battleCallbacks.onEnemyHealthChange) {
      this.battleCallbacks.onEnemyHealthChange();
    }
  }

  /**
   * Queue dialog messages to be shown to the player
   * @param messages Array of messages to queue
   */
  private queueDialogMessages(messages: string[]): void {
    if (this.battleCallbacks.onDialogMessage) {
      this.battleCallbacks.onDialogMessage(messages);
    }
  }

  /**
   * Set battle message
   * @param message The message to display
   */
  private setBattleMessage(message: string): void {
    this.state.battleMessage = message;
    if (this.battleCallbacks.onBattleMessageChange) {
      this.battleCallbacks.onBattleMessageChange(message);
    }
  }

  /**
   * Set the defending state
   * @param isDefending Whether the player is defending
   */
  private setDefendingState(isDefending: boolean): void {
    this.state.isDefending = isDefending;
    if (this.battleCallbacks.onDefendStateChange) {
      this.battleCallbacks.onDefendStateChange(isDefending);
    }
  }

  /**
   * Set the player turn state
   * @param isPlayerTurn Whether it's the player's turn
   */
  private setPlayerTurnState(isPlayerTurn: boolean): void {
    this.state.isPlayerTurn = isPlayerTurn;
    if (this.battleCallbacks.onPlayerTurnChange) {
      this.battleCallbacks.onPlayerTurnChange(isPlayerTurn);
    }
  }

  /**
   * Get player name from store
   */
  private getPlayerName(): string {
    return this.store.getters.getUserById(this.store.state.user?.id)?.name?.nick || 'Player';
  }

  /**
   * Get player level from store
   */
  private getPlayerLevel(): number {
    return this.store.getters.getUserById(this.store.state.user?.id)?.stats?.level || 1;
  }

  /**
   * Get player HP from store
   */
  private getPlayerHP(): number {
    return this.store.getters.getUserById(this.store.state.user?.id)?.stats?.hp || 100;
  }

  /**
   * Get current enemy
   */
  public getCurrentEnemy(): Enemy | null {
    return this.state.currentEnemy;
  }

  /**
   * Get enemy health color
   */
  public getEnemyHealthColor(): string {
    return this.state.enemyHealthColor;
  }

  /**
   * Check if player is defending
   */
  public isDefending(): boolean {
    return this.state.isDefending;
  }

  /**
   * Check if it's player's turn
   */
  public isPlayerTurn(): boolean {
    return this.state.isPlayerTurn;
  }

  /**
   * Get battle message
   */
  public getBattleMessage(): string {
    return this.state.battleMessage;
  }

  /**
   * Get battle started status
   */
  public isBattleStarted(): boolean {
    return this.state.battleStarted;
  }

  /**
   * Get turn counter
   */
  public getTurnCounter(): number {
    return this.state.turnCounter;
  }
}