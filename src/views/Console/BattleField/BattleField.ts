import { defineComponent, ref, onMounted, onUnmounted, inject, computed, watch } from "vue";
import { useStore } from "vuex";
import { useRouter, useRoute } from "vue-router";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
import backgrounds from "@/assets/images/backgrounds/parallax/index";
import CardUserStats from "@/components/CardUserStats/CardUserStats.vue";
import fetchItems from "@/mixins/fetchItems";
import ionic from "@/mixins/ionic";
import MyTask from "@/views/Console/MyPortal/UserHud/MyTask/MyTask.vue";
import userActions from "@/mixins/userActions";
import XpFabBattleActions from "@/views/Console/MyPortal/UserHud/components/XpFabBattleActions.vue";
import XpTypingText from "@/components/XpTypingText/XpTypingText.vue";
import XpHpMpHud from "@/views/Console/BattleField/hud/XpHpMpHud/XpHpMpHud.vue";
import { modalController, toastController } from '@ionic/vue';

// Import battle services
import { createBattleService, createBestiaryService, BattleService, BestiaryService, Enemy, CompletedTask } from '@/lib/services/battle';

// Import icons
import {
  closeCircle,
  medalOutline,
  cashOutline,
  giftOutline,
  diceOutline,
  colorWandOutline,
  bagOutline,
  fitnessOutline,
  sparklesOutline,
  serverOutline,
  settings,
  refresh,
  flame,
  medkit,
  time
} from "ionicons/icons";
import debug from "@/lib/utils/debug";

// Define a unique ID for this page for background management
const PAGE_ID = 'battle-field';

const requireAvatar = require.context("@/assets/images/avatars/");

