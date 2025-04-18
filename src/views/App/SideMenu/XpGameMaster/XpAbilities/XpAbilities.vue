<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="icon-colors rpg-box">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <i slot="start" class="fad fa-hand-holding-magic fa-2x" />
        <ion-title>
          Abilities 
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="toggleViewMode">
            <ion-icon :icon="viewMode === 'list' ? gridOutline : listOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="currentFilter" @ionChange="filterAbilities">
          <ion-segment-button value="all">
            <ion-icon :icon="albumsOutline"></ion-icon>
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="real-life">
            <ion-icon :icon="homeOutline"></ion-icon>
            <ion-label>Real-Life</ion-label>
          </ion-segment-button>
          <ion-segment-button value="in-game">
            <ion-icon :icon="gameControllerOutline"></ion-icon>
            <ion-label>In-Game</ion-label>
          </ion-segment-button>
          <ion-segment-button value="presets">
            <ion-icon :icon="starOutline"></ion-icon>
            <ion-label>Presets</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      <ion-toolbar v-if="currentFilter === 'in-game'">
        <ion-segment v-model="classFilter" @ionChange="filterByClass">
          <ion-segment-button value="all">All</ion-segment-button>
          <ion-segment-button value="time-mage">Time Mage</ion-segment-button>
          <ion-segment-button value="black-mage">Black Mage</ion-segment-button>
          <ion-segment-button value="white-mage">White Mage</ion-segment-button>
          <ion-segment-button value="other">Other</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- List View of Abilities -->
      <div v-if="viewMode === 'list'">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>Daily Abilities</ion-label>
            </ion-item-divider>
            <ion-item v-for="ability in filteredAbilities.daily" :key="ability.id" button @click="editAbility(ability)">
              <ion-icon :icon="ability.type === 'real-life' ? homeOutline : gameControllerOutline" slot="start" />
              <ion-label>
                <h2>{{ ability.name }}</h2>
                <p>{{ ability.description }}</p>
              </ion-label>
              <ion-badge slot="end" color="warning">{{ ability.apCost }} AP</ion-badge>
              <ion-badge slot="end" color="tertiary" v-if="ability.mpCost">{{ ability.mpCost }} MP</ion-badge>
            </ion-item>
          </ion-item-group>

          <ion-item-group>
            <ion-item-divider>
              <ion-label>Weekly Abilities</ion-label>
            </ion-item-divider>
            <ion-item v-for="ability in filteredAbilities.weekly" :key="ability.id" button @click="editAbility(ability)">
              <ion-icon :icon="ability.type === 'real-life' ? homeOutline : gameControllerOutline" slot="start" />
              <ion-label>
                <h2>{{ ability.name }}</h2>
                <p>{{ ability.description }}</p>
              </ion-label>
              <ion-badge slot="end" color="warning">{{ ability.apCost }} AP</ion-badge>
              <ion-badge slot="end" color="tertiary" v-if="ability.mpCost">{{ ability.mpCost }} MP</ion-badge>
            </ion-item>
          </ion-item-group>

          <ion-item-group>
            <ion-item-divider>
              <ion-label>Monthly Abilities</ion-label>
            </ion-item-divider>
            <ion-item v-for="ability in filteredAbilities.monthly" :key="ability.id" button @click="editAbility(ability)">
              <ion-icon :icon="ability.type === 'real-life' ? homeOutline : gameControllerOutline" slot="start" />
              <ion-label>
                <h2>{{ ability.name }}</h2>
                <p>{{ ability.description }}</p>
              </ion-label>
              <ion-badge slot="end" color="warning">{{ ability.apCost }} AP</ion-badge>
              <ion-badge slot="end" color="tertiary" v-if="ability.mpCost">{{ ability.mpCost }} MP</ion-badge>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </div>

      <!-- Grid View (FFX-inspired) of Abilities -->
      <div v-else class="ability-grid-container">
        <div class="grid-controls">
          <ion-button fill="clear" @click="zoomIn">
            <ion-icon :icon="addCircleOutline"></ion-icon>
          </ion-button>
          <ion-button fill="clear" @click="zoomOut">
            <ion-icon :icon="removeCircleOutline"></ion-icon>
          </ion-button>
          <ion-button fill="clear" @click="resetView">
            <ion-icon :icon="refreshOutline"></ion-icon>
          </ion-button>
        </div>
        
        <div 
          class="ability-canvas" 
          ref="abilityCanvas"
          @mousedown="startPan"
          @mousemove="pan"
          @mouseup="endPan"
          @mouseleave="endPan"
          @wheel="handleZoom"
          :style="{
            transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            cursor: isPanning ? 'grabbing' : 'grab'
          }"
        >
          <svg class="ability-paths" ref="abilitySvg">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#2ecc71" />
              </marker>
              <marker id="locked-arrowhead" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#7f8c8d" />
              </marker>
            </defs>
            <g>
              <path 
                v-for="connection in abilityConnections" 
                :key="connection.id"
                :d="connection.path"
                :class="connection.status"
                :marker-end="connection.status === 'unlocked' ? 'url(#arrowhead)' : 'url(#locked-arrowhead)'"
              />
            </g>
          </svg>
          
          <div class="ability-node" 
               v-for="ability in allAbilities" 
               :key="ability.id"
               :class="[
                 ability.type, 
                 ability.class, 
                 { 'connected': hasConnections(ability) }
               ]"
               :style="getNodeStyle(ability)"
               @click="editAbility(ability)">
            <div class="node-icon">
              <ion-icon :icon="getAbilityIcon(ability)" />
            </div>
            <div class="node-tooltip">
              <div class="tooltip-title">{{ ability.name }}</div>
              <div class="tooltip-class" v-if="ability.class">{{ formatClassName(ability.class) }}</div>
              <div class="tooltip-description">{{ ability.description }}</div>
              <div class="tooltip-cost">
                <span>{{ ability.apCost }} AP</span>
                <span v-if="ability.mpCost">{{ ability.mpCost }} MP</span>
              </div>
              <div class="tooltip-frequency" v-if="ability.frequency">
                {{ capitalize(ability.frequency) }}
              </div>
            </div>
          </div>
        </div>
        
        <div class="mini-map">
          <div class="mini-map-content" :style="getMiniMapStyle()">
            <div 
              v-for="ability in allAbilities" 
              :key="`mini-${ability.id}`"
              :class="['mini-node', ability.type, ability.class]"
              :style="getMiniNodeStyle(ability)"
            ></div>
            <div class="view-rectangle" :style="getViewRectStyle()"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="allAbilities.length === 0" class="empty-state">
        <ion-icon :icon="colorWandOutline" size="large"></ion-icon>
        <h2>No Abilities Created Yet</h2>
        <p>Start by adding your first ability using the + button below</p>
      </div>

      <!-- Add/Edit Ability Modal -->
      <ion-modal :is-open="showAbilityModal" @didDismiss="closeAbilityModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ editingAbility.id ? 'Edit Ability' : 'Create New Ability' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeAbilityModal">
                <ion-icon :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <form @submit.prevent="saveAbility">
            <ion-list>
              <ion-item>
                <ion-label position="stacked">Name</ion-label>
                <ion-input v-model="editingAbility.name" required></ion-input>
              </ion-item>
              
              <ion-item>
                <ion-label position="stacked">Description</ion-label>
                <ion-textarea v-model="editingAbility.description" rows="3"></ion-textarea>
              </ion-item>
              
              <ion-item>
                <ion-label>Type</ion-label>
                <ion-select v-model="editingAbility.type">
                  <ion-select-option value="real-life">Real-life Privilege</ion-select-option>
                  <ion-select-option value="in-game">In-game Ability</ion-select-option>
                </ion-select>
              </ion-item>
              
              <ion-item v-if="editingAbility.type === 'in-game'">
                <ion-label>Class</ion-label>
                <ion-select v-model="editingAbility.class">
                  <ion-select-option value="time-mage">Time Mage</ion-select-option>
                  <ion-select-option value="black-mage">Black Mage</ion-select-option>
                  <ion-select-option value="white-mage">White Mage</ion-select-option>
                  <ion-select-option value="other">Other</ion-select-option>
                </ion-select>
              </ion-item>
              
              <ion-item>
                <ion-label>Frequency</ion-label>
                <ion-select v-model="editingAbility.frequency">
                  <ion-select-option value="daily">Daily</ion-select-option>
                  <ion-select-option value="weekly">Weekly</ion-select-option>
                  <ion-select-option value="monthly">Monthly</ion-select-option>
                  <ion-select-option value="yearly">Yearly</ion-select-option>
                </ion-select>
              </ion-item>
              
              <ion-item>
                <ion-label position="stacked">AP Cost</ion-label>
                <ion-input type="number" v-model="editingAbility.apCost" min="0" required></ion-input>
              </ion-item>
              
              <ion-item>
                <ion-label position="stacked">MP Cost (to cast/use)</ion-label>
                <ion-input type="number" v-model="editingAbility.mpCost" min="0"></ion-input>
              </ion-item>
              
              <ion-item>
                <ion-label>Prerequisites</ion-label>
                <ion-select v-model="editingAbility.prerequisites" multiple="true">
                  <ion-select-option v-for="ability in prerequisites" :key="ability.id" :value="ability.id">
                    {{ ability.name }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
              
              <ion-item v-if="editingAbility.type === 'in-game'">
                <ion-label position="stacked">Effect</ion-label>
                <ion-textarea v-model="editingAbility.effect" rows="2"></ion-textarea>
              </ion-item>
              
              <ion-item>
                <ion-label>Icon</ion-label>
                <ion-select v-model="editingAbility.icon">
                  <ion-select-option value="timeOutline">Time</ion-select-option>
                  <ion-select-option value="flameOutline">Fire</ion-select-option>
                  <ion-select-option value="waterOutline">Water</ion-select-option>
                  <ion-select-option value="flashOutline">Lightning</ion-select-option>
                  <ion-select-option value="medkitOutline">Heal</ion-select-option>
                  <ion-select-option value="shieldOutline">Defense</ion-select-option>
                  <ion-select-option value="colorWandOutline">Magic</ion-select-option>
                  <ion-select-option value="homeOutline">Home</ion-select-option>
                  <ion-select-option value="tvOutline">TV</ion-select-option>
                  <ion-select-option value="gameControllerOutline">Gaming</ion-select-option>
                  <ion-select-option value="peopleOutline">Social</ion-select-option>
                </ion-select>
              </ion-item>
            </ion-list>
            
            <div class="ion-padding">
              <ion-button expand="block" type="submit">Save Ability</ion-button>
              <ion-button v-if="editingAbility.id" expand="block" color="danger" @click="confirmDeleteAbility">
                Delete Ability
              </ion-button>
            </div>
          </form>
        </ion-content>
      </ion-modal>

      <!-- Preset Abilities Modal -->
      <ion-modal :is-open="showPresetModal" @didDismiss="closePresetModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Preset Abilities</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closePresetModal">
                <ion-icon :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list>
            <ion-item-group>
              <ion-item-divider>
                <ion-label>Time Mage Abilities</ion-label>
              </ion-item-divider>
              <ion-item v-for="preset in timeMagePresets" :key="preset.id" button @click="addPreset(preset)">
                <ion-icon :icon="preset.icon" slot="start" />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox slot="end" :checked="isPresetAdded(preset.id)"></ion-checkbox>
              </ion-item>
            </ion-item-group>
            
            <ion-item-group>
              <ion-item-divider>
                <ion-label>Black Mage Abilities</ion-label>
              </ion-item-divider>
              <ion-item v-for="preset in blackMagePresets" :key="preset.id" button @click="addPreset(preset)">
                <ion-icon :icon="preset.icon" slot="start" />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox slot="end" :checked="isPresetAdded(preset.id)"></ion-checkbox>
              </ion-item>
            </ion-item-group>
            
            <ion-item-group>
              <ion-item-divider>
                <ion-label>White Mage Abilities</ion-label>
              </ion-item-divider>
              <ion-item v-for="preset in whiteMagePresets" :key="preset.id" button @click="addPreset(preset)">
                <ion-icon :icon="preset.icon" slot="start" />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox slot="end" :checked="isPresetAdded(preset.id)"></ion-checkbox>
              </ion-item>
            </ion-item-group>
            
            <ion-item-group>
              <ion-item-divider>
                <ion-label>Real-Life Privilege Presets</ion-label>
              </ion-item-divider>
              <ion-item v-for="preset in realLifePresets" :key="preset.id" button @click="addPreset(preset)">
                <ion-icon :icon="preset.icon" slot="start" />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox slot="end" :checked="isPresetAdded(preset.id)"></ion-checkbox>
              </ion-item>
            </ion-item-group>

            <ion-item-group>
              <ion-item-divider>
                <ion-label>Red Mage Abilities</ion-label>
              </ion-item-divider>
              <ion-item v-for="preset in redMagePresets" :key="preset.id" button @click="addPreset(preset)">
                <ion-icon :icon="preset.icon" slot="start" />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox slot="end" :checked="isPresetAdded(preset.id)"></ion-checkbox>
              </ion-item>
            </ion-item-group>

            <ion-item-group>
              <ion-item-divider>
                <ion-label>Warrior Abilities</ion-label>
              </ion-item-divider>
              <ion-item v-for="preset in warriorPresets" :key="preset.id" button @click="addPreset(preset)">
                <ion-icon :icon="preset.icon" slot="start" />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox slot="end" :checked="isPresetAdded(preset.id)"></ion-checkbox>
              </ion-item>
            </ion-item-group>

            <ion-item-group>
              <ion-item-divider>
                <ion-label>Scholar Abilities</ion-label>
              </ion-item-divider>
              <ion-item v-for="preset in scholarPresets" :key="preset.id" button @click="addPreset(preset)">
                <ion-icon :icon="preset.icon" slot="start" />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox slot="end" :checked="isPresetAdded(preset.id)"></ion-checkbox>
              </ion-item>
            </ion-item-group>
          </ion-list>
          
          <div class="ion-padding">
            <ion-button expand="block" @click="closePresetModal">Done</ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <!-- FAB button for adding abilities -->
      <ion-fab vertical="bottom" horizontal="end">
        <ion-fab-button @click="openAbilityModal()">
          <ion-icon :icon="add" />
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button @click="openPresetModal()">
            <ion-icon :icon="starOutline" />
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, computed, reactive } from 'vue'
  import ionic from '@/mixins/ionic'
  import { 
    add, 
    listOutline, 
    gridOutline, 
    albumsOutline, 
    homeOutline, 
    gameControllerOutline, 
    starOutline,
    closeOutline,
    colorWandOutline,
    timeOutline,
    flameOutline,
    waterOutline,
    flashOutline,
    medkitOutline,
    shieldOutline,
    tvOutline,
    peopleOutline,
    addCircleOutline,
    removeCircleOutline,
    refreshOutline,
    diamondOutline,
    heartOutline,
    snowOutline,
    earthOutline,
    footballOutline,
    fitnessOutline,
    bookOutline,
    schoolOutline,
    restaurantOutline,
    constructOutline,
    hammerOutline,
    eyeOutline,
    cloudOutline,
    desktopOutline,
    phonePortraitOutline,
    gitNetworkOutline,
    compassOutline,
    ribbonOutline,
    bicycleOutline
  } from 'ionicons/icons'
  import { v4 as uuidv4 } from 'uuid'

  export default defineComponent({
    name: 'XpAbilities',
    mixins: [ionic],
    setup() {
      // State
      const abilities = ref<any[]>([])
      const showAbilityModal = ref(false)
      const showPresetModal = ref(false)
      const editingAbility = ref<any>({})
      const viewMode = ref('list') // 'list' or 'grid'
      const currentFilter = ref('all')
      const classFilter = ref('all')
      const abilityConnections = ref<Array<{
        id: string;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        status: string;
        path: string;
      }>>([])
      const zoom = ref(1)
      const panOffset = ref({ x: 0, y: 0 })
      const isPanning = ref(false)
      const startPanPosition = ref({ x: 0, y: 0 })
      const startPanOffset = ref({ x: 0, y: 0 })
      
      // Computed properties
      const filteredAbilities = computed(() => {
        let filtered = abilities.value;
        
        // Apply type filter
        if (currentFilter.value !== 'all') {
          if (currentFilter.value === 'presets') {
            filtered = filtered.filter(a => a.isPreset);
          } else {
            filtered = filtered.filter(a => a.type === currentFilter.value);
          }
        }
        
        // Apply class filter for in-game abilities
        if (currentFilter.value === 'in-game' && classFilter.value !== 'all') {
          filtered = filtered.filter(a => a.class === classFilter.value);
        }
        
        // Group by frequency
        return {
          daily: filtered.filter(a => a.frequency === 'daily'),
          weekly: filtered.filter(a => a.frequency === 'weekly'),
          monthly: filtered.filter(a => a.frequency === 'monthly'),
          yearly: filtered.filter(a => a.frequency === 'yearly')
        };
      });
      
      const allAbilities = computed(() => {
        let filtered = abilities.value;
        
        // Apply type filter
        if (currentFilter.value !== 'all') {
          if (currentFilter.value === 'presets') {
            filtered = filtered.filter(a => a.isPreset);
          } else {
            filtered = filtered.filter(a => a.type === currentFilter.value);
          }
        }
        
        // Apply class filter for in-game abilities
        if (currentFilter.value === 'in-game' && classFilter.value !== 'all') {
          filtered = filtered.filter(a => a.class === classFilter.value);
        }
        
        return filtered;
      });
      
      const prerequisites = computed(() => {
        if (editingAbility.value.id) {
          // Don't show current ability in prerequisites to avoid circular references
          return abilities.value.filter(a => a.id !== editingAbility.value.id);
        }
        return abilities.value;
      });
      
      // Preset abilities
      const timeMagePresets = [
        {
          id: 'time-1',
          name: 'Haste',
          description: 'Gives you more time to finish tasks. Add 15 minutes to your deadline.',
          type: 'in-game',
          class: 'time-mage',
          frequency: 'daily',
          apCost: 30,
          mpCost: 10,
          effect: 'Extends deadline by 15 minutes',
          icon: 'timeOutline',
          isPreset: true,
          position: { x: 150, y: 100 }
        },
        {
          id: 'time-2',
          name: 'Haste II',
          description: 'Significantly extends your deadline. Add 30 minutes to your deadline.',
          type: 'in-game',
          class: 'time-mage',
          frequency: 'daily',
          apCost: 60,
          mpCost: 20,
          effect: 'Extends deadline by 30 minutes',
          icon: 'timeOutline',
          prerequisites: ['time-1'],
          isPreset: true,
          position: { x: 250, y: 150 }
        },
        {
          id: 'time-3',
          name: 'Slow',
          description: 'Slows down time requirements for tasks',
          type: 'in-game',
          class: 'time-mage',
          frequency: 'daily',
          apCost: 25,
          mpCost: 8,
          effect: 'Reduces task time requirement by 10%',
          icon: 'timeOutline',
          isPreset: true,
          position: { x: 120, y: 180 }
        },
        {
          id: 'time-4',
          name: 'Slow II',
          description: 'Strongly slows down time requirements for tasks',
          type: 'in-game',
          class: 'time-mage',
          frequency: 'daily',
          apCost: 50,
          mpCost: 16,
          effect: 'Reduces task time requirement by 20%',
          icon: 'timeOutline',
          prerequisites: ['time-3'],
          isPreset: true,
          position: { x: 180, y: 250 }
        },
        {
          id: 'time-5',
          name: 'Stop',
          description: 'Pause a task or chore temporarily',
          type: 'in-game',
          class: 'time-mage',
          frequency: 'weekly',
          apCost: 100,
          mpCost: 30,
          effect: 'Postpone one task for 24 hours',
          icon: 'timeOutline',
          prerequisites: ['time-3', 'time-4'],
          isPreset: true,
          position: { x: 260, y: 300 }
        },
        {
          id: 'time-6',
          name: 'Extra Screen Time',
          description: 'Get additional 30 minutes of screen time',
          type: 'real-life',
          class: 'time-mage',
          frequency: 'daily',
          apCost: 40,
          mpCost: 15,
          icon: 'tvOutline',
          isPreset: true,
          position: { x: 100, y: 300 }
        },
        {
          id: 'time-7',
          name: 'Extended Screen Time',
          description: 'Get additional 60 minutes of screen time',
          type: 'real-life',
          class: 'time-mage',
          frequency: 'weekly',
          apCost: 80,
          mpCost: 25,
          icon: 'tvOutline',
          prerequisites: ['time-6'],
          isPreset: true,
          position: { x: 150, y: 380 }
        },
        {
          id: 'time-8',
          name: 'Time Extension',
          description: 'Stay up 30 minutes past bedtime',
          type: 'real-life',
          class: 'time-mage',
          frequency: 'weekly',
          apCost: 70,
          mpCost: 20,
          icon: 'timeOutline',
          isPreset: true,
          position: { x: 280, y: 380 }
        },
        {
          id: 'time-9',
          name: 'Quick',
          description: 'Complete a small task instantly',
          type: 'in-game',
          class: 'time-mage',
          frequency: 'weekly',
          apCost: 120,
          mpCost: 35,
          effect: 'Skip one small chore entirely',
          icon: 'flashOutline',
          prerequisites: ['time-2', 'time-5'],
          isPreset: true,
          position: { x: 350, y: 200 }
        },
        {
          id: 'time-10',
          name: 'Temporal Mastery',
          description: 'Complete control over your schedule for a day',
          type: 'in-game',
          class: 'time-mage',
          frequency: 'monthly',
          apCost: 300,
          mpCost: 80,
          effect: 'Rearrange your entire schedule for one day',
          icon: 'timeOutline',
          prerequisites: ['time-9'],
          isPreset: true,
          position: { x: 450, y: 250 }
        }
      ];
      
      const blackMagePresets = [
        {
          id: 'black-1',
          name: 'Fire',
          description: 'Basic fire magic attack',
          type: 'in-game',
          class: 'black-mage',
          frequency: 'daily',
          apCost: 20,
          mpCost: 5,
          effect: 'Magic attack with fire element',
          icon: 'flameOutline',
          isPreset: true,
          position: { x: 500, y: 100 }
        },
        {
          id: 'black-2',
          name: 'Fira',
          description: 'Medium fire magic attack',
          type: 'in-game',
          class: 'black-mage',
          frequency: 'daily',
          apCost: 40,
          mpCost: 10,
          effect: 'Stronger magic attack with fire element',
          icon: 'flameOutline',
          prerequisites: ['black-1'],
          isPreset: true,
          position: { x: 570, y: 150 }
        },
        {
          id: 'black-3',
          name: 'Firaga',
          description: 'Strong fire magic attack',
          type: 'in-game',
          class: 'black-mage',
          frequency: 'weekly',
          apCost: 80,
          mpCost: 20,
          effect: 'Powerful magic attack with fire element',
          icon: 'flameOutline',
          prerequisites: ['black-2'],
          isPreset: true,
          position: { x: 640, y: 200 }
        },
        {
          id: 'black-4',
          name: 'Thunder',
          description: 'Basic lightning magic attack',
          type: 'in-game',
          class: 'black-mage',
          frequency: 'daily',
          apCost: 25,
          mpCost: 7,
          effect: 'Magic attack with lightning element',
          icon: 'flashOutline',
          isPreset: true,
          position: { x: 500, y: 180 }
        },
        {
          id: 'black-5',
          name: 'Thundara',
          description: 'Medium lightning magic attack',
          type: 'in-game',
          class: 'black-mage',
          frequency: 'daily',
          apCost: 45,
          mpCost: 12,
          effect: 'Stronger magic attack with lightning element',
          icon: 'flashOutline',
          prerequisites: ['black-4'],
          isPreset: true,
          position: { x: 570, y: 230 }
        },
        {
          id: 'black-6',
          name: 'Thundaga',
          description: 'Strong lightning magic attack',
          type: 'in-game',
          class: 'black-mage',
          frequency: 'weekly',
          apCost: 85,
          mpCost: 22,
          effect: 'Powerful magic attack with lightning element',
          icon: 'flashOutline',
          prerequisites: ['black-5'],
          isPreset: true,
          position: { x: 640, y: 280 }
        },
        {
          id: 'black-7',
          name: 'Blizzard',
          description: 'Basic ice magic attack',
          type: 'in-game',
          class: 'black-mage',
          frequency: 'daily',
          apCost: 25,
          mpCost: 7,
          effect: 'Magic attack with ice element',
          icon: 'snowOutline',
          isPreset: true,
          position: { x: 500, y: 260 }
        },
        {
          id: 'black-8',
          name: 'Blizzara',
          description: 'Medium ice magic attack',
          type: 'in-game',
          class: 'black-mage',
          frequency: 'daily',
          apCost: 45,
          mpCost: 12,
          effect: 'Stronger magic attack with ice element',
          icon: 'snowOutline',
          prerequisites: ['black-7'],
          isPreset: true,
          position: { x: 570, y: 310 }
        },
        {
          id: 'black-9',
          name: 'Blizzaga',
          description: 'Strong ice magic attack',
          type: 'in-game',
          class: 'black-mage',
          frequency: 'weekly',
          apCost: 85,
          mpCost: 22,
          effect: 'Powerful magic attack with ice element',
          icon: 'snowOutline',
          prerequisites: ['black-8'],
          isPreset: true,
          position: { x: 640, y: 360 }
        },
        {
          id: 'black-10',
          name: 'Focus',
          description: 'Increase concentration power',
          type: 'in-game',
          class: 'black-mage',
          frequency: 'daily',
          apCost: 35,
          mpCost: 15,
          effect: 'Improve focus and concentration on tasks',
          icon: 'eyeOutline',
          isPreset: true,
          position: { x: 500, y: 340 }
        },
        {
          id: 'black-11',
          name: 'MP Restore',
          description: 'Recover MP during the day',
          type: 'in-game',
          class: 'black-mage',
          frequency: 'daily',
          apCost: 60,
          mpCost: 0,
          effect: 'Recover 30% of maximum MP',
          icon: 'waterOutline',
          isPreset: true,
          position: { x: 570, y: 390 }
        },
        {
          id: 'black-12',
          name: 'Flare',
          description: 'Ultimate non-elemental magic attack',
          type: 'in-game',
          class: 'black-mage',
          frequency: 'monthly',
          apCost: 200,
          mpCost: 50,
          effect: 'Extremely powerful magic attack',
          icon: 'flameOutline',
          prerequisites: ['black-3', 'black-6', 'black-9'],
          isPreset: true,
          position: { x: 700, y: 320 }
        },
        {
          id: 'black-13',
          name: 'Digital Entertainment',
          description: 'Priority access to digital entertainment like gaming or streaming',
          type: 'real-life',
          class: 'black-mage',
          frequency: 'daily',
          apCost: 30,
          mpCost: 10,
          icon: 'gameControllerOutline',
          isPreset: true,
          position: { x: 700, y: 100 }
        },
        {
          id: 'black-14',
          name: 'Technology Time',
          description: 'Extra time with technology and devices',
          type: 'real-life',
          class: 'black-mage',
          frequency: 'weekly',
          apCost: 70,
          mpCost: 15,
          icon: 'desktopOutline',
          prerequisites: ['black-13'],
          isPreset: true,
          position: { x: 770, y: 150 }
        }
      ];
      
      const whiteMagePresets = [
        {
          id: 'white-1',
          name: 'Cure',
          description: 'Recovers health points',
          type: 'in-game',
          class: 'white-mage',
          frequency: 'daily',
          apCost: 20,
          mpCost: 5,
          effect: 'Restores 50 HP',
          icon: 'medkitOutline',
          isPreset: true,
          position: { x: 150, y: 500 }
        },
        {
          id: 'white-2',
          name: 'Cura',
          description: 'Recovers significant health points',
          type: 'in-game',
          class: 'white-mage',
          frequency: 'daily',
          apCost: 40,
          mpCost: 10,
          effect: 'Restores 100 HP',
          icon: 'medkitOutline',
          prerequisites: ['white-1'],
          isPreset: true,
          position: { x: 220, y: 550 }
        },
        {
          id: 'white-3',
          name: 'Curaga',
          description: 'Recovers major health points',
          type: 'in-game',
          class: 'white-mage',
          frequency: 'weekly',
          apCost: 80,
          mpCost: 20,
          effect: 'Restores 200 HP',
          icon: 'medkitOutline',
          prerequisites: ['white-2'],
          isPreset: true,
          position: { x: 290, y: 600 }
        },
        {
          id: 'white-4',
          name: 'Protect',
          description: 'Provides physical defense',
          type: 'in-game',
          class: 'white-mage',
          frequency: 'daily',
          apCost: 25,
          mpCost: 7,
          effect: 'Reduces physical damage by 20%',
          icon: 'shieldOutline',
          isPreset: true,
          position: { x: 150, y: 580 }
        },
        {
          id: 'white-5',
          name: 'Shell',
          description: 'Provides magical defense',
          type: 'in-game',
          class: 'white-mage',
          frequency: 'daily',
          apCost: 25,
          mpCost: 7,
          effect: 'Reduces magical damage by 20%',
          icon: 'shieldOutline',
          isPreset: true,
          position: { x: 220, y: 630 }
        },
        {
          id: 'white-6',
          name: 'Regen',
          description: 'Gradually recover HP over time',
          type: 'in-game',
          class: 'white-mage',
          frequency: 'daily',
          apCost: 35,
          mpCost: 10,
          effect: 'Recover 5 HP every hour',
          icon: 'heartOutline',
          isPreset: true,
          position: { x: 290, y: 680 }
        },
        {
          id: 'white-7',
          name: 'Esuna',
          description: 'Cures status ailments like tiredness',
          type: 'in-game',
          class: 'white-mage',
          frequency: 'weekly',
          apCost: 50,
          mpCost: 15,
          effect: 'Removes one negative status effect',
          icon: 'colorWandOutline',
          isPreset: true,
          position: { x: 150, y: 660 }
        },
        {
          id: 'white-8',
          name: 'Wall',
          description: 'Combines Protect and Shell effects',
          type: 'in-game',
          class: 'white-mage',
          frequency: 'weekly',
          apCost: 70,
          mpCost: 20,
          effect: 'Reduces both physical and magical damage by 20%',
          icon: 'shieldOutline',
          prerequisites: ['white-4', 'white-5'],
          isPreset: true,
          position: { x: 220, y: 710 }
        },
        {
          id: 'white-9',
          name: 'Holy',
          description: 'Ultimate white magic attack',
          type: 'in-game',
          class: 'white-mage',
          frequency: 'monthly',
          apCost: 200,
          mpCost: 50,
          effect: 'Powerful holy element attack',
          icon: 'diamondOutline',
          prerequisites: ['white-3', 'white-8'],
          isPreset: true,
          position: { x: 290, y: 760 }
        },
        {
          id: 'white-10',
          name: 'Rest Day',
          description: 'Take a day off from chores to recover',
          type: 'real-life',
          class: 'white-mage',
          frequency: 'monthly',
          apCost: 150,
          mpCost: 30,
          icon: 'bedOutline',
          isPreset: true,
          position: { x: 380, y: 500 }
        },
        {
          id: 'white-11',
          name: 'Self-Care Time',
          description: 'Take time for personal well-being and relaxation',
          type: 'real-life',
          class: 'white-mage',
          frequency: 'weekly',
          apCost: 60,
          mpCost: 15,
          icon: 'heartOutline',
          isPreset: true,
          position: { x: 380, y: 570 }
        },
        {
          id: 'white-12',
          name: 'Digital Detox',
          description: 'Skip a chore in exchange for reduced screen time',
          type: 'real-life',
          class: 'white-mage',
          frequency: 'weekly',
          apCost: 45,
          mpCost: 10,
          icon: 'phonePortraitOutline',
          isPreset: true,
          position: { x: 380, y: 640 }
        }
      ];
      
      const redMagePresets = [
        {
          id: 'red-1',
          name: 'Red Magic Basics',
          description: 'Foundations of both black and white magic',
          type: 'in-game',
          class: 'red-mage',
          frequency: 'daily',
          apCost: 30,
          mpCost: 8,
          effect: 'Small effects of both healing and damage spells',
          icon: 'colorWandOutline',
          isPreset: true,
          position: { x: 500, y: 500 }
        },
        {
          id: 'red-2',
          name: 'Doublecast',
          description: 'Cast two spells in succession',
          type: 'in-game',
          class: 'red-mage',
          frequency: 'weekly',
          apCost: 100,
          mpCost: 30,
          effect: 'Use two abilities in one day',
          icon: 'gitNetworkOutline',
          prerequisites: ['red-1'],
          isPreset: true,
          position: { x: 570, y: 550 }
        },
        {
          id: 'red-3',
          name: 'Versatile Learning',
          description: 'Ability to quickly learn and adapt to different subjects',
          type: 'in-game',
          class: 'red-mage',
          frequency: 'daily',
          apCost: 40,
          mpCost: 10,
          effect: 'Improved learning speed for new subjects',
          icon: 'schoolOutline',
          isPreset: true,
          position: { x: 500, y: 580 }
        },
        {
          id: 'red-4',
          name: 'Jack of All Trades',
          description: 'Bonus to all activities requiring multiple skills',
          type: 'in-game',
          class: 'red-mage',
          frequency: 'weekly',
          apCost: 85,
          mpCost: 20,
          effect: 'Bonuses to multi-discipline activities',
          icon: 'compassOutline',
          prerequisites: ['red-1', 'red-3'],
          isPreset: true,
          position: { x: 570, y: 630 }
        },
        {
          id: 'red-5',
          name: 'Balance',
          description: 'Perfect balance between work and play',
          type: 'real-life',
          class: 'red-mage',
          frequency: 'weekly',
          apCost: 70,
          mpCost: 15,
          icon: 'ribbonOutline',
          isPreset: true,
          position: { x: 640, y: 500 }
        },
        {
          id: 'red-6',
          name: 'Activity Switch',
          description: 'Change a scheduled activity to something else',
          type: 'real-life',
          class: 'red-mage',
          frequency: 'weekly',
          apCost: 60,
          mpCost: 15,
          icon: 'refreshOutline',
          isPreset: true,
          position: { x: 640, y: 570 }
        }
      ];
      
      const warriorPresets = [
        {
          id: 'war-1',
          name: 'Physical Training',
          description: 'Basic physical fitness training',
          type: 'in-game',
          class: 'warrior',
          frequency: 'daily',
          apCost: 20,
          mpCost: 5,
          effect: 'Improves physical abilities',
          icon: 'fitnessOutline',
          isPreset: true,
          position: { x: 150, y: 800 }
        },
        {
          id: 'war-2',
          name: 'Strength Up',
          description: 'Increases physical strength',
          type: 'in-game',
          class: 'warrior',
          frequency: 'daily',
          apCost: 30,
          mpCost: 8,
          effect: 'Boost to strength-based activities',
          icon: 'bicycleOutline',
          prerequisites: ['war-1'],
          isPreset: true,
          position: { x: 220, y: 850 }
        },
        {
          id: 'war-3',
          name: 'Endurance',
          description: 'Improved stamina for long tasks',
          type: 'in-game',
          class: 'warrior',
          frequency: 'daily',
          apCost: 35,
          mpCost: 10,
          effect: 'Better endurance for lengthy activities',
          icon: 'footballOutline',
          prerequisites: ['war-1'],
          isPreset: true,
          position: { x: 290, y: 800 }
        },
        {
          id: 'war-4',
          name: 'Provoke',
          description: 'Take on a difficult task for someone else',
          type: 'in-game',
          class: 'warrior',
          frequency: 'weekly',
          apCost: 75,
          mpCost: 20,
          effect: 'Handle a challenging task for another family member',
          icon: 'shieldOutline',
          prerequisites: ['war-2', 'war-3'],
          isPreset: true,
          position: { x: 290, y: 870 }
        },
        {
          id: 'war-5',
          name: 'Outside Play',
          description: 'Extra outdoor play or sports time',
          type: 'real-life',
          class: 'warrior',
          frequency: 'daily',
          apCost: 25,
          mpCost: 5,
          icon: 'footballOutline',
          isPreset: true,
          position: { x: 360, y: 800 }
        },
        {
          id: 'war-6',
          name: 'Sports Event',
          description: 'Attend or participate in a sports event',
          type: 'real-life',
          class: 'warrior',
          frequency: 'monthly',
          apCost: 120,
          mpCost: 20,
          icon: 'footballOutline',
          prerequisites: ['war-5'],
          isPreset: true,
          position: { x: 430, y: 830 }
        }
      ];
      
      const scholarPresets = [
        {
          id: 'sch-1',
          name: 'Study',
          description: 'Enhanced study techniques',
          type: 'in-game',
          class: 'scholar',
          frequency: 'daily',
          apCost: 20,
          mpCost: 5,
          effect: 'Improved learning and study efficiency',
          icon: 'bookOutline',
          isPreset: true,
          position: { x: 500, y: 700 }
        },
        {
          id: 'sch-2',
          name: 'Research',
          description: 'Advanced research capabilities',
          type: 'in-game',
          class: 'scholar',
          frequency: 'daily',
          apCost: 30,
          mpCost: 8,
          effect: 'Better information gathering and analysis',
          icon: 'bookOutline',
          prerequisites: ['sch-1'],
          isPreset: true,
          position: { x: 570, y: 730 }
        },
        {
          id: 'sch-3',
          name: 'Memorize',
          description: 'Enhanced memory for studying',
          type: 'in-game',
          class: 'scholar',
          frequency: 'daily',
          apCost: 35,
          mpCost: 10,
          effect: 'Improved memory for exams and tests',
          icon: 'schoolOutline',
          prerequisites: ['sch-1'],
          isPreset: true,
          position: { x: 640, y: 700 }
        },
        {
          id: 'sch-4',
          name: 'Knowledge Share',
          description: 'Share knowledge with family members',
          type: 'in-game',
          class: 'scholar',
          frequency: 'weekly',
          apCost: 60,
          mpCost: 15,
          effect: 'Help a family member with their studies',
          icon: 'peopleOutline',
          prerequisites: ['sch-2', 'sch-3'],
          isPreset: true,
          position: { x: 610, y: 780 }
        },
        {
          id: 'sch-5',
          name: 'Library Visit',
          description: 'Special trip to the library',
          type: 'real-life',
          class: 'scholar',
          frequency: 'weekly',
          apCost: 50,
          mpCost: 10,
          icon: 'bookOutline',
          isPreset: true,
          position: { x: 500, y: 780 }
        },
        {
          id: 'sch-6',
          name: 'Educational Activity',
          description: 'Special educational outing or activity',
          type: 'real-life',
          class: 'scholar',
          frequency: 'monthly',
          apCost: 120,
          mpCost: 25,
          icon: 'schoolOutline',
          prerequisites: ['sch-5'],
          isPreset: true,
          position: { x: 570, y: 830 }
        }
      ];
      
      const realLifePresets = [
        {
          id: 'rl-1',
          name: 'Watch TV',
          description: 'Unlock TV watching privileges',
          type: 'real-life',
          frequency: 'daily',
          apCost: 25,
          mpCost: 0,
          icon: 'tvOutline',
          isPreset: true,
          position: { x: 800, y: 100 }
        },
        {
          id: 'rl-2',
          name: 'Play Video Games',
          description: 'Unlock video gaming privileges',
          type: 'real-life',
          frequency: 'daily',
          apCost: 30,
          mpCost: 0,
          icon: 'gameControllerOutline',
          isPreset: true,
          position: { x: 860, y: 150 }
        },
        {
          id: 'rl-3',
          name: 'Hangout with Friends',
          description: 'Allow time for hanging out with friends',
          type: 'real-life',
          frequency: 'weekly',
          apCost: 75,
          mpCost: 0,
          icon: 'peopleOutline',
          isPreset: true,
          position: { x: 800, y: 200 }
        },
        {
          id: 'rl-4',
          name: 'Sleepover',
          description: 'Permission for a sleepover',
          type: 'real-life',
          frequency: 'weekly',
          apCost: 100,
          mpCost: 0,
          icon: 'homeOutline',
          isPreset: true,
          position: { x: 860, y: 250 }
        },
        {
          id: 'rl-5',
          name: 'Family Outing',
          description: 'Special family outing of your choice',
          type: 'real-life',
          frequency: 'monthly',
          apCost: 300,
          mpCost: 0,
          icon: 'peopleOutline',
          isPreset: true,
          position: { x: 800, y: 300 }
        },
        {
          id: 'rl-6',
          name: 'Restaurant Choice',
          description: 'Choose the restaurant for a family meal',
          type: 'real-life',
          frequency: 'weekly',
          apCost: 70,
          mpCost: 0,
          icon: 'restaurantOutline',
          isPreset: true,
          position: { x: 860, y: 350 }
        },
        {
          id: 'rl-7',
          name: 'Movie Night',
          description: 'Special movie night with snacks',
          type: 'real-life',
          frequency: 'weekly',
          apCost: 80,
          mpCost: 0,
          icon: 'tvOutline',
          isPreset: true,
          position: { x: 800, y: 400 }
        },
        {
          id: 'rl-8',
          name: 'Late Weekend',
          description: 'Stay up late on a weekend night',
          type: 'real-life',
          frequency: 'weekly',
          apCost: 90,
          mpCost: 0,
          icon: 'timeOutline',
          isPreset: true,
          position: { x: 860, y: 450 }
        },
        {
          id: 'rl-9',
          name: 'Dessert Choice',
          description: 'Choose a special dessert',
          type: 'real-life',
          frequency: 'weekly',
          apCost: 60,
          mpCost: 0,
          icon: 'restaurantOutline',
          isPreset: true,
          position: { x: 800, y: 500 }
        },
        {
          id: 'rl-10',
          name: 'Shopping Trip',
          description: 'Special shopping trip for something you want',
          type: 'real-life',
          frequency: 'monthly',
          apCost: 250,
          mpCost: 0,
          icon: 'cartOutline',
          isPreset: true,
          position: { x: 860, y: 550 }
        },
        {
          id: 'rl-11',
          name: 'Choose Family Activity',
          description: 'Pick an activity for the whole family',
          type: 'real-life',
          frequency: 'monthly',
          apCost: 200,
          mpCost: 0,
          icon: 'peopleOutline',
          isPreset: true,
          position: { x: 800, y: 600 }
        },
        {
          id: 'rl-12',
          name: 'Birthday Party',
          description: 'Special birthday party with friends',
          type: 'real-life',
          frequency: 'yearly',
          apCost: 500,
          mpCost: 0,
          icon: 'giftOutline',
          isPreset: true,
          position: { x: 860, y: 650 }
        }
      ];
      
      // Methods
      const toggleViewMode = () => {
        viewMode.value = viewMode.value === 'list' ? 'grid' : 'list';
        if (viewMode.value === 'grid') {
          calculateConnections();
        }
      };
      
      const filterAbilities = () => {
        // Reset class filter when switching tabs
        if (currentFilter.value !== 'in-game') {
          classFilter.value = 'all';
        }
      };
      
      const filterByClass = () => {
        // This function is triggered when the class filter changes
        // The actual filtering is handled by the computed properties
      };
      
      const openAbilityModal = (ability: any = null) => {
        if (ability) {
          editingAbility.value = { ...ability };
        } else {
          editingAbility.value = {
            id: '',
            name: '',
            description: '',
            type: 'real-life',
            class: '',
            frequency: 'daily',
            apCost: 0,
            mpCost: 0,
            prerequisites: [],
            effect: '',
            icon: 'colorWandOutline',
            isPreset: false,
            position: { x: 0, y: 0 }
          };
        }
        showAbilityModal.value = true;
      };
      
      const closeAbilityModal = () => {
        showAbilityModal.value = false;
        editingAbility.value = {};
      };
      
      const openPresetModal = () => {
        showPresetModal.value = true;
      };
      
      const closePresetModal = () => {
        showPresetModal.value = false;
      };
      
      const editAbility = (ability) => {
        openAbilityModal(ability);
      };
      
      const saveAbility = () => {
        const abilityToSave = { ...editingAbility.value };
        
        if (!abilityToSave.id) {
          // New ability
          abilityToSave.id = uuidv4();
          abilityToSave.position = {
            x: Math.floor(Math.random() * 800),
            y: Math.floor(Math.random() * 600)
          };
          abilities.value.push(abilityToSave);
        } else {
          // Update existing ability
          const index = abilities.value.findIndex(a => a.id === abilityToSave.id);
          if (index !== -1) {
            abilities.value[index] = abilityToSave;
          }
        }
        
        // Save to local storage or backend
        saveAbilitiesToStorage();
        
        // Recalculate connections for grid view
        calculateConnections();
        
        closeAbilityModal();
      };
      
      const confirmDeleteAbility = () => {
        if (confirm('Are you sure you want to delete this ability?')) {
          deleteAbility();
        }
      };
      
      const deleteAbility = () => {
        if (editingAbility.value.id) {
          abilities.value = abilities.value.filter(a => a.id !== editingAbility.value.id);
          
          // Also remove this ability from prerequisites of other abilities
          abilities.value.forEach(ability => {
            if (ability.prerequisites && ability.prerequisites.includes(editingAbility.value.id)) {
              ability.prerequisites = ability.prerequisites.filter(p => p !== editingAbility.value.id);
            }
          });
          
          // Save changes
          saveAbilitiesToStorage();
          
          // Recalculate connections
          calculateConnections();
          
          closeAbilityModal();
        }
      };
      
      const addPreset = (preset) => {
        // Check if preset already exists
        const existingPreset = abilities.value.find(a => a.id === preset.id);
        
        if (existingPreset) {
          // Remove preset if it exists
          abilities.value = abilities.value.filter(a => a.id !== preset.id);
        } else {
          // Add preset
          abilities.value.push({ ...preset });
        }
        
        // Save changes
        saveAbilitiesToStorage();
      };
      
      const isPresetAdded = (presetId) => {
        return abilities.value.some(a => a.id === presetId);
      };
      
      const getAbilityIcon = (ability) => {
        // Return the appropriate icon based on ability.icon
        const iconMap = {
          timeOutline,
          flameOutline,
          waterOutline,
          flashOutline,
          medkitOutline,
          shieldOutline,
          colorWandOutline,
          homeOutline,
          tvOutline,
          gameControllerOutline,
          peopleOutline
        };
        
        return iconMap[ability.icon] || colorWandOutline;
      };
      
      const hasConnections = (ability) => {
        if (!ability.prerequisites || ability.prerequisites.length === 0) {
          return false;
        }
        return true;
      };
      
      const getNodeStyle = (ability) => {
        // Return style for positioning the node in grid view
        // Ensure the position property exists, otherwise use default values
        if (!ability.position) {
          ability.position = {
            x: Math.floor(Math.random() * 800),
            y: Math.floor(Math.random() * 600)
          };
        }
        
        return {
          left: `${ability.position.x}px`,
          top: `${ability.position.y}px`
        };
      };
      
      const calculateConnections = () => {
        // Calculate SVG lines for connections between abilities
        const connections: Array<{
          id: string;
          startX: number;
          startY: number;
          endX: number;
          endY: number;
          status: string;
          path: string;
        }> = [];
        
        abilities.value.forEach(ability => {
          if (ability.prerequisites && ability.prerequisites.length > 0) {
            ability.prerequisites.forEach(prereqId => {
              const prereq = abilities.value.find(a => a.id === prereqId);
              if (prereq) {
                const startX = prereq.position.x + 25; // center of node
                const startY = prereq.position.y + 25;
                const endX = ability.position.x + 25;
                const endY = ability.position.y + 25;
                const path = `M${startX},${startY} L${endX},${endY}`;
                connections.push({
                  id: `${prereqId}-${ability.id}`,
                  startX,
                  startY,
                  endX,
                  endY,
                  status: 'unlocked',
                  path
                });
              }
            });
          }
        });
        
        abilityConnections.value = connections;
      };
      
      const loadAbilitiesFromStorage = () => {
        // Load abilities from local storage
        const savedAbilities = localStorage.getItem('xp-abilities');
        if (savedAbilities) {
          abilities.value = JSON.parse(savedAbilities);
        }
      };
      
      const saveAbilitiesToStorage = () => {
        // Save abilities to local storage
        localStorage.setItem('xp-abilities', JSON.stringify(abilities.value));
      };
      
      const zoomIn = () => {
        zoom.value = Math.min(zoom.value + 0.1, 2);
      };
      
      const zoomOut = () => {
        zoom.value = Math.max(zoom.value - 0.1, 0.5);
      };
      
      const resetView = () => {
        zoom.value = 1;
        panOffset.value = { x: 0, y: 0 };
      };
      
      const startPan = (event) => {
        isPanning.value = true;
        startPanPosition.value = { x: event.clientX, y: event.clientY };
        startPanOffset.value = { ...panOffset.value };
      };
      
      const pan = (event) => {
        if (isPanning.value) {
          const deltaX = event.clientX - startPanPosition.value.x;
          const deltaY = event.clientY - startPanPosition.value.y;
          panOffset.value = {
            x: startPanOffset.value.x + deltaX / zoom.value,
            y: startPanOffset.value.y + deltaY / zoom.value
          };
        }
      };
      
      const endPan = () => {
        isPanning.value = false;
      };
      
      const handleZoom = (event) => {
        event.preventDefault();
        if (event.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      };
      
      const getMiniMapStyle = () => {
        return {
          transform: `scale(${1 / zoom.value}) translate(${-panOffset.value.x}px, ${-panOffset.value.y}px)`
        };
      };
      
      const getMiniNodeStyle = (ability) => {
        return {
          left: `${ability.position.x / 10}px`,
          top: `${ability.position.y / 10}px`
        };
      };
      
      const getViewRectStyle = () => {
        return {
          width: `${1000 / zoom.value}px`,
          height: `${800 / zoom.value}px`,
          transform: `translate(${panOffset.value.x / 10}px, ${panOffset.value.y / 10}px)`
        };
      };
      
      const formatClassName = (className) => {
        return className.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      };
      
      const capitalize = (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
      };
      
      // Initialize
      loadAbilitiesFromStorage();
      
      return {
        abilities,
        filteredAbilities,
        allAbilities,
        showAbilityModal,
        showPresetModal,
        editingAbility,
        viewMode,
        currentFilter,
        classFilter,
        abilityConnections,
        prerequisites,
        timeMagePresets,
        blackMagePresets,
        whiteMagePresets,
        realLifePresets,
        redMagePresets,
        warriorPresets,
        scholarPresets,
        zoom,
        panOffset,
        isPanning,
        
        // Methods
        toggleViewMode,
        filterAbilities,
        filterByClass,
        openAbilityModal,
        closeAbilityModal,
        openPresetModal,
        closePresetModal,
        editAbility,
        saveAbility,
        confirmDeleteAbility,
        deleteAbility,
        addPreset,
        isPresetAdded,
        getAbilityIcon,
        hasConnections,
        getNodeStyle,
        calculateConnections,
        zoomIn,
        zoomOut,
        resetView,
        startPan,
        pan,
        endPan,
        handleZoom,
        getMiniMapStyle,
        getMiniNodeStyle,
        getViewRectStyle,
        formatClassName,
        capitalize,
        
        // Icons
        add,
        listOutline,
        gridOutline,
        albumsOutline,
        homeOutline,
        gameControllerOutline,
        starOutline,
        closeOutline,
        colorWandOutline,
        addCircleOutline,
        removeCircleOutline,
        refreshOutline
      };
    }
  })
</script>

<style lang="scss">
.ability-grid-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1a1a2e;
  padding: 20px;
}

