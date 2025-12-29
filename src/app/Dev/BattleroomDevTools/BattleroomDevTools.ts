import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useBattleStore } from '@/lib/store/stores/battle';
import BattleField from '@/app/Console/BattleField/BattleField.vue';
import { toastController } from '@ionic/vue';
import {
  skull,
  fitnessOutline,
  settingsOutline,
  closeOutline,
  pawOutline,
  personOutline,
  addOutline,
  closeCircleOutline,
  flashOutline,
  flameOutline,
  pulseOutline,
  trophyOutline,
  skullOutline,
  refreshOutline
} from 'ionicons/icons';
import Ionic from '@/lib/mixins/ionic';
import BestiaryDb, { Beast, beastStorage } from '@/lib/databases/BestiaryDb';
import ProfileDb from '@/lib/databases/ProfileDb';
import { profileStorage } from '@/app/SideMenu/SwitchProfile/SwitchProfile.vue';
import { modalController, actionSheetController } from '@ionic/vue';
import AddProfile from '@/app/SideMenu/SwitchProfile/AddProfile/AddProfile.vue';
// Import our new FAB components
import DevToolsFab from '@/app/Console/BattleField/hud/dev/DevToolsFab.vue';
import BattleActionsFab from '@/app/Console/BattleField/hud/dev/DevBattleActionsFab.vue';
import debug from '@/lib/utils/debug';

// Define an interface for the BattleField component
interface BattleFieldInstance {
  initBackground?: () => void;
  enterBattle?: () => void;
  loadBeastById?: (id: string) => void;
  loadSampleBeast?: () => void;
  createSampleEnemy?: () => void;
  initBattle?: () => void;
  aspectRatio?: number;
  bg1?: number;
  bg2?: number;
  // Add the actual methods that exist in BattleField component
  handleBattleAction?: (action: { action: string }) => void;
  defeatEnemy?: (enemy?: any) => void;
  currentEnemy?: any;
  enemyAnimationClass?: string;
  performEnemyTurn?: () => void;
  endPlayerTurn?: () => void;
  victoryAnimation?: () => void; // Add the missing method
}

// Define an interface for the Profile data
interface Profile {
  id: number;
  name: string;
  role: string;
  level: number;
  avatar?: string;
  userData?: any; // Store the full user data from the database
}

// Define an interface for the new profile form
interface NewProfile {
  name: string;
  role: string;
  level: number;
  avatar: string;
}

