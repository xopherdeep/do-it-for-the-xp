<template>
  <ion-page>
    <ion-content>
      <!-- Battle Room Preview -->
      <div class="battleroom-container">
        <BattleField 
          class="battleground-component"
          ref="battlegroundRef"
          :taskId="0"
          :enemyType="selectedEnemyType"
          :userId="String(selectedProfile?.userData?.id || 1)"
          :userName="selectedProfile?.name || 'Developer'"
          :beastAvatar="selectedBeast?.avatar || null"
          :showEnemyInfo="false"
        />
      </div>
    </ion-content>

    <!-- Battle Dialog Box (Earthbound-style) -->
    <div class="battle-dialog-overlay" v-if="showBattleDialog" @click="advanceBattleDialog">
      <div class="battle-dialog-box rpg-box">
        <div class="dialog-content">
          <xp-typing-text
            ref="battleDialogText"
            :text="battleDialogText"
            :speed="25"
            :auto-start="true"
            :sound-theme="$fx?.theme?.rpg"
            sound-type="text"
            @typing-complete="onBattleDialogComplete"
            class="battle-text"
            :has-more-text="hasMoreBattleDialog"
          />
        </div>
        <div v-if="hasMoreBattleDialog" class="dialog-indicator">
          <i class="fad fa-chevron-down blink"></i>
        </div>
      </div>
    </div>

    <!-- Victory Dialog Box (Special styling for victory messages) -->
    <div class="victory-dialog-overlay" v-if="showVictoryDialog" @click="advanceVictoryDialog">
      <div class="victory-dialog-box rpg-box">
        <div class="victory-title" v-if="isShowingVictoryTitle">You Won!</div>
        <div class="dialog-content">
          <xp-typing-text
            ref="victoryDialogText"
            :text="victoryDialogText"
            :speed="25"
            :auto-start="true"
            :sound-theme="$fx?.theme?.rpg"
            sound-type="text"
            @typing-complete="onVictoryDialogComplete"
            class="victory-text"
            :has-more-text="hasMoreVictoryDialog"
          />
        </div>
        <div v-if="hasMoreVictoryDialog" class="dialog-indicator">
          <i class="fad fa-chevron-down blink"></i>
        </div>
      </div>
    </div>

    <!-- Configuration Toolbox FAB -->
    <DevToolsFab 
      @open-profile-selector="openProfileSelector" 
      @open-beast-selector="openBeastSelector" 
      @open-controls-modal="openControlsModal" 
    />
    
    <!-- Battle Actions FAB -->
    <BattleActionsFab
      @attack-animation="triggerAttackAnimation"
      @enemy-hit="triggerEnemyHit"
      @player-hit="triggerPlayerHit"
      @victory-animation="triggerVictoryAnimation"
      @defeat-animation="triggerDefeatAnimation"
      @reset-battle="resetBattle"
    />
    
    <!-- Dev Controls Modal -->
    <ion-modal ref="controlsModal" :is-open="isControlsModalOpen" @didDismiss="isControlsModalOpen = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Development Controls</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="isControlsModalOpen = false">
              <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <!-- Task Enemy Visualization Section -->
          <ion-item-divider>
            <ion-label>Task Enemy Configuration</ion-label>
          </ion-item-divider>

          <ion-item>
            <ion-label>Task Type</ion-label>
            <ion-select v-model="selectedTaskType" @ionChange="changeTaskType">
              <ion-select-option value="daily">Daily Chore</ion-select-option>
              <ion-select-option value="weekly">Weekly Task</ion-select-option>
              <ion-select-option value="project">Project Milestone</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label>Task Difficulty</ion-label>
            <ion-range :min="1" :max="5" :step="1" v-model="taskDifficultyValue" @ionChange="onDifficultyChange" snaps>
              <ion-icon slot="start" size="small" :icon="easyIcon"></ion-icon>
              <ion-icon slot="end" :icon="hardIcon"></ion-icon>
            </ion-range>
          </ion-item>

          <ion-item>
            <ion-label>Enemy Health</ion-label>
            <ion-progress-bar :value="taskDifficulty / 5" :color="healthBarColor"></ion-progress-bar>
          </ion-item>

          <ion-item>
            <ion-button expand="block" @click="simulateTaskProgress">
              Simulate Task Progress
            </ion-button>
          </ion-item>
          
          <ion-item-divider>
            <ion-label>Battle Environment</ion-label>
          </ion-item-divider>

          <!-- Existing controls -->
          <ion-item>
            <ion-label>Enemy Type</ion-label>
            <ion-select v-model="selectedEnemyType" @ionChange="changeEnemyType">
              <ion-select-option value="basic">Basic</ion-select-option>
              <ion-select-option value="miniboss">Mini Boss</ion-select-option>
              <ion-select-option value="boss">Boss</ion-select-option>
            </ion-select>
          </ion-item>
          
          <ion-item>
            <ion-label>Battle State</ion-label>
            <ion-toggle v-model="battleActive" @ionChange="toggleBattleState"></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-button expand="block" @click="triggerBattle">
              Trigger Battle
            </ion-button>
          </ion-item>
        </ion-list>
        
        <!-- Task Enemy Preview -->
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>Current Task Enemy</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="task-enemy-preview">
              <h3>{{ currentTaskName }}</h3>
              <div class="enemy-health">
                <span>HP: {{ taskHealth }} / {{ maxTaskHealth }}</span>
                <ion-progress-bar :value="taskHealth / maxTaskHealth" :color="healthBarColor"></ion-progress-bar>
              </div>
              <div class="enemy-status">
                <p><strong>Type:</strong> {{ taskTypeDisplay }}</p>
                <p><strong>Difficulty:</strong> {{ taskDifficultyDisplay }}</p>
                <p><strong>Rewards:</strong> {{ taskRewards }}</p>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
        
        <!-- Battle State Info -->
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>Battle State</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <pre>{{ battleStateJson }}</pre>
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-modal>

    <!-- Beast Selector Modal -->
    <ion-modal ref="beastSelectorModal" :is-open="isBeastModalOpen" @didDismiss="isBeastModalOpen = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Beast Selector</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="isBeastModalOpen = false">
              <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-item-divider>
            <ion-label>Select Beast</ion-label>
          </ion-item-divider>
          
          <ion-item button v-for="beast in beasts" :key="beast.id" @click="selectBeast(beast)">
            <ion-thumbnail slot="start" class="cursor-pointer">
              <ion-img
                v-if="beast?.avatar"
                :src="getAvatar(beast.avatar)"
                class="w-full p-0 m-0"
              />
              <ion-skeleton-text v-else animated />
            </ion-thumbnail>
            <ion-label>
              <h2>{{ beast.name }}</h2>
              <p>{{ beast.checklist?.length || 0 }} Challenges</p>
            </ion-label>
          </ion-item>

          <ion-item v-if="beasts.length === 0">
            <ion-label class="ion-text-center">
              <p>Loading beasts or no beasts found...</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>

    <!-- Profile Selector Modal -->
    <ion-modal ref="profileSelectorModal" :is-open="isProfileModalOpen" @didDismiss="isProfileModalOpen = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Profile Selector</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="isProfileModalOpen = false">
              <ion-icon :icon="closeOutline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-item-divider>
            <ion-label>Select Profile</ion-label>
          </ion-item-divider>
          
          <ion-item button v-for="profile in profiles" :key="profile.id" @click="selectProfile(profile)">
            <ion-avatar slot="start" class="cursor-pointer">
              <ion-img
                v-if="profile?.avatar"
                :src="profile.avatar"
                class="w-full p-0 m-0"
              />
              <ion-icon v-else :icon="personOutline" class="w-full p-2 text-gray-500" />
            </ion-avatar>
            <ion-label>
              <h2>{{ profile.name }}</h2>
              <p>{{ profile.role || 'User' }} - Level {{ profile.level || 1 }}</p>
            </ion-label>
            <ion-badge v-if="profile.id === selectedProfile?.id" color="primary" slot="end">Selected</ion-badge>
          </ion-item>

          <ion-item v-if="profiles.length === 0">
            <ion-label class="ion-text-center">
              <p>Loading profiles or no profiles found...</p>
            </ion-label>
          </ion-item>

          <ion-item>
            <ion-button expand="block" fill="outline" @click="createNewProfile">
              <ion-icon :icon="addOutline" slot="start"></ion-icon>
              Create New Profile
            </ion-button>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import BattleField from '@/views/Console/BattleField/BattleField.vue';
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
import Ionic from '@/mixins/ionic';
import BestiaryDb, { Beast, beastStorage } from '@/lib/databases/BestiaryDb';
import ProfileDb from '@/lib/databases/ProfileDb';
import { profileStorage } from '@/views/App/SideMenu/SwitchProfile/SwitchProfile.vue';
import { modalController, actionSheetController } from '@ionic/vue';
import AddProfile from '@/views/App/SideMenu/SwitchProfile/AddProfile/AddProfile.vue';
// Import our new FAB components
import DevToolsFab from '@/views/Console/BattleField/hud/dev/DevToolsFab.vue';
import BattleActionsFab from '@/views/Console/BattleField/hud/dev/DevBattleActionsFab.vue';
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
    const store = useStore();
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
    const getAvatar = (id) => {
      const pad = id.toString().padStart(3, '0');
      return require(`@/assets/images/beasts/${pad}.png`);
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

    const battleState = computed(() => store.getters.battleState);
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
      // store.dispatch('updateTaskEnemy', { 
      //   type: selectedTaskType.value,
      //   difficulty: taskDifficulty.value,
      //   health: taskHealth.value,
      //   maxHealth: maxTaskHealth.value
      // });
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
        store.dispatch('enterBattle');
      } else {
        store.dispatch('leaveBattle');
      }
    };

    // Trigger a battle
    const triggerBattle = () => {
      store.commit('ACTIVATE_BATTLE');
      store.dispatch('enterBattle');
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
    const requireAvatar = require.context('@/assets/images/avatars', false, /\.svg$/);

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
          // {
          //   text: 'Change Background',
          //   icon: 'image-outline',
          //   handler: () => {
          //     openBgSelector();
          //   }
          // },
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
    
    // Add battle dialog state and methods
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
      bgSelectorTarget, // Use the renamed computed property
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
      taskDifficultyValue, // Add this to the return object
      onDifficultyChange, // Add this to the return object
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
      getAvatar, // Add the getAvatar method
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
</script>

<style scoped>
ion-page{
  max-height: 50vh;
  overflow: hidden;
} 
.battleroom-container {
  width: 100%;
  /* height: 100vh; */
  position: relative;
  overflow: hidden;
}

pre {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  max-height: 150px;
  overflow-y: auto;
}

.task-enemy-preview {
  padding: 10px;
  border: 1px solid var(--ion-color-medium);
  border-radius: 8px;
  background: rgba(var(--ion-background-color-rgb), 0.6);
}

.enemy-health {
  margin: 10px 0;
}

.enemy-status {
  font-size: 0.9em;
}

.enemy-status p {
  margin: 5px 0;
}

/* Screen shake animation for player hit effects */
@keyframes screenShake {
  0% { transform: translate(0, 0) rotate(0); }
  10% { transform: translate(-5px, -5px) rotate(-1deg); }
  20% { transform: translate(5px, -5px) rotate(1deg); }
  30% { transform: translate(-5px, 5px) rotate(0); }
  40% { transform: translate(5px, 5px) rotate(1deg); }
  50% { transform: translate(-5px, -5px) rotate(-1deg); }
  60% { transform: translate(5px, 0) rotate(0); }
  70% { transform: translate(-5px, 0) rotate(-1deg); }
  80% { transform: translate(0, 5px) rotate(1deg); }
  90% { transform: translate(0, -5px) rotate(0); }
  100% { transform: translate(0, 0) rotate(0); }
}

.screen-shake {
  animation: screenShake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  transform-origin: center center;
}

/* Fix any background rendering issues */
.battleground-component {
  width: 100%;
  height: 100%;
}

.toolbox-fab {
  margin-top: 10px;
  margin-right: 10px;
  z-index: 100;
}

.toolbox-fab ion-fab-button {
  --box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s ease;
}

.toolbox-fab ion-fab-button:hover {
  transform: scale(1.05);
}

.toolbox-fab i {
  color: white;
  font-size: 20px;
}

/* Make sure the battleground takes up full screen space */
.battleroom-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

/* Battle Dialog Styling */
.battle-dialog-overlay {
  position: fixed;
  bottom: 20px;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  pointer-events: none;
}

.battle-dialog-box {
  width: 90%;
  max-width: 500px;
  background-color: rgba(0, 0, 0, 0.8);
  border: 2px solid white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
  pointer-events: auto;
  cursor: pointer;
}

.battle-text {
  color: white;
  font-size: 1.1rem;
  line-height: 1.4;
  min-height: 3rem;
}

/* Victory Dialog Styling */
.victory-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1500;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

.victory-dialog-box {
  width: 90%;
  max-width: 500px;
  background-color: rgba(0, 0, 0, 0.9);
  border: 3px solid gold;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.victory-title {
  color: gold;
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 15px;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
  animation: victoryPulse 1.5s infinite;
}

.victory-text {
  color: white;
  font-size: 1.2rem;
  line-height: 1.5;
  min-height: 3rem;
}

.dialog-indicator {
  text-align: center;
  margin-top: 10px;
}

.dialog-indicator i {
  color: white;
  font-size: 1.2rem;
}

/* Animation for the victory title */
@keyframes victoryPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* Animation for screen collapse effect */
@keyframes screenCollapse {
  0% { transform: scaleY(1); }
  100% { transform: scaleY(0); }
}

.screen-collapse {
  animation: screenCollapse 1s ease-in forwards;
}

/* Blinking indicator animation */
.blink {
  animation: blink-animation 1s steps(5, start) infinite;
}

@keyframes blink-animation {
  to {
    visibility: hidden;
  }
}
</style>