import { defineComponent } from "vue";
import { mapState } from "vuex";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
import backgrounds from "@/assets/images/backgrounds/parallax/index";
import CardUserStats from "@/components/CardUserStats/CardUserStats.vue";
import fetchItems from "@/mixins/fetchItems";
import ionic from "@/mixins/ionic";
import MyTask from "@/views/Console/MyDialogBox/MyTask/MyTask.vue";
// import requireImg from "@/assets/js/requireImg.js";
import users from "@/lib/api/users.api";
import userActions from "@/mixins/userActions";
import XpFabBattleActions from "@/views/Console/MyPortal/components/XpFabBattleActions.vue";
import XpTypingText from "@/components/XpTypingText/XpTypingText.vue";
// Import the new battle services
import { createBattleService, createBestiaryService, BattleService, BestiaryService, Enemy, CompletedTask } from '@/lib/services/battle';

// Define a unique ID for this page for background management
const PAGE_ID = 'battle-ground';

import { toastController, modalController } from "@ionic/vue";
import {
  today,
  calendarNumber,
  calendar,
  hourglass,
  calendarClear,
  time,
  heart,
  colorWand,
  card,
  server,
  sparkles,
  medal,
  // Removing unused icons to fix ESLint errors
  // personCircle,
  // camera,
  // bookmark,
  diceOutline,
  colorWandOutline,
  medalOutline,
  bagOutline,
  // accessibilityOutline,
  // chevronBack,
  fitnessOutline,
  sparklesOutline,
  // infinite,
  // happyOutline,
  serverOutline,
  // arrowBack,
  cashOutline,
  giftOutline
} from "ionicons/icons";

import { Swiper, SwiperSlide } from "swiper/vue";
import "swiper/css";
import XpHpMpHud from "@/components/XpHpMpHud/XpHpMpHud.vue";

const requireAvatar = require.context("@/assets/images/avatars/");

