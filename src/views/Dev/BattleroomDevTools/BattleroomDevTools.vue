<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
      <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Battleroom Dev Tools</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openProfileSelector">
            <i class="fad fa-user-circle fa-lg"></i>
          </ion-button>
          <ion-button @click="openBeastSelector">
            <i class="fad fa-paw-claws fa-lg"></i>
          </ion-button>
          <XpBackgroundSelector
            :target-ref="bgSelectorTarget"
            :initial-bg1="customBg1"
            :initial-bg2="customBg2"
            :aspect-ratio="selectedAspectRatio"
            @background-changed="onBackgroundChanged"
          />
          <ion-button @click="openControlsModal">
            <ion-icon :icon="settingsOutline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Battle Room Preview -->
      <div class="battleroom-container">
        <BattleGround 
          class="battleground-component"
          ref="battlegroundRef"
          :taskId="0"
          :enemyType="selectedEnemyType"
          :userId="selectedProfile?.userData?.id || 1"
          :userName="selectedProfile?.name || 'Developer'"
          :beastAvatar="selectedBeast?.avatar || null"
          :showEnemyInfo="false"
        />
      </div>
    </ion-content>
    
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
import BattleGround from '@/views/Console/MyPortal/HomeTown/BattleGround/BattleGround.vue';
import XpBackgroundSelector from '@/components/XpBackgroundSelector/XpBackgroundSelector.vue';
import { toastController } from '@ionic/vue';
import { 
  skull,
  fitnessOutline,
  settingsOutline, 
  closeOutline,
  pawOutline,
  personOutline,
  addOutline
} from 'ionicons/icons';
import Ionic from '@/mixins/ionic';
import BestiaryDb, { Beast, beastStorage } from '@/lib/databases/BestiaryDb';
import ProfileDb from '@/lib/databases/ProfileDb';
import { profileStorage } from '@/views/App/SideMenu/SwitchProfile/SwitchProfile.vue';
import { modalController } from '@ionic/vue';
import AddProfile from '@/views/App/SideMenu/SwitchProfile/AddProfile/AddProfile.vue';

// Define an interface for the BattleGround component
interface BattleGroundInstance {
  initBackground?: () => void;
  enterBattle?: () => void;
  bg1?: number;
  bg2?: number;
  // Add other methods and properties as needed
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
    BattleGround,
    XpBackgroundSelector,
  },
  setup() {
    const store = useStore();
    // Properly type the battleground ref with the BattleGroundInstance interface
    const battlegroundRef = ref<BattleGroundInstance | null>(null);
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
        console.log('Current localStorage keys:', Object.keys(localStorage));
        
        // Try to get beasts from normal environment
        beasts.value = await bestiary.getBeasts();
        console.log(`Loaded ${beasts.value.length} beasts from BestiaryDb`);
        console.log('Beast data:', JSON.stringify(beasts.value, null, 2));
        
        // If no beasts found and we're in battleroom environment, try to load from main app storage
        if (beasts.value.length === 0 && window.location.href.includes('battleroom')) {
          console.log('No beasts found in battleroom environment. Trying to load from main app storage...');
          
          // Check if there's a beast data in the main app storage
          const mainStorageKey = 'xp-bestiary'; // This is likely the key used in main app
          const mainBeastsData = localStorage.getItem(mainStorageKey);
          
          if (mainBeastsData) {
            try {
              const parsedData = JSON.parse(mainBeastsData);
              if (Array.isArray(parsedData) && parsedData.length > 0) {
                console.log('Found beasts in main app storage:', parsedData.length);
                beasts.value = parsedData;
                
                // Save each beast to the current environment's storage for future use
                for (const beast of parsedData) {
                  await bestiary.setBeast(beast);
                }
              }
            } catch (parseError) {
              console.error('Error parsing main app beast data:', parseError);
            }
          }
        }
      } catch (error) {
        console.error('Error loading beasts:', error);
        
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
        
        // Update the battleground
        if (battlegroundRef.value) {
          battlegroundRef.value.bg1 = beast.bg1;
          battlegroundRef.value.bg2 = beast.bg2;
          
          // Then call enterBattle to refresh the background
          setTimeout(() => {
            if (battlegroundRef.value && typeof battlegroundRef.value.enterBattle === 'function') {
              battlegroundRef.value.enterBattle();
            }
          }, 100);
        }
      }
      
      // Update task enemy and close modal
      updateTaskEnemy();
      isBeastModalOpen.value = false;
      
      // Show confirmation toast
      const toast = await toastController.create({
        message: `Selected beast: ${beast.name}`,
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      toast.present();
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
      
      // Update the bg1 and bg2 properties on the BattleGround component
      if (battlegroundRef.value) {
        // Update the bg1 and bg2 properties directly
        battlegroundRef.value.bg1 = customBg1.value;
        battlegroundRef.value.bg2 = customBg2.value;

        // Then call enterBattle to refresh the background
        setTimeout(() => {
          if (battlegroundRef.value && typeof battlegroundRef.value.enterBattle === 'function') {
            battlegroundRef.value.enterBattle();
          } else {
            console.warn('battlegroundRef or enterBattle method not available');
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
        console.error('Error loading profiles:', error);
        
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
        console.error('Error when opening profile creation modal:', error);
        
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
.battleroom-container {
  width: 100%;
  height: 100vh;
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

/* Fix any background rendering issues */
.battleground-component {
  width: 100%;
  height: 100%;
}
</style>