import debug from '@/lib/utils/debug';
import { ref, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/lib/store/stores/user';
import $fx from '@/assets/fx';

// Types
export interface Enemy {
  id?: string | number;
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
  isBoss?: boolean;
  xpReward?: number;
  goldReward?: number;
  itemReward?: string | null;
}

export interface CompletedTask {
  name: string;
  xpReward: number;
  gpReward: number;
  itemReward?: string | null;
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
  theme: string;
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

// Callback interfaces
export interface BattleCallbacks {
  onVictory?: () => void;
  onDefeat?: () => void;
  onReturnToHometown?: (userId?: string) => void;
  onBattleMessage?: (message: string) => void;
  onEnemyHealthChange?: () => void;
  onPlayerStatsChange?: () => void;
}

// Battle Dialog Types
export interface BattleDialog {
  dialogText: string;
  showDialog: boolean;
  dialogQueue: Array<string | (() => void)>;
  hasMoreDialog: boolean;
  isDialogTyping: boolean;
  isVictoryMessage: boolean;
  queueDialog: (messages: Array<string | (() => void)>) => void;
  showNextDialog: () => void;
  onDialogComplete: () => void;
  advanceDialog: () => void;
  clearDialog: () => void;
}

/**
 * Battle Engine Hook
 * 
 * This hook provides a complete interface to the battle system,
 * handling enemy state, player actions, animations, and battle flow.
 */
export function useBattleEngine() {
  // Get Vue router for navigation
  const router = useRouter();
  // Get Pinia user store for state management
  const userStore = useUserStore();
  
  // Use the imported FX as 'fx'
  const fx = $fx as any;
  
  // Enemy state
  const currentEnemy = ref<Enemy | null>(null);
  
  // Battle state
  const state = reactive<BattleState>({
    battleStarted: false,
    isPlayerTurn: true,
    isDefending: false,
    enemyAnimationClass: '',
    battleMessage: '',
    theme: fx?.theme?.rpg || "default",
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
  
  // Battle callback registry
  const callbacks = reactive<BattleCallbacks>({
    onVictory: undefined,
    onDefeat: undefined,
    onReturnToHometown: undefined,
    onBattleMessage: undefined,
    onEnemyHealthChange: undefined,
    onPlayerStatsChange: undefined
  });
  
  // Available player actions
  const userActions = ref<BattleAction[]>([
    { id: 'attack', name: 'Attack', type: 'attack', damage: 10, icon: 'sword-outline' },
    { id: 'defend', name: 'Defend', type: 'defend', icon: 'shield-outline' },
    { id: 'ability', name: 'Abilities', type: 'special', icon: 'color-wand-outline' },
    { id: 'goods', name: 'Goods', type: 'item', icon: 'bag-outline' },
    { id: 'run', name: 'Run Away', type: 'escape', icon: 'walk-outline' }
  ]);
  
  // Computed properties
  const enemyHealthColor = computed(() => {
    if (!currentEnemy.value) return '#2dd36f';
    
    const healthPercent = currentEnemy.value.health / currentEnemy.value.maxHealth;
    if (healthPercent > 0.6) return '#2dd36f'; // Green
    if (healthPercent > 0.3) return '#ffc409'; // Yellow
    return '#eb445a'; // Red
  });
  
  // Battle Dialog System - Fix type issues by initializing with proper types
  const dialogQueueInitial: Array<string | (() => void)> = [];
  
  // Create the dialog object with methods that preserve 'this' context
  const createBattleDialog = (): BattleDialog => {
    const dialog: BattleDialog = {
      dialogText: '',
      showDialog: false,
      dialogQueue: [...dialogQueueInitial],
      hasMoreDialog: false,
      isDialogTyping: false,
      isVictoryMessage: false,
      
      queueDialog(messages: Array<string | (() => void)>) {
        // Add messages to the queue
        this.dialogQueue = [...this.dialogQueue, ...messages];
        
        // If no dialog is currently displaying, show the first message
        if (!this.isDialogTyping && !this.showDialog) {
          this.showNextDialog();
        }
      },
      
      showNextDialog() {
        if (this.dialogQueue.length === 0) {
          // No more messages to show
          this.dialogText = '';
          this.showDialog = false;
          this.hasMoreDialog = false;
          
          // If we were in an enemy turn, proceed to player turn
          if (!state.isPlayerTurn) {
            startPlayerTurn();
          }
          return;
        }
        
        // Get the next message or function from the queue
        const next = this.dialogQueue.shift();
        
        // Check if it's a function and execute it
        if (typeof next === 'function') {
          next();
          // Process the next item in the queue
          this.showNextDialog();
          return;
        }
        
        // It's a string message, so display it
        this.dialogText = next || '';
        this.isDialogTyping = true;
        this.hasMoreDialog = this.dialogQueue.length > 0;
        this.showDialog = true;
        
        // Play typing sound
        playSound('text');
      },
      
      onDialogComplete() {
        this.isDialogTyping = false;
        
        // Add a short pause before showing the next message
        setTimeout(() => {
          // If there are more messages, show the next one
          if (this.dialogQueue.length > 0) {
            this.showNextDialog();
          } else {
            this.hasMoreDialog = false;
            
            // If this was enemy dialog, proceed to player turn after a delay
            if (!state.isPlayerTurn) {
              setTimeout(() => {
                startPlayerTurn();
              }, 1000);
            }
          }
        }, 1500);
      },
      
      advanceDialog() {
        if (this.isDialogTyping) {
          // Complete the current text immediately
          this.isDialogTyping = false;
          // Would trigger any complete typing mechanism in the UI component
        } else if (this.dialogQueue.length > 0) {
          // Show next message
          this.showNextDialog();
        } else {
          // If we were in enemy turn, proceed to player turn
          if (!state.isPlayerTurn) {
            startPlayerTurn();
          }
          
          // Clear the dialog
          this.dialogText = '';
          this.showDialog = false;
        }
      },
      
      clearDialog() {
        this.dialogText = '';
        this.showDialog = false;
        this.dialogQueue = [];
        this.hasMoreDialog = false;
        this.isDialogTyping = false;
        this.isVictoryMessage = false;
      }
    };
    
    // Bind all methods to ensure 'this' context is preserved
    dialog.queueDialog = dialog.queueDialog.bind(dialog);
    dialog.showNextDialog = dialog.showNextDialog.bind(dialog);
    dialog.onDialogComplete = dialog.onDialogComplete.bind(dialog);
    dialog.advanceDialog = dialog.advanceDialog.bind(dialog);
    dialog.clearDialog = dialog.clearDialog.bind(dialog);
    
    return dialog;
  };
  
  // Create the battle dialog with bound methods
  const battleDialog = reactive<BattleDialog>(createBattleDialog());
  
  // Audio Utilities
  const playSound = (type: string) => {
    // Check if fx system is available
    if (fx?.ui && fx.theme?.ui) {
      // Types: confirm, cancel, openPage, cast, text
      if (fx.ui[fx.theme.ui][type]) {
        fx.ui[fx.theme.ui][type].play();
      }
    }
  };

  /**
   * Register callbacks for battle events
   */
  const registerCallbacks = (newCallbacks: Partial<BattleCallbacks>) => {
    // Update each callback if provided
    Object.keys(newCallbacks).forEach(key => {
      const callbackKey = key as keyof BattleCallbacks;
      if (newCallbacks[callbackKey]) {
        // Need to use type assertion here to resolve the type conflict
        callbacks[callbackKey] = newCallbacks[callbackKey] as any;
      }
    });
  };
  
  /**
   * Get beast avatar image from ID
   */
  const getAvatar = (id?: number | string) => {
    if (!id) return '';
    
    // Handle numeric IDs
    if (typeof id === 'number' || !isNaN(Number(id))) {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      const pad = numId.toString().padStart(3, '0');
      return require(`@/assets/images/beasts/${pad}.png`);
    }
    
    // Handle string IDs (URLs or paths)
    return id;
  };
  
  /**
   * Load beast by ID from the bestiary service
   */
  const loadBeastById = async (beastId: string | number): Promise<Enemy | null> => {
    try {
      // Try to fetch from API or service
      // For now we'll create a sample enemy with the ID
      const enemy: Enemy = {
        id: beastId,
        name: `Beast #${beastId}`,
        type: typeof beastId === 'number' && beastId > 100 ? 'boss' : 'basic',
        health: 150,
        maxHealth: 150,
        avatar: beastId,
        attack: 10,
        defense: 5,
        speed: 8,
        isBoss: typeof beastId === 'number' && beastId > 100
      };
      
      setEnemy(enemy);
      return enemy;
    } catch (error) {
      debug.error('Error loading beast:', error);
      return null;
    }
  };
  
  /**
   * Load a random or sample beast
   */
  const loadSampleBeast = async (): Promise<Enemy | null> => {
    try {
      // Sample beast data
      const sampleEnemy = createSampleEnemy();
      return sampleEnemy;
    } catch (error) {
      debug.error('Error loading sample beast:', error);
      return null;
    }
  };
  
  /**
   * Create a sample enemy for demonstrations
   */
  const createSampleEnemy = (): Enemy => {
    // Create a basic enemy for demonstration
    const enemy: Enemy = {
      id: 'sample',
      name: 'Training Dummy',
      type: 'basic',
      health: 150,
      maxHealth: 150,
      emoji: '👾', // Fallback emoji if no image
      attack: 10,
      defense: 5,
      speed: 8
    };
    
    // Set as current enemy
    setEnemy(enemy);
    
    return enemy;
  };
  
  /**
   * Set the current enemy
   */
  const setEnemy = (enemy: Enemy) => {
    currentEnemy.value = enemy;
    
    // Trigger health change callback
    if (callbacks.onEnemyHealthChange) {
      callbacks.onEnemyHealthChange();
    }
    
    return enemy;
  };
  
  /**
   * Start player's turn
   */
  const startPlayerTurn = () => {
    state.isPlayerTurn = true;
    
    // For the very first turn, just clear dialog and don't show any message
    if (!state.battleStarted) {
      return;
    }
    
    // For subsequent turns, show the turn announcements
    const currentUser = userStore.currentUser;
    const userData = currentUser?.id ? userStore.getUserById(currentUser.id) : null;
    const playerName = userData?.name?.nick || 'Player';
    battleDialog.queueDialog([
      `Turn - ${playerName}'s turn!`,
      "What will you do?"
    ]);
  };
  
  /**
   * Initialize a new battle with current enemy
   */
  const initBattle = () => {
    if (!currentEnemy.value) {
      debug.warn('Attempting to initialize battle with no enemy');
      return;
    }
    
    // Set battle state
    state.battleStarted = true;
    state.isPlayerTurn = false; // Will be set to true after dialog
    
    // Reset any previous state
    state.isDefending = false;
    state.enemyAnimationClass = '';
    state.battleMessage = '';
    
    // Show encounter message
    const currentUser = userStore.currentUser;
    const userData = currentUser?.id ? userStore.getUserById(currentUser.id) : null;
    const playerName = userData?.name?.nick || 'Player';
    battleDialog.queueDialog([
      `${playerName} encountered ${currentEnemy.value.name}!`
    ]);
    
    // Start player's turn after dialog completes
    // This happens via the dialog system's callback
  };
  
  /**
   * Handle battle action selection
   */
  const handleBattleAction = (action: { action: string }) => {
    // If battle hasn't started, initialize it
    if (!state.battleStarted) {
      initBattle();
      return;
    }
    
    // Only process actions if it's the player's turn
    if (!state.isPlayerTurn) {
      battleDialog.queueDialog(["It's not your turn yet!"]);
      return;
    }
    
    const actionType = action.action;
    
    // Helpers to calculate damage based on stats
    const getPlayerDamage = () => {
      const currentUser = userStore.currentUser;
      const userData = currentUser?.id ? userStore.getUserById(currentUser.id) : null;
      const baseAttack = userData?.stats?.intelligence || 10;
      const baseValue = baseAttack + Math.floor(Math.random() * 15);
      return Math.max(5, baseValue);
    };
    
    // Play appropriate sound effect based on action
    switch(actionType) {
      case 'attack':
      case 'defend':
        playSound('confirm');
        break;
      case 'goods':
      case 'ability':
        playSound('openPage');
        break;
      case 'run':
        playSound('cancel');
        break;
    }
    
    // Handle different action types
    switch(actionType) {
      case 'attack': {
        // Handle attack
        const currentUser = userStore.currentUser;
        const userData = currentUser?.id ? userStore.getUserById(currentUser.id) : null;
        const playerName = userData?.name?.nick || 'Player';
        battleDialog.queueDialog([`${playerName} attacks!`]);
        
        // Apply attack animation to enemy
        state.enemyAnimationClass = 'damaged';
        setTimeout(() => {
          if (state.enemyAnimationClass === 'damaged') {
            state.enemyAnimationClass = '';
          }
        }, 500);
        
        // Calculate damage
        const damage = getPlayerDamage();
        
        // Apply damage to enemy
        if (currentEnemy.value) {
          currentEnemy.value.health = Math.max(0, currentEnemy.value.health - damage);
          
          // Update health bar via callback
          if (callbacks.onEnemyHealthChange) {
            callbacks.onEnemyHealthChange();
          }
          
          // Show damage message
          state.battleMessage = `${damage} damage!`;
          setTimeout(() => {
            if (state.battleMessage.includes('damage')) {
              state.battleMessage = '';
            }
          }, 1500);
          
          // Check if enemy defeated
          if (currentEnemy.value.health <= 0) {
            // Handle victory
            handleVictory();
          } else {
            // End turn if enemy still alive
            endPlayerTurn();
          }
        }
        break;
      }
      
      case 'defend': {
        // Handle defend action
        const currentUser = userStore.currentUser;
        const userData = currentUser?.id ? userStore.getUserById(currentUser.id) : null;
        const defenderName = userData?.name?.nick || 'Player';
        battleDialog.queueDialog([
          `${defenderName} takes a defensive stance!`,
          "Defense increased for this turn."
        ]);
        
        // Set defending flag and show message
        state.isDefending = true;
        state.battleMessage = "DEFENSE UP!";
        setTimeout(() => {
          if (state.battleMessage === "DEFENSE UP!") {
            state.battleMessage = "";
          }
        }, 2000);
        
        // End player turn
        endPlayerTurn();
        break;
      }
      
      case 'goods': {
        const currentUser = userStore.currentUser;
        const userData = currentUser?.id ? userStore.getUserById(currentUser.id) : null;
        battleDialog.queueDialog([
          `${userData?.name?.nick || 'Player'} checks their inventory.`,
          "Opening inventory..."
        ]);
        
        setTimeout(() => {
          const userId = userStore.currentUser?.id;
          if (userId) {
            router.push({
              name: "my-inventory",
              params: { userId }
            });
          }
        }, 2000);
        break;
      }
        
      case 'ability': {
        // Open abilities
        const currentUser = userStore.currentUser;
        const userData = currentUser?.id ? userStore.getUserById(currentUser.id) : null;
        battleDialog.queueDialog([
          `${userData?.name?.nick || 'Player'} prepares to use an ability.`,
          "Opening abilities..."
        ]);
        
        setTimeout(() => {
          const userId = userStore.currentUser?.id;
          if (userId) {
            router.push({
              name: "my-abilities",
              params: { userId }
            });
          }
        }, 2000);
        break;
      }
        
      case 'run': {
        // Handle run action
        const currentUser = userStore.currentUser;
        const userData = currentUser?.id ? userStore.getUserById(currentUser.id) : null;
        const runnerName = userData?.name?.nick || 'Player';
        
        // 70% chance to escape
        const escapeChance = Math.random();
        const escaped = escapeChance < 0.7;
        
        if (escaped) {
          // Successful escape
          battleDialog.queueDialog([
            `${runnerName} tries to escape...`,
            "Got away safely!"
          ]);
          
          // Fade out enemy
          state.enemyAnimationClass = 'fadeout';
          
          // Return to hometown after a delay
          setTimeout(() => {
            exitBattle();
          }, 3000);
        } else {
          // Failed escape
          battleDialog.queueDialog([
            `${runnerName} tries to escape...`,
            "Couldn't get away!"
          ]);
          
          // End player turn since escape failed
          endPlayerTurn();
        }
        break;
      }
      
      default:
        debug.warn(`Unknown battle action: ${actionType}`);
    }
    
    // Return success for action handling (used by dev tools)
    return { success: true };
  };
  
  /**
   * End player's turn and start enemy's turn
   */
  const endPlayerTurn = () => {
    state.isPlayerTurn = false;
    
    // Short delay before enemy turn
    setTimeout(() => {
      if (currentEnemy.value) {
        performEnemyTurn();
      } else {
        // If no enemy, just go back to player turn
        startPlayerTurn();
      }
    }, 1000);
  };
  
  /**
   * Execute enemy AI turn
   */
  const performEnemyTurn = () => {
    if (!currentEnemy.value) return;
    
    // Queue enemy turn messages
    battleDialog.queueDialog([
      `${currentEnemy.value.name}'s turn!`
    ]);
    
    // Pick a random enemy action
    const actions = ['attack', 'defend', 'special'];
    const enemyAction = actions[Math.floor(Math.random() * actions.length)];
    
    // Variables for damage calculation
    const currentUser = userStore.currentUser;
    const userData = currentUser?.id ? userStore.getUserById(currentUser.id) : null;
    const userLevel = userData?.stats?.level || 1;
    const baseDamage = 5 + Math.floor(Math.random() * 10);
    const damageTaken = Math.max(1, Math.floor(baseDamage * (1 + userLevel / 10)));
    
    // Cache current user stats
    const currentHP = userData?.stats?.hp || 100;
    
    switch (enemyAction) {
      case 'attack': {
        // Enemy attacks
        state.enemyAnimationClass = 'attacking';
        
        battleDialog.queueDialog([
          `${currentEnemy.value.name} attacks!`,
        ]);
        
        // Reset animation after a short time
        setTimeout(() => {
          state.enemyAnimationClass = '';
        }, 500);
        
        // Apply damage after a delay
        setTimeout(() => {
          // Calculate base damage
          let finalDamage = damageTaken;
          
          // Apply defense reduction if player is defending
          if (state.isDefending) {
            // Reduce damage by defense multiplier (50%)
            finalDamage = Math.floor(finalDamage * 0.5);
            
            // Show defense message
            battleDialog.queueDialog([
              `${userData?.name?.nick || 'Player'}'s defense reduces the damage!`,
            ]);
          }
          
          // Reduce player HP (dispatch to store in real implementation)
          const newHP = Math.max(0, currentHP - finalDamage);
          
          // Update UI via battle message
          state.battleMessage = `-${finalDamage} HP`;
          
          // Show damage message and animate screen shake
          const playerName = userData?.name?.nick || 'Player';
          battleDialog.queueDialog([
            `${playerName} takes ${finalDamage} damage!`
          ]);
          
          // Check if player is defeated
          if (newHP <= 0) {
            battleDialog.queueDialog([
              `${playerName} is defeated!`,
              "Game Over"
            ]);
            
            // Handle defeat after dialog completes
            setTimeout(() => {
              handleDefeat();
            }, 3000);
          } else {
            // In a real implementation, we would update the store
            // store.dispatch('updateUserStat', { stat: 'hp', value: newHP });
            
            // Reset defending flag at end of enemy turn
            state.isDefending = false;
            
            // Start player turn after dialog completes
          }
        }, 1000);
        break;
      }
      
      case 'defend':
        // Enemy defends
        battleDialog.queueDialog([
          `${currentEnemy.value.name} takes a defensive stance!`
        ]);
        
        // For simple implementation, enemy defend just ends their turn
        break;
        
      case 'special':
        // Enemy uses special ability
        battleDialog.queueDialog([
          `${currentEnemy.value.name} is charging power!`,
          "It seems to be preparing for something..."
        ]);
        
        // For simple implementation, this is just flavor text and ends their turn
        break;
    }
  };

  /**
   * Handle player victory in battle
   */
  const handleVictory = () => {
    if (!currentEnemy.value) return;
    
    // Show victory message
    state.battleMessage = `${currentEnemy.value.name} was defeated!`;
    
    // Check if we have a victory callback and use it
    if (callbacks.onVictory) {
      callbacks.onVictory();
    } else {
      // Default victory behavior if no callback
      defaultVictoryAnimation();
    }
  };
  
  /**
   * Default victory animation if no callback provided
   */
  const defaultVictoryAnimation = () => {
    // Apply victory animation to enemy
    state.enemyAnimationClass = 'victory-fadeout';
    
    // Set victory dialog mode
    battleDialog.isVictoryMessage = true;
    
    // Calculate rewards
    const xpReward = calculateXPReward();
    const gpReward = calculateGPReward();
    
    // Show victory dialog
    battleDialog.queueDialog([
      `You Won!`, 
      `${currentEnemy.value?.name || 'Enemy'} was defeated!`,
      `You gained ${xpReward} XP!`,
      `You earned ${gpReward} GP!`
    ]);
    
    // Add a final callback to end battle after dialog
    battleDialog.dialogQueue.push(() => {
      setTimeout(() => {
        battleDialog.isVictoryMessage = false;
        exitBattle();
      }, 1000);
    });
  };
  
  /**
   * Handle player defeat in battle
   */
  const handleDefeat = () => {
    // Check if we have a defeat callback and use it
    if (callbacks.onDefeat) {
      callbacks.onDefeat();
    } else {
      // Default defeat behavior
      state.battleMessage = "You were defeated!";
      
      // Return to hometown after a delay
      setTimeout(() => {
        exitBattle();
      }, 3000);
    }
  };
  
  /**
   * Exit battle and return to hometown or previous screen
   */
  const exitBattle = () => {
    // Reset battle state
    state.battleStarted = false;
    state.isPlayerTurn = false;
    state.isDefending = false;
    state.enemyAnimationClass = '';
    state.battleMessage = '';
    battleDialog.clearDialog();
    
    // Use callback to return to hometown if provided
    if (callbacks.onReturnToHometown) {
      callbacks.onReturnToHometown(userStore.currentUser?.id || undefined);
    } else {
      // Default navigation
      const userId = userStore.currentUser?.id;
      if (userId) {
        router.push({
          name: "home-town",
          params: { userId }
        });
      }
    }
  };
  
  /**
   * Return to hometown specifically (used after rewards)
   */
  const returnToHometown = (userId?: string) => {
    if (callbacks.onReturnToHometown) {
      callbacks.onReturnToHometown(userId);
    } else {
      router.push({
        name: "home-town",
        params: { userId: userId || userStore.currentUser?.id }
      });
    }
  };
  
  /**
   * Calculate XP reward based on enemy difficulty
   */
  const calculateXPReward = (): number => {
    if (!currentEnemy.value) return 0;
    
    // Base XP on enemy type and health
    let baseXP = currentEnemy.value.xpReward || currentEnemy.value.maxHealth / 2;
    
    // Bonus for boss types
    if (currentEnemy.value.isBoss) {
      baseXP *= 1.5;
    } else if (currentEnemy.value.type === 'miniboss') {
      baseXP *= 1.25;
    }
    
    // Round to nearest integer
    return Math.round(baseXP);
  };
  
  /**
   * Calculate GP (gold) reward based on enemy difficulty
   */
  const calculateGPReward = (): number => {
    if (!currentEnemy.value) return 0;
    
    // Base GP on enemy type and health
    let baseGP = currentEnemy.value.goldReward || currentEnemy.value.maxHealth / 4;
    
    // Bonus for boss types
    if (currentEnemy.value.isBoss) {
      baseGP *= 1.5;
    } else if (currentEnemy.value.type === 'miniboss') {
      baseGP *= 1.25;
    }
    
    // Round to nearest integer
    return Math.round(baseGP);
  };
  
  /**
   * Execute victory animation sequence
   * This is often overridden by component's implementation
   */
  const victoryAnimation = () => {
    // Default implementation just handles state
    state.enemyAnimationClass = 'victory-strobe';
    
    // Play victory sound
    playSound('confirm');
    
    // Set victory dialog mode
    battleDialog.isVictoryMessage = true;
    
    // Queue battle dialog messages with "You Won!" as first message
    battleDialog.queueDialog([
      `You Won!`, 
      `${currentEnemy.value?.name || 'Enemy'} was defeated!`,
      `You gained ${calculateXPReward()} XP!`,
      `You earned ${calculateGPReward()} GP!`
    ]);
  };
    
  return {
    // State
    currentEnemy,
    state,
    userActions,
    enemyHealthColor,
    battleDialog,
    
    // Methods
    registerCallbacks,
    getAvatar,
    loadBeastById,
    loadSampleBeast,
    createSampleEnemy,
    setEnemy,
    initBattle,
    handleBattleAction,
    endPlayerTurn,
    performEnemyTurn,
    handleVictory,
    handleDefeat,
    exitBattle,
    returnToHometown,
    calculateXPReward,
    calculateGPReward,
    victoryAnimation
  };
}