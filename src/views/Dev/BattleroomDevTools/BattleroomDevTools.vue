<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
      <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Battleroom Dev Tools</ion-title>
        <ion-buttons slot="end">
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
          v-bind="{ 
            taskId: 0,
            enemyType: selectedEnemyType 
          }"
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
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import BattleGround from '@/views/Console/MyPortal/HomeTown/BattleGround/BattleGround.vue';
import XpBackgroundSelector from '@/components/XpBackgroundSelector/XpBackgroundSelector.vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
         IonButton, IonCard, IonCardHeader, IonCardSubtitle, IonCardContent,
         IonList, IonItem, IonLabel, IonSelect, IonSelectOption, IonToggle,
         IonItemDivider, IonRange, IonProgressBar, IonModal, IonIcon, toastController } from '@ionic/vue';
import { 
  skull,
  fitnessOutline,
  settingsOutline, closeOutline
} from 'ionicons/icons';

// Define an interface for the BattleGround component
interface BattleGroundInstance {
  initBackground?: () => void;
  enterBattle?: () => void; // Add the enterBattle method
  bg1?: number;             // Add bg1 property
  bg2?: number;             // Add bg2 property
  // Add other methods and properties as needed
}

export default defineComponent({
  name: 'BattleroomDevTools',
  components: {
    BattleGround,
    XpBackgroundSelector,
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonItemDivider,
    IonRange,
    IonProgressBar,
    IonModal,
    IonIcon
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
      
      // Icons
      settingsOutline,
      closeOutline
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