export default defineComponent({
  name: "battle-ground",
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
    }
  },
  mixins: [fetchItems, ionic, userActions],
  components: {
    CardUserStats,
    MyTask,
    Swiper,
    SwiperSlide,
    XpHpMpHud,
    XpFabBattleActions,
    XpTypingText,

  },
  data() {
    return {
      // Battle service instances
      battleService: null as BattleService | null,
      bestiaryService: null as BestiaryService | null,
      
      currentBg: 0,
      backgrounds,
      bg1: 1,
      bg2: 1,
      
      // Current enemy data with custom background and beast image support
      currentEnemy: null as Enemy | null,
      enemyAnimationClass: '',
      enemyHealthColor: '#2dd36f',
      
      // Battle message variables
      battleMessage: '',
      showRewardsModal: false,
      completedTask: null as CompletedTask | null,
      aspectRatio: 48, // Default aspect ratio for battle backgrounds
      
      // Battle dialog system variables
      battleDialogText: '',
      battleDialogQueue: [] as Array<string | (() => void)>, // Properly typed to allow both strings and callback functions
      hasMoreBattleDialog: false,
      isBattleDialogTyping: false,
      isVictoryMessage: false, // Flag to apply special styling to victory messages
      
      // Battle turn system variables
      battleStarted: false,
      isPlayerTurn: true,
      turnCounter: 0,
      
      // Battle defense mechanic
      isDefending: false,
      defenseMultiplier: 0.5, // Reduces damage by 50% when defending
      
      areas: {
        physical: {
          open: true,
          color: "danger",
          icon: fitnessOutline,
          stats: {
            strength: "Use less HP when completing a task",
            defense: "Influences max HP",
            endurance: "Influences HP restore rate",
          },
        },
        mental: {
          open: false,
          color: "tertiary",
          icon: colorWand,
          stats: {
            intelligence: "Use less MP when casting abilities",
            perception: "Influences max MP",
            wisdom: "Influences MP restore rate",
          },
        },
        social: {
          color: "warning",
          icon: serverOutline,
          stats: {
            charisma: "Gain more GP when completing tasks",
            charm: "Influences GP discounts on items",
            presence: "Influences GP to $ conversion rate",
          },
        },
        misc: {
          color: "success",
          icon: sparklesOutline,
          stats: {
            agility: "Gain more AP when completing tasks",
            guts: "Gain more XP when completing tasks",
            luck: "Influence chances of receiving bonus points",
          },
        },
      },
      users,
      isUserModalOpen: false,
      initialBreakpoint: 0.1,
      activeModal: 0,
      toggleBGDirection: false,
      icons: {
        medal,
        server,
        sparkles,
        card,
        today,
        calendar,
        calendarNumber,
        hourglass,
        calendarClear,
        time,
        heart,
        colorWand,
      },
      medalOutline,
      cashOutline,
      giftOutline,
      dashboardItems: {
        achievements: {},
        abilities: {},
        accessories: {},
        badges: {},
        gold: {},
        alerts: {},
      },
    };
  },
  computed: {
    ...mapState(["xp_achievement"]),
  },
  methods: {
    // Get beast avatar image from the beast ID - using bestiary service
    getAvatar(id: number) {
      if (this.bestiaryService) {
        return this.bestiaryService.getAvatar(id);
      }
      
      // Fallback to original implementation if service not available
      const pad = id.toString().padStart(3, '0');
      return require(`@/assets/images/beasts/${pad}.png`);
    },
    
    // Load beast by ID from the bestiary using the bestiary service
    async loadBeastById(beastId: string) {
      try {
        if (!this.bestiaryService) {
          console.error('Bestiary service not initialized');
          return;
        }
        
        const enemy = await this.bestiaryService.loadBeastById(beastId);
        if (enemy) {
          // Set current enemy
          this.currentEnemy = enemy;
          this.updateEnemyHealthColor();
          
          // Start battle after a short delay
          setTimeout(() => {
            this.initBattle();
          }, 1000);
        }
      } catch (error) {
        console.error('Error loading beast:', error);
      }
    },
    
    // Update enemy health bar color based on remaining health
    updateEnemyHealthColor() {
      if (this.battleService) {
        // Use the battle service for health color
        this.enemyHealthColor = this.battleService.getEnemyHealthColor();
      } else if (this.currentEnemy) {
        // Fallback to original implementation
        const healthPercentage = this.currentEnemy.health / this.currentEnemy.maxHealth;
        
        if (healthPercentage > 0.6) {
          this.enemyHealthColor = '#2dd36f'; // green
        } else if (healthPercentage > 0.3) {
          this.enemyHealthColor = '#ffc409'; // yellow
        } else {
          this.enemyHealthColor = '#eb445a'; // red
        }
      }
    },

    onSwiper() {
      // this.swiper = swiper;
    },
    
    // Updated to use battle service
    handleBattleAction({ action }) {
      // If no enemy is present or battle hasn't started, load a sample beast
      if (!this.battleStarted) {
        this.loadSampleBeast();
        return;
      }
      
      // Use the battle service to handle the action if available
      if (this.battleService) {
        // Play appropriate sound effect based on action
        switch(action) {
          case 'attack':
          case 'defend':
            this.$fx.ui[this.$fx.theme.ui].confirm.play();
            break;
          case 'goods':
          case 'abilities':
            this.$fx.ui[this.$fx.theme.ui].openPage.play();
            break;
          case 'run':
            this.$fx.ui[this.$fx.theme.ui].cancel.play();
            break;
        }
        
        // Special handling for navigation actions that should bypass battle service
        if (action === 'goods') {
          this.queueBattleDialog([
            `${this.user?.name?.nick || 'Player'} checks their inventory.`,
            "Opening inventory..."
          ]);
          
          setTimeout(() => {
            this.$router.push({
              name: "my-inventory",
              params: { userId: this.userId },
            });
          }, 2000);
          return;
        }
        
        if (action === 'abilities') {
          this.queueBattleDialog([
            `${this.user?.name?.nick || 'Player'} prepares to use an ability.`,
            "Opening abilities..."
          ]);
          
          setTimeout(() => {
            this.$router.push({
              name: "my-abilities",
              params: { userId: this.userId },
            });
          }, 2000);
          return;
        }
        
        // Handle the action through the battle service for combat actions
        const result = this.battleService.handleBattleAction(action);
        
        // Handle run action success separately since it requires navigation
        if (action === 'run' && result.success) {
          // Fade out enemy
          this.enemyAnimationClass = 'fadeout';
          
          // Return to hometown after a delay
          setTimeout(() => {
            this.$router.push({
              name: "hometown",
              params: { userId: this.userId },
            });
          }, 3000);
        }
        
        // Apply attack animation for attack action
        if (action === 'attack' && result.success) {
          this.enemyAnimationClass = 'damaged';
          setTimeout(() => {
            this.enemyAnimationClass = '';
          }, 500);
        }
      } else {
        // Fallback to original implementation if service not available
        console.warn('Battle service not initialized, using legacy battle handler');
        this.handleBattleActionLegacy(action);
      }
    },
    
    // Legacy battle action handler (fallback if service not available)
    handleBattleActionLegacy(action) {
      // Original battle action handling code...
      console.warn(`Using legacy battle handling for action: ${action}`);
      
      // Only process actions if it's the player's turn
      if (!this.isPlayerTurn) {
        this.queueBattleDialog(["It's not your turn yet!"]);
        return;
      }

      // Use switch statement from original implementation
      switch(action) {
        case 'attack':
          // Handle attack (legacy code)
          break;
        case 'defend':
          // Handle defend (legacy code)
          this.$fx.ui[this.$fx.theme.ui].confirm.play();
          this.queueBattleDialog([
            `${this.user?.name?.nick || 'Player'} takes a defensive stance!`,
            "Defense increased for this turn."
          ]);
          
          this.isDefending = true;
          this.battleMessage = "DEFENSE UP!";
          setTimeout(() => {
            if (this.battleMessage === "DEFENSE UP!") {
              this.battleMessage = "";
            }
          }, 2000);
          
          this.endPlayerTurn();
          break;
        default:
          console.warn(`Unhandled battle action in legacy mode: ${action}`);
      }
    },
    
    // Defeat current enemy and show rewards - updated to work with battle service
    defeatEnemy(enemy?: Enemy) {
      // Use the provided enemy or the current enemy from the component
      const defeatedEnemy = enemy || this.currentEnemy;
      if (!defeatedEnemy) return;
      
      // Store defeated enemy info for rewards modal
      this.completedTask = {
        name: defeatedEnemy.name,
        xpReward: Math.floor(50 + Math.random() * 100),
        gpReward: Math.floor(10 + Math.random() * 50),
        itemReward: Math.random() > 0.7 ? this.getRandomRewardItem() : null
      };
      
      // Show victory message
      this.battleMessage = `${defeatedEnemy.name} was defeated!`;
      
      this.victoryAnimation()
      
      // Clear current enemy
      this.currentEnemy = null;
      
      // Show rewards modal after a delay
      setTimeout(() => {
        this.battleMessage = '';
        this.showRewardsModal = true;
      }, 2500);
    },
    
    // Get random reward item name
    getRandomRewardItem() {
      const items = [
        'Small Health Potion', 
        'Magic Dust', 
        'Beast Fang', 
        'Copper Coin', 
        'Leather Scraps',
        'Shiny Pebble'
      ];
      return items[Math.floor(Math.random() * items.length)];
    },
    
    // Close rewards modal
    closeRewardsModal() {
      this.showRewardsModal = false;
      this.completedTask = null;
    },
    
    // Load a sample beast using bestiary service
    async loadSampleBeast() {
      try {
        if (!this.bestiaryService) {
          console.error('Bestiary service not initialized');
          return;
        }
        
        // Try to load a random beast from the bestiary
        const enemy = await this.bestiaryService.loadRandomBeast();
        
        if (enemy) {
          // Set current enemy
          this.currentEnemy = enemy;
          this.updateEnemyHealthColor();
          
          // Start battle after a short delay
          setTimeout(() => {
            this.initBattle();
          }, 1000);
        } else {
          // If no beasts are found, create a sample enemy
          this.createSampleEnemy();
        }
      } catch (error) {
        console.error('Error loading beasts:', error);
        // Fallback to sample enemy
        this.createSampleEnemy();
      }
    },
    
    // Create a sample enemy for demonstration using bestiary service
    createSampleEnemy() {
      // Reset any animation classes first
      this.enemyAnimationClass = '';
      
      if (this.bestiaryService) {
        this.currentEnemy = this.bestiaryService.createSampleEnemy();
        this.updateEnemyHealthColor();
        
        // Add appear animation after a short delay to ensure DOM is updated
        setTimeout(() => {
          this.enemyAnimationClass = 'appear';
        }, 100);
        
        // Start battle after a short delay
        setTimeout(() => {
          this.initBattle();
        }, 1000);
      } else {
        // Fallback to original implementation
        this.currentEnemy = {
          id: 'sample',
          name: 'Training Dummy',
          type: 'beast',
          isBoss: false,
          health: 500,
          maxHealth: 500,
          emoji: '👾' // Fallback emoji if no image available
        };
        
        this.updateEnemyHealthColor();
        
        // Add appear animation after a short delay
        setTimeout(() => {
          this.enemyAnimationClass = 'appear';
        }, 100);
        
        // Start battle after a short delay
        setTimeout(() => {
          this.initBattle();
        }, 1000);
      }
    },
    
    getBattleActionIcon(label) {
      switch(label.toLowerCase()) {
        case 'roll': return diceOutline;
        case 'attack': return 'sword-outline';
        case 'goods': return bagOutline;
        case 'abilities': return colorWandOutline;
        case 'defend': return 'shield-outline';
        case 'run away': return 'walk-outline';
        default: return 'help-outline';
      }
    },
    getBattleActionColor(label) {
      switch(label.toLowerCase()) {
        case 'roll': return 'primary';
        case 'goods': return 'success';
        case 'abilities': return 'tertiary';
        case 'defend': return 'warning';
        case 'run away': return 'danger';
        default: return 'medium';
      }
    },
    handleSlideTo() {
      // this.swiper.slideTo(1);
    },
    clickStats() {
      // this.swiper.slideTo(1);
    },
    closeModal() {
      modalController.dismiss();
    },
    // ... existing methods ...
    
    // Battle dialog and turn management methods adapted to use battle service
    initBattle() {
      // Make sure the enemy is visible and properly animated when initializing a battle
      if (!this.enemyAnimationClass || this.enemyAnimationClass === 'victory-fadeout' || this.enemyAnimationClass === 'victory-strobe') {
        this.enemyAnimationClass = 'appear';
      }
      
      if (this.battleService && this.currentEnemy) {
        // Initialize battle through the battle service
        this.battleService.initBattle(this.currentEnemy);
      } else {
        // Fallback to original implementation
        this.battleStarted = true;
        this.isPlayerTurn = false; // Will be set to true after dialog completes
        this.turnCounter = 1;
        
        // Queue encounter message using the requested format
        if (this.currentEnemy) {
          const playerName = this.user?.name?.nick || 'Player';
          this.queueBattleDialog([
            `${playerName} encountered ${this.currentEnemy.name}!`
          ]);
        } else {
          this.queueBattleDialog([
            "You entered a battle area...",
            "But there's no enemy yet..."
          ]);
        }
      }
    },
    
    // Queue multiple dialog messages - now called by battle service too
    queueBattleDialog(messages) {
      // Add messages to the queue
      this.battleDialogQueue = [...this.battleDialogQueue, ...messages];
      
      // If no dialog is currently displaying, show the first message
      if (!this.isBattleDialogTyping && this.battleDialogText === '') {
        this.showNextBattleDialog();
      }
    },
    
    // Show the next dialog message from the queue
    showNextBattleDialog() {
      if (this.battleDialogQueue.length === 0) {
        // No more messages to show
        this.battleDialogText = '';
        this.hasMoreBattleDialog = false;
        
        // If we were in an enemy turn, proceed to player turn
        if (!this.isPlayerTurn && this.battleService) {
          this.battleService.startPlayerTurn();
        } else if (!this.isPlayerTurn) {
          this.startPlayerTurn();
        }
        return;
      }
      
      // Get the next message or function from the queue
      const next = this.battleDialogQueue.shift();
      
      // Check if it's a function and execute it
      if (typeof next === 'function') {
        next();
        // Process the next item in the queue
        this.showNextBattleDialog();
        return;
      }
      
      // It's a string message, so display it
      this.battleDialogText = next || '';
      this.isBattleDialogTyping = true;
      this.hasMoreBattleDialog = this.battleDialogQueue.length > 0;
      
      // Play typing sound
      this.play$fx("text");
    },
    
    // Called when a battle dialog text finishes typing
    onBattleDialogComplete() {
      this.isBattleDialogTyping = false;
      
      // Add a short pause before showing the next message
      setTimeout(() => {
        // If there are more messages, show the next one
        if (this.battleDialogQueue.length > 0) {
          this.showNextBattleDialog();
        } else {
          this.hasMoreBattleDialog = false;
          // If this was enemy dialog, proceed to player turn after a delay
          if (!this.isPlayerTurn) {
            setTimeout(() => {
              if (this.battleService) {
                // Use battle service to start player turn
                this.battleService.startPlayerTurn();
              } else {
                // Fallback to original implementation
                this.startPlayerTurn();
              }
            }, 1000);
          }
        }
      }, 1500);
    },
    
    // Called when the battle dialog is clicked
    advanceBattleDialog() {
      if (this.isBattleDialogTyping) {
        // Complete the current text immediately
        const typingComponent = this.$refs.battleDialogText as any;
        if (typingComponent && typingComponent.completeTyping) {
          typingComponent.completeTyping();
        }
        this.isBattleDialogTyping = false;
      } else if (this.battleDialogQueue.length > 0) {
        // Show next message
        this.showNextBattleDialog();
      } else if (!this.isPlayerTurn && this.battleDialogText) {
        // This is the dialog-complete click after the encounter message
        // Clear the dialog text which will hide the dialog box and immediately start the player's turn
        this.battleDialogText = '';
        if (this.battleService) {
          this.battleService.startPlayerTurn();
        } else {
          this.startPlayerTurn();
        }
      } else {
        // If we were in enemy turn, proceed to player turn
        if (!this.isPlayerTurn) {
          if (this.battleService) {
            this.battleService.startPlayerTurn();
          } else {
            this.startPlayerTurn();
          }
        } else {
          // If it's already player's turn, just clear the dialog to show FAB
          this.battleDialogText = '';
        }
      }
    },
    
    // Start player's turn - fallback method if battle service is not available
    startPlayerTurn() {
      // Set the player turn flag first to ensure FAB is visible
      this.isPlayerTurn = true;
      
      // For the very first turn, just clear dialog and don't show any message
      if (this.turnCounter === 1) {
        this.battleDialogText = '';
        return;
      }
      
      // For subsequent turns, show the turn announcements
      this.queueBattleDialog([
        `Turn ${this.turnCounter} - ${this.user?.name?.nick || 'Player'}'s turn!`,
        "What will you do?"
      ]);
    },
    
    // End player's turn and start enemy's turn - fallback method if battle service is not available
    endPlayerTurn() {
      // Use battle service if available
      if (this.battleService) {
        this.battleService.endPlayerTurn();
        return;
      }
      
      // Fallback to original implementation
      this.isPlayerTurn = false;
      this.battleMessage = '';
      
      setTimeout(() => {
        if (this.currentEnemy) {
          this.performEnemyTurn();
        } else {
          // If no enemy, just go back to player turn
          this.turnCounter++;
          this.startPlayerTurn();
        }
      }, 1000);
    },
    
    // Enemy AI turn logic - fallback method if battle service is not available
    performEnemyTurn() {
      // This method is only used as a fallback if battle service is not available
      if (!this.currentEnemy) return;
      
      // Queue enemy turn messages
      this.queueBattleDialog([
        `${this.currentEnemy.name}'s turn!`
      ]);
      
      // Pick a random enemy action
      const actions = ['attack', 'defend', 'special'];
      const enemyAction = actions[Math.floor(Math.random() * actions.length)];
      
      // Variables for damage calculation moved outside case blocks
      const userLevel = this.user?.stats?.level || 1;
      const baseDamage = 5 + Math.floor(Math.random() * 10);
      const damageTaken = Math.max(1, Math.floor(baseDamage * (1 + userLevel / 10)));
      const currentHP = this.user?.stats?.hp || 100;
      
      switch (enemyAction) {
        case 'attack':
          // Enemy attacks
          this.queueBattleDialog([
            `${this.currentEnemy.name} attacks!`,
          ]);
          
          // Apply damage after a delay
          setTimeout(() => {
            // Calculate base damage
            let finalDamage = damageTaken;
            
            // Apply defense reduction if player is defending
            if (this.isDefending) {
              // Apply defense multiplier (reducing damage by 50%)
              finalDamage = Math.floor(finalDamage * this.defenseMultiplier);
              
              // Show defense message
              this.queueBattleDialog([
                `${this.user?.name?.nick || 'Player'}'s defense reduces the damage!`,
              ]);
            }
            
            // Reduce player HP (in a real game, this would dispatch to the store)
            const newHP = Math.max(0, currentHP - finalDamage);
            
            // Show damage message
            this.queueBattleDialog([
              `${this.user?.name?.nick || 'Player'} takes ${finalDamage} damage!`
            ]);
            
            // Check if player is defeated
            if (newHP <= 0) {
              this.queueBattleDialog([
                `${this.user?.name?.nick || 'Player'} is defeated!`,
                "Game Over"
              ]);
              
              // Handle game over after dialog completes
              setTimeout(() => {
                this.$router.push({
                  name: "hometown",
                  params: { userId: this.userId },
                });
              }, 5000);
            } else {
              // Reset defending flag at end of enemy turn
              this.isDefending = false;
              
              // Proceed to next turn
              this.turnCounter++;
              // Next turn will start after dialog completes
            }
          }, 1000);
          break;
          
        case 'defend':
          // Enemy defends
          this.queueBattleDialog([
            `${this.currentEnemy.name} takes a defensive stance!`
          ]);
          
          // Proceed to next turn after a delay
          setTimeout(() => {
            this.turnCounter++;
            // Next turn will start after dialog completes
          }, 1000);
          break;
          
        case 'special':
          // Enemy uses special ability
          this.queueBattleDialog([
            `${this.currentEnemy.name} is charging power!`,
            "It seems to be preparing for something..."
          ]);
          
          // Proceed to next turn after a delay
          setTimeout(() => {
            this.turnCounter++;
            // Next turn will start after dialog completes
          }, 1000);
          break;
      }
    },
    
    setBGStyle(key: string, value: string) {
      // Add safety check to prevent errors when this.$refs.page is undefined
      const pageRef = this.$refs.page as { $el?: { style: Record<string, string> } } | undefined;
      if (pageRef && pageRef.$el) {
        pageRef.$el.style[key] = value;
      } else {
        // Fall back to using document.body when in development environment
        const element = document.querySelector('.battle-bg') as HTMLElement;
        if (element) {
          element.style[key as any] = value;
        }
      }
    },
    
    changeBg() {
      if (this.$fx.theme.rpg == "earthbound") {
        this.enterBattle();
        return false;
      }
      
      // Check if we're even able to set bg styles
      if (!this.$refs.page && !document.querySelector('.battle-bg')) {
        console.warn('No suitable element found to set background styles');
        this.enterBattle(); // Just try to enter battle directly
        return;
      }
      
      const { setBGStyle, backgrounds } = this;
      this.currentBg = Math.floor(Math.random() * 10);
      const values = Object.values(backgrounds);
      let prop = {};
      while (!prop) {
        const rand = Math.floor(Math.random() * values.length);
        prop = prop == this.currentBg ? {} : values[rand] || {};
      }
      setBGStyle("backdropFilter", "blur(5px)");
      setBGStyle(
        "background", 
        `linear-gradient(0deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${prop})`
      );
      setBGStyle("backgroundSize", "cover");
      this.toggleBGDirection = !this.toggleBGDirection;

      if (this.toggleBGDirection)
        setBGStyle("backgroundPosition", "0 100%, 0 100%");
      else
        setBGStyle("backgroundPosition", "0 0%, 0 0%");

      setTimeout(() => setBGStyle("backdropFilter", "blur(0px)"), 3000);
    },
    
    enterBattle() {
      // Clean up previous background if active
      if (backgroundManager.isActiveFor(PAGE_ID)) {
        backgroundManager.cleanupBackground();
      }

      // Get the canvas element using the ref
      const canvasElement = this.$refs.battleBackground as HTMLCanvasElement;
      
      if (!canvasElement) {
        // Try with querySelector as fallback
        const canvasSelector = "canvas.battle-bg";
        
        backgroundManager.initBackground({
          canvasSelector,
          bg1: this.bg1,
          bg2: this.bg2,
          aspectRatio: 48, // More common aspect ratio value
          handleResize: true,
          page: PAGE_ID
        });
      } else {
        // Use the direct canvas element reference
        backgroundManager.initBackground({
          canvasElement,
          bg1: this.bg1,
          bg2: this.bg2, 
          aspectRatio: 48, // More common aspect ratio value
          handleResize: true,
          page: PAGE_ID
        });
      }
      
      return true;
    },
    
    clickTask(task) {
      this.activeModal = task.id;
    },
    
    clickUserChip(user) {
      this.isUserModalOpen = user.id;
      this.initialBreakpoint = 0.55;
    },
    
    didDismissUserModal() {
      this.isUserModalOpen = false;
    },
    
    willPresent() {
      this.$fx.ui[this.$fx.theme.ui].chooseUser.currentTime = 1.25;
      this.$fx.ui[this.$fx.theme.ui].chooseUser.play();
    },
    
    getUserAvatar(user) {
      const avatar = `./${user.avatar}.svg`;
      return requireAvatar(avatar);
    },
    
    segmentChanged() {
      // console.log("Segment changed", ev);
    },

    async openToast() {
      const { user } = this;

      const toast = await toastController.create({
        message: `${user?.name?.nick} has entered the battle!`,
        cssClass: this.$fx.theme.rpg,
        position: "top",
        duration: 2800,
      });
      const numAchievements = Object.keys(this.xp_achievement).length;
      // alert(numAchievements)
      if (numAchievements == 0) setTimeout(this.openToastOptions, 3200);
      return toast.present();
    },
    
    async openToastOptions() {
      const toast = await toastController.create({
        header: "It's pretty quiet",
        cssClass: this.$fx.theme.rpg,
        message: "You should search for some quests!",
        // icon: alienMonster,
        position: "top",
        buttons: [
          {
            // icon: alienMonster,
            text: "Load Quests",
            // color: "light",
            cssClass: this.$fx.theme.rpg,
            handler: () => {
              this.request.type = "xp_achievement";
              this.getItems();
            },
          },
        ],
      });
      await toast.present();
    },
    
    async openMagicToast(magic) {
      const { nick } = this.user.name;
      const toast = await toastController.create({
        header: `${nick} Casts ${magic}...`,
        message: `becomes slower`,
        cssClass: this.$fx.theme.rpg,
        position: "top",
        duration: 3200,
      });
      return toast.present();
    },

    async openTaskToast(task) {
      const { nick } = this.user.name;
      if (task) {
        const toast = await toastController.create({
          header: `${nick} looks at ${task.title.rendered}...`,
          message: `...hmm, what now?`,
          cssClass: this.$fx.theme.rpg,
          position: "top",
          duration: 3200,
        });
        return toast.present();
      }
    },
    
    getImgObj(media_id) {
      if (media_id) {
        return {
          src: `//${window.location.host}/temp/placeholder.png`
        }
      }
      
      return {
        src: `//${window.location.host}/temp/placeholder.png`
      };
    },
    
    // Initialize battle services
    initBattleServices() {
      // Create the battle service instances
      this.battleService = createBattleService(this.$store);
      this.bestiaryService = createBestiaryService();
      
      // Register callbacks for the battle service
      if (this.battleService) {
        this.battleService.registerCallbacks({
          onDialogMessage: this.queueBattleDialog,
          onBattleMessageChange: (message) => { 
            this.battleMessage = message;
          },
          onEnemyHealthChange: () => {
            if (this.currentEnemy && this.battleService) {
              this.enemyHealthColor = this.battleService.getEnemyHealthColor();
            }
          },
          onDefendStateChange: (isDefending) => {
            this.isDefending = isDefending;
          },
          onPlayerTurnChange: (isPlayerTurn) => {
            this.isPlayerTurn = isPlayerTurn;
          },
          onEnemyDefeated: this.defeatEnemy
        });
      }
    },
    
    // Animation methods for battle effects - used by both the game and dev tools
    
    /**
     * Trigger player attack animation
     * This applies an attack animation to the player and triggers
     * a hit effect on the enemy
     */
    playerAttack() {
      // Use battle service if available
      if (this.battleService) {
        this.battleService.handleBattleAction("attack");
      } else {
        // Fallback to basic animation
        // Apply attack animation class to enemy
        this.enemyAnimationClass = 'damaged';
        setTimeout(() => {
          this.enemyAnimationClass = '';
        }, 500);
      }
    },
    
    /**
     * Apply hit animation to enemy
     * Visual effect when enemy takes damage
     */
    enemyHit(damage?: number) {
      // Apply damage class for animation
      this.enemyAnimationClass = 'damaged';
      
      // Remove the class after animation completes
      setTimeout(() => {
        this.enemyAnimationClass = '';
      }, 500);
      
      // Apply damage if specified and we have an enemy
      if (typeof damage === 'number' && this.currentEnemy) {
        const actualDamage = Math.min(damage, this.currentEnemy.health);
        this.currentEnemy.health = Math.max(0, this.currentEnemy.health - actualDamage);
        
        // Update health bar color
        this.updateEnemyHealthColor();
        
        // Show damage message
        this.battleMessage = `${this.currentEnemy.name} takes ${actualDamage} damage!`;
        setTimeout(() => {
          if (this.battleMessage.includes('takes')) {
            this.battleMessage = '';
          }
        }, 1500);
        
        // Check if enemy defeated
        if (this.currentEnemy.health <= 0) {
          this.defeatEnemy();
        }
      }
    },
    
    /**
     * Apply screen shake effect and trigger player hit animation
     * Visual effect when player takes damage
     */
    playerHit(damage?: number) {
      // Apply screen shake animation
      const pageElement = this.$refs.page as HTMLElement | undefined;
      if (pageElement) {
        pageElement.classList.add('screen-shake');
        
        // Remove the class after animation completes
        setTimeout(() => {
          pageElement.classList.remove('screen-shake');
        }, 500);
      }
      
      // Play hit sound
      this.$fx.ui[this.$fx.theme.ui].cancel.play();
      
      // Show damage taken message if damage provided
      if (typeof damage === 'number' && this.user?.stats) {
        const actualDamage = Math.min(damage, this.user.stats.hp);
        
        // In a real game, we would dispatch to update user HP in store
        // this.$store.dispatch('updateHP', this.user.stats.hp - actualDamage);
        
        // Show damage message
        this.battleMessage = `${this.user?.name?.nick || 'Player'} takes ${actualDamage} damage!`;
        setTimeout(() => {
          if (this.battleMessage.includes('takes')) {
            this.battleMessage = '';
          }
        }, 1500);
      }
    },
    
    /**
     * Trigger victory animation sequence
     * This method is called when the player wins a battle
     */
    victoryAnimation() {
      // if (!this.currentEnemy) return;
      
      // Apply victory strobe effect to the enemy sprite
      this.enemyAnimationClass = 'victory-strobe';
      
      // Play victory sound with null check to prevent errors
      // if (this.$fx?.ui?.[this.$fx?.theme?.ui]?.confirm?.play) {
      //   this.$fx.ui[this.$fx.theme.ui].confirm.play();
      // }
      
      // Get the current aspect ratio from backgroundManager
      const currentAspectRatio = backgroundManager.getCurrentAspectRatio() || 48;
      
      // Store current aspect ratio for restoration after battle
      this.aspectRatio = currentAspectRatio;
      
      // Start the aspect ratio animation after a short delay for the strobe effect
      setTimeout(() => {
        // Use the smooth aspect ratio animation - first collapse to 0 height
        backgroundManager.animateAspectRatio(0, 750)
          .then(() => {
            // Change enemy animation to fadeout with strobe when aspect ratio animation completes
            this.enemyAnimationClass = 'victory-fadeout';
            
            // Animation complete - show victory dialog after a short delay
            setTimeout(() => {
              // Set flag for victory message styling
              this.isVictoryMessage = true;
              
              // Queue battle dialog messages with "You Won!" as first message
              this.queueBattleDialog([
                `You Won!`, 
                `${this.currentEnemy?.name || 'Enemy'} was defeated!`,
                `You gained ${this.calculateXPReward()} XP!`,
                `You earned ${this.calculateGPReward()} GP!`
              ]);
              
              // Add a final callback to the queue to show rewards after dialog
              this.battleDialogQueue.push(() => {
                setTimeout(() => {
                  this.isVictoryMessage = false;
                  this.defeatEnemy();
                }, 1000);
              });
            }, 500);
          })
          .catch(error => {
            console.error("Error during victory animation:", error);
            
            // Fallback in case of error
            this.battleMessage = `Victory! ${this.currentEnemy?.name || 'Enemy'} was defeated!`;
            
            // Show rewards modal after a delay
            setTimeout(() => {
              this.defeatEnemy();
            }, 1500);
          });
      }, 1000); // Let the strobe effect run for 1 second before starting the aspect ratio animation
    },
    
    /**
     * Calculate XP reward based on enemy difficulty
     */
    calculateXPReward() {
      if (!this.currentEnemy) return 0;
      
      // Base XP on enemy type and health
      let baseXP = this.currentEnemy.maxHealth / 2;
      
      // Bonus for boss types
      if (this.currentEnemy.isBoss) {
        baseXP *= 1.5;
      } else if (this.currentEnemy.type === 'miniboss') {
        baseXP *= 1.25;
      }
      
      // Round to nearest integer
      return Math.round(baseXP);
    },
    
    /**
     * Calculate GP reward based on enemy difficulty
     */
    calculateGPReward() {
      if (!this.currentEnemy) return 0;
      
      // Base GP on enemy type and health
      let baseGP = this.currentEnemy.maxHealth / 4;
      
      // Bonus for boss types
      if (this.currentEnemy.isBoss) {
        baseGP *= 1.5;
      } else if (this.currentEnemy.type === 'miniboss') {
        baseGP *= 1.25;
      }
      
      // Round to nearest integer
      return Math.round(baseGP);
    },
    
    /**
     * Trigger defeat animation sequence
     * This method is called when the player loses a battle
     */
    defeatAnimation() {
      // Show defeat message
      this.battleMessage = "You were defeated!";
      
      // Apply screen shake
      const pageElement = this.$refs.page as HTMLElement | undefined;
      if (pageElement) {
        pageElement.classList.add('screen-shake');
        
        setTimeout(() => {
          pageElement.classList.remove('screen-shake');
        }, 500);
      }
      
      // Play defeat sound
      this.$fx.ui[this.$fx.theme.ui].cancel.play();
      
      // Return to hometown after a delay
      setTimeout(() => {
        // In a real game, we would handle defeat properly
        // For now just redirect to hometown
        this.$router.push({
          name: "hometown",
          params: { userId: this.userId },
        });
      }, 3000);
    },
  },
  mounted() {
    // Initialize battle services
    this.initBattleServices();
    
    this.changeBg();
    this.$fx.ui[this.$fx.theme.ui].chooseUser.play();
    this.enterBattle();
    
    // Load a beast from the bestiary after a short delay
    setTimeout(() => {
      this.loadSampleBeast();
    }, 1000);
    
    setTimeout(() => {
      this.$fx.ui[this.$fx.theme.ui].chooseUser.pause();
      this.isUserModalOpen = this.userId;
    }, 1250);
  },
  unmounted() {
    backgroundManager.cleanupBackground();
  },
  // ... rest of the component ...
});