.grid-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 20;
  display: flex;
  flex-direction: column;
}

.ability-canvas {
  position: relative;
  width: 1000px;
  height: 800px;
  transform-origin: 0 0;
}

.ability-node {
  position: absolute;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
  
  &.real-life {
    background-color: #3498db;
    
    &:hover {
      box-shadow: 0 0 15px #3498db;
    }
  }
  
  &.in-game {
    background-color: #9b59b6;
    
    &:hover {
      box-shadow: 0 0 15px #9b59b6;
    }
  }
  
  &.time-mage {
    background-color: #1abc9c;
    
    &:hover {
      box-shadow: 0 0 15px #1abc9c;
    }
  }
  
  &.black-mage {
    background-color: #e74c3c;
    
    &:hover {
      box-shadow: 0 0 15px #e74c3c;
    }
  }
  
  &.white-mage {
    background-color: #f1c40f;
    
    &:hover {
      box-shadow: 0 0 15px #f1c40f;
    }
  }
  
  .node-icon {
    font-size: 24px;
    color: white;
  }
  
  .node-tooltip {
    position: absolute;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    width: 200px;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    display: none;
    
    .tooltip-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .tooltip-class {
      font-size: 0.9em;
      margin-bottom: 5px;
    }
    
    .tooltip-description {
      font-size: 0.9em;
      margin-bottom: 5px;
    }
    
    .tooltip-cost {
      display: flex;
      justify-content: space-between;
      font-size: 0.8em;
      
      span {
        padding: 2px 5px;
        border-radius: 3px;
        
        &:first-child {
          background-color: #f39c12;
        }
        
        &:last-child {
          background-color: #9b59b6;
        }
      }
    }
    
    .tooltip-frequency {
      font-size: 0.8em;
      margin-top: 5px;
    }
  }
  
  &:hover .node-tooltip {
    display: block;
  }
}

