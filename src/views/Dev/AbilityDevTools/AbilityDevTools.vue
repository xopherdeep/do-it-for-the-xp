<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/dev"></ion-back-button>
        </ion-buttons>
        <ion-title>Ability Manager Dev Tools</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="controls-panel p-4">
        <ion-card>
          <ion-card-header>
            <ion-card-title>XpAbilityManager Controls</ion-card-title>
            <ion-card-subtitle>Test and debug your abilities component</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="flex flex-row items-center mb-4">
              <ion-label>View Mode:</ion-label>
              <ion-segment v-model="viewMode" @ionChange="updateViewMode">
                <ion-segment-button value="list">
                  <ion-label>List</ion-label>
                  <ion-icon :icon="listOutline"></ion-icon>
                </ion-segment-button>
                <ion-segment-button value="grid">
                  <ion-label>Grid</ion-label>
                  <ion-icon :icon="gridOutline"></ion-icon>
                </ion-segment-button>
              </ion-segment>
            </div>

            <div class="flex flex-row items-center mb-4">
              <ion-label>Number of abilities:</ion-label>
              <ion-range
                v-model="abilityCount"
                min="1"
                max="50"
                step="1"
                @ionChange="generateAbilities"
                aria-label="Ability count"
              >
                <ion-label slot="start">1</ion-label>
                <ion-label slot="end">50</ion-label>
              </ion-range>
            </div>

            <ion-button expand="block" @click="regeneratePositions">Regenerate Grid Positions</ion-button>
            <ion-button expand="block" @click="toggleConnectionDensity">
              {{ connectionDensity === 'low' ? 'Increase Connection Density' : 'Decrease Connection Density' }}
            </ion-button>
            <ion-button expand="block" @click="toggleAllUnlocked">
              {{ allUnlocked ? 'Lock Some Abilities' : 'Unlock All Abilities' }}
            </ion-button>
            <ion-button expand="block" @click="randomizeStatuses">Randomize Statuses</ion-button>
          </ion-card-content>
        </ion-card>

        <ion-item>
          <ion-label>Selected Ability:</ion-label>
          <ion-text>
            {{ selectedAbility ? selectedAbility.name : 'None selected' }}
          </ion-text>
        </ion-item>
      </div>

      <div class="ability-container">
        <XpAbilityManager
          :abilities="testAbilities"
          :view-mode="viewMode"
          :ability-statuses="abilityStatuses"
          :unlock-statuses="unlockStatuses"
          @edit-ability="handleAbilitySelected"
          @view-mode-change="viewMode = $event"
        />
      </div>

      <!-- Selected Ability Details Modal -->
      <ion-modal :is-open="!!selectedAbility" @didDismiss="selectedAbility = null">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ selectedAbility?.name }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="selectedAbility = null">
                <ion-icon :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div v-if="selectedAbility">
            <ion-item>
              <ion-label>Name</ion-label>
              <ion-input v-model="selectedAbility.name"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label>Description</ion-label>
              <ion-textarea v-model="selectedAbility.description" rows="3"></ion-textarea>
            </ion-item>
            <ion-item>
              <ion-label>Type</ion-label>
              <ion-select v-model="selectedAbility.type">
                <ion-select-option value="real-life">Real Life</ion-select-option>
                <ion-select-option value="in-game">In Game</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label>Status</ion-label>
              <ion-select v-model="abilityStatuses[selectedAbility.id]">
                <ion-select-option :value="0">Locked</ion-select-option>
                <ion-select-option :value="1">Unlocked</ion-select-option>
                <ion-select-option :value="2">Available</ion-select-option>
                <ion-select-option :value="3">Used</ion-select-option>
                <ion-select-option :value="4">Cooling</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label>Unlocked</ion-label>
              <ion-toggle v-model="unlockStatuses[selectedAbility.id]"></ion-toggle>
            </ion-item>
            <ion-button expand="block" color="primary" @click="updateAbility">Update Ability</ion-button>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { 
  listOutline, 
  gridOutline, 
  closeOutline 
} from 'ionicons/icons';
import XpAbilityManager from '@/components/XpAbility/XpAbilityManager.vue';
import { Ability, AbilityType, AbilityStatus, TimePeriod } from '@/lib/types/abilities';

