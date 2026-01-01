import { useUserStore } from '@/lib/store/stores/user';
import debug from '@/lib/utils/debug';
import { reactive } from 'vue';

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
  attackTimer?: number;
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
  participants: {
    enemies: Enemy[];
    users: User[];
    activeEnemyIndex: number;
    activeUserIndex: number;
  };
  enemyAttackTimer: number; // 0 to 100
  timeRemaining: number; // ms remaining
  combatTasks: CombatTask[];
  pendingPlayerDamage: number; // Damage waiting to be applied after dialog
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
 * 
 * Updated to use Pinia stores instead of Vuex.
 */
export class BattleService {
  private userStore: ReturnType<typeof useUserStore>;
  private state: BattleState;
  private devMode: boolean;
  private battleCallbacks: {
    onDialogMessage?: (messages: string[]) => void;
    onBattleMessageChange?: (message: string) => void;
    onEnemyHealthChange?: () => void;
    onDefendStateChange?: (isDefending: boolean) => void;
    onPlayerTurnChange?: (isPlayerTurn: boolean) => void;
    onEnemyDefeated?: (enemy: Enemy) => void;
    onCombatTasksChange?: (tasks: CombatTask[]) => void;
    onPlayerDefeated?: () => void;
    onAttack?: (attacker: 'player' | 'enemy') => void;
    onDamage?: (target: 'player' | 'enemy', amount: number) => void;
  };
  private attackTimerInterval: any = null;

  constructor(devMode: boolean = false) {
    this.userStore = useUserStore();
    this.devMode = devMode;
    this.state = reactive({
      battleStarted: false,
      isPlayerTurn: false,
      turnCounter: 0,
      isDefending: false,
      defenseMultiplier: 0.5, // Reduces damage by 50% when defending
      currentEnemy: null,
      enemyHealthColor: '#2dd36f',
      battleMessage: '',
      participants: {
        enemies: [],
        users: [],
        activeEnemyIndex: 0,
        activeUserIndex: 0
      },
      enemyAttackTimer: 100,
      timeRemaining: 0,
      combatTasks: [],
      pendingPlayerDamage: 0
    });
    this.battleCallbacks = {};

    if (this.devMode) {
      debug.log('Battle service initialized in dev mode');
    }
  }

  /**
   * Register callbacks for battle events
   * @param callbacks Object containing callback functions for different battle events
   */
  public registerCallbacks(callbacks: Partial<typeof this.battleCallbacks>) {
    this.battleCallbacks = { ...this.battleCallbacks, ...callbacks };
  }

  /**
   * Handles the defeat of an enemy.
   * @param enemy The enemy that was defeated.
   */
  private defeatEnemy(enemy: Enemy): void {
    this.stopAttackTimer();
    debug.log(`Challenge '${enemy.name}' completed!`);
    if (this.battleCallbacks.onEnemyDefeated) {
      this.battleCallbacks.onEnemyDefeated(enemy);
    }
  }

  /**
   * Initialize a battle with an enemy
   * @param enemy The enemy to battle
   */
  public initBattle(enemy: Enemy): void {
    // Set initial battle state
    this.state.currentEnemy = enemy;
    this.state.battleStarted = true;
    this.state.isPlayerTurn = true; // For Task-ATB, player is usually "always ready"
    this.state.turnCounter = 1;

    // Initialize tasks from enemy checklist
    if (enemy.tasks && enemy.tasks.length > 0) {
      debug.log('BattleService: Initializing combat tasks from enemy', enemy.tasks);
      this.state.combatTasks = [...enemy.tasks];
    } else {
      debug.warn('BattleService: No tasks found on enemy, using defaults', enemy);
      // Fallback/Default tasks if none defined
      this.state.combatTasks = [
        { id: '1', name: 'Investigate', isCompleted: false },
        { id: '2', name: 'Observe patterns', isCompleted: false }
      ];
    }

    if (this.battleCallbacks.onCombatTasksChange) {
      this.battleCallbacks.onCombatTasksChange(this.state.combatTasks);
    }

    // Add enemy to participants array
    this.state.participants.enemies = [enemy];
    this.state.participants.activeEnemyIndex = 0;

    // Get current user from Pinia store and add to participants
    const currentUser = this.getCurrentUserFromStore();
    if (currentUser) {
      this.state.participants.users = [currentUser];
      this.state.participants.activeUserIndex = 0;
    }

    this.updateEnemyHealthColor();

    // Encounter message handled by UI component for better choreography
    /*
    this.queueDialogMessages([
      `${playerName} encountered ${enemy.name}!`
    ]);
    */


    if (this.devMode) {
      debug.log('Battle initialized with enemy:', enemy);
    }
  }