export default defineComponent({
  name: 'BattleroomDevTools',
  mixins: [Ionic],
  components: {
    BattleField,
    DevToolsFab,
    BattleActionsFab,
  },
  setup() {
    const battleStore = useBattleStore();
    // Properly type the battleground ref with the BattleFieldInstance interface
    const battlegroundRef = ref<BattleFieldInstance | null>(null);
    const controlsModal = ref(null);
    const isControlsModalOpen = ref(false);
    const customBg1 = ref(0);
    const customBg2 = ref(0);
    const selectedAspectRatio = ref(48);
    const selectedEnemyType = ref('basic');
    const battleActive = ref(false);

    // Beast selector related state
    const isBeastModalOpen = ref(false);
    const beasts = ref<Beast[]>([]);
    const selectedBeast = ref<Beast | null>(null);
    const bestiary = new BestiaryDb(beastStorage);

    // Load beasts from the database with improved debugging
    const loadBeasts = async () => {
      try {
        // Debug the storage environment
        debug.log('Current localStorage keys:', Object.keys(localStorage));

        // Try to get beasts from normal environment
        beasts.value = await bestiary.getBeasts();
        debug.log(`Loaded ${beasts.value.length} beasts from BestiaryDb`);
        debug.log('Beast data:', JSON.stringify(beasts.value, null, 2));

        // If no beasts found and we're in battleroom environment, try to load from main app storage
        if (beasts.value.length === 0 && window.location.href.includes('battleroom')) {
          debug.log('No beasts found in battleroom environment. Trying to load from main app storage...');

          // Check if there's a beast data in the main app storage
          const mainStorageKey = 'xp-bestiary'; // This is likely the key used in main app
          const mainBeastsData = localStorage.getItem(mainStorageKey);

          if (mainBeastsData) {
            try {
              const parsedData = JSON.parse(mainBeastsData);
              if (Array.isArray(parsedData) && parsedData.length > 0) {
                debug.log('Found beasts in main app storage:', parsedData.length);
                beasts.value = parsedData;

                // Save each beast to the current environment's storage for future use
                for (const beast of parsedData) {
                  await bestiary.setBeast(beast);
                }
              }
            } catch (parseError) {
              debug.error('Error parsing main app beast data:', parseError);
            }
          }
        }
      } catch (error) {
        debug.error('Error loading beasts:', error);

        // Show error toast
        const toast = await toastController.create({
          message: 'Failed to load beasts',
          duration: 3000,
          position: 'top',
          color: 'danger'
        });
        toast.present();
      }
    };

    // Open beast selector modal and load beasts if needed
    const openBeastSelector = async () => {
      isBeastModalOpen.value = true;

      // Load beasts if we haven't yet
      if (beasts.value.length === 0) {
        await loadBeasts();
      }
    };

    // Helper method to get beast avatar
    const getAvatar = (id: string | number) => {
      const pad = id.toString().padStart(3, '0');
      try {
        return require(`@/assets/images/beasts/${pad}.png`);
      } catch (e) {
        debug.error(`Could not load avatar for beast ${id}`, e);
        return '';
      }
    };

    // Helper method to get beast description
    const getBeastDescription = (beast: Beast) => {
      // Use beast properties to create a description
      const checklist = beast.checklist || [];
      const aspectRatio = beast.aspectRatio || 30; // Default to 30 if undefined
      const type = aspectRatio > 60 ? 'Boss' :
        aspectRatio > 40 ? 'Miniboss' : 'Basic';

      return `${type} - ${checklist.length} challenge${checklist.length !== 1 ? 's' : ''}`;
    };

    // Select a beast and close the modal
    const selectBeast = async (beast: Beast) => {
      selectedBeast.value = beast;

      // Update enemy type based on beast aspect ratio
      const aspectRatio = beast.aspectRatio || 30; // Default to 30 if undefined
      if (aspectRatio > 60) {
        selectedEnemyType.value = 'boss';
      } else if (aspectRatio > 40) {
        selectedEnemyType.value = 'miniboss';
      } else {
        selectedEnemyType.value = 'basic';
      }

      // Update the background settings if available
      if (typeof beast.bg1 === 'number' && typeof beast.bg2 === 'number') {
        customBg1.value = beast.bg1;
        customBg2.value = beast.bg2;

        if (typeof beast.aspectRatio === 'number') {
          selectedAspectRatio.value = beast.aspectRatio;
        }
      }

      // Close modal first to avoid UI jank
      isBeastModalOpen.value = false;

      // Show confirmation toast
      const toast = await toastController.create({
        message: `Selected beast: ${beast.name}`,
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      toast.present();

      // Update task enemy for the dev controls
      updateTaskEnemy();

      // IMPORTANT: This is the key fix - we need to wait a moment for the component to update
      // with the new beastAvatar prop, then directly load the beast using its ID
      setTimeout(() => {
        if (battlegroundRef.value && typeof battlegroundRef.value.loadBeastById === 'function') {
          // Load the beast directly by ID
          battlegroundRef.value.loadBeastById(beast.id);

          // Apply background settings
          if (typeof beast.bg1 === 'number' && typeof beast.bg2 === 'number') {
            battlegroundRef.value.bg1 = beast.bg1;
            battlegroundRef.value.bg2 = beast.bg2;
            if (typeof beast.aspectRatio === 'number') {
              battlegroundRef.value.aspectRatio = beast.aspectRatio;
            }

            // Refresh the background
            if (typeof battlegroundRef.value.enterBattle === 'function') {
              battlegroundRef.value.enterBattle();
            }
          }

          // Start the battle after loading the beast
          setTimeout(() => {
            if (battlegroundRef.value && typeof battlegroundRef.value.initBattle === 'function') {
              battlegroundRef.value.initBattle();
            }
          }, 300);
        }
      }, 200);
    };

    // Create a computed property that returns an object for the background selector
    const bgSelectorTarget = computed(() => ({
      bg1: customBg1.value,
      bg2: customBg2.value,
      aspectRatio: selectedAspectRatio.value,
      enterBattle: () => {
        if (battlegroundRef.value && typeof battlegroundRef.value.enterBattle === 'function') {
          battlegroundRef.value.enterBattle();
        }
      }
    }));

    // Task-Enemy related state
    const selectedTaskType = ref('daily');
    const taskDifficulty = ref<number>(3);
    // Fix the ion-range issue by using explicit number typing
    const taskDifficultyValue = ref<number>(3);
    const taskHealth = ref(100);
    const maxTaskHealth = ref(100);
    const taskProgressStep = ref(20);

    const battleState = computed(() => ({
      active: battleStore.active,
      timer: battleStore.timer,
      steps: battleStore.steps,
      terrain: battleStore.terrain
    }));
    const battleStateJson = computed(() => JSON.stringify(battleState.value, null, 2));

    // Task-Enemy computed properties
    const currentTaskName = computed(() => {
      const typeNames = {
        daily: 'Clean the Kitchen',
        weekly: 'Finish Project Report',
        project: 'Redesign Website'
      };
      return typeNames[selectedTaskType.value as keyof typeof typeNames] || 'Unknown Task';
    });

    const taskTypeDisplay = computed(() => {
      const typeDisplays = {
        daily: 'Daily Chore (Slime)',
        weekly: 'Weekly Task (Goblin)',
        project: 'Project Milestone (Dragon)'
      };
      return typeDisplays[selectedTaskType.value as keyof typeof typeDisplays] || 'Unknown';
    });

    const taskDifficultyDisplay = computed(() => {
      const difficultyLabels = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
      return difficultyLabels[taskDifficulty.value - 1] || 'Medium';
    });

    const taskRewards = computed(() => {
      const baseXP = taskDifficulty.value * 10;
      const baseGold = taskDifficulty.value * 5;
      return `${baseXP} XP, ${baseGold} GP`;
    });

    const healthBarColor = computed(() => {
      const healthPercentage = taskHealth.value / maxTaskHealth.value;
      if (healthPercentage > 0.6) return 'success';
      if (healthPercentage > 0.3) return 'warning';
      return 'danger';
    });

    // Icons for the range slider
    const easyIcon = fitnessOutline;
    const hardIcon = skull;

    // Open controls modal
    const openControlsModal = () => {
      isControlsModalOpen.value = true;
    };

    // Handle background changes from the selector component
    const onBackgroundChanged = (bgData: { bg1: number, bg2: number, aspectRatio?: number }) => {
      // Update background values
      customBg1.value = bgData.bg1;
      customBg2.value = bgData.bg2;

      if (bgData.aspectRatio !== undefined) {
        selectedAspectRatio.value = bgData.aspectRatio;
      }

      // Update the bg1, bg2, and aspectRatio properties on the BattleField component
      if (battlegroundRef.value) {
        // Update the properties directly
        battlegroundRef.value.bg1 = customBg1.value;
        battlegroundRef.value.bg2 = customBg2.value;
        battlegroundRef.value.aspectRatio = selectedAspectRatio.value;

        // Then call enterBattle to refresh the background with these new values
        setTimeout(() => {
          if (battlegroundRef.value && typeof battlegroundRef.value.enterBattle === 'function') {
            battlegroundRef.value.enterBattle();

            // Re-initialize the battle after background changes
            setTimeout(() => {
              if (battlegroundRef.value && typeof battlegroundRef.value.initBattle === 'function') {
                battlegroundRef.value.initBattle();
              }
            }, 300);
          } else {
            debug.warn('battlegroundRef or enterBattle method not available');
          }
        }, 100);
      }
    };

    // Change enemy type
    const changeEnemyType = () => {
      updateTaskEnemy();
    };

    // Change task type
    const changeTaskType = () => {
      updateTaskEnemy();
    };

    // Update task enemy based on current settings
    const updateTaskEnemy = () => {
      // Set max health based on difficulty
      maxTaskHealth.value = taskDifficulty.value * 50;
      taskHealth.value = maxTaskHealth.value;

      // Update enemy in store if needed
      // store.dispatch('updateTaskEnemy', { ... }); -- Legacy Vuex dispatch removed
    };

    // Simulate progress on the current task
    const simulateTaskProgress = async () => {
      // Reduce task health
      taskHealth.value = Math.max(0, taskHealth.value - taskProgressStep.value);

      // Show toast with action result
      const toast = await toastController.create({
        message: `You made progress on "${currentTaskName.value}"!`,
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();

      // Check if task is complete
      if (taskHealth.value <= 0) {
        const completionToast = await toastController.create({
          message: `Task completed! You earned ${taskRewards.value}!`,
          duration: 3000,
          position: 'middle',
          color: 'tertiary',
          buttons: [
            {
              text: 'Awesome!',
              role: 'cancel'
            }
          ]
        });
        await completionToast.present();

        // Reset task after brief delay
        setTimeout(() => {
          taskHealth.value = maxTaskHealth.value;
        }, 3000);
      }
    };

    // Toggle battle state
    const toggleBattleState = () => {
      if (battleActive.value) {
        battleStore.enterBattle();
      } else {
        battleStore.deactivateBattle();
      }
    };

    // Trigger a battle
    const triggerBattle = () => {
      battleStore.activateBattle();
      battleStore.enterBattle();
      battleActive.value = true;
      // Close the modal after triggering a battle
      isControlsModalOpen.value = false;
    };

    // Watch for difficulty changes to update task enemy
    watch(taskDifficulty, () => {
      updateTaskEnemy();
    });

    onMounted(() => {
      // Initialize battleroom with default settings
      setTimeout(() => {
        updateTaskEnemy();
        // Initialize the background if ref is available
        if (battlegroundRef.value && typeof battlegroundRef.value.initBackground === 'function') {
          battlegroundRef.value.initBackground();
        }
      }, 500);
    });

    // Handle ion-range change for task difficulty with proper typing
    const onDifficultyChange = (event: CustomEvent) => {
      const value = event.detail.value;
      taskDifficultyValue.value = typeof value === 'string' ? parseInt(value, 10) : value;
      taskDifficulty.value = taskDifficultyValue.value;
      updateTaskEnemy();
    };

    // Profile selector related state
    const isProfileModalOpen = ref(false);
    const profiles = ref<Profile[]>([]);
    const selectedProfile = ref<Profile | null>(null);
    const newProfile = ref<NewProfile>({
      name: '',
      role: 'User',
      level: 1,
      avatar: ''
    });

    // Require avatar images
    const requireAvatar = (require as any).context('@/assets/images/avatars', false, /\.svg$/);

    // Open profile selector modal
    const openProfileSelector = () => {
      isProfileModalOpen.value = true;
      loadProfiles();
    };

    // Load profiles from the database or storage
    const loadProfiles = async () => {
      try {
        const profileDb = new ProfileDb(profileStorage);
        const userProfiles = await profileDb.getProfiles();

        if (userProfiles && userProfiles.length > 0) {
          profiles.value = userProfiles.map(user => ({
            id: user.id,
            name: user.name.nick || user.name.full,
            role: user.jobClass || 'User',
            level: user.stats?.level || 1,
            avatar: user.avatar ? requireAvatar(`./${user.avatar}.svg`) : '',
            // Store the full user object for battle
            userData: user
          }));
        } else {
          // Show a message if no profiles are found
          const toast = await toastController.create({
            message: 'No profiles found in the database',
            duration: 3000,
            position: 'top',
            color: 'warning'
          });
          toast.present();
        }
      } catch (error) {
        debug.error('Error loading profiles:', error);

        // Show error toast
        const toast = await toastController.create({
          message: 'Failed to load profiles',
          duration: 3000,
          position: 'top',
          color: 'danger'
        });
        toast.present();
      }
    };

    // Select a profile and close the modal
    const selectProfile = (profile: Profile) => {
      selectedProfile.value = profile;
      isProfileModalOpen.value = false;
    };

    // Create new profile modal state
    const isCreateProfileModalOpen = ref(false);

    // Open create profile modal using the existing AddProfile component
    const createNewProfile = async () => {
      const modal = await modalController.create({
        component: AddProfile,
        cssClass: "fullscreen",
      });

      await modal.present();

      const { data } = await modal.onDidDismiss();
      if (data?.profileAdded) {
        // If profile was created successfully, reload profiles
        loadProfiles();
      }
    };

    // Save new profile - This function isn't used anymore since we use the AddProfile modal
    const saveNewProfile = async () => {
      try {
        // Close the current modal and open the proper AddProfile modal instead
        isCreateProfileModalOpen.value = false;
        await createNewProfile();
      } catch (error) {
        debug.error('Error when opening profile creation modal:', error);

        // Show error toast
        const toast = await toastController.create({
          message: 'Failed to open profile creation modal',
          duration: 3000,
          position: 'top',
          color: 'danger'
        });
        toast.present();
      }
    };

    // Background selector modal state
    const isBgSelectorModalOpen = ref(false);

    // Open the background selector modal
    const openBgSelector = () => {
      isBgSelectorModalOpen.value = true;
    };

    // Action sheet for dev tools
    const openDevToolsActionSheet = async () => {
      const actionSheet = await actionSheetController.create({
        header: 'Battleroom Dev Tools',
        mode: 'ios',
        buttons: [
          {
            text: 'Select Profile',
            icon: personOutline,
            handler: () => {
              openProfileSelector();
            }
          },
          {
            text: 'Select Beast',
            icon: pawOutline,
            handler: () => {
              openBeastSelector();
            }
          },
          {
            text: 'Battle Controls',
            icon: settingsOutline,
            handler: () => {
              openControlsModal();
            }
          },
          {
            text: 'Cancel',
            icon: closeCircleOutline,
            role: 'cancel',
          }
        ]
      });

      await actionSheet.present();
    };

    // Action sheet for battle animations and actions
    const openBattleActionsSheet = async () => {
      const actionSheet = await actionSheetController.create({
        header: 'Battle Actions',
        mode: 'ios',
        buttons: [
          {
            text: 'Attack Animation',
            icon: flashOutline,
            handler: () => {
              triggerAttackAnimation();
            }
          },
          {
            text: 'Enemy Hit Animation',
            icon: flameOutline,
            handler: () => {
              triggerEnemyHit();
            }
          },
          {
            text: 'Player Hit Animation',
            icon: pulseOutline,
            handler: () => {
              triggerPlayerHit();
            }
          },
          {
            text: 'Victory Animation',
            icon: trophyOutline,
            handler: () => {
              triggerVictoryAnimation();
            }
          },
          {
            text: 'Defeat Animation',
            icon: skullOutline,
            handler: () => {
              triggerDefeatAnimation();
            }
          },
          {
            text: 'Reset Battle',
            icon: refreshOutline,
            handler: () => {
              resetBattle();
            }
          },
          {
            text: 'Cancel',
            icon: closeOutline,
            role: 'cancel',
          }
        ]
      });

      await actionSheet.present();
    };

    // Battle animation methods
    const triggerAttackAnimation = async () => {
      if (battlegroundRef.value) {
        // Use the battle service to handle the attack action if available
        if (battlegroundRef.value.handleBattleAction) {
          battlegroundRef.value.handleBattleAction({ action: 'attack' });

          const toast = await toastController.create({
            message: 'Player attack animation triggered',
            duration: 1500,
            position: 'top',
            color: 'primary'
          });
          toast.present();
        } else {
          debug.warn('handleBattleAction method not available');

          const toast = await toastController.create({
            message: 'Attack animation not available',
            duration: 1500,
            position: 'top',
            color: 'warning'
          });
          toast.present();
        }
      }
    };

    // Battle dialog state and methods
    const showBattleDialog = ref(false);
    const battleDialogText = ref('');
    const battleDialogQueue = ref<string[]>([]);
    const hasMoreBattleDialog = ref(false);
    const isBattleDialogTyping = ref(false);

    // Victory dialog state
    const showVictoryDialog = ref(false);
    const victoryDialogText = ref('');
    const victoryDialogQueue = ref<string[]>([]);
    const hasMoreVictoryDialog = ref(false);
    const isVictoryDialogTyping = ref(false);
    const isShowingVictoryTitle = ref(false);

    // Queue battle dialog messages
    const queueBattleDialog = (messages: string[]) => {
      // Add messages to the queue
      battleDialogQueue.value = [...battleDialogQueue.value, ...messages];

      // If no dialog is currently displaying, show the first message
      if (!isBattleDialogTyping.value && !showBattleDialog.value) {
        showNextBattleDialog();
      }
    };

    // Show the next dialog message from the queue
    const showNextBattleDialog = () => {
      if (battleDialogQueue.value.length === 0) {
        // No more messages to show
        showBattleDialog.value = false;
        hasMoreBattleDialog.value = false;
        return;
      }

      // Get the next message
      const nextMessage = battleDialogQueue.value.shift();
      // Fix TypeScript error by providing fallback empty string if nextMessage is undefined
      battleDialogText.value = nextMessage || '';
      isBattleDialogTyping.value = true;
      hasMoreBattleDialog.value = battleDialogQueue.value.length > 0;

      // Show the dialog if it's not already visible
      showBattleDialog.value = true;
    };

    // Called when a battle dialog text finishes typing
    const onBattleDialogComplete = () => {
      isBattleDialogTyping.value = false;
    };

    // Called when the battle dialog is clicked
    const advanceBattleDialog = () => {
      if (isBattleDialogTyping.value) {
        // Complete the current text immediately
        const typingComponent = document.querySelector('.battle-dialog-overlay xp-typing-text') as any;
        if (typingComponent && typingComponent.completeTyping) {
          typingComponent.completeTyping();
        }
        isBattleDialogTyping.value = false;
      } else if (battleDialogQueue.value.length > 0) {
        // Show next message
        showNextBattleDialog();
      } else {
        // No more messages, hide the dialog
        showBattleDialog.value = false;
      }
    };

    // Queue victory dialog messages with special handling for victory title
    const queueVictoryDialog = (messages: string[], showVictoryTitle = false) => {
      // Set victory title flag
      isShowingVictoryTitle.value = showVictoryTitle;

      // Add messages to the queue
      victoryDialogQueue.value = [...victoryDialogQueue.value, ...messages];

      // If no dialog is currently displaying, show the first message
      if (!isVictoryDialogTyping.value && !showVictoryDialog.value) {
        showNextVictoryDialog();
      }
    };

    // Show the next victory dialog message from the queue
    const showNextVictoryDialog = () => {
      if (victoryDialogQueue.value.length === 0) {
        // No more messages to show
        setTimeout(() => {
          showVictoryDialog.value = false;
          isShowingVictoryTitle.value = false;
        }, 1000);
        hasMoreVictoryDialog.value = false;
        return;
      }

      // Get the next message
      const nextMessage = victoryDialogQueue.value.shift();
      // Fix TypeScript error by providing fallback empty string if nextMessage is undefined
      victoryDialogText.value = nextMessage || '';
      isVictoryDialogTyping.value = true;
      hasMoreVictoryDialog.value = victoryDialogQueue.value.length > 0;

      // Show the dialog if it's not already visible
      showVictoryDialog.value = true;
    };

    // Called when a victory dialog text finishes typing
    const onVictoryDialogComplete = () => {
      isVictoryDialogTyping.value = false;
    };

    // Called when the victory dialog is clicked
    const advanceVictoryDialog = () => {
      if (isVictoryDialogTyping.value) {
        // Complete the current text immediately
        const typingComponent = document.querySelector('.victory-dialog-overlay xp-typing-text') as any;
        if (typingComponent && typingComponent.completeTyping) {
          typingComponent.completeTyping();
        }
        isVictoryDialogTyping.value = false;
      } else if (victoryDialogQueue.value.length > 0) {
        // Show next message
        showNextVictoryDialog();
      } else {
        // No more messages, hide the dialog after a delay
        setTimeout(() => {
          showVictoryDialog.value = false;
          isShowingVictoryTitle.value = false;
        }, 1000);
      }
    };

    const triggerEnemyHit = async () => {
      if (battlegroundRef.value) {
        // Try to access the enemy animation class
        if (typeof battlegroundRef.value.enemyAnimationClass !== 'undefined') {
          // Apply damaged animation class to enemy
          battlegroundRef.value.enemyAnimationClass = 'damaged';

          // Reset animation class after a short delay
          setTimeout(() => {
            if (battlegroundRef.value) {
              battlegroundRef.value.enemyAnimationClass = '';
            }
          }, 500);

          const toast = await toastController.create({
            message: 'Enemy hit animation triggered',
            duration: 1500,
            position: 'top',
            color: 'primary'
          });
          toast.present();
        } else {
          debug.warn('enemyAnimationClass property not available');

          // Try fallback - handle battle action which should animate enemy hit
          if (battlegroundRef.value.handleBattleAction) {
            battlegroundRef.value.handleBattleAction({ action: 'attack' });

            const toast = await toastController.create({
              message: 'Enemy hit animation triggered (fallback)',
              duration: 1500,
              position: 'top',
              color: 'primary'
            });
            toast.present();
          } else {
            const toast = await toastController.create({
              message: 'Enemy hit animation not available',
              duration: 1500,
              position: 'top',
              color: 'warning'
            });
            toast.present();
          }
        }
      }
    };

    const triggerPlayerHit = async () => {
      // First, create a points counter if needed
      if (!taskHealth.value) {
        // Initialize health if it's not set
        taskHealth.value = maxTaskHealth.value || 100;
      }

      // Apply screen shake animation to the battleground container
      const battlegroundContainer = document.querySelector('.battleroom-container');
      if (battlegroundContainer) {
        battlegroundContainer.classList.add('screen-shake');

        // Remove the class after animation completes
        setTimeout(() => {
          battlegroundContainer.classList.remove('screen-shake');
        }, 500);
      }

      // Reduce points on the counter (using the task health as our points system)
      const damageAmount = Math.floor(Math.random() * 15) + 10; // Random damage between 10-25
      const previousHealth = taskHealth.value;
      taskHealth.value = Math.max(0, taskHealth.value - damageAmount);

      // Show damage notification
      const toast = await toastController.create({
        message: `Player hit! -${damageAmount} HP (${taskHealth.value}/${maxTaskHealth.value})`,
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
      toast.present();

      // Check if we should also trigger the battle animation
      if (battlegroundRef.value) {
        // Try to trigger enemy turn which should animate player being hit
        if (battlegroundRef.value.performEnemyTurn) {
          battlegroundRef.value.performEnemyTurn();
        } else if (battlegroundRef.value.endPlayerTurn) {
          // Alternative method if performEnemyTurn isn't directly accessible
          battlegroundRef.value.endPlayerTurn();
        }
      }

      // Check if player is defeated
      if (taskHealth.value <= 0 && previousHealth > 0) {
        const defeatToast = await toastController.create({
          message: 'Player defeated!',
          duration: 3000,
          position: 'middle',
          color: 'danger',
          buttons: [
            {
              text: 'Try Again',
              handler: () => resetBattle()
            }
          ]
        });
        defeatToast.present();
      }
    };

    const triggerVictoryAnimation = async () => {
      if (battlegroundRef.value) {
        // Try to handle a "victory" battle event
        if (battlegroundRef.value.victoryAnimation) {
          battlegroundRef.value.victoryAnimation();

          const toast = await toastController.create({
            message: 'Victory animation triggered',
            duration: 1500,
            position: 'top',
            color: 'success'
          });
          toast.present();
        } else {
          debug.warn('defeatEnemy method or currentEnemy not available');

          const toast = await toastController.create({
            message: 'Victory animation not available',
            duration: 1500,
            position: 'top',
            color: 'warning'
          });
          toast.present();
        }
      }
    };

    const triggerDefeatAnimation = async () => {
      if (battlegroundRef.value) {
        // Try to handle a "run" battle action, which is like a defeat/retreat
        if (battlegroundRef.value.handleBattleAction) {
          battlegroundRef.value.handleBattleAction({ action: 'run' });

          const toast = await toastController.create({
            message: 'Defeat/retreat animation triggered',
            duration: 1500,
            position: 'top',
            color: 'danger'
          });
          toast.present();
        } else {
          debug.warn('handleBattleAction method not available');

          const toast = await toastController.create({
            message: 'Defeat animation not available',
            duration: 1500,
            position: 'top',
            color: 'warning'
          });
          toast.present();
        }
      }
    };

    const resetBattle = async () => {
      if (battlegroundRef.value) {
        // Try to reset the battle using available methods
        if (typeof battlegroundRef.value.initBattle === 'function') {
          battlegroundRef.value.initBattle();
        }

        if (typeof battlegroundRef.value.enterBattle === 'function') {
          battlegroundRef.value.enterBattle();
        }

        if (typeof battlegroundRef.value.initBackground === 'function') {
          battlegroundRef.value.initBackground();
        }

        const toast = await toastController.create({
          message: 'Battle has been reset',
          duration: 1500,
          position: 'top',
          color: 'primary'
        });
        toast.present();
      }
    };

    return {
      battlegroundRef,
      bgSelectorTarget,
      controlsModal,
      isControlsModalOpen,
      openControlsModal,
      selectedEnemyType,
      battleActive,
      battleStateJson,
      changeEnemyType,
      toggleBattleState,
      triggerBattle,

      // Task-Enemy related properties
      selectedTaskType,
      taskDifficulty,
      taskDifficultyValue,
      onDifficultyChange,
      taskHealth,
      maxTaskHealth,
      currentTaskName,
      taskTypeDisplay,
      taskDifficultyDisplay,
      taskRewards,
      healthBarColor,
      easyIcon,
      hardIcon,
      changeTaskType,
      updateTaskEnemy,
      simulateTaskProgress,

      // Background controls
      customBg1,
      customBg2,
      selectedAspectRatio,
      onBackgroundChanged,

      // Beast selector related properties
      isBeastModalOpen,
      beasts,
      selectedBeast,
      openBeastSelector,
      getAvatar,
      getBeastDescription,
      selectBeast,

      // Profile selector related properties
      isProfileModalOpen,
      profiles,
      selectedProfile,
      openProfileSelector,
      selectProfile,
      isCreateProfileModalOpen,
      createNewProfile,
      newProfile,
      saveNewProfile,

      // Background selector modal state
      isBgSelectorModalOpen,
      openBgSelector,

      // Action sheet for dev tools
      openDevToolsActionSheet,
      openBattleActionsSheet,

      // Battle animation methods
      triggerAttackAnimation,
      triggerEnemyHit,
      triggerPlayerHit,
      triggerVictoryAnimation,
      triggerDefeatAnimation,
      resetBattle,

      // Battle dialog state and methods
      showBattleDialog,
      battleDialogText,
      battleDialogQueue,
      hasMoreBattleDialog,
      isBattleDialogTyping,
      queueBattleDialog,
      showNextBattleDialog,
      onBattleDialogComplete,
      advanceBattleDialog,

      // Victory dialog state and methods
      showVictoryDialog,
      victoryDialogText,
      victoryDialogQueue,
      hasMoreVictoryDialog,
      isVictoryDialogTyping,
      isShowingVictoryTitle,
      queueVictoryDialog,
      showNextVictoryDialog,
      onVictoryDialogComplete,
      advanceVictoryDialog,

      // Icons
      settingsOutline,
      closeOutline,
      pawOutline,
      personOutline,
      addOutline
    };
  }
});
