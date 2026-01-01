import { defineComponent, ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useUserStore, type LevelUpInfo, type ClassLevelUpInfo } from "@/lib/store/stores/user";
import { useRouter, useRoute } from "vue-router";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
import backgrounds from "@/assets/images/backgrounds/parallax/index";
import CardUserStats from "@/components/organisms/CardUserStats/CardUserStats.vue";
import { useBattleStore } from "@/lib/store/stores/battle";
import XpTypingText from "@/components/atoms/TypingText/XpTypingText.vue";
import XpRpgMenu from "@/components/molecules/RpgMenu/XpRpgMenu.vue";
import XpBattleTaskMenu from "@/app/Console/BattleField/components/XpBattleTaskMenu.vue";
import XpCombatTasks from "@/app/Console/BattleField/components/XpCombatTasks.vue";
import XpHpMpHud from "@/app/Console/BattleField/hud/XpHpMpHud/XpHpMpHud.vue";
import { useAudioStore } from "@/lib/store/stores/audio";
import $fx, { play$fx } from "@/assets/fx";
import DevToolsFab from "@/app/Console/BattleField/hud/dev/DevToolsFab.vue";
import DevBattleActionsFab from "@/app/Console/BattleField/hud/dev/DevBattleActionsFab.vue";
import {
  modalController,
  toastController,
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonFabList,
  IonModal,
  onIonViewWillEnter,
  onIonViewDidEnter
} from '@ionic/vue';