  /**
   * Initialize a battle with multiple enemies and users
   * @param enemies Array of enemies to battle
   * @param userIds Array of user IDs to participate in battle (defaults to current user)
   */
  public initMultiBattle(enemies: Enemy[], userIds?: string[]): void {
    if (enemies.length === 0) {
      debug.error('Cannot initialize battle with no enemies');
      return;
    }

    this.state.battleStarted = true;
    this.state.isPlayerTurn = false;
    this.state.turnCounter = 1;

    // Store enemies in participants array
    this.state.participants.enemies = enemies;
    this.state.participants.activeEnemyIndex = 0;

    // Set current enemy to first enemy
    this.state.currentEnemy = enemies[0];

    // Get users from store and add to participants
    this.state.participants.users = [];
    this.state.participants.activeUserIndex = 0;

    if (userIds && userIds.length > 0) {
      // Add multiple users from IDs
      userIds.forEach(id => {
        const user = this.getUserById(id);
        if (user) {
          this.state.participants.users.push(user);
        }
      });
    } else {
      // Add current user from store
      const currentUser = this.getCurrentUserFromStore();
      if (currentUser) {
        this.state.participants.users.push(currentUser);
      }
    }

    // Update enemy health color
    this.updateEnemyHealthColor();

    // Encounter message handled by UI component for better choreography
    /*
    this.queueDialogMessages([encounterMessage]);
    */


    if (this.devMode) {
      debug.log('Multi-battle initialized with enemies:', enemies);
      debug.log('Multi-battle participants:', this.state.participants);
    }
  }

  /**
   * Add an enemy to the current battle
   * @param enemy The enemy to add
   */
  public addEnemy(enemy: Enemy): void {
    if (!this.state.battleStarted) {
      this.initBattle(enemy);
      return;
    }

    this.state.participants.enemies.push(enemy);
    this.queueDialogMessages([
      `${enemy.name} has joined the battle!`
    ]);

    if (this.devMode) {
      debug.log('Enemy added to battle:', enemy);
    }
  }