.ability-paths {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 5;
  
  path {
    stroke-width: 3px;
    fill: none;
    
    &.locked {
      stroke: #7f8c8d;
      stroke-dasharray: 5, 5;
    }
    
    &.unlocked {
      stroke: #2ecc71;
    }
    
    &.active {
      stroke: #f1c40f;
      animation: pulse 2s infinite;
    }
  }
}

@keyframes pulse {
  0% {
    stroke-width: 3px;
  }
  50% {
    stroke-width: 6px;
  }
  100% {
    stroke-width: 3px;
  }
}

.mini-map {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 200px;
  height: 160px;
  background-color: rgba(0, 0, 0, 0.5);
  border: 1px solid #fff;
  border-radius: 5px;
  overflow: hidden;
  z-index: 20;
}

.mini-map-content {
  position: relative;
  width: 1000px;
  height: 800px;
  transform-origin: 0 0;
}

.mini-node {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  
  &.real-life {
    background-color: #3498db;
  }
  
  &.in-game {
    background-color: #9b59b6;
  }
  
  &.time-mage {
    background-color: #1abc9c;
  }
  
  &.black-mage {
    background-color: #e74c3c;
  }
  
  &.white-mage {
    background-color: #f1c40f;
  }
}

.view-rectangle {
  position: absolute;
  border: 1px solid #fff;
  box-sizing: border-box;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ion-color-medium);
  
  ion-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
  
  h2 {
    margin-bottom: 8px;
  }
  
  p {
    text-align: center;
    max-width: 300px;
  }
}
</style>