// Import battle services
import { createBattleService, createBestiaryService, BattleService, BestiaryService, Enemy, CombatTask } from '@/lib/services/battle';

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
import templeDb from "@/lib/databases/TempleDb";

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
    userIds: String,
    // Temple battle props
    templeId: String,
    level: String,
    x: String,
    y: String,
    // Quest battle props
    questId: String
  },

  components: {
    CardUserStats,
    XpHpMpHud,
    XpRpgMenu,
    XpBattleTaskMenu,
    XpCombatTasks,
    XpTypingText,
    DevToolsFab,
    DevBattleActionsFab,
    IonPage,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonFabList,
    IonModal
  },
  setup(props) {
    // Component state
    const pageRef = ref(null);
    const battleBackground = ref<HTMLCanvasElement | null>(null);
    const battleDialogText = ref('');
    const battleStarted = ref(false);
    const isPlayerTurn = ref(false);
    const currentEnemy = ref<Enemy | null>(null);
    const enemyAnimationClass = ref('');
    const enemyHealthColor = ref('#2dd36f');
    const battleMessage = ref('');

    const combatTasks = ref<CombatTask[]>([]);
    const hasMoreBattleDialog = ref(false);
    const isBattleDialogTyping = ref(false);
    const isVictoryMessage = ref(false);
    const battleDialogQueue = ref<Array<string | (() => void)>>([]);
    const battleDialogRef = ref<any>(null);

    // Append mode state (Earthbound-style text accumulation for level-up)
    const isAppendMode = ref(false);
    const accumulatedDialogLines = ref<string[]>([]);
    const showEnemyHp = ref(false);
    const showEnemy = ref(false);
    const showTaskMenu = ref(false);
    const isBackgroundActive = ref(false);
    const currentRoomContent = ref<{ xp?: number; gp?: number; ap?: number } | null>(null);

    // Services
    const battleService = ref<BattleService | null>(null);
    const bestiaryService = ref<BestiaryService | null>(null);

    // Get Pinia stores and router using composition API
    const userStore = useUserStore();
    const battleStore = useBattleStore();
    const audioStore = useAudioStore();
    const router = useRouter();
    const route = useRoute();

    // Background configuration
    const bg1 = ref(219); // Default bg1
    const bg2 = ref(218); // Default bg2
    const urlBgConfig = ref<{ bg1?: number, bg2?: number }>({});

    // Get user from Pinia store - fetch full user object by ID
    const user = computed(() => {
      const current = userStore.currentUser;
      if (current && current.id) {
        return userStore.getUserById(current.id);
      }
      return null;
    });

    // Calculate enemy progress percentage based on remaining tasks
    const enemyProgressPercent = computed(() => {
      if (!combatTasks.value || combatTasks.value.length === 0) return 100;
      const totalTasks = combatTasks.value.length;
      const completedTasks = combatTasks.value.filter(t => t.isCompleted).length;
      const remainingPercent = ((totalTasks - completedTasks) / totalTasks) * 100;
      return Math.max(0, Math.min(100, remainingPercent));
    });

    debug.log('enemyProgressPercent initialized:', enemyProgressPercent.value);

    // Calculate enemy attack timer percentage
    const enemyAttackTimerPercent = computed(() => {
      if (!battleService.value) return 100;
      return battleService.value.getEnemyAttackTimer();
    });

    // Calculate time remaining formatted string
    const atbTimeRemaining = computed(() => {
      if (!battleService.value) return '';
      const ms = battleService.value.getTimeRemaining();
      if (ms <= 0) return '';

      const totalSeconds = Math.ceil(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    });

    // Dynamic ATB bar style with gradient color transition (green -> yellow -> red)
    const atbBarStyle = computed(() => {
      const percent = enemyAttackTimerPercent.value;

      // Calculate color based on percentage (100% = green, 50% = yellow, 0% = red)
      let r, g, b;
      if (percent > 50) {
        // Green to yellow (100% -> 50%)
        const ratio = (percent - 50) / 50;
        r = Math.round(255 * (1 - ratio));
        g = 200;
        b = 0;
      } else {
        // Yellow to red (50% -> 0%)
        const ratio = percent / 50;
        r = 255;
        g = Math.round(200 * ratio);
        b = 0;
      }

      const color = `rgb(${r}, ${g}, ${b})`;
      const lighterColor = `rgb(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${b})`;

      return {
        width: `${percent}%`,
        background: `linear-gradient(90deg, ${color} 0%, ${lighterColor} 100%)`,
        boxShadow: `0 0 10px rgba(${r}, ${g}, 0, 0.7)`
      };
    });

    // Dynamic ATB icon color (matches bar color)
    const atbIconColor = computed(() => {
      const percent = enemyAttackTimerPercent.value;

      let r, g;
      if (percent > 50) {
        const ratio = (percent - 50) / 50;
        r = Math.round(255 * (1 - ratio));
        g = 200;
      } else {
        const ratio = percent / 50;
        r = 255;
        g = Math.round(200 * ratio);
      }

      return `rgb(${r}, ${g}, 0)`;
    });



    // Enemy size class based on type
    const enemySizeClass = computed(() => {
      if (!currentEnemy.value) return 'monster';
      if (currentEnemy.value.isBoss) return 'boss';
      if (currentEnemy.value.type === 'miniboss') return 'miniboss';
      return 'monster';
    });

    // Get battle participants from URL params or Store
    const getBattleParticipants = () => {
      debug.log('BattleField: getBattleParticipants called');
      const { beastIds: beastIdsParam, userIds: userIdsParam } = route.params;
      const { beastIds: beastIdsQuery } = route.query;

      debug.log('BattleField: Route Params', { beastIdsParam, userIdsParam });
      debug.log('BattleField: Route Query', { beastIdsQuery });

      let parsedBeastIds: string[] = [];
      let parsedUserIds: string[] = [];

      // Check Store first for encounter
      if (battleStore.currentEncounter) {
        debug.log('BattleField: Found encounter in store', battleStore.currentEncounter);
        if (battleStore.currentEncounter.beastIds && battleStore.currentEncounter.beastIds.length > 0) {
          parsedBeastIds = [...battleStore.currentEncounter.beastIds];
        }
        if (battleStore.currentEncounter.userIds && battleStore.currentEncounter.userIds.length > 0) {
          parsedUserIds = [...battleStore.currentEncounter.userIds];
        }
      } else {
        debug.log('BattleField: No encounter in store');
      }

      // Parse beast IDs from route params (Override store if present, or add to it? Override usually)
      if (beastIdsParam && typeof beastIdsParam === 'string') {
        const params = beastIdsParam.split(',').filter(id => id.trim() !== '');
        if (params.length > 0) parsedBeastIds = params;
      }

      // Also check route.query (used by Temple Grounds)
      if (beastIdsQuery && typeof beastIdsQuery === 'string') {
        const queryBeastIds = beastIdsQuery.split(',').filter(id => id.trim() !== '');
        // If we have query params, they might be additional or primary
        queryBeastIds.forEach(id => {
          if (!parsedBeastIds.includes(id)) {
            parsedBeastIds.push(id);
          }
        });
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
        const params = userIdsParam.split(',').filter(id => id.trim() !== '');
        if (params.length > 0) parsedUserIds = params;
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

    // Get battle type from route meta
    const getBattleType = (): 'temple' | 'quest' | 'standard' => {
      const battleType = route.meta?.battleType as string | undefined;

      if (battleType === 'temple' && props.templeId) {
        debug.log('BattleField: Temple battle detected', {
          templeId: props.templeId,
          level: props.level,
          x: props.x,
          y: props.y
        });
        return 'temple';
      }

      if (battleType === 'quest' && props.questId) {
        debug.log('BattleField: Quest battle detected', { questId: props.questId });
        return 'quest';
      }

      return 'standard';
    };

    // Load room data from a temple and start the battle
    const loadTempleRoomBattle = async (templeId: string, level: string, x: number, y: number) => {
      debug.log('BattleField: Loading temple room battle', { templeId, level, x, y });

      try {
        // Fetch temple data from TempleDb
        const temple = await templeDb.getTempleById(templeId);

        if (!temple) {
          debug.warn('BattleField: Temple not found', templeId);
          loadSampleBeast();
          return;
        }

        // Get maze from dungeonLayout (preferred) or top-level (backwards compatibility)
        const maze = temple.dungeonLayout?.maze || temple.maze;

        if (!maze) {
          debug.warn('BattleField: Temple has no maze data', templeId);
          loadSampleBeast();
          return;
        }

        // Get the maze grid for the specified level
        let levelMaze: string[][] | undefined;

        if (Array.isArray(maze)) {
          // Single level maze
          levelMaze = maze;
        } else if (typeof maze === 'object') {
          // Multi-level maze
          levelMaze = maze[level] as string[][];
        }

        if (!levelMaze || !levelMaze[y] || !levelMaze[y][x]) {
          debug.warn('BattleField: Room not found at coordinates', { level, x, y });
          loadSampleBeast();
          return;
        }

        // Get the room key at this position
        const roomKey = levelMaze[y][x];

        // Get rooms from dungeonLayout (preferred) or top-level (backwards compatibility)
        const rooms = temple.dungeonLayout?.rooms || temple.rooms;
        const room = rooms?.[roomKey];

        if (!room) {
          debug.warn('BattleField: Room configuration not found', roomKey);
          loadSampleBeast();
          return;
        }

        debug.log('BattleField: Found room', { roomKey, room });

        // Extract beast IDs from room content
        const roomContent = room.content || {};
        const beastIds = roomContent.beasts || [];

        // Set up background configuration from room
        if (roomContent.bg1 !== undefined) {
          bg1.value = roomContent.bg1;
        }
        if (roomContent.bg2 !== undefined) {
          bg2.value = roomContent.bg2;
        }

        // Store room content for reward calculations
        currentRoomContent.value = {
          xp: roomContent.xp,
          gp: roomContent.gp,
          ap: roomContent.ap
        };

        // Start battle with the beasts
        if (beastIds.length > 0) {
          if (beastIds.length === 1) {
            loadBeastById(beastIds[0]);
          } else {
            loadMultipleBeasts(beastIds);
          }
        } else if (room.type === 'monster' || room.type === 'miniboss' || room.type === 'boss') {
          // Room is a combat room but no specific beasts configured
          // Could generate random beasts based on room type/temple theme
          debug.log('BattleField: Combat room without configured beasts, loading sample');
          loadSampleBeast();
        } else {
          debug.warn('BattleField: Room is not a combat room', room.type);
          loadSampleBeast();
        }
      } catch (error) {
        debug.error('BattleField: Error loading temple room', error);
        loadSampleBeast();
      }
    };

    // Parse battle configuration from URL or Store
    const setupBattleConfiguration = () => {
      const query = route.query;
      let configFound = false;

      // Check Store first
      if (battleStore.currentEncounter?.bgConfig) {
        if (battleStore.currentEncounter.bgConfig.bg1 !== undefined) {
          urlBgConfig.value.bg1 = battleStore.currentEncounter.bgConfig.bg1;
          bg1.value = urlBgConfig.value.bg1;
          configFound = true;
        }
        if (battleStore.currentEncounter.bgConfig.bg2 !== undefined) {
          urlBgConfig.value.bg2 = battleStore.currentEncounter.bgConfig.bg2;
          bg2.value = urlBgConfig.value.bg2;
          configFound = true;
        }
      }

      // URL Query params override store
      if (query.bg1) {
        urlBgConfig.value.bg1 = parseInt(query.bg1 as string, 10);
        bg1.value = urlBgConfig.value.bg1;
        configFound = true;
      }

      if (query.bg2) {
        urlBgConfig.value.bg2 = parseInt(query.bg2 as string, 10);
        bg2.value = urlBgConfig.value.bg2;
        configFound = true;
      }

      // Auto-start battle visuals if configured
      if (configFound) {
        debug.log('BattleField: Background configuration detected, awaiting intro to start animation');
      }
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
      play$fx(type);
    };

    // Initialize battle services
    const initServices = () => {
      battleService.value = createBattleService();
      bestiaryService.value = createBestiaryService();

      // Register callbacks for the battle service
      if (battleService.value) {
        battleService.value.registerCallbacks({
          onDialogMessage: (messages) => {
            queueBattleDialog(messages);
          },
          onBattleMessageChange: (message) => {
            // Route all messages to dialog queue instead of using the overlay
            if (message) queueBattleDialog([message]);
          },
          onCombatTasksChange: (tasks: CombatTask[]) => {
            debug.log('BattleField: Reacting to combat tasks change', tasks);
            combatTasks.value = tasks;
          },
          onEnemyHealthChange: () => {
            showEnemyHp.value = true;
            setTimeout(() => {
              showEnemyHp.value = false;
            }, 3000); // reduced from 2000 to be snappy but visible
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
            playSound("enemyDie");
          },
          onPlayerDefeated: () => {
            // Play death sound
            playSound("die");

            // Stop the battle and navigate to game over after dialog
            battleService.value?.stopAttackTimer();
            battleStarted.value = false;

            // Use queueBattleDialog to ensure this happens AFTER "You blacked out..."
            queueBattleDialog([
              () => {
                debug.log('BattleField: Player defeated, navigating to Game Over');
                router.push({ name: 'game-over' });
              }
            ]);
          },
          onAttack: (attacker) => {
            if (attacker === 'player') {
              playSound("attack");
            } else {
              playSound("preAttack");
            }
          },
          onDamage: (target) => {
            if (target === 'player') {
              playSound("damage");
              // Shake screen
              const container = document.querySelector('.battle-ui-container');
              if (container) {
                container.classList.add('screen-shake');
                setTimeout(() => container.classList.remove('screen-shake'), 500);
              }
            } else {
              playSound("enemyDamage");
            }
          }
        });
      }
    };

    const finishCombatTask = (taskId: string) => {
      if (battleService.value) {
        battleService.value.finishCombatTask(taskId);
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
    const queueBattleDialog = (messages: (string | (() => void))[]) => {
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

      // In append mode, accumulate the finished text line
      if (isAppendMode.value && battleDialogText.value) {
        accumulatedDialogLines.value.push(battleDialogText.value);
        battleDialogText.value = ''; // Clear for next line
      }

      // Do NOT auto-advance; wait for user input
      // Just check if we have more dialog to show the "more" indicator
      if (battleDialogQueue.value.length > 0) {
        hasMoreBattleDialog.value = true;
      } else {
        hasMoreBattleDialog.value = false;

        // If we are in victory sequence, we might want to auto-close or wait for user to click one last time?
        // Let's stick to manual. The 'advanceBattleDialog' will handle the final close.
      }
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
        // Check if there's pending damage to apply (Earthbound-style delayed damage)
        if (battleService.value?.hasPendingDamage()) {
          battleService.value.applyPendingDamage();
        }
        // This is the dialog-complete click after the encounter message
        // Clear the dialog text which will hide the dialog box and immediately start the player's turn
        battleDialogText.value = '';
        if (battleService.value) {
          battleService.value.startPlayerTurn();
          battleService.value.startAttackTimer();
        }
      } else {
        // Check for pending damage here too (safety)
        if (battleService.value?.hasPendingDamage()) {
          battleService.value.applyPendingDamage();
        }
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

    // Enable append mode for Earthbound-style text accumulation (level-up sequences)
    const enableAppendMode = () => {
      isAppendMode.value = true;
      accumulatedDialogLines.value = [];
    };

    // Disable append mode and clear accumulated lines
    const disableAppendMode = () => {
      isAppendMode.value = false;
      accumulatedDialogLines.value = [];
      battleDialogText.value = '';
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
          currentEnemy.value = enemy;
          updateEnemyHealthColor();
          initBattle(); // Direct call, no timeout
        }
      } catch (error) {
        debug.error('Error loading beast:', error);
      }
    };

    // Unified function to handle Battle Intro choreography
    const startBattleIntro = (enemyName: string) => {
      // 2. Hide common elements for intro
      showEnemy.value = false;
      isVictoryMessage.value = false;

      // 3. Inject the intro choreography into the queue
      // (Service encounter messages have been removed to avoid duplication)

      queueBattleDialog([
        () => {
          // Dramatically show the beast and start the background swirling
          showEnemy.value = true;
          // Dramatically show the beast and start the background swirling
          showEnemy.value = true;
          enterBattle();
          playSound("startBattle");

          // Play battle music!
          const tracks = $fx.rpg.earthbound.BGM.battle;
          const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
          audioStore.changeBGM({
            tracks: [randomTrack],
            track: 0,
            is_on: true
          });
        },
        `From the dark forces of chaos comes ${enemyName}!!!`
      ]);
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

          // Trigger intro choreography
          const enemyName = enemies.length > 1 ? `${enemies.length} enemies` : enemies[0].name;
          startBattleIntro(enemyName);
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
          initBattle(); // Direct call
        } else {
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
        initBattle(); // Direct call
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
          emoji: '👾'
        };
        updateEnemyHealthColor();
        initBattle(); // Direct call
      }
    };

    // Initialize the battle
    const initBattle = () => {
      // Make sure the enemy is visible with proper animation
      if (!enemyAnimationClass.value ||
        enemyAnimationClass.value === 'victory-fadeout' ||
        enemyAnimationClass.value === 'victory-strobe') {
        enemyAnimationClass.value = '';
      }

      // Reset HP bar visibility
      showEnemyHp.value = false;

      if (battleService.value && currentEnemy.value) {
        const enemyName = currentEnemy.value.name || 'Unknown Enemy';

        // 1. Initialize logic
        battleService.value.initBattle(currentEnemy.value);
        battleStarted.value = true;

        // 2. Start intro choreography
        startBattleIntro(enemyName);
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
        switch (action.action) {
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

    // Handle enemy defeat
    const defeatEnemy = (enemy: Enemy) => {
      debug.log('Enemy defeated:', enemy.name);
      isVictoryMessage.value = true;
      // Use the provided enemy or the current enemy
      const defeatedEnemy = enemy || currentEnemy.value;
      if (!defeatedEnemy) return;

      // Trigger victory animation
      victoryAnimation();

      // Clear current enemy
      currentEnemy.value = null;
    };

    // Calculate XP reward based on room content or enemy difficulty
    const calculateXPReward = () => {
      // Priority 1: Room-defined XP (dungeon room battles)
      if (currentRoomContent.value?.xp !== undefined) {
        return currentRoomContent.value.xp;
      }

      // Priority 2: Formula fallback (for legacy or quest battles)
      if (!currentEnemy.value) return 0;
      let baseXP = currentEnemy.value.maxHealth / 2;
      if (currentEnemy.value.isBoss) {
        baseXP *= 1.5;
      } else if (currentEnemy.value.type === 'miniboss') {
        baseXP *= 1.25;
      }
      return Math.round(baseXP);
    };

    // Calculate GP reward based on room content or enemy difficulty
    const calculateGPReward = () => {
      // Priority 1: Room-defined GP (dungeon room battles)
      if (currentRoomContent.value?.gp !== undefined) {
        return currentRoomContent.value.gp;
      }

      // Priority 2: Formula fallback (for legacy or quest battles)
      if (!currentEnemy.value) return 0;
      let baseGP = currentEnemy.value.maxHealth / 4;
      if (currentEnemy.value.isBoss) {
        baseGP *= 1.5;
      } else if (currentEnemy.value.type === 'miniboss') {
        baseGP *= 1.25;
      }
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



    // Return to hometown
    const returnToHometown = () => {
      const userId = props.userId || user.value?.id;
      if (userId) {
        router.push({
          name: "home-town",
          params: { userId },
        });
      }
    };

    // Victory animation that coordinates with background manager
    const victoryAnimation = () => {
      // Apply victory strobe effect to the enemy sprite
      enemyAnimationClass.value = 'victory-strobe';

      // Play victory sound effect (the short jingle)
      playSound("win");

      // Play victory music
      if (currentEnemy.value?.isBoss) {
        // play$fx('eb_winboss'); // If using sound effect system for music
        const tracks = $fx.rpg.earthbound.BGM.winboss || $fx.rpg.earthbound.BGM.win; // Fallback
        audioStore.changeBGM({
          tracks: tracks,
          track: 0,
          is_on: true
        });
      } else {
        const tracks = $fx.rpg.earthbound.BGM.win;
        audioStore.changeBGM({
          tracks: tracks,
          track: 0,
          is_on: true
        });
      }

      // Start the aspect ratio animation after a short delay for the strobe effect
      setTimeout(() => {
        // Use the smooth aspect ratio animation - first collapse to 0 height
        backgroundManager.animateAspectRatio(0, 750)
          .then(() => {
            // Change enemy animation to fadeout when aspect ratio animation completes
            enemyAnimationClass.value = 'victory-fadeout';

            // Set victory message flag for styling
            isVictoryMessage.value = true;

            const xp = calculateXPReward();
            const gp = calculateGPReward();
            const ap = currentRoomContent.value?.ap || 0;

            // Persist rewards to user profile and capture level-up info
            const usrId = props.userId || user.value?.id;
            let levelUpInfo: LevelUpInfo | null = null;
            let classLevelUpInfo: ClassLevelUpInfo | null = null;

            if (usrId && user.value) {
              // Update User XP
              levelUpInfo = userStore.updateUserXP({ userId: usrId, amount: xp });

              // Update Class XP
              const jobClassId = user.value.jobClass || 'default';
              classLevelUpInfo = userStore.updateClassXp(usrId, jobClassId, xp);

              userStore.updateUserGP({ userId: usrId, savings: gp }); // GP goes to bank (Earthbound-style)
              if (ap > 0) {
                userStore.recordAPGain({ userId: usrId, amount: ap, source: 'battle' });
              }
            }

            // Calculate item reward (50% chance)
            const item = Math.random() > 0.5 ? getRandomRewardItem() : null;

            // Get player name for level-up messages
            const playerName = user.value?.name?.nick || user.value?.name?.first || 'You';

            // Build victory messages
            const messages: (string | (() => void))[] = [
              'You Won!',
              `${currentEnemy.value?.name || 'Enemy'} was defeated!`,
              `You gained ${xp} XP!`,
              `${gp} GP deposited to your bank!`
            ];

            // Add item message if applicable
            if (item) {
              messages.push(`You found a ${item}!`);
            }

            // Level-up sequence (Earthbound style with append mode)
            if (levelUpInfo?.didLevelUp) {
              // Enable append mode for the level-up stat reveal
              messages.push(() => {
                enableAppendMode();
                playSound("levelUp");
              });

              // Level-up announcement
              messages.push(`${playerName} grew to Level ${levelUpInfo.newLevel}!`);

              // Show stat increases one by one (Earthbound style)
              if (levelUpInfo.hpGained > 0) {
                messages.push(`HP increased by ${levelUpInfo.hpGained}!`);
              }
              if (levelUpInfo.mpGained > 0) {
                messages.push(`MP increased by ${levelUpInfo.mpGained}!`);
              }

              // Multi-level bonus message
              if (levelUpInfo.levelsGained > 1) {
                messages.push(`Gained ${levelUpInfo.levelsGained} levels!`);
              }

              // Disable append mode after stat reveal
              messages.push(() => {
                disableAppendMode();
              });
            }

            // Class Level-up sequence
            if (classLevelUpInfo?.didLevelUp) {
              messages.push(() => {
                enableAppendMode();
                // Play a different sound or the same level up sound
                playSound("levelUp");
              });

              const className = (user.value?.jobClass || 'Class').toUpperCase();
              messages.push(`${className} skill increased to Level ${classLevelUpInfo.newLevel}!`);

              messages.push(() => {
                disableAppendMode();
              });
            }

            // Add completion callback
            messages.push(() => {
              returnToHometown();
            });

            // Queue victory dialog messages
            queueBattleDialog(messages);
          })
          .catch(error => {
            debug.error("Error during victory animation:", error);
            // Fallback in case of error
            queueBattleDialog([
              `Victory! ${currentEnemy.value?.name || 'Enemy'} was defeated!`,
              () => returnToHometown()
            ]);
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
      switch (label.toLowerCase()) {
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
      switch (label.toLowerCase()) {
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

        // Trigger HP bar
        showEnemyHp.value = true;
        setTimeout(() => {
          showEnemyHp.value = false;
        }, 2000);
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

    // Dev tools methods
    const openProfileSelector = async () => {
      if (!props.devMode) return;

      // Show toast message
      const toast = await toastController.create({
        message: 'Profile selector feature activated',
        duration: 2000,
        position: 'top'
      });
      await toast.present();

      // Here you would typically implement the actual profile selector logic
      debug.log('Dev Tools: Open profile selector');
    };

    const openBeastSelector = async () => {
      if (!props.devMode) return;

      const toast = await toastController.create({
        message: 'Beast selector feature activated',
        duration: 2000,
        position: 'top'
      });
      await toast.present();

      // Here you would typically implement the actual beast selector logic
      debug.log('Dev Tools: Open beast selector');
    };

    const openControlsModal = async () => {
      if (!props.devMode) return;

      const toast = await toastController.create({
        message: 'Battle controls modal activated',
        duration: 2000,
        position: 'top'
      });
      await toast.present();

      // Here you would typically implement the actual controls modal logic
      debug.log('Dev Tools: Open battle controls modal');
    };

    // Battle actions methods (for DevBattleActionsFab)
    const triggerAttackAnimation = () => {
      if (!props.devMode) return;
      debug.log('Dev Tools: Triggering attack animation');

      // Add attack animation class to the enemy
      enemyAnimationClass.value = 'attack';
      setTimeout(() => {
        enemyAnimationClass.value = '';
      }, 500);
    };

    const triggerEnemyHit = () => {
      if (!props.devMode) return;
      debug.log('Dev Tools: Triggering enemy hit animation');

      // Add damaged animation class to the enemy
      enemyAnimationClass.value = 'damaged';
      setTimeout(() => {
        enemyAnimationClass.value = '';
      }, 500);

      // Apply damage to the enemy
      if (battleService.value && currentEnemy.value) {
        battleService.value.devDamageEnemy(50);
        // Trigger HP bar
        showEnemyHp.value = true;
        setTimeout(() => {
          showEnemyHp.value = false;
        }, 2000);
      }
    };

    const triggerPlayerHit = () => {
      if (!props.devMode) return;
      debug.log('Dev Tools: Triggering player hit animation');

      // Show message
      queueBattleDialog(['Player takes damage!']);

      // Here you would apply damage to the player through battle service if implemented
    };

    const triggerVictoryAnimation = () => {
      if (!props.devMode) return;
      debug.log('Dev Tools: Triggering victory animation');

      // Trigger the victory animation
      victoryAnimation();
    };

    const triggerDefeatAnimation = () => {
      if (!props.devMode) return;
      debug.log('Dev Tools: Triggering defeat animation');

      // Show defeat message
      queueBattleDialog(['You were defeated!']);
    };

    const resetBattle = () => {
      if (!props.devMode) return;
      debug.log('Dev Tools: Resetting battle');

      // Reset enemy health if there is a current enemy
      if (battleService.value && currentEnemy.value) {
        battleService.value.resetBattle();
      } else {
        // If there's no current enemy, load a sample one
        loadSampleBeast();
      }

      // Clear any messages
      battleMessage.value = '';
      battleDialogText.value = '';

      // Reset animation classes
      enemyAnimationClass.value = 'appear';
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

    // Watch for currentEnemy changes to update background
    watch(
      currentEnemy,
      (newEnemy) => {
        if (newEnemy) {
          let bgUpdated = false;

          // Update BGs if not overridden by URL and enemy has config
          if (newEnemy.bg1 !== undefined && urlBgConfig.value.bg1 === undefined) {
            bg1.value = newEnemy.bg1;
            bgUpdated = true;
          }

          if (newEnemy.bg2 !== undefined && urlBgConfig.value.bg2 === undefined) {
            bg2.value = newEnemy.bg2;
            bgUpdated = true;
          }

          // Trigger background update if changed or if we need to ensure it's active
          if (bgUpdated || backgroundManager.getBackgroundSettings().isActive) {
            // Small delay to ensure DOM is ready if it's the first load
            setTimeout(() => enterBattle(), 50);
          }
        }
      }
    );

    // Lifecycle hooks
    // Use onMounted for minimal initialization only - services setup
    onMounted(() => {
      // Initialize services synchronously - these don't depend on DOM
      initServices();

      // Debug message if in dev mode
      if (props.devMode) {
        debug.log('BattleField component initialized in dev mode');
      }
    });

    // Use Ionic's lifecycle hook for battle initialization
    // This fires AFTER the page transition is complete and the page is properly registered
    onIonViewWillEnter(() => {
      // Parse battle configuration from URL - safe to call here
      setupBattleConfiguration();
    });

    // Use onIonViewDidEnter for anything that needs the page to be fully visible
    onIonViewDidEnter(() => {
      // Check battle type first
      const battleType = getBattleType();

      // Get battle participants from URL params
      const participants = getBattleParticipants();

      // Handle temple battles - look up room data for beast configuration
      if (battleType === 'temple') {
        debug.log('BattleField: Setting up temple battle', {
          templeId: props.templeId,
          level: props.level,
          x: props.x,
          y: props.y
        });

        // First check if we have beast IDs from the store (set by TempleGrounds navigation)
        if (participants.beastIds.length > 0) {
          if (participants.beastIds.length === 1) {
            loadBeastById(participants.beastIds[0]);
          } else {
            loadMultipleBeasts(participants.beastIds);
          }
        } else if (props.templeId && props.level && props.x && props.y) {
          // No pre-configured beasts, but we have temple coordinates - look up the room
          loadTempleRoomBattle(
            props.templeId,
            props.level,
            parseInt(props.x, 10),
            parseInt(props.y, 10)
          );
        } else {
          // Fallback for temple battles without coordinates
          debug.warn('BattleField: Temple battle without coordinates or configured beasts');
          loadSampleBeast();
        }
        return;
      }

      // Handle quest battles
      if (battleType === 'quest') {
        debug.log('BattleField: Setting up quest battle', { questId: props.questId });
        // Quest battles would look up quest configuration from store/db
        // For now, check participants first, then fallback
        if (participants.beastIds.length > 0) {
          if (participants.beastIds.length === 1) {
            loadBeastById(participants.beastIds[0]);
          } else {
            loadMultipleBeasts(participants.beastIds);
          }
        } else {
          // TODO: Load quest-specific beasts based on questId
          loadSampleBeast();
        }
        return;
      }

      // Standard battle handling
      // Check if we have a specific beast avatar provided via props (legacy/direct support)
      if (props.beastAvatar) {
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
        initBattle(); // Direct call
      } else if (participants.beastIds.length > 0) {
        // If we have beast IDs from parameters, load them
        if (participants.beastIds.length === 1) {
          loadBeastById(participants.beastIds[0]);
        } else {
          loadMultipleBeasts(participants.beastIds);
        }
      } else if (props.taskId) {
        // Load task beast... logic to be implemented
        // For now fallback to sample
        loadSampleBeast();
      } else {
        // Default behavior
        loadSampleBeast();
      }
    });

    onUnmounted(() => {
      if (battleService.value) {
        battleService.value.stopAttackTimer();
      }
      backgroundManager.cleanupBackground();
    });

    const closeTaskMenu = () => {
      showTaskMenu.value = false;
      playSound("cancel");
    };

    const handleTaskAttackResult = (result: any) => {
      // Close menu
      showTaskMenu.value = false;

      if (result.success) {
        // Log for debugging
        debug.log("Task executed successfully", result);

        // Show the progress bar
        showEnemyHp.value = true;

        // Trigger hit animation on enemy sprite
        enemyAnimationClass.value = 'damaged';
        setTimeout(() => {
          enemyAnimationClass.value = '';
        }, 500);

        // Hide progress bar after a delay
        setTimeout(() => {
          showEnemyHp.value = false;
        }, 2000);

        // Check for victory - all tasks completed
        const allTasksComplete = combatTasks.value.every(t => t.isCompleted);
        if (allTasksComplete && currentEnemy.value) {
          debug.log("All tasks complete - enemy defeated!");
          if (battleService.value) {
            // Trigger defeat logic
            battleService.value.devDamageEnemy(currentEnemy.value.health); // Reduce to 0
          }
        }
      }
    };

    // Battle Menu Actions for XpCardMenu
    const battleMenuActions = computed(() => [
      {
        id: 'attack',
        label: 'Attack',
        faIcon: 'fist-raised',
        click: () => {
          // Open the task menu
          showTaskMenu.value = true;
          playSound("confirm");
        }
      },
      {
        id: 'abilities',
        label: 'Abilities',
        faIcon: 'comet',
        click: () => handleBattleAction({ action: 'abilities' })
      },
      {
        id: 'goods',
        label: 'Goods',
        faIcon: 'backpack',
        click: () => handleBattleAction({ action: 'goods' })
      },
      {
        id: 'defend',
        label: 'Defend',
        faIcon: 'shield-alt',
        click: () => handleBattleAction({ action: 'defend' })
      },

      {
        id: 'run',
        label: 'Run Away',
        faIcon: 'running',
        click: () => handleBattleAction({ action: 'run' })
      }
    ]);

    return {
      // State refs
      pageRef,
      battleBackground,
      battleDialogText,
      battleStarted,
      isPlayerTurn,
      currentEnemy,
      enemyAnimationClass,
      enemyHealthColor,
      enemyProgressPercent,
      enemyAttackTimerPercent,
      atbTimeRemaining,
      atbBarStyle,
      atbIconColor,
      combatTasks,
      battleMessage,

      finishCombatTask,
      bg1,
      bg2,
      user,
      hasMoreBattleDialog,
      isBattleDialogTyping,
      isVictoryMessage,
      battleDialogRef,
      showEnemyHp,
      enemySizeClass,
      battleMenuActions,
      showEnemy,
      showTaskMenu,
      isBackgroundActive,

      // Task Menu Methods
      closeTaskMenu,
      handleTaskAttackResult,

      // Methods for battle dialog
      queueBattleDialog,
      showNextBattleDialog,
      onBattleDialogComplete,
      advanceBattleDialog,

      // Append mode for level-up sequences
      isAppendMode,
      accumulatedDialogLines,
      enableAppendMode,
      disableAppendMode,

      // Methods for battle mechanics
      changeBg,
      enterBattle,
      loadBeastById,
      loadSampleBeast,
      createSampleEnemy,
      initBattle,
      handleBattleAction,
      victoryAnimation,


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

      // Dev tools methods
      openProfileSelector,
      openBeastSelector,
      openControlsModal,

      // Battle actions methods (for DevBattleActionsFab)
      triggerAttackAnimation,
      triggerEnemyHit,
      triggerPlayerHit,
      triggerVictoryAnimation,
      triggerDefeatAnimation,
      resetBattle,

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