  /**
   * Add a user to the current battle
   * @param userId The user ID to add
   * @returns Boolean indicating if the user was successfully added
   */
  public addUser(userId: string): boolean {
    const user = this.getUserById(userId);
    if (!user) {
      return false;
    }

    this.state.participants.users.push(user);
    this.queueDialogMessages([
      `${user.name} has joined the battle!`
    ]);

    if (this.devMode) {
      debug.log('User added to battle:', user);
    }

    return true;
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
    switch (action) {
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

    // Get active user
    const activeUser = this.getActiveUser();
    if (!activeUser) {
      this.queueDialogMessages(["No active user to attack with!"]);
      return {
        success: false,
        message: "No active user"
      };
    }

    // Queue attack messages
    this.queueDialogMessages([
      `${activeUser.name} attacks!`,
    ]);

    // Trigger attack animation via message (animation handled by UI)
    /*
    if (this.battleCallbacks.onAttack) {
      this.battleCallbacks.onAttack('player');
    }
    */

    // Calculate damage based on player stats and enemy defense
    const attackStat = activeUser.stats.strength;
    const defenseStat = this.state.currentEnemy.defense;
    const baseDamage = 10 + Math.floor(Math.random() * 20);

    // Apply attack and defense modifiers
    let damage = Math.floor(baseDamage * (1 + attackStat / 20));

    // Reduce damage based on enemy defense 
    damage = Math.max(1, Math.floor(damage * (1 - defenseStat / 100)));

    // Apply damage
    this.state.currentEnemy.health = Math.max(0, this.state.currentEnemy.health - damage);
    this.updateEnemyHealthColor();

    // Update the active enemy in participants array
    const activeEnemyIndex = this.state.participants.activeEnemyIndex;
    this.state.participants.enemies[activeEnemyIndex] = this.state.currentEnemy;

    // Queue damage message
    this.queueDialogMessages([
      `${this.state.currentEnemy.name} takes ${damage} damage!`
    ]);

    // Trigger damage sound
    if (this.battleCallbacks.onDamage) {
      this.battleCallbacks.onDamage('enemy', damage);
    }

    // Check if enemy is defeated
    if (this.state.currentEnemy.health <= 0) {
      this.queueDialogMessages([
        `${this.state.currentEnemy.name} was defeated!`
      ]);

      // Store defeated enemy for callback
      const defeatedEnemy = { ...this.state.currentEnemy };

      // Check if there are more enemies
      if (this.state.participants.enemies.length > 1) {
        // Remove the defeated enemy
        this.state.participants.enemies.splice(activeEnemyIndex, 1);

        // Check if there are more enemies left
        if (this.state.participants.enemies.length > 0) {
          // Set next enemy as active
          this.state.participants.activeEnemyIndex = 0;
          this.state.currentEnemy = this.state.participants.enemies[0];

          this.queueDialogMessages([
            `${this.state.currentEnemy.name} steps forward!`
          ]);

          // End player turn to continue battle
          this.endPlayerTurn();

          return {
            success: true,
            message: "Enemy defeated, battle continues"
          };
        }
      }

      // All enemies defeated
      this.queueDialogMessages([
        "You've won the battle!"
      ]);

      // Handle enemy defeat with callback
      if (this.battleCallbacks.onEnemyDefeated) {
        setTimeout(() => {
          if (this.battleCallbacks.onEnemyDefeated) {
            this.battleCallbacks.onEnemyDefeated(defeatedEnemy);
          }
        }, 2000);
      }

      return {
        success: true,
        message: "All enemies defeated",
        dialogMessages: [
          `${defeatedEnemy.name} was defeated!`,
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
    // Calculate escape chance based on enemy type
    // Boss battles have lower escape chance
    let escapeChance = 0.75; // Default 75% chance

    // Check if enemy is a boss
    if (this.state.currentEnemy?.isBoss) {
      escapeChance = 0.25; // Only 25% chance to escape from bosses
    } else if (this.state.currentEnemy?.type === 'miniboss') {
      escapeChance = 0.5; // 50% chance to escape from minibosses
    }

    // Calculate if escape is successful
    if (Math.random() < escapeChance) {
      this.stopAttackTimer();
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

    // Get active user name
    const activeUser = this.getActiveUser();
    const playerName = activeUser?.name || this.getPlayerName();

    // For subsequent turns, show the turn announcements
    this.queueDialogMessages([
      `Turn ${this.state.turnCounter} - ${playerName}'s turn!`,
      "What will you do?"
    ]);

    if (this.devMode) {
      debug.log(`Starting player turn ${this.state.turnCounter}`);
    }
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

    if (this.devMode) {
      debug.log(`Ending player turn ${this.state.turnCounter}`);
    }

    // Task-ATB note: player turn doesn't strictly "end" until all tasks done,
    // but we can use this to toggle visibility if needed.
    // For now, let's just keep the flow active.
  }

  /**
   * Completes a task and damages the enemy
   * @param taskId The ID of the task completed
   */
  public finishCombatTask(taskId: string): void {
    const task = this.state.combatTasks.find(t => t.id === taskId);
    if (!task || task.isCompleted) return;

    task.isCompleted = true;

    if (this.state.currentEnemy) {
      // Calculate damage based on number of tasks
      // Completing all tasks should defeat the enemy
      const damage = Math.ceil(this.state.currentEnemy.maxHealth / this.state.combatTasks.length);

      this.state.currentEnemy.health = Math.max(0, this.state.currentEnemy.health - damage);
      this.updateEnemyHealthColor();

      // Feedback - use enemy name and mention attack interrupt
      const enemyName = this.state.currentEnemy.name;
      this.queueDialogMessages([`Completed: ${task.name}!`, `${enemyName}'s attack was interrupted!`]);

      // Trigger damage sound (task completion simulates damage)
      if (this.battleCallbacks.onDamage) {
        this.battleCallbacks.onDamage('enemy', damage);
      }

      if (this.state.currentEnemy.health <= 0) {
        this.defeatEnemy(this.state.currentEnemy);
      }
    }

    if (this.battleCallbacks.onCombatTasksChange) {
      this.battleCallbacks.onCombatTasksChange(this.state.combatTasks);
    }

    // Reset the ATB gauge when a task is completed - player earns more time!
    if (this.state.currentEnemy && this.state.currentEnemy.health > 0) {
      this.stopAttackTimer();
      this.startAttackTimer();
    }
  }

  /**
   * Get the current combat tasks
   */
  public getCombatTasks(): CombatTask[] {
    return this.state.combatTasks;
  }

  /**
   * Start the enemy's attack timer (Active Time Battle style)
   */
  public startAttackTimer(): void {
    if (this.attackTimerInterval) clearInterval(this.attackTimerInterval);

    this.state.enemyAttackTimer = 100;
    const tickRate = 50; // ms

    // Calculate duration based on number of incomplete combat tasks
    // Each incomplete task gives 1 minute of time (60,000ms)
    // Minimum of 1 minute even with no tasks
    const incompleteTasks = this.state.combatTasks.filter(t => !t.isCompleted).length;
    const minutesPerTask = 60000; // 1 minute in ms
    const duration = Math.max(minutesPerTask, incompleteTasks * minutesPerTask);
    const decrement = (100 / (duration / tickRate));

    // Initialize time remaining
    this.state.timeRemaining = duration;

    // debug.log(`ATB Timer: ${incompleteTasks} tasks = ${duration / 1000}s duration`);
    // Debugging the 4 mins issue
    console.warn('ATB START DEBUG:', {
      tasks: this.state.combatTasks.length,
      incomplete: incompleteTasks,
      titles: this.state.combatTasks.map(t => t.name),
      duration: duration
    });

    this.attackTimerInterval = setInterval(() => {
      this.state.enemyAttackTimer = Math.max(0, this.state.enemyAttackTimer - decrement);
      this.state.timeRemaining = Math.max(0, this.state.timeRemaining - tickRate);

      if (this.state.enemyAttackTimer <= 0 || this.state.timeRemaining <= 0) {
        this.stopAttackTimer();
        if (this.state.currentEnemy) {
          this.performEnemyTurn();
        }
      }
    }, tickRate);
  }

  /**
   * Stop the enemy's attack timer
   */
  public stopAttackTimer(): void {
    if (this.attackTimerInterval) {
      clearInterval(this.attackTimerInterval);
      this.attackTimerInterval = null;
    }
  }

  /**
   * Get the current value of the enemy attack timer (0 to 100)
   */
  public getEnemyAttackTimer(): number {
    return this.state.enemyAttackTimer;
  }

  /**
   * Get the current time remaining in ms
   */
  public getTimeRemaining(): number {
    return this.state.timeRemaining;
  }

  /**
   * Perform enemy's turn
   */
  private performEnemyTurn(): void {
    if (!this.state.currentEnemy) return;

    // Get active enemy
    const activeEnemy = this.state.currentEnemy;

    // Get active user
    const activeUser = this.getActiveUser();
    if (!activeUser) {
      debug.error('No active user for enemy to target');
      // Just go back to player turn
      this.state.turnCounter++;
      this.startPlayerTurn();
      return;
    }

    // Queue enemy turn messages
    this.queueDialogMessages([
      `${activeEnemy.name}'s turn!`
    ]);

    // Trigger enemy pre-attack sound (ambush/charge)
    if (this.battleCallbacks.onAttack) {
      this.battleCallbacks.onAttack('enemy');
    }

    // Enemy attacks the player - this creates urgency to complete tasks!
    const baseDamage = 5 + Math.floor(Math.random() * 10);
    const attackStat = activeEnemy.attack || 10;
    const defenseStat = activeUser.stats?.defense || 5;

    let finalDamage = Math.floor(baseDamage * (1 + attackStat / 20));
    finalDamage = Math.max(1, Math.floor(finalDamage * (1 - defenseStat / 100)));

    // Apply defense reduction if player is defending
    if (this.state.isDefending) {
      finalDamage = Math.floor(finalDamage * this.state.defenseMultiplier);
      this.queueDialogMessages([`${activeUser.name}'s defense reduces the damage!`]);
    }

    this.queueDialogMessages([
      `${activeEnemy.name} attacks!`,
      `You take ${finalDamage} damage!`
    ]);

    // Trigger player damage sound - Moved to applyPendingDamage (Earthbound style)
    /*
    if (this.battleCallbacks.onDamage) {
      this.battleCallbacks.onDamage('player', finalDamage);
    }
    */

    // Store pending damage - will be applied when dialog is dismissed (Earthbound style!)
    this.state.pendingPlayerDamage = finalDamage;

    // Reset defending state after attack resolves
    this.setDefendingState(false);

    // Note: Damage is NOT applied here. It will be applied via applyPendingDamage()
    // which should be called when the attack dialog is dismissed by the player.
    // The ATB timer will restart after damage is applied.

    if (this.devMode) {
      debug.log(`Pending damage stored: ${finalDamage}. Awaiting dialog dismiss.`);
    }
  }

  /**
   * Apply pending damage to the player (called when attack dialog is dismissed)
   * This creates the Earthbound-style "rolling HP" effect
   */
  public applyPendingDamage(): void {
    if (this.state.pendingPlayerDamage <= 0) {
      // No pending damage, just restart the timer
      this.state.turnCounter++;
      this.startAttackTimer();
      return;
    }

    const damage = this.state.pendingPlayerDamage;
    this.state.pendingPlayerDamage = 0;

    const activeUser = this.getActiveUser();
    if (!activeUser) {
      debug.error('No active user to apply damage to');
      this.state.turnCounter++;
      this.startAttackTimer();
      return;
    }

    // Apply damage to player HP via the store
    const isAlive = this.userStore.updateUserHP({
      userId: activeUser.id,
      amount: -damage
    });

    // Trigger player damage sound and animations now that damage is applied
    if (this.battleCallbacks.onDamage) {
      this.battleCallbacks.onDamage('player', damage);
    }

    // Update the local participant's HP as well
    activeUser.stats.hp = Math.max(0, activeUser.stats.hp - damage);

    if (this.devMode) {
      debug.log(`Applied ${damage} pending damage. Player alive: ${isAlive}`);
    }

    if (!isAlive) {
      // Player defeated
      this.queueDialogMessages([
        `${activeUser.name} has fallen!`,
        'You blacked out...'
      ]);

      if (this.battleCallbacks.onPlayerDefeated) {
        this.battleCallbacks.onPlayerDefeated();
      }
    } else {
      // Proceed to next turn, restart ATB
      this.state.turnCounter++;
      this.startAttackTimer();
    }
  }

  /**
   * Check if there is pending damage awaiting application
   */
  public hasPendingDamage(): boolean {
    return this.state.pendingPlayerDamage > 0;
  }

  /**
   * Get the pending damage amount
   */
  public getPendingDamage(): number {
    return this.state.pendingPlayerDamage;
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

    if (this.devMode) {
      debug.log('Dialog messages:', messages);
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
   * Get player name from Pinia store
   */
  private getPlayerName(): string {
    const currentUser = this.userStore.currentUser;
    if (currentUser?.id) {
      const user = this.userStore.getUserById(currentUser.id);
      return user?.name?.nick || 'Player';
    }
    return 'Player';
  }

  /**
   * Get active user from participants
   */
  private getActiveUser(): User | null {
    const { users, activeUserIndex } = this.state.participants;
    if (users.length === 0 || activeUserIndex >= users.length) {
      return null;
    }
    return users[activeUserIndex];
  }

  /**
   * Get user by ID from Pinia store
   */
  private getUserById(userId: string): User | null {
    const storeUser = this.userStore.getUserById(userId);
    if (!storeUser) return null;

    const stats = storeUser.stats || {};

    // Extract HP/MP from either primitive or object structure { now, max }
    const hp = typeof stats.hp === 'object' ? stats.hp?.now : stats.hp;
    const maxHp = typeof stats.hp === 'object' ? stats.hp?.max : (stats.maxHp || 100);
    const mp = typeof stats.mp === 'object' ? stats.mp?.now : stats.mp;
    const maxMp = typeof stats.mp === 'object' ? stats.mp?.max : (stats.maxMp || 100);

    // Convert store user to battle user interface
    return {
      id: userId,
      name: storeUser.name?.nick || 'Player',
      avatar: storeUser.avatar,
      stats: {
        level: stats.level || 1,
        hp: typeof hp === 'number' ? hp : 100,
        maxHp: typeof maxHp === 'number' ? maxHp : 100,
        mp: typeof mp === 'number' ? mp : 100,
        maxMp: typeof maxMp === 'number' ? maxMp : 100,
        strength: stats.strength || 10,
        defense: stats.defense || 10,
        speed: stats.speed || 10,
      }
    };
  }

  /**
   * Get current user from Pinia store
   */
  private getCurrentUserFromStore(): User | null {
    const currentUser = this.userStore.currentUser;
    if (!currentUser?.id) return null;
    return this.getUserById(currentUser.id);
  }

  /**
   * Reset the battle state
   * This resets the battle to initial state but keeps the enemy
   */
  public resetBattle(): void {
    if (this.state.currentEnemy) {
      this.stopAttackTimer();
      this.state.enemyAttackTimer = 100;
      // Reset enemy health to max
      this.state.currentEnemy.health = this.state.currentEnemy.maxHealth;

      // Update the enemy in participants array
      const activeEnemyIndex = this.state.participants.activeEnemyIndex;
      if (this.state.participants.enemies[activeEnemyIndex]) {
        this.state.participants.enemies[activeEnemyIndex].health = this.state.participants.enemies[activeEnemyIndex].maxHealth;
      }

      // Update health color
      this.updateEnemyHealthColor();
    }

    // Reset battle state
    this.state.isPlayerTurn = false;
    this.state.turnCounter = 1;
    this.state.isDefending = false;
    this.setBattleMessage('');

    // Queue reset message
    this.queueDialogMessages([
      "The battle has been reset!",
      "Get ready to fight again!"
    ]);

    if (this.devMode) {
      debug.log("Battle has been reset");
    }
  }

  /**
   * Get current enemy
   */
  public getCurrentEnemy(): Enemy | null {
    return this.state.currentEnemy;
  }

  /**
   * Get all enemies in battle
   */
  public getAllEnemies(): Enemy[] {
    return [...this.state.participants.enemies];
  }

  /**
   * Get all users in battle
   */
  public getAllUsers(): User[] {
    return [...this.state.participants.users];
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

  /**
   * Get whether service is in dev mode
   */
  public isDevMode(): boolean {
    return this.devMode;
  }

  /**
   * Set dev mode
   * @param devMode Whether to enable dev mode
   */
  public setDevMode(devMode: boolean): void {
    this.devMode = devMode;
    debug.log(`Battle service dev mode ${devMode ? 'enabled' : 'disabled'}`);
  }

  /**
   * Developer tool: Damage enemy (only available in dev mode)
   * @param damage Amount of damage to inflict
   * @returns Whether the damage was applied
   */
  public devDamageEnemy(damage: number): boolean {
    if (!this.devMode) return false;
    if (!this.state.currentEnemy) return false;

    // Apply damage to enemy
    this.state.currentEnemy.health = Math.max(0, this.state.currentEnemy.health - damage);
    this.updateEnemyHealthColor();

    // Update the active enemy in participants array
    const activeEnemyIndex = this.state.participants.activeEnemyIndex;
    this.state.participants.enemies[activeEnemyIndex] = this.state.currentEnemy;

    // Check if enemy is defeated
    if (this.state.currentEnemy.health <= 0) {
      // Store defeated enemy for callback
      const defeatedEnemy = { ...this.state.currentEnemy };

      // Handle enemy defeat with callback
      if (this.battleCallbacks.onEnemyDefeated) {
        setTimeout(() => {
          if (this.battleCallbacks.onEnemyDefeated) {
            this.battleCallbacks.onEnemyDefeated(defeatedEnemy);
          }
        }, 500);
      }
    }

    return true;
  }

  /**
   * Developer tool: Heal enemy (only available in dev mode)
   * @param healing Amount of healing to apply
   * @returns Whether the healing was applied
   */
  public devHealEnemy(healing: number): boolean {
    if (!this.devMode) return false;
    if (!this.state.currentEnemy) return false;

    // Apply healing to enemy
    this.state.currentEnemy.health = Math.min(
      this.state.currentEnemy.maxHealth,
      this.state.currentEnemy.health + healing
    );
    this.updateEnemyHealthColor();

    // Update the active enemy in participants array
    const activeEnemyIndex = this.state.participants.activeEnemyIndex;
    this.state.participants.enemies[activeEnemyIndex] = this.state.currentEnemy;

    return true;
  }

  /**
   * Developer tool: Skip turn (only available in dev mode)
   * @returns Whether the turn was skipped
   */
  public devSkipTurn(): boolean {
    if (!this.devMode) return false;

    if (this.state.isPlayerTurn) {
      this.endPlayerTurn();
    } else {
      this.state.turnCounter++;
      this.startPlayerTurn();
    }

    return true;
  }
}

/**
 * Factory function to create a battle service
 * @param devMode Whether to enable dev mode
 * @returns A new battle service instance
 */
export function createBattleService(devMode: boolean = false): BattleService {
  return new BattleService(devMode);
}