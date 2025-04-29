<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="icon-colors rpg-box">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <i
          slot="start"
          class="fad fa-hand-holding-magic fa-2x"
        />
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
        <ion-segment
          v-model="currentFilter"
          @ionChange="filterAbilities"
        >
          <ion-segment-button value="all">
            <ion-icon :icon="albumsOutline"></ion-icon>
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="real-life">
            <ion-icon :icon="homeOutline"></ion-icon>
            <ion-label>IRL</ion-label>
          </ion-segment-button>
          <ion-segment-button value="in-game">
            <ion-icon :icon="gameControllerOutline"></ion-icon>
            <ion-label>Game</ion-label>
          </ion-segment-button>
          <ion-segment-button value="presets">
            <ion-icon :icon="starOutline"></ion-icon>
            <ion-label>Presets</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      <ion-toolbar v-if="currentFilter === 'in-game'">
        <ion-segment
          v-model="classFilter"
          @ionChange="filterByClass"
        >
          <ion-segment-button value="all">All</ion-segment-button>
          <ion-segment-button value="time-mage">Time Mage</ion-segment-button>
          <ion-segment-button value="black-mage">Black Mage</ion-segment-button>
          <ion-segment-button value="white-mage">White Mage</ion-segment-button>
          <ion-segment-button value="technician">Technician</ion-segment-button>
          <ion-segment-button value="other">Other</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-slide">
      <!-- Enhanced Ability Manager Component -->
      <XpAbilityManager
        :abilities="filteredAbilities"
        :view-mode="viewMode"
        :ability-statuses="abilityStatuses"
        :unlock-statuses="unlockStatuses"
        @edit-ability="editAbility"
        @view-mode-change="viewMode = $event"
      />

      <!-- Add/Edit Ability Modal -->
      <ion-modal
        :is-open="showAbilityModal"
        @didDismiss="closeAbilityModal"
      >
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
                <ion-input
                  v-model="editingAbility.name"
                  required
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Description</ion-label>
                <ion-textarea
                  v-model="editingAbility.description"
                  rows="3"
                ></ion-textarea>
              </ion-item>

              <ion-item>
                <ion-label>Type</ion-label>
                <ion-select v-model="editingAbility.type">
                  <ion-select-option :value="AbilityType.RealLife">Real Life Reward</ion-select-option>
                  <ion-select-option :value="AbilityType.InGame">In-Game Ability</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item v-if="editingAbility.type === AbilityType.InGame">
                <ion-label>Class</ion-label>
                <ion-select
                  v-model="selectedClass"
                  @ionChange="updateClassRequirement"
                >
                  <ion-select-option value="none">None</ion-select-option>
                  <ion-select-option
                    v-for="(className, key) in ABILITY_CLASSES"
                    :key="key"
                    :value="className"
                  >
                    {{ formatClassName(className) }}
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item v-if="selectedClass !== 'none' && editingAbility.type === AbilityType.InGame">
                <ion-label>Required Class Level</ion-label>
                <ion-select
                  v-model="selectedClassLevel"
                  @ionChange="updateClassRequirement"
                >
                  <ion-select-option
                    v-for="level in 10"
                    :key="level"
                    :value="level"
                  >
                    Level {{ level }}
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item v-if="editingAbility.type === AbilityType.InGame">
                <ion-label>Character Level Required</ion-label>
                <ion-select
                  v-model="characterLevelRequired"
                  @ionChange="updateCharacterLevelRequirement"
                >
                  <ion-select-option value="none">None</ion-select-option>
                  <ion-select-option
                    v-for="level in 20"
                    :key="level"
                    :value="level"
                  >
                    Level {{ level }}
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-label>Frequency</ion-label>
                <ion-select v-model="editingAbility.frequency">
                  <ion-select-option
                    v-for="(value, key) in TimePeriod"
                    :key="key"
                    :value="value"
                  >
                    {{ formatFrequency(value) }}
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">AP Cost</ion-label>
                <ion-input
                  type="number"
                  v-model="apCost"
                  min="0"
                  required
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-label>AP Period</ion-label>
                <ion-select v-model="editingAbility.apRequirement.period">
                  <ion-select-option
                    v-for="(value, key) in TimePeriod"
                    :key="key"
                    :value="value"
                  >
                    {{ formatPeriod(value) }}
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">MP Cost (to cast/use)</ion-label>
                <ion-input
                  type="number"
                  v-model="editingAbility.mpCost"
                  min="0"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-label>Prerequisites</ion-label>
                <ion-select
                  v-model="editingAbility.prerequisites"
                  multiple="true"
                >
                  <ion-select-option
                    v-for="ability in prerequisites"
                    :key="ability.id"
                    :value="ability.id"
                  >
                    {{ ability.name }}
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item v-if="editingAbility.type === AbilityType.InGame">
                <ion-label position="stacked">Effect</ion-label>
                <ion-textarea
                  v-model="editingAbility.effect"
                  rows="2"
                ></ion-textarea>
              </ion-item>

              <ion-item v-if="editingAbility.type === AbilityType.InGame">
                <ion-label>Scaling Attribute</ion-label>
                <ion-select
                  v-model="scalingAttribute"
                  @ionChange="updateScalingAttribute"
                >
                  <ion-select-option value="none">None</ion-select-option>
                  <ion-select-option value="strength">Strength</ion-select-option>
                  <ion-select-option value="dexterity">Dexterity</ion-select-option>
                  <ion-select-option value="constitution">Constitution</ion-select-option>
                  <ion-select-option value="intelligence">Intelligence</ion-select-option>
                  <ion-select-option value="wisdom">Wisdom</ion-select-option>
                  <ion-select-option value="charisma">Charisma</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item v-if="scalingAttribute !== 'none' && editingAbility.type === AbilityType.InGame">
                <ion-label position="stacked">Scaling Rate (% per point)</ion-label>
                <ion-range
                  min="5"
                  max="100"
                  step="5"
                  :value="scalingRate * 100"
                  @ionChange="updateScalingRate($event)"
                  aria-label="Scaling Rate"
                >
                  <ion-label slot="start">5%</ion-label>
                  <ion-label slot="end">100%</ion-label>
                </ion-range>
              </ion-item>

              <ion-item>
                <ion-label>Icon</ion-label>
                <ion-button
                  slot="end"
                  fill="clear"
                  @click="openIconPicker"
                >
                  <i :class="getIconClass(editingAbility.icon)"></i>
                  <span class="ion-padding-start">{{ editingAbility.icon }}</span>
                </ion-button>
              </ion-item>
            </ion-list>

            <div class="ion-padding">
              <ion-button
                expand="block"
                type="submit"
              >Save Ability</ion-button>
              <ion-button
                v-if="editingAbility.id"
                expand="block"
                color="danger"
                @click="confirmDeleteAbility"
              >
                Delete Ability
              </ion-button>
            </div>
          </form>
        </ion-content>
      </ion-modal>

      <!-- Icon Picker Modal -->
      <ion-modal
        :is-open="showIconPicker"
        @didDismiss="closeIconPicker"
      >
        <ion-header>
          <ion-toolbar>
            <ion-title>Select an Icon</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeIconPicker">
                <ion-icon :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <XpIconPicker
          :initial-icon="editingAbility.icon"
          @select="selectIcon"
        />
      </ion-modal>

      <!-- Preset Abilities Modal -->
      <ion-modal
        :is-open="showPresetModal"
        @didDismiss="closePresetModal"
      >
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
              <ion-item
                v-for="preset in timeMagePresets"
                :key="preset.id"
                button
                @click="addPreset(preset)"
              >
                <ion-icon
                  :icon="getAbilityIcon(preset)"
                  slot="start"
                />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox
                  slot="end"
                  :checked="isPresetAdded(preset.id)"
                ></ion-checkbox>
              </ion-item>
            </ion-item-group>

            <ion-item-group>
              <ion-item-divider>
                <ion-label>Technician Abilities</ion-label>
              </ion-item-divider>
              <ion-item
                v-for="preset in techMagePresets"
                :key="preset.id"
                button
                @click="addPreset(preset)"
              >
                <ion-icon
                  :icon="getAbilityIcon(preset)"
                  slot="start"
                />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox
                  slot="end"
                  :checked="isPresetAdded(preset.id)"
                ></ion-checkbox>
              </ion-item>
            </ion-item-group>

            <ion-item-group>
              <ion-item-divider>
                <ion-label>Real Life Rewards</ion-label>
              </ion-item-divider>
              <ion-item
                v-for="preset in realLifePresets"
                :key="preset.id"
                button
                @click="addPreset(preset)"
              >
                <ion-icon
                  :icon="getAbilityIcon(preset)"
                  slot="start"
                />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox
                  slot="end"
                  :checked="isPresetAdded(preset.id)"
                ></ion-checkbox>
              </ion-item>
            </ion-item-group>

            <ion-item-group v-if="hybridPresets.length > 0">
              <ion-item-divider>
                <ion-label>Multi-Class Abilities</ion-label>
              </ion-item-divider>
              <ion-item
                v-for="preset in hybridPresets"
                :key="preset.id"
                button
                @click="addPreset(preset)"
              >
                <ion-icon
                  :icon="getAbilityIcon(preset)"
                  slot="start"
                />
                <ion-label>
                  <h2>{{ preset.name }}</h2>
                  <p>{{ preset.description }}</p>
                </ion-label>
                <ion-checkbox
                  slot="end"
                  :checked="isPresetAdded(preset.id)"
                ></ion-checkbox>
              </ion-item>
            </ion-item-group>
          </ion-list>

          <div class="ion-padding">
            <ion-button
              expand="block"
              @click="closePresetModal"
            >Done</ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <!-- FAB button for adding abilities -->
      <ion-fab
        slot="fixed"
        vertical="bottom"
        horizontal="center"
      >
        <ion-fab-button @click="presentActionSheet" color="rpg">
          <i class="fad fa-hand-holding-magic fa-2x"/>
        </ion-fab-button>
      </ion-fab>

    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, computed, onMounted, watch } from 'vue'
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
    colorWandOutline
  } from 'ionicons/icons'
  import { v4 as uuidv4 } from 'uuid'
  import { alertController, actionSheetController } from '@ionic/vue'
  import AbilitiesDb, { abilitiesStorage } from '@/databases/AbilitiesDb'
  import XpAbilityManager from '@/components/XpAbility/XpAbilityManager.vue'
  import XpIconPicker from '@/components/XpIcon/XpIconPicker.vue'
  import {
    Ability,
    AbilityType,
    AbilityStatus,
    TimePeriod,
    ABILITY_CLASSES
  } from '@/types/abilities'
  import {
    REAL_LIFE_PRESETS,
    TIME_MAGE_PRESETS,
    TECH_MAGE_PRESETS
  } from '@/engine/core/AbilityPresets'

  export default defineComponent({
    name: 'XpAbilities',
    components: {
      XpAbilityManager,
      XpIconPicker
    },
    mixins: [ionic],
    setup() {
      // Database instance
      const abilitiesDb = new AbilitiesDb(abilitiesStorage);

      // State
      const abilities = ref<Ability[]>([])
      const showAbilityModal = ref(false)
      const showPresetModal = ref(false)
      const showIconPicker = ref(false)
      const editingAbility = ref<Ability>({} as Ability)
      const viewMode = ref('list') // 'list' or 'grid'
      const currentFilter = ref('all')
      const classFilter = ref('all')
      const abilityStatuses = ref<{ [abilityId: string]: AbilityStatus }>({})
      const unlockStatuses = ref<{ [abilityId: string]: boolean }>({})

      // Form field refs
      const apCost = ref(0)
      const selectedClass = ref('none')
      const selectedClassLevel = ref(1)
      const characterLevelRequired = ref('none')
      const scalingAttribute = ref('none')
      const scalingRate = ref(0.1) // 10% by default

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
          filtered = filtered.filter(a => {
            if (a.characterRequirement?.class) {
              return Object.keys(a.characterRequirement.class).includes(classFilter.value);
            }
            return false;
          });
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

      // Preset abilities references
      const timeMagePresets = TIME_MAGE_PRESETS;
      const techMagePresets = TECH_MAGE_PRESETS;
      const realLifePresets = REAL_LIFE_PRESETS;
      const hybridPresets = [];

      // Methods
      const toggleViewMode = () => {
        viewMode.value = viewMode.value === 'list' ? 'grid' : 'list';
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

      const openAbilityModal = (ability: Ability | null = null) => {
        if (ability) {
          editingAbility.value = { ...ability };

          // Set form field refs
          apCost.value = ability.apRequirement.amount;

          // Set class requirement fields
          if (ability.characterRequirement?.class) {
            const className = Object.keys(ability.characterRequirement.class)[0];
            if (className) {
              selectedClass.value = className;
              selectedClassLevel.value = ability.characterRequirement.class[className];
            } else {
              selectedClass.value = 'none';
            }
          } else {
            selectedClass.value = 'none';
          }

          // Set character level requirement
          characterLevelRequired.value = ability.characterRequirement?.level
            ? ability.characterRequirement.level.toString()
            : 'none';

          // Set scaling fields
          if (ability.scaling) {
            scalingAttribute.value = ability.scaling.attribute;
            scalingRate.value = ability.scaling.rate;
          } else {
            scalingAttribute.value = 'none';
            scalingRate.value = 0.1;
          }
        } else {
          // Create new ability with defaults
          const newAbility = {
            id: '',
            name: '',
            description: '',
            type: AbilityType.RealLife,
            frequency: TimePeriod.Daily,
            mpCost: 0,
            apRequirement: {
              amount: 0,
              period: TimePeriod.Daily
            },
            prerequisites: [],
            icon: 'colorWandOutline',
            isPreset: false,
            position: {
              x: Math.floor(Math.random() * 800),
              y: Math.floor(Math.random() * 600)
            }
          };

          editingAbility.value = newAbility as Ability;
          apCost.value = 0;
          selectedClass.value = 'none';
          selectedClassLevel.value = 1;
          characterLevelRequired.value = 'none';
          scalingAttribute.value = 'none';
          scalingRate.value = 0.1;
        }
        showAbilityModal.value = true;
      };

      const closeAbilityModal = () => {
        showAbilityModal.value = false;
        // Initialize with a valid default structure to prevent undefined errors
        editingAbility.value = {
          apRequirement: { amount: 0, period: TimePeriod.Daily }
        } as Ability;
      };

      const openPresetModal = () => {
        showPresetModal.value = true;
      };

      const closePresetModal = () => {
        showPresetModal.value = false;
      };

      // Icon picker methods
      const openIconPicker = () => {
        showIconPicker.value = true;
      };

      const closeIconPicker = () => {
        showIconPicker.value = false;
      };

      const selectIcon = ({ iconName, iconPrefix }) => {
        editingAbility.value.icon = iconName;
        editingAbility.value.iconPrefix = iconPrefix;
        closeIconPicker();
      };

      const getIconClass = (iconName) => {
        // If the ability has a specific iconPrefix, use it, otherwise default to solid
        const prefix = editingAbility.value.iconPrefix || 'fas';
        return `${prefix} fa-${iconName}`;
      };

      const editAbility = (ability: Ability) => {
        openAbilityModal(ability);
      };

      const updateClassRequirement = () => {
        if (selectedClass.value === 'none') {
          if (editingAbility.value.characterRequirement) {
            delete editingAbility.value.characterRequirement.class;

            // If no character requirements left, remove the whole object
            if (!editingAbility.value.characterRequirement?.level) {
              delete editingAbility.value.characterRequirement;
            }
          }
        } else {
          if (!editingAbility.value.characterRequirement) {
            editingAbility.value.characterRequirement = {};
          }

          editingAbility.value.characterRequirement.class = {
            [selectedClass.value]: selectedClassLevel.value
          };
        }
      };

      const updateCharacterLevelRequirement = () => {
        if (characterLevelRequired.value === 'none') {
          if (editingAbility.value.characterRequirement) {
            delete editingAbility.value.characterRequirement.level;

            // If no character requirements left, remove the whole object
            if (!editingAbility.value.characterRequirement?.class) {
              delete editingAbility.value.characterRequirement;
            }
          }
        } else {
          if (!editingAbility.value.characterRequirement) {
            editingAbility.value.characterRequirement = {};
          }

          editingAbility.value.characterRequirement.level = parseInt(characterLevelRequired.value);
        }
      };

      const updateScalingAttribute = () => {
        if (scalingAttribute.value === 'none') {
          delete editingAbility.value.scaling;
        } else {
          editingAbility.value.scaling = {
            attribute: scalingAttribute.value,
            rate: scalingRate.value
          };
        }
      };

      const updateScalingRate = (event) => {
        scalingRate.value = event.detail.value / 100;

        if (editingAbility.value.scaling) {
          editingAbility.value.scaling.rate = scalingRate.value;
        }
      };

      const saveAbility = () => {
        const abilityToSave = { ...editingAbility.value };

        // Update AP amount from apCost ref
        abilityToSave.apRequirement.amount = apCost.value;

        if (!abilityToSave.id) {
          // New ability
          abilityToSave.id = uuidv4();

          // Save to DB
          abilitiesDb.setAbility(abilityToSave);
          abilities.value.push(abilityToSave);
        } else {
          // Update existing ability
          abilitiesDb.setAbility(abilityToSave);

          // Update in local array
          const index = abilities.value.findIndex(a => a.id === abilityToSave.id);
          if (index !== -1) {
            abilities.value[index] = abilityToSave;
          }
        }

        closeAbilityModal();
      };

      const confirmDeleteAbility = async () => {
        const alert = await alertController.create({
          header: 'Confirm Delete',
          message: `Are you sure you want to delete the ability "${editingAbility.value.name}"?`,
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel'
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => deleteAbility()
            }
          ]
        });
        alert.present();
      };

      const deleteAbility = () => {
        if (editingAbility.value.id) {
          // Delete from DB
          abilitiesDb.deleteAbility(editingAbility.value);

          // Remove from local array
          abilities.value = abilities.value.filter(a => a.id !== editingAbility.value.id);

          // Also remove this ability from prerequisites of other abilities
          abilities.value.forEach(ability => {
            if (ability.prerequisites && ability.prerequisites.includes(editingAbility.value.id)) {
              ability.prerequisites = ability.prerequisites.filter(p => p !== editingAbility.value.id);
              abilitiesDb.setAbility(ability);
            }
          });

          closeAbilityModal();
        }
      };

      const addPreset = (preset: Ability) => {
        // Check if preset already exists
        const existingPreset = abilities.value.find(a => a.id === preset.id);

        if (existingPreset) {
          // Remove preset if it exists
          abilitiesDb.deleteAbility(existingPreset);
          abilities.value = abilities.value.filter(a => a.id !== preset.id);
        } else {
          // Add preset
          const presetToAdd = { ...preset };
          abilitiesDb.setAbility(presetToAdd);
          abilities.value.push(presetToAdd);
        }
      };

      const isPresetAdded = (presetId: string) => {
        return abilities.value.some(a => a.id === presetId);
      };

      const getAbilityIcon = (ability: Ability) => {
        // If the ability has iconPrefix, it's a Font Awesome icon, so we should display it differently
        if (ability.iconPrefix) {
          return { component: 'i', class: `${ability.iconPrefix} fa-${ability.icon} fa-lg` };
        }

        // Otherwise use the old ionic icon mapping
        const iconMap = {
          colorWandOutline,
          timeOutline: colorWandOutline,
          flameOutline: colorWandOutline,
          waterOutline: colorWandOutline,
          flashOutline: colorWandOutline,
          medkitOutline: colorWandOutline,
          shieldOutline: colorWandOutline,
          homeOutline,
          tvOutline: homeOutline,
          gameControllerOutline,
          peopleOutline: homeOutline
        };

        return iconMap[ability.icon] || colorWandOutline;
      };

      const formatClassName = (className: string): string => {
        return className.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      };

      const formatFrequency = (frequency: TimePeriod): string => {
        switch (frequency) {
          case TimePeriod.Hourly:
            return 'Hourly';
          case TimePeriod.Daily:
            return 'Daily';
          case TimePeriod.Weekly:
            return 'Weekly';
          case TimePeriod.Monthly:
            return 'Monthly';
          case TimePeriod.Quarterly:
            return 'Quarterly';
          case TimePeriod.BiAnnual:
            return 'Bi-Annual';
          case TimePeriod.Yearly:
            return 'Yearly';
          case TimePeriod.Flat:
          default:
            return 'One-time';
        }
      };

      const formatPeriod = (period: TimePeriod): string => {
        if (period === TimePeriod.Flat) {
          return 'Total (one-time)';
        }
        return formatFrequency(period);
      };

      const calculateAbilityStatuses = () => {
        // Mock function to simulate ability statuses
        // In a real app, this would check against user progress and stats

        const mockUserStats = {
          level: 5,
          classes: {
            'time-mage': 3,
            'technician': 2,
            'black-mage': 1
          },
          attributes: {
            strength: 8,
            dexterity: 10,
            constitution: 9,
            intelligence: 12,
            wisdom: 10,
            charisma: 11
          },
          ap: {
            total: 1000,
            daily: 50,
            weekly: 200,
            monthly: 500
          },
          mp: 30
        };

        // Reset statuses
        const statuses: { [id: string]: AbilityStatus } = {};
        const unlocks: { [id: string]: boolean } = {};

        // Process abilities
        abilities.value.forEach(ability => {
          // Check if ability is unlocked
          let isUnlocked = false;

          // Check AP requirements
          let hasEnoughAp = false;

          switch (ability.apRequirement.period) {
            case TimePeriod.Daily:
              hasEnoughAp = mockUserStats.ap.daily >= ability.apRequirement.amount;
              break;
            case TimePeriod.Weekly:
              hasEnoughAp = mockUserStats.ap.weekly >= ability.apRequirement.amount;
              break;
            case TimePeriod.Monthly:
              hasEnoughAp = mockUserStats.ap.monthly >= ability.apRequirement.amount;
              break;
            default:
              hasEnoughAp = mockUserStats.ap.total >= ability.apRequirement.amount;
          }

          if (hasEnoughAp) {
            // Check character level requirement
            if (ability.characterRequirement?.level) {
              if (mockUserStats.level >= ability.characterRequirement.level) {
                isUnlocked = true;
              }
            } else {
              isUnlocked = true;
            }

            // Check class requirements
            if (isUnlocked && ability.characterRequirement?.class) {
              for (const [className, requiredLevel] of Object.entries(ability.characterRequirement.class)) {
                const userClassLevel = mockUserStats.classes[className] || 0;
                if (userClassLevel < requiredLevel) {
                  isUnlocked = false;
                  break;
                }
              }
            }

            // Check prerequisites
            if (isUnlocked && ability.prerequisites && ability.prerequisites.length > 0) {
              for (const prereqId of ability.prerequisites) {
                if (!unlocks[prereqId]) {
                  isUnlocked = false;
                  break;
                }
              }
            }
          }

          // Store unlock status
          unlocks[ability.id] = isUnlocked;

          // Determine ability status
          if (!isUnlocked) {
            statuses[ability.id] = AbilityStatus.Locked;
          } else if (mockUserStats.mp < ability.mpCost) {
            statuses[ability.id] = AbilityStatus.Unlocked;
          } else if (ability.lastUsed) {
            // Check if the ability is in cooldown based on frequency
            const now = new Date();
            const lastUsed = new Date(ability.lastUsed);
            let cooldownExpired = true;
            let dayDiff = 0;
            let weekDiff = 0;
            let monthDiff = 0;

            switch (ability.frequency) {
              case TimePeriod.Daily:
                dayDiff = now.getDate() - lastUsed.getDate();
                cooldownExpired = dayDiff >= 1;
                break;
              case TimePeriod.Weekly:
                weekDiff = Math.floor((now.getTime() - lastUsed.getTime()) / (7 * 24 * 60 * 60 * 1000));
                cooldownExpired = weekDiff >= 1;
                break;
              case TimePeriod.Monthly:
                monthDiff = (now.getFullYear() - lastUsed.getFullYear()) * 12 + (now.getMonth() - lastUsed.getMonth());
                cooldownExpired = monthDiff >= 1;
                break;
            }

            statuses[ability.id] = cooldownExpired ? AbilityStatus.Available : AbilityStatus.Cooling;
          } else {
            statuses[ability.id] = AbilityStatus.Available;
          }
        });

        abilityStatuses.value = statuses;
        unlockStatuses.value = unlocks;
      };

      const loadAbilities = async () => {
        const loadedAbilities = await abilitiesDb.getAbilities();
        abilities.value = loadedAbilities;
        calculateAbilityStatuses();
      };

      // Watch for changes in abilities to recalculate statuses
      watch(abilities, calculateAbilityStatuses, { deep: true });

      // Initialize
      onMounted(() => {
        loadAbilities();
      });

      // Action sheet handler
      const presentActionSheet = async () => {
        const actionSheet = await actionSheetController.create({
          header: 'Ability Actions',
          cssClass: 'abilities-action-sheet',
          mode: 'ios',
          buttons: [
            {
              text: 'Create New Ability',
              cssClass: 'action-create',
              handler: () => {
                openAbilityModal();
              }
            },
            {
              text: 'Add from Presets',
              cssClass: 'action-preset',
              handler: () => {
                openPresetModal();
              }
            },
            {
              text: 'Cancel',
              role: 'cancel',
              cssClass: 'action-cancel',
              handler: () => {
                // Just close the action sheet
              }
            },
          ],
        });
        await actionSheet.present();
      };

      return {
        abilities,
        filteredAbilities,
        showAbilityModal,
        showPresetModal,
        editingAbility,
        viewMode,
        currentFilter,
        classFilter,
        abilityStatuses,
        unlockStatuses,
        prerequisites,
        apCost,
        selectedClass,
        selectedClassLevel,
        characterLevelRequired,
        scalingAttribute,
        scalingRate,

        // Presets
        timeMagePresets,
        techMagePresets,
        realLifePresets,
        hybridPresets,

        // Methods
        toggleViewMode,
        filterAbilities,
        filterByClass,
        openAbilityModal,
        closeAbilityModal,
        openPresetModal,
        closePresetModal,
        // Icon picker methods
        openIconPicker,
        closeIconPicker,
        selectIcon,
        getIconClass,
        editAbility,
        updateClassRequirement,
        updateCharacterLevelRequirement,
        updateScalingAttribute,
        updateScalingRate,
        saveAbility,
        confirmDeleteAbility,
        deleteAbility,
        addPreset,
        isPresetAdded,
        getAbilityIcon,
        formatClassName,
        formatFrequency,
        formatPeriod,
        presentActionSheet,

        // Constants
        AbilityType,
        TimePeriod,
        ABILITY_CLASSES,

        // Icons
        add,
        listOutline,
        gridOutline,
        albumsOutline,
        homeOutline,
        gameControllerOutline,
        starOutline,
        closeOutline,
        colorWandOutline
      };
    }
  })
</script>

<style lang="scss" scoped>
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

  ion-fab-list {
    ion-fab-button {
      &::before {
        position: absolute;
        right: 53px;
        top: 12px;
        cursor: pointer;
        white-space: nowrap;
      }

      &:nth-child(1)::before {
        content: "Create New Ability";
      }

      &:nth-child(2)::before {
        content: "Add from Presets";
      }
    }
  }

  ion-modal {
    --height: 90%;
    --width: 90%;
    --max-width: 700px;
    --border-radius: 16px;
  }
</style>