// Sample ability names and descriptions
const abilityNamePrefixes = ['Arcane', 'Dark', 'Light', 'Elemental', 'Divine', 'Toxic', 'Mighty', 'Swift', 'Healing', 'Defensive'];
const abilityNameSuffixes = ['Blast', 'Shield', 'Strike', 'Mastery', 'Healing', 'Surge', 'Bolt', 'Wave', 'Aura', 'Storm'];
const abilityDescriptions = [
  'Deals damage to enemies in a small area.',
  'Creates a protective shield for a short time.',
  'Increases your attack speed temporarily.',
  'Heals you and nearby allies.',
  'Reduces damage taken for a moderate period.',
  'Boosts your critical hit chance.',
  'Teleports you to a nearby location.',
  'Applies a damage-over-time effect to enemies.',
  'Increases experience gained for a short time.',
  'Allows you to levitate and move faster.'
];

// Ability icons 
const abilityIcons = [
  'colorWandOutline',
  'timeOutline',
  'flameOutline',
  'waterOutline',
  'flashOutline',
  'medkitOutline',
  'shieldOutline',
  'homeOutline'
];

// Class types for abilities
const classTypes = [
  'time-mage',
  'black-mage',
  'white-mage',
  'technician',
  'none'
];

export default defineComponent({
  name: 'AbilityDevTools',
  components: {
    XpAbilityManager
  },
  setup() {
    const viewMode = ref('list');
    const abilityCount = ref(10);
    const selectedAbility = ref<Ability | null>(null);
    const testAbilities = ref<Ability[]>([]);
    const abilityStatuses = reactive<{[id: string]: AbilityStatus}>({});
    const unlockStatuses = reactive<{[id: string]: boolean}>({});
    const connectionDensity = ref<'low'|'high'>('low');
    const allUnlocked = ref(false);

    // Generate random test abilities
    const generateAbilities = () => {
      const count = abilityCount.value;
      const newAbilities: Ability[] = [];
      
      for (let i = 0; i < count; i++) {
        const namePrefix = abilityNamePrefixes[Math.floor(Math.random() * abilityNamePrefixes.length)];
        const nameSuffix = abilityNameSuffixes[Math.floor(Math.random() * abilityNameSuffixes.length)];
        const description = abilityDescriptions[Math.floor(Math.random() * abilityDescriptions.length)];
        const icon = abilityIcons[Math.floor(Math.random() * abilityIcons.length)];
        const type = Math.random() > 0.5 ? AbilityType.RealLife : AbilityType.InGame;
        const frequency = Object.values(TimePeriod)[Math.floor(Math.random() * Object.values(TimePeriod).length)];
        const mpCost = Math.floor(Math.random() * 50);
        const apCost = Math.floor(Math.random() * 100) + 10;
        const id = uuidv4();
        
        // Generate random position for grid view
        const posX = Math.floor(Math.random() * 800);
        const posY = Math.floor(Math.random() * 600);
        
        // Add class requirement for in-game abilities
        const characterRequirement: { 
          class?: { [className: string]: number }; 
          level?: number 
        } = {};

        if (type === AbilityType.InGame && Math.random() > 0.3) {
          const selectedClass = classTypes[Math.floor(Math.random() * (classTypes.length - 1))]; // Exclude 'none'
          const classLevel = Math.floor(Math.random() * 5) + 1;
          
          characterRequirement.class = {
            [selectedClass]: classLevel
          };
          
          // Add level requirement for some abilities
          if (Math.random() > 0.5) {
            characterRequirement.level = Math.floor(Math.random() * 10) + 1;
          }
        }

        // Create the ability object
        const newAbility: Ability = {
          id,
          name: `${namePrefix} ${nameSuffix}`,
          description,
          type,
          frequency,
          mpCost,
          apRequirement: {
            amount: apCost,
            period: TimePeriod.Daily
          },
          prerequisites: [],
          icon,
          isPreset: false,
          position: { x: posX, y: posY },
          characterRequirement: Object.keys(characterRequirement).length > 0 ? characterRequirement : undefined
        };
        
        newAbilities.push(newAbility);
      }
      
      // Add prerequisites (connections between abilities)
      addPrerequisites(newAbilities);
      
      // Update abilities array
      testAbilities.value = newAbilities;
      
      // Generate initial statuses
      randomizeStatuses();
    };

    const addPrerequisites = (abilities: Ability[]) => {
      // Initialize prerequisites arrays if they don't exist
      abilities.forEach(ability => {
        if (!ability.prerequisites) {
          ability.prerequisites = [];
        }
      });
      
      // Add prerequisites based on connection density
      for (let i = 0; i < abilities.length; i++) {
        const ability = abilities[i];
        // Only create dependencies for about half the abilities
        if (Math.random() > 0.5) {
          continue;
        }
        
        // Number of prerequisites based on connection density
        const numPrereqs = connectionDensity.value === 'high' ? 
          Math.floor(Math.random() * 3) + 1 : // 1-3 for high
          Math.floor(Math.random() * 2) + 1;  // 1-2 for low
        
        for (let j = 0; j < numPrereqs; j++) {
          // Pick a random earlier ability as prerequisite
          if (i > 0) {
            const prereqIdx = Math.floor(Math.random() * i);
            const prereqId = abilities[prereqIdx].id;
            
            // Make sure prerequisites is initialized
            if (!ability.prerequisites) {
              ability.prerequisites = [];
            }
            
            // Avoid duplicates
            if (!ability.prerequisites.includes(prereqId)) {
              ability.prerequisites.push(prereqId);
            }
          }
        }
      }
    };

    const regeneratePositions = () => {
      testAbilities.value.forEach(ability => {
        ability.position = {
          x: Math.floor(Math.random() * 800),
          y: Math.floor(Math.random() * 600)
        };
      });
    };

    const toggleConnectionDensity = () => {
      connectionDensity.value = connectionDensity.value === 'low' ? 'high' : 'low';
      addPrerequisites(testAbilities.value);
    };

    const randomizeStatuses = () => {
      testAbilities.value.forEach(ability => {
        // Generate random status for each ability
        const statusIndex = Math.floor(Math.random() * 5); // 5 possible statuses
        // Convert the number to the appropriate AbilityStatus enum value
        abilityStatuses[ability.id] = statusIndex as unknown as AbilityStatus;
        
        // Set unlock status with slightly higher chance of being unlocked
        unlockStatuses[ability.id] = Math.random() > 0.4;
      });
    };

    const toggleAllUnlocked = () => {
      allUnlocked.value = !allUnlocked.value;
      
      testAbilities.value.forEach(ability => {
        if (allUnlocked.value) {
          unlockStatuses[ability.id] = true;
          abilityStatuses[ability.id] = AbilityStatus.Available;
        } else {
          unlockStatuses[ability.id] = Math.random() > 0.5;
          const statusIndex = Math.floor(Math.random() * 5);
          // Convert the number to the appropriate AbilityStatus enum value
          abilityStatuses[ability.id] = statusIndex as unknown as AbilityStatus;
        }
      });
    };

    const handleAbilitySelected = (ability: Ability) => {
      selectedAbility.value = { ...ability };
    };

    const updateAbility = () => {
      if (!selectedAbility.value) return;
      
      // Find and update the ability in the list
      const index = testAbilities.value.findIndex(a => a.id === selectedAbility.value?.id);
      if (index !== -1) {
        testAbilities.value[index] = { ...selectedAbility.value };
        selectedAbility.value = null;
      }
    };

    const updateViewMode = (event: CustomEvent) => {
      viewMode.value = event.detail.value;
    };

    // Generate initial abilities
    generateAbilities();
    
    return {
      viewMode,
      abilityCount,
      testAbilities,
      selectedAbility,
      abilityStatuses,
      unlockStatuses,
      connectionDensity,
      allUnlocked,
      generateAbilities,
      regeneratePositions,
      toggleConnectionDensity,
      randomizeStatuses,
      toggleAllUnlocked,
      handleAbilitySelected,
      updateAbility,
      updateViewMode,
      listOutline,
      gridOutline,
      closeOutline
    };
  }
});
</script>

<style lang="scss" scoped>
.controls-panel {
  max-width: 600px;
  margin: 0 auto;
}

.ability-container {
  padding: 20px;
  height: calc(100vh - 270px);
  overflow: auto;
}

/* Add styles for the dev tools */
ion-range {
  padding-left: 16px;
  padding-right: 16px;
}

ion-button {
  margin: 8px 0;
}

@media (min-width: 768px) {
  .controls-panel {
    padding: 20px;
  }
}
</style>