export default defineComponent({
  name: "battle-field",
  props: {
    userId: String,
    userName: {
      type: String,
      default: ''
    },
    beastAvatar: {
      type: Number,
      default: null
    },
    showEnemyInfo: {
      type: Boolean,
      default: true
    },
    enemyType: {
      type: String,
      default: 'basic'
    },
    taskId: {
      type: [String, Number],
      default: 0
    },
    devMode: {
      type: Boolean,
      default: false
    },
    beastIds: String,
    userIds: String
  },
  mixins: [fetchItems, ionic, userActions],
  components: {
    CardUserStats,
    MyTask,
    XpHpMpHud,
    XpFabBattleActions,
    XpTypingText,
  },
  setup(props) {
    // Component state
    const page = ref(null);
    const battleBackground = ref<HTMLCanvasElement | null>(null);
    const battleDialogText = ref('');
    const battleStarted = ref(false);
    const isPlayerTurn = ref(false);
    const currentEnemy = ref<Enemy | null>(null);
    const enemyAnimationClass = ref('');
    const enemyHealthColor = ref('#2dd36f');
    const battleMessage = ref('');
    const showRewardsModal = ref(false);
    const completedTask = ref<CompletedTask | null>(null);
    const hasMoreBattleDialog = ref(false);
    const isBattleDialogTyping = ref(false);
    const isVictoryMessage = ref(false);
    const battleDialogQueue = ref<Array<string | (() => void)>>([]);
    const battleDialogRef = ref<any>(null);
    
    // Services
    const battleService = ref<BattleService | null>(null);
    const bestiaryService = ref<BestiaryService | null>(null);
    
    // Get store, router and injected services using composition API
    const store = useStore();
    const router = useRouter();
    const route = useRoute();
    const $fx = inject('$fx') as any;
    
    // Background configuration
    const bg1 = ref(1);
    const bg2 = ref(1);
    
    // Get user from store
    const user = computed(() => store.state.user);

    // Get battle participants from URL params
    const getBattleParticipants = () => {
      const { beastIds: beastIdsParam, userIds: userIdsParam } = route.params;
      
      let parsedBeastIds: string[] = [];
      let parsedUserIds: string[] = [];
      
      // Parse beast IDs from route params
      if (beastIdsParam && typeof beastIdsParam === 'string') {
        parsedBeastIds = beastIdsParam.split(',').filter(id => id.trim() !== '');
      }
      
      // If beastIds is provided via props, use that too
      if (props.beastIds && typeof props.beastIds === 'string') {
        const propBeastIds = props.beastIds.split(',').filter(id => id.trim() !== '');
        // Add any prop beast IDs that aren't already in the parsedBeastIds array
        propBeastIds.forEach(id => {
          if (!parsedBeastIds.includes(id)) {
            parsedBeastIds.push(id);
          }
        });
      }
      
      // Parse user IDs from route params
      if (userIdsParam && typeof userIdsParam === 'string') {
        parsedUserIds = userIdsParam.split(',').filter(id => id.trim() !== '');
      }
      
      // If userIds is provided via props, use that too
      if (props.userIds && typeof props.userIds === 'string') {
        const propUserIds = props.userIds.split(',').filter(id => id.trim() !== '');
        // Add any prop user IDs that aren't already in the parsedUserIds array
        propUserIds.forEach(id => {
          if (!parsedUserIds.includes(id)) {
            parsedUserIds.push(id);
          }
        });
      }
      
      // If we have a userId from props but not from route, use it
      if (parsedUserIds.length === 0 && props.userId) {
        parsedUserIds.push(props.userId);
      }
      
      return { beastIds: parsedBeastIds, userIds: parsedUserIds };
    };
    
    // Methods for background management
    const changeBg = () => {
      if ($fx?.theme?.rpg === "earthbound") {
        enterBattle();
        return false;
      }
      
      // Check if we're even able to set bg styles
      const pageElement = document.querySelector('.battle-bg') as HTMLElement | null;
      if (!pageElement) {
        debug.warn('No suitable element found to set background styles');
        enterBattle(); // Just try to enter battle directly
        return;
      }
      
      const setBGStyle = (key: string, value: string) => {
        if (pageElement) {
          pageElement.style[key as any] = value;
        }
      };
      
      // Set background styles
      const values = Object.values(backgrounds);
      let prop = {};
      const currentBg = Math.floor(Math.random() * 10);
      while (!prop) {
        const rand = Math.floor(Math.random() * values.length);
        prop = prop == currentBg ? {} : values[rand] || {};
      }
      
      // Apply styles
      setBGStyle("backdropFilter", "blur(5px)");
      setBGStyle(
        "background", 
        `linear-gradient(0deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${prop})`
      );
      setBGStyle("backgroundSize", "cover");

      const toggleBGDirection = Math.random() > 0.5;
      if (toggleBGDirection) {
        setBGStyle("backgroundPosition", "0 100%, 0 100%");
      } else {
        setBGStyle("backgroundPosition", "0 0%, 0 0%");
      }

      setTimeout(() => setBGStyle("backdropFilter", "blur(0px)"), 3000);
    };
    
    const enterBattle = () => {
      // Clean up previous background if active
      if (backgroundManager.isActiveFor(PAGE_ID)) {
        backgroundManager.cleanupBackground();
      }

      // Get the canvas element using the ref
      const canvasElement = battleBackground.value;
      
      if (!canvasElement) {
        // Try with querySelector as fallback
        const canvasSelector = "canvas.battle-bg";
        
        backgroundManager.initBackground({
          canvasSelector,
          bg1: bg1.value,
          bg2: bg2.value,
          aspectRatio: 48, // Common aspect ratio value
          handleResize: true,
          page: PAGE_ID
        });
      } else {
        // Use the direct canvas element reference
        backgroundManager.initBackground({
          canvasElement,
          bg1: bg1.value,
          bg2: bg2.value, 
          aspectRatio: 48, // Common aspect ratio value
          handleResize: true,
          page: PAGE_ID
        });
      }
      
      return true;
    };
    
    // Play sound effects
    const playSound = (type: string) => {
      if ($fx?.ui && $fx?.theme?.ui) {
        if ($fx.ui[$fx.theme.ui][type]) {
          $fx.ui[$fx.theme.ui][type].play();
        }
      }
    };
    
    // Initialize battle services
    const initServices = () => {
      battleService.value = createBattleService(store);
      bestiaryService.value = createBestiaryService();
      
      // Register callbacks for the battle service
      if (battleService.value) {
        battleService.value.registerCallbacks({
          onDialogMessage: (messages) => {
            queueBattleDialog(messages);
          },
          onBattleMessageChange: (message) => { 
            battleMessage.value = message;
          },
          onEnemyHealthChange: () => {
            updateEnemyHealthColor();
          },
          onDefendStateChange: () => {
            // Handle defend state changes if needed
          },
          onPlayerTurnChange: (playerTurn) => {
            isPlayerTurn.value = playerTurn;
          },
          onEnemyDefeated: (enemy) => {
            defeatEnemy(enemy);
          }
        });
      }
    };
    
    // Update enemy health color based on the battle service data
    const updateEnemyHealthColor = () => {
      if (battleService.value) {
        enemyHealthColor.value = battleService.value.getEnemyHealthColor();
      } else if (currentEnemy.value) {
        // Fallback to calculating it manually
        const healthPercentage = currentEnemy.value.health / currentEnemy.value.maxHealth;
        
        if (healthPercentage > 0.6) {
          enemyHealthColor.value = '#2dd36f'; // green
        } else if (healthPercentage > 0.3) {
          enemyHealthColor.value = '#ffc409'; // yellow
        } else {
          enemyHealthColor.value = '#eb445a'; // red
        }
      }
    };
    
    // Queue multiple dialog messages
    const queueBattleDialog = (messages: string[]) => {
      // Add messages to the queue
      battleDialogQueue.value = [...battleDialogQueue.value, ...messages];
      
      // If no dialog is currently displaying, show the first message
      if (!isBattleDialogTyping.value && battleDialogText.value === '') {
        showNextBattleDialog();
      }
    };

    // Show the next dialog message from the queue
    const showNextBattleDialog = () => {
      if (battleDialogQueue.value.length === 0) {
        // No more messages to show
        battleDialogText.value = '';
        hasMoreBattleDialog.value = false;
        
        // If we were in an enemy turn, proceed to player turn
        if (!isPlayerTurn.value && battleService.value) {
          battleService.value.startPlayerTurn();
        }
        return;
      }
      
      // Get the next message or function from the queue
      const next = battleDialogQueue.value.shift();
      
      // Check if it's a function and execute it
      if (typeof next === 'function') {
        next();
        // Process the next item in the queue
        showNextBattleDialog();
        return;
      }
      
      // It's a string message, so display it
      battleDialogText.value = next || '';
      isBattleDialogTyping.value = true;
      hasMoreBattleDialog.value = battleDialogQueue.value.length > 0;
      
      // Play typing sound
      playSound("text");
    };
    
    // Called when a battle dialog text finishes typing
    const onBattleDialogComplete = () => {
      isBattleDialogTyping.value = false;
      
      // Add a short pause before showing the next message
      setTimeout(() => {
        // If there are more messages, show the next one
        if (battleDialogQueue.value.length > 0) {
          showNextBattleDialog();
        } else {
          hasMoreBattleDialog.value = false;
          // If this was enemy dialog, proceed to player turn after a delay
          if (!isPlayerTurn.value) {
            setTimeout(() => {
              if (battleService.value) {
                // Use battle service to start player turn
                battleService.value.startPlayerTurn();
              }
            }, 1000);
          }
        }
      }, 1500);
    };
    
    // Called when the battle dialog is clicked
    const advanceBattleDialog = () => {
      if (isBattleDialogTyping.value) {
        // Complete the current text immediately
        const typingComponent = battleDialogRef.value;
        if (typingComponent && typingComponent.completeTyping) {
          typingComponent.completeTyping();
        }
        isBattleDialogTyping.value = false;
      } else if (battleDialogQueue.value.length > 0) {
        // Show next message
        showNextBattleDialog();
      } else if (!isPlayerTurn.value && battleDialogText.value) {
        // This is the dialog-complete click after the encounter message
        // Clear the dialog text which will hide the dialog box and immediately start the player's turn
        battleDialogText.value = '';
        if (battleService.value) {
          battleService.value.startPlayerTurn();
        }
      } else {
        // If we were in enemy turn, proceed to player turn
        if (!isPlayerTurn.value) {
          if (battleService.value) {
            battleService.value.startPlayerTurn();
          }
        } else {
          // If it's already player's turn, just clear the dialog to show FAB
          battleDialogText.value = '';
        }
      }
    };
    
    // Load beast by ID
    const loadBeastById = async (beastId: string) => {
      try {
        if (!bestiaryService.value) {
          debug.error('Bestiary service not initialized');
          return;
        }
        
        const enemy = await bestiaryService.value.loadBeastById(beastId);
        if (enemy) {
          // Set current enemy
          currentEnemy.value = enemy;
          updateEnemyHealthColor();
          
          // Start battle after a short delay
          setTimeout(() => {
            initBattle();
          }, 1000);
        }
      } catch (error) {
        debug.error('Error loading beast:', error);
      }
    };
    
    // Load multiple beasts for a battle with multiple enemies
    const loadMultipleBeasts = async (beastIds: string[]) => {
      try {
        if (!bestiaryService.value || !battleService.value) {
          debug.error('Services not initialized');
          return;
        }
        
        const enemies: Enemy[] = [];
        
        // Load each beast
        for (const beastId of beastIds) {
          const enemy = await bestiaryService.value.loadBeastById(beastId);
          if (enemy) {
            enemies.push(enemy);
          }
        }
        
        // If we loaded at least one enemy, initiate battle
        if (enemies.length > 0) {
          // Get user IDs from the battle participants
          const { userIds } = getBattleParticipants();
          
          // Initialize multi battle with enemies and user IDs
          battleService.value.initMultiBattle(enemies, userIds);
          
          // Set the first enemy as the current enemy
          currentEnemy.value = enemies[0];
          updateEnemyHealthColor();
          battleStarted.value = true;
        }
      } catch (error) {
        debug.error('Error loading beasts:', error);
      }
    };
    
    // Load a sample beast
    const loadSampleBeast = async () => {
      try {
        if (!bestiaryService.value) {
          debug.error('Bestiary service not initialized');
          return;
        }
        
        const enemy = await bestiaryService.value.loadRandomBeast();
        if (enemy) {
          currentEnemy.value = enemy;
          updateEnemyHealthColor();
          
          // Apply appear animation
          setTimeout(() => {
            enemyAnimationClass.value = 'appear';
          }, 100);
          
          // Start battle after a short delay
          setTimeout(() => {
            initBattle();
          }, 1000);
        } else {
          // If no beasts are found, create a sample enemy
          createSampleEnemy();
        }
      } catch (error) {
        debug.error('Error loading beasts:', error);
        // Fallback to sample enemy
        createSampleEnemy();
      }
    };
    
    // Create a sample enemy for demonstration
    const createSampleEnemy = () => {
      // Reset any animation classes first
      enemyAnimationClass.value = '';
      
      if (bestiaryService.value) {
        currentEnemy.value = bestiaryService.value.createSampleEnemy();
        updateEnemyHealthColor();
        
        // Add appear animation after a short delay 
        setTimeout(() => {
          enemyAnimationClass.value = 'appear';
        }, 100);
        
        // Start battle after a short delay
        setTimeout(() => {
          initBattle();
        }, 1000);
      } else {
        // Fallback to direct creation
        currentEnemy.value = {
          id: 'sample',
          name: 'Training Dummy',
          type: 'beast',
          isBoss: false,
          health: 500,
          maxHealth: 500,
          attack: 10,
          defense: 5,
          speed: 8,
          emoji: '👾' // Fallback emoji if no image available
        };
        
        updateEnemyHealthColor();
        
        // Add appear animation after a short delay
        setTimeout(() => {
          enemyAnimationClass.value = 'appear';
        }, 100);
        
        // Start battle after a short delay
        setTimeout(() => {
          initBattle();
        }, 1000);
      }
    };
    
    // Initialize the battle
    const initBattle = () => {
      // Make sure the enemy is visible with proper animation
      if (!enemyAnimationClass.value || 
          enemyAnimationClass.value === 'victory-fadeout' || 
          enemyAnimationClass.value === 'victory-strobe') {
        enemyAnimationClass.value = 'appear';
      }
      
      if (battleService.value && currentEnemy.value) {
        battleService.value.initBattle(currentEnemy.value);
        battleStarted.value = true;
      }
    };
    
    // Handle battle actions (attack, defend, etc.)
    const handleBattleAction = (action: { action: string }) => {
      // If no battle started, load a sample beast
      if (!battleStarted.value) {
        loadSampleBeast();
        return;
      }
      
      // Use the battle service to handle the action
      if (battleService.value) {
        // Play appropriate sound effect based on action
        switch(action.action) {
          case 'attack':
          case 'defend':
            playSound("confirm");
            break;
          case 'goods':
          case 'abilities':
            playSound("openPage");
            break;
          case 'run':
            playSound("cancel");
            break;
        }
        
        // Special handling for navigation actions
        if (action.action === 'goods') {
          // Show dialog message
          battleMessage.value = "Opening inventory...";
          
          setTimeout(() => {
            router.push({
              name: "my-inventory",
              params: { userId: props.userId || user.value?.id },
            });
          }, 2000);
          return;
        }
        
        if (action.action === 'abilities') {
          // Show dialog message
          battleMessage.value = "Opening abilities...";
          
          setTimeout(() => {
            router.push({
              name: "my-abilities",
              params: { userId: props.userId || user.value?.id },
            });
          }, 2000);
          return;
        }
        
        // Handle combat actions through battle service
        const result = battleService.value.handleBattleAction(action.action);
        
        // Apply visual effects based on action result
        if (action.action === 'attack' && result.success) {
          enemyAnimationClass.value = 'damaged';
          setTimeout(() => {
            enemyAnimationClass.value = '';
          }, 500);
        }
        
        // Handle running away
        if (action.action === 'run' && result.success) {
          // Fade out enemy
          enemyAnimationClass.value = 'fadeout';
          
          // Return to hometown after a delay
          setTimeout(() => {
            returnToHometown();
          }, 3000);
        }
      }
    };
    
    // Defeat the current enemy and show rewards
    const defeatEnemy = (enemy?: Enemy) => {
      // Use the provided enemy or the current enemy
      const defeatedEnemy = enemy || currentEnemy.value;
      if (!defeatedEnemy) return;
      
      // Store defeated enemy info for rewards modal
      completedTask.value = {
        name: defeatedEnemy.name,
        xpReward: calculateXPReward(),
        gpReward: calculateGPReward(),
        itemReward: Math.random() > 0.7 ? getRandomRewardItem() : null
      };
      
      // Show victory message
      battleMessage.value = `${defeatedEnemy.name} was defeated!`;
      
      // Trigger victory animation
      victoryAnimation();
      
      // Clear current enemy
      currentEnemy.value = null;
      
      // Show rewards modal after a delay
      setTimeout(() => {
        battleMessage.value = '';
        showRewardsModal.value = true;
      }, 3000);
    };
    
    // Calculate XP reward based on enemy difficulty
    const calculateXPReward = () => {
      if (!currentEnemy.value) return 0;
      
      // Base XP on enemy type and health
      let baseXP = currentEnemy.value.maxHealth / 2;
      
      // Bonus for boss types
      if (currentEnemy.value.isBoss) {
        baseXP *= 1.5;
      } else if (currentEnemy.value.type === 'miniboss') {
        baseXP *= 1.25;
      }
      
      // Round to nearest integer
      return Math.round(baseXP);
    };
    
    // Calculate GP reward based on enemy difficulty
    const calculateGPReward = () => {
      if (!currentEnemy.value) return 0;
      
      // Base GP on enemy type and health
      let baseGP = currentEnemy.value.maxHealth / 4;
      
      // Bonus for boss types
      if (currentEnemy.value.isBoss) {
        baseGP *= 1.5;
      } else if (currentEnemy.value.type === 'miniboss') {
        baseGP *= 1.25;
      }
      
      // Round to nearest integer
      return Math.round(baseGP);
    };
    
    // Get random reward item name
    const getRandomRewardItem = () => {
      const items = [
        'Small Health Potion', 
        'Magic Dust', 
        'Beast Fang', 
        'Copper Coin', 
        'Leather Scraps',
        'Shiny Pebble'
      ];
      return items[Math.floor(Math.random() * items.length)];
    };
    
    // Close rewards modal
    const closeRewardsModal = () => {
      showRewardsModal.value = false;
      completedTask.value = null;
      
      // Return to hometown
      setTimeout(() => {
        returnToHometown();
      }, 500);
    };
    
    // Return to hometown
    const returnToHometown = () => {
      const userId = props.userId || user.value?.id;
      if (userId) {
        router.push({
          name: "hometown",
          params: { userId },
        });
      }
    };
    
    // Victory animation that coordinates with background manager
    const victoryAnimation = () => {
      // Apply victory strobe effect to the enemy sprite
      enemyAnimationClass.value = 'victory-strobe';
      
      // Play victory sound
      playSound("confirm");
      
      // Start the aspect ratio animation after a short delay for the strobe effect
      setTimeout(() => {
        // Use the smooth aspect ratio animation - first collapse to 0 height
        backgroundManager.animateAspectRatio(0, 750)
          .then(() => {
            // Change enemy animation to fadeout when aspect ratio animation completes
            enemyAnimationClass.value = 'victory-fadeout';
            
            // Set victory message flag for styling
            isVictoryMessage.value = true;
            
            // Queue victory dialog messages
            queueBattleDialog([
              'You Won!', 
              `${currentEnemy.value?.name || 'Enemy'} was defeated!`,
              `You gained ${calculateXPReward()} XP!`,
              `You earned ${calculateGPReward()} GP!`
            ]);
          })
          .catch(error => {
            debug.error("Error during victory animation:", error);
            // Fallback in case of error
            battleMessage.value = `Victory! ${currentEnemy.value?.name || 'Enemy'} was defeated!`;
          });
      }, 1000);
    };
    
    // Get beast avatar image
    const getAvatar = (id?: number) => {
      if (!id && currentEnemy.value?.avatar) {
        id = currentEnemy.value.avatar;
      }
      
      if (id && bestiaryService.value) {
        return bestiaryService.value.getAvatar(id);
      }
      
      // Fallback to default avatar if no ID provided or service not available
      return require('@/assets/images/beasts/001.png');
    };
    
    // UI interaction methods
    const clickUserChip = async (userData: any) => {
      const modal = await modalController.create({
        component: CardUserStats,
        initialBreakpoint: 0.55,
        componentProps: { userId: userData.id },
      });
      await modal.present();
    };
    
    const getUserAvatar = (userData: any) => {
      const avatar = `./${userData.avatar}.svg`;
      return requireAvatar(avatar);
    };
    
    const openToast = async () => {
      const toast = await toastController.create({
        message: `${user.value?.name?.nick || 'Player'} has entered the battle!`,
        cssClass: $fx?.theme?.rpg || '',
        position: "top",
        duration: 2800,
      });
      return toast.present();
    };

    // Get icon for battle actions
    const getBattleActionIcon = (label: string) => {
      switch(label.toLowerCase()) {
        case 'roll': return diceOutline;
        case 'attack': return 'sword-outline';
        case 'goods': return bagOutline;
        case 'abilities': return colorWandOutline;
        case 'defend': return 'shield-outline';
        case 'run away': return 'walk-outline';
        default: return 'help-outline';
      }
    };

    // Get color for battle actions
    const getBattleActionColor = (label: string) => {
      switch(label.toLowerCase()) {
        case 'roll': return 'primary';
        case 'goods': return 'success';
        case 'abilities': return 'tertiary';
        case 'defend': return 'warning';
        case 'run away': return 'danger';
        default: return 'medium';
      }
    };
    
    // Dev mode battle service methods
    const devDamageEnemy = (damage: number) => {
      if (props.devMode && battleService.value) {
        battleService.value.devDamageEnemy(damage);
        enemyAnimationClass.value = 'damaged';
        setTimeout(() => {
          enemyAnimationClass.value = '';
        }, 500);
      }
    };
    
    const devHealEnemy = (healing: number) => {
      if (props.devMode && battleService.value) {
        battleService.value.devHealEnemy(healing);
      }
    };
    
    const devSkipTurn = () => {
      if (props.devMode && battleService.value) {
        battleService.value.devSkipTurn();
      }
    };
    
    // Watch for route params changes to update battle participants
    watch(
      () => route.params,
      () => {
        const { beastIds } = getBattleParticipants();
        
        // If beast IDs are provided, load them
        if (beastIds.length > 0) {
          if (beastIds.length === 1) {
            loadBeastById(beastIds[0]);
          } else {
            loadMultipleBeasts(beastIds);
          }
        }
      },
      { immediate: false }
    );
    
    // Lifecycle hooks
    onMounted(() => {
      // Initialize battle services
      initServices();
      
      // Set up background
      changeBg();
      enterBattle();
      
      // Show welcome toast
      openToast();
      
      // Get battle participants from URL params
      const { beastIds } = getBattleParticipants();
      
      // Load a beast based on props, URL params, or use a sample beast
      if (props.beastAvatar) {
        // If we have a beast avatar from props, use it
        const enemy: Enemy = {
          id: 'custom',
          name: props.enemyType === 'boss' ? 'Boss Monster' :
                props.enemyType === 'miniboss' ? 'Mini Boss' : 'Monster',
          type: props.enemyType,
          health: props.enemyType === 'boss' ? 500 : 
                 props.enemyType === 'miniboss' ? 300 : 150,
          maxHealth: props.enemyType === 'boss' ? 500 : 
                    props.enemyType === 'miniboss' ? 300 : 150,
          avatar: props.beastAvatar,
          attack: props.enemyType === 'boss' ? 25 : 
                 props.enemyType === 'miniboss' ? 15 : 10,
          defense: props.enemyType === 'boss' ? 15 :
                  props.enemyType === 'miniboss' ? 10 : 5,
          speed: props.enemyType === 'boss' ? 5 :
                 props.enemyType === 'miniboss' ? 8 : 10,
          isBoss: props.enemyType === 'boss'
        };
        
        currentEnemy.value = enemy;
        updateEnemyHealthColor();
        
        // Initialize the battle after a short delay
        setTimeout(() => {
          initBattle();
        }, 1000);
      } else if (beastIds.length > 0) {
        // If we have beast IDs from parameters, load them
        if (beastIds.length === 1) {
          loadBeastById(beastIds[0]);
        } else {
          loadMultipleBeasts(beastIds);
        }
      } else {
        // Load a sample beast
        setTimeout(() => {
          loadSampleBeast();
        }, 1000);
      }
      
      // Debug message if in dev mode
      if (props.devMode) {
        debug.log('BattleField component initialized in dev mode');
      }
    });
    
    onUnmounted(() => {
      backgroundManager.cleanupBackground();
    });
    
    return {
      // State refs
      page,
      battleBackground,
      battleDialogText,
      battleStarted,
      isPlayerTurn,
      currentEnemy,
      enemyAnimationClass,
      enemyHealthColor,
      battleMessage,
      showRewardsModal,
      completedTask,
      bg1,
      bg2,
      user,
      hasMoreBattleDialog,
      isBattleDialogTyping,
      isVictoryMessage,
      battleDialogRef,
      
      // Methods for battle dialog
      queueBattleDialog,
      showNextBattleDialog,
      onBattleDialogComplete,
      advanceBattleDialog,
      
      // Methods for battle mechanics
      changeBg,
      enterBattle,
      loadBeastById,
      loadSampleBeast,
      createSampleEnemy,
      initBattle,
      handleBattleAction,
      victoryAnimation,
      closeRewardsModal,
      
      // UI Helper methods
      clickUserChip,
      getUserAvatar,
      openToast,
      getBattleActionIcon,
      getBattleActionColor,
      
      // Helper for avatars
      getAvatar,
      
      // Dev mode methods
      devDamageEnemy,
      devHealEnemy,
      devSkipTurn,
      
      // Icons
      closeCircle,
      medalOutline,
      cashOutline,
      giftOutline,
      diceOutline,
      colorWandOutline,
      bagOutline,
      fitnessOutline,
      sparklesOutline,
      serverOutline,
      settings,
      refresh,
      flame,
      medkit,
      time
    };
  }
});