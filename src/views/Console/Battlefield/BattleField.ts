import { defineComponent, ref, onMounted, onUnmounted } from "vue";
import { mapState } from "vuex";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
import backgrounds from "@/assets/images/backgrounds/parallax/index";
import CardUserStats from "@/components/CardUserStats/CardUserStats.vue";
import fetchItems from "@/mixins/fetchItems";
import ionic from "@/mixins/ionic";
import MyTask from "@/views/Console/MyPortal/UserHud/MyTask/MyTask.vue";
import users from "@/lib/api/users.api";
import userActions from "@/mixins/userActions";
import XpFabBattleActions from "@/views/Console/MyPortal/UserHud/components/XpFabBattleActions.vue";
import XpTypingText from "@/components/XpTypingText/XpTypingText.vue";
import XpHpMpHud from "@/views/Console/BattleField/HUD/XpHpMpHud/XpHpMpHud.vue";
import { useBattleEngine, Enemy, CompletedTask } from '@/views/Console/BattleField/hooks/useBattleEngine';

// Import icons
import {
  closeCircle,
  medalOutline,
  cashOutline,
  giftOutline
} from "ionicons/icons";

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
    }
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
    // Use the battle engine hook as the central source of truth
    const battleEngine = useBattleEngine();
    const page = ref(null);
    const battleBackground = ref<HTMLCanvasElement | null>(null);
    
    // Background configuration
    const bg1 = ref(1);
    const bg2 = ref(1);
    const showRewardsModal = ref(false);
    const completedTask = ref<CompletedTask | null>(null);
    
    // Methods for background management
    const changeBg = () => {
      if (battleEngine.state.theme === "earthbound") {
        enterBattle();
        return false;
      }
      
      // Check if we're even able to set bg styles
      const pageElement = page.value?.$el as HTMLElement | undefined;
      if (!pageElement && !document.querySelector('.battle-bg')) {
        console.warn('No suitable element found to set background styles');
        enterBattle(); // Just try to enter battle directly
        return;
      }
      
      const setBGStyle = (key: string, value: string) => {
        const element = pageElement || document.querySelector('.battle-bg') as HTMLElement;
        if (element) {
          element.style[key as any] = value;
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
    
    // Expose public methods for external components (for dev tools)
    const loadBeastById = async (beastId: string) => {
      try {
        const enemy = await battleEngine.loadBeastById(beastId);
        if (enemy) {
          // Start battle after a short delay
          setTimeout(() => {
            initBattle();
          }, 1000);
        }
      } catch (error) {
        console.error('Error loading beast:', error);
      }
    };
    
    const loadSampleBeast = () => {
      battleEngine.loadSampleBeast().then(() => {
        // Start battle after a short delay
        setTimeout(() => {
          initBattle();
        }, 1000);
      });
    };
    
    const createSampleEnemy = () => {
      // Create a sample enemy if needed
      battleEngine.createSampleEnemy();
      
      // Start battle after a short delay
      setTimeout(() => {
        initBattle();
      }, 1000);
    };
    
    const initBattle = () => {
      // Initialize the battle through our battle engine
      battleEngine.initBattle();
    };
    
    // Victory animation that coordinates with background manager
    const victoryAnimation = () => {
      battleEngine.victoryAnimation();
      
      // Show rewards modal after the victory animation completes
      setTimeout(() => {
        // Set completed task data for the rewards modal
        if (battleEngine.currentEnemy.value) {
          completedTask.value = {
            name: battleEngine.currentEnemy.value.name,
            xpReward: battleEngine.calculateXPReward(),
            gpReward: battleEngine.calculateGPReward(),
            itemReward: Math.random() > 0.7 ? getRandomRewardItem() : null
          };
        }
        
        // Show the modal
        showRewardsModal.value = true;
      }, 3000);
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
        battleEngine.returnToHometown(props.userId);
      }, 500);
    };
    
    // Register callbacks with battle engine for UI updates
    battleEngine.registerCallbacks({
      onVictory: victoryAnimation,
      onReturnToHometown: (userId) => {
        // For navigation after battle ends
        if (userId) {
          window.location.href = `/#/hometown/${userId}`;
        }
      }
    });
    
    // Lifecycle hooks
    onMounted(() => {
      changeBg();
      enterBattle();
      
      // Load a beast based on props or a sample beast
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
        
        battleEngine.setEnemy(enemy);
        
        // Initialize the battle after a short delay
        setTimeout(() => {
          initBattle();
        }, 1000);
      } else {
        // Load a sample beast
        setTimeout(() => {
          loadSampleBeast();
        }, 1000);
      }
    });
    
    onUnmounted(() => {
      backgroundManager.cleanupBackground();
    });
    
    return {
      battleEngine,
      page,
      battleBackground,
      bg1,
      bg2,
      showRewardsModal,
      completedTask,
      
      // Methods
      changeBg,
      enterBattle,
      loadBeastById,
      loadSampleBeast,
      createSampleEnemy,
      initBattle,
      victoryAnimation,
      closeRewardsModal,
      
      // Helper for avatars
      getAvatar: battleEngine.getAvatar,
      
      // Battle action handler
      handleBattleAction: battleEngine.handleBattleAction,
      
      // Icons
      closeCircle,
      medalOutline,
      cashOutline,
      giftOutline
    };
  },
  computed: {
    ...mapState(["xp_achievement"]),
    
    // Computed properties from store
    user() {
      return this.$store.state.user;
    }
  },
  methods: {
    // UI interaction methods
    clickUserChip(user) {
      this.$modal.create({
        component: CardUserStats,
        initialBreakpoint: 0.55,
        componentProps: { userId: user.id },
      });
    },
    
    getUserAvatar(user) {
      const avatar = `./${user.avatar}.svg`;
      return requireAvatar(avatar);
    },
    
    // Pass key methods to the vue template
    getAvatar(id) {
      return this.battleEngine.getAvatar(id);
    },
    
    // Other UI methods
    segmentChanged() {
      // Handle segment changes
    },
    
    openToast() {
      const { user } = this;
      const toast = this.$ionic.toastController.create({
        message: `${user?.name?.nick} has entered the battle!`,
        cssClass: this.$fx.theme.rpg,
        position: "top",
        duration: 2800,
      });
      return toast.then(toast => toast.present());
    }
  }
});