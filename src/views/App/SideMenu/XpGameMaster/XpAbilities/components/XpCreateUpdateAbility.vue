<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master/compendium/abilities"></ion-back-button>
        </ion-buttons>

        <ion-title>
          {{ id ? 'Edit Ability' : 'Add Ability' }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button
            @click="saveAbility"
            :color="isValid ? 'success' : 'rpg'"
          >
            <i
              class="fad mr-2 fa-2x"
              :class="isValid ? 'fa-save' : 'fa-save'"
            />
            {{ isValid ? 'Save' : '' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="bg-slide">
      <ion-card>
        <ion-card-content>
          <p>Create your own abilities to use in the game. Abilities can grant bonuses, track cooldowns, and help organize your activities.</p>
          <p>Abilities require you to maintain a certain AP threshold (not spent) and cost MP to cast.</p>
          <p><small>Fields with an asterisk (*) are required.</small></p>
        </ion-card-content>
      </ion-card>
      
      <ion-list>
        <ion-list-header>
          <ion-label>Basic Information</ion-label>
        </ion-list-header>
        
        <ion-item>
          <ion-label position="floating">
            Name *
          </ion-label>
          <ion-input v-model="ability.name" placeholder="Enter ability name" />
        </ion-item>

        <ion-item>
          <ion-label position="floating">
            Description
          </ion-label>
          <ion-textarea
            v-model="ability.description"
            rows="3"
            placeholder="Describe what this ability does"
          ></ion-textarea>
        </ion-item>

        <ion-item>
          <ion-label>Type</ion-label>
          <ion-select v-model="ability.type" interface="popover">
            <ion-select-option :value="AbilityType.RealLife">Real Life Reward</ion-select-option>
            <ion-select-option :value="AbilityType.InGame">In-Game Ability</ion-select-option>
          </ion-select>
          <ion-note slot="helper">Real life rewards are external activities. In-game abilities are used within the app.</ion-note>
        </ion-item>
        
        <ion-item>
          <ion-label>Frequency</ion-label>
          <ion-select v-model="ability.frequency" interface="popover">
            <ion-select-option :value="TimePeriod.Hourly">Hourly</ion-select-option>
            <ion-select-option :value="TimePeriod.Daily">Daily</ion-select-option>
            <ion-select-option :value="TimePeriod.Weekly">Weekly</ion-select-option>
            <ion-select-option :value="TimePeriod.Monthly">Monthly</ion-select-option>
            <ion-select-option :value="TimePeriod.Quarterly">Quarterly</ion-select-option>
            <ion-select-option :value="TimePeriod.BiAnnual">Bi-Annual</ion-select-option>
            <ion-select-option :value="TimePeriod.Yearly">Yearly</ion-select-option>
            <ion-select-option :value="TimePeriod.Flat">One-Time</ion-select-option>
          </ion-select>
          <ion-note slot="helper">How often this ability can be used</ion-note>
        </ion-item>
        
        <ion-item button @click="openIconPicker">
          <ion-label>Icon</ion-label>
          <div slot="end" class="icon-preview">
            <i v-if="ability.icon" :class="`${ability.iconPrefix || 'fad'} fa-${ability.icon} fa-lg`"></i>
            <span v-else>Select Icon</span>
          </div>
        </ion-item>
        
        <ion-list-header>
          <ion-label>Costs & Requirements</ion-label>
        </ion-list-header>
        
        <ion-item>
          <ion-label>MP Cost</ion-label>
          <ion-input
            type="number"
            v-model="mpCost"
            placeholder="Enter MP cost"
            min="0"
          ></ion-input>
          <ion-note slot="helper">Magic Points spent when casting this ability</ion-note>
        </ion-item>

        <ion-item>
          <ion-label position="floating">AP Required</ion-label>
          <ion-input
            type="number"
            v-model="apCost"
            min="0"
          ></ion-input>
          <ion-note slot="helper">Ability Points threshold required to access this ability (not spent)</ion-note>
        </ion-item>

        <ion-item>
          <ion-label>AP Period</ion-label>
          <ion-select v-model="ability.apRequirement.period" interface="popover">
            <ion-select-option :value="TimePeriod.Daily">Daily</ion-select-option>
            <ion-select-option :value="TimePeriod.Weekly">Weekly</ion-select-option>
            <ion-select-option :value="TimePeriod.Monthly">Monthly</ion-select-option>
            <ion-select-option :value="TimePeriod.Yearly">Yearly</ion-select-option>
            <ion-select-option :value="TimePeriod.Flat">Total (one-time)</ion-select-option>
          </ion-select>
          <ion-note slot="helper">Time period over which AP threshold is measured</ion-note>
        </ion-item>
      </ion-list>
      
      <ion-list v-if="ability.type === AbilityType.InGame">
        <ion-list-header>
          <ion-label>Character Requirements</ion-label>
        </ion-list-header>
        
        <ion-item>
          <ion-label>Class Requirement</ion-label>
          <ion-select
            v-model="selectedClass"
            @ionChange="updateClassRequirement"
            interface="popover"
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

        <!-- Add class level input when a class is selected -->
        <ion-item v-if="selectedClass !== 'none'">
          <ion-label>Class Level</ion-label>
          <ion-input
            type="number"
            v-model="selectedClassLevel"
            placeholder="Required level"
            min="1"
            @ionChange="updateClassRequirement"
          ></ion-input>
          <ion-note slot="helper">Minimum class level needed</ion-note>
        </ion-item>
        
        <ion-item>
          <ion-label>Character Level</ion-label>
          <ion-input
            type="number"
            v-model="characterLevelRequired"
            placeholder="Required level"
            min="0"
            @ionChange="updateCharacterLevelRequirement"
          ></ion-input>
          <ion-note slot="helper">Set to 0 for no level requirement</ion-note>
        </ion-item>
        
        <ion-list-header>
          <ion-label>Ability Effects</ion-label>
        </ion-list-header>
        
        <ion-item>
          <ion-label position="floating">Effect Description</ion-label>
          <ion-textarea
            v-model="ability.effect"
            rows="2"
            placeholder="What happens when this ability is used"
          ></ion-textarea>
        </ion-item>
        
        <ion-item>
          <ion-label>Scaling Attribute</ion-label>
          <ion-select
            v-model="scalingAttribute"
            @ionChange="updateScalingAttribute"
            interface="popover"
          >
            <ion-select-option value="none">None</ion-select-option>
            <ion-select-option value="strength">Strength</ion-select-option>
            <ion-select-option value="dexterity">Dexterity</ion-select-option>
            <ion-select-option value="constitution">Constitution</ion-select-option>
            <ion-select-option value="intelligence">Intelligence</ion-select-option>
            <ion-select-option value="wisdom">Wisdom</ion-select-option>
            <ion-select-option value="charisma">Charisma</ion-select-option>
          </ion-select>
          <ion-note slot="helper">Attribute that enhances this ability</ion-note>
        </ion-item>
        
        <ion-item v-if="scalingAttribute !== 'none'">
          <ion-label>Scaling Rate (%)</ion-label>
          <ion-range
            :min="0"
            :max="100"
            :step="5"
            :pin="true"
            :value="scalingRate * 100"
            @ionChange="updateScalingRate"
          >
            <ion-label slot="start">0%</ion-label>
            <ion-label slot="end">100%</ion-label>
          </ion-range>
          <ion-note slot="helper">How much each point in the attribute increases ability effectiveness</ion-note>
        </ion-item>
      </ion-list>
    </ion-content>
    
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="goBack" color="danger">
            <i class="fad fa-times fa-lg mr-2" />
            Cancel
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="saveAbility" :disabled="!isValid">
            Save
            <i class="fad fa-save fa-lg ml-2" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, computed, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import ionic from "@/mixins/ionic";
  import { modalController, toastController } from "@ionic/vue"; // Import controllers directly
  import AbilitiesDb, { abilitiesStorage } from '@/lib/databases/AbilitiesDb';
  import { v4 as uuidv4 } from 'uuid';
  import {
    Ability,
    AbilityType,
    TimePeriod,
    ABILITY_CLASSES
  } from '@/lib/types/abilities';

  export default defineComponent({
    name: "XpCreateUpdateAbility",
    mixins: [ionic],
    setup() {
      const route = useRoute();
      const router = useRouter();
      const id = computed(() => route.params.id as string | undefined);
      
      // Database instance
      const abilitiesDb = new AbilitiesDb(abilitiesStorage);
      
      // Form data
      const ability = ref<Ability>({
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
        icon: 'hand-holding-magic',
        iconPrefix: 'fad',
        isPreset: false,
        position: {
          x: Math.floor(Math.random() * 800),
          y: Math.floor(Math.random() * 600)
        }
      } as Ability);
      
      // Additional form fields
      const apCost = ref(0);
      const mpCost = ref(0);
      const selectedClass = ref('none');
      const selectedClassLevel = ref(1);
      const characterLevelRequired = ref(0);
      const scalingAttribute = ref('none');
      const scalingRate = ref(0);
      
      // Computed properties
      const isValid = computed(() => {
        // Basic validation
        if (!ability.value.name || ability.value.name.trim() === '') {
          return false;
        }
        
        // Ensure MP cost is valid
        if (ability.value.mpCost < 0 || isNaN(ability.value.mpCost)) {
          return false;
        }
        
        // Ensure AP requirement is valid
        if (ability.value.apRequirement.amount < 0 || isNaN(ability.value.apRequirement.amount)) {
          return false;
        }
        
        return true;
      });
      
      // Methods
      const loadAbility = async (abilityId: string) => {
        const loadedAbility = await abilitiesDb.getAbilityById(abilityId);
        if (loadedAbility) {
          ability.value = { ...loadedAbility };
          
          // Set form field refs
          apCost.value = loadedAbility.apRequirement.amount;
          mpCost.value = loadedAbility.mpCost || 0;
          
          // Set class requirement fields
          if (loadedAbility.characterRequirement?.class) {
            const className = Object.keys(loadedAbility.characterRequirement.class)[0];
            if (className) {
              selectedClass.value = className;
              selectedClassLevel.value = loadedAbility.characterRequirement.class[className];
            } else {
              selectedClass.value = 'none';
            }
          }
          
          // Set character level requirement
          if (loadedAbility.characterRequirement?.level) {
            characterLevelRequired.value = loadedAbility.characterRequirement.level;
          }
          
          // Set scaling attributes if they exist
          if (loadedAbility.scaling) {
            scalingAttribute.value = loadedAbility.scaling.attribute || 'none';
            scalingRate.value = loadedAbility.scaling.rate || 0.1;
          } else {
            scalingAttribute.value = 'none';
            scalingRate.value = 0.1;
          }
        }
      };
      
      const updateClassRequirement = () => {
        if (selectedClass.value === 'none') {
          if (ability.value.characterRequirement) {
            delete ability.value.characterRequirement.class;
            
            // If no character requirements left, remove the whole object
            if (!ability.value.characterRequirement?.level) {
              delete ability.value.characterRequirement;
            }
          }
        } else {
          if (!ability.value.characterRequirement) {
            ability.value.characterRequirement = {};
          }
          
          ability.value.characterRequirement.class = {
            [selectedClass.value]: selectedClassLevel.value
          };
        }
      };
      
      const updateCharacterLevelRequirement = () => {
        if (characterLevelRequired.value === 0) {
          if (ability.value.characterRequirement) {
            delete ability.value.characterRequirement.level;
            
            // If no character requirements left, remove the whole object
            if (!ability.value.characterRequirement?.class) {
              delete ability.value.characterRequirement;
            }
          }
        } else {
          if (!ability.value.characterRequirement) {
            ability.value.characterRequirement = {};
          }
          
          ability.value.characterRequirement.level = characterLevelRequired.value;
        }
      };
      
      // Icon picker functionality
      const openIconPicker = async () => {
        const iconPicker = await modalController.create({
          component: 'XpIconPicker',
          cssClass: 'icon-picker-modal',
          componentProps: {
            selectedIcon: ability.value.icon,
            selectedPrefix: ability.value.iconPrefix || 'fad'
          }
        });
        
        iconPicker.onDidDismiss().then((result) => {
          if (result.data) {
            ability.value.icon = result.data.iconName;
            ability.value.iconPrefix = result.data.iconPrefix;
          }
        });
        
        return iconPicker.present();
      };
      
      const updateScalingAttribute = () => {
        if (scalingAttribute.value === 'none') {
          delete ability.value.scaling;
        } else {
          if (!ability.value.scaling) {
            // Initialize with both required properties to satisfy TypeScript
            ability.value.scaling = {
              attribute: scalingAttribute.value,
              rate: scalingRate.value
            };
          } else {
            // Set attribute if scaling already exists
            ability.value.scaling.attribute = scalingAttribute.value;
          }
        }
      };
      
      const updateScalingRate = (event: CustomEvent) => {
        scalingRate.value = event.detail.value / 100;
        
        if (ability.value.scaling) {
          ability.value.scaling.rate = scalingRate.value;
        } else if (scalingAttribute.value !== 'none') {
          // Ensure we have a valid scaling object with both required properties
          ability.value.scaling = {
            attribute: scalingAttribute.value,
            rate: scalingRate.value
          };
        }
      };
      
      const formatClassName = (className: string): string => {
        return className.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      };
      
      const saveAbility = async () => {
        const abilityToSave = { ...ability.value };
        
        // Update AP amount and MP cost from refs
        abilityToSave.apRequirement.amount = apCost.value;
        abilityToSave.mpCost = mpCost.value;
        
        if (!abilityToSave.id) {
          // New ability
          abilityToSave.id = uuidv4();
        }
        
        try {
          // Save to DB
          await abilitiesDb.setAbility(abilityToSave);
          
          // Show success toast
          const toast = await toastController.create({
            message: `Ability "${abilityToSave.name}" saved successfully!`,
            duration: 2000,
            color: 'success',
            position: 'bottom'
          });
          toast.present();
          
          // Navigate back
          goBack();
        } catch (error) {
          console.error('Error saving ability:', error);
          
          // Show error toast
          const toast = await toastController.create({
            message: 'Error saving ability. Please try again.',
            duration: 3000,
            color: 'danger',
            position: 'bottom'
          });
          toast.present();
        }
      };
      
      const goBack = () => {
        router.push('/game-master/compendium/abilities');
      };
      
      // Initialize
      onMounted(async () => {
        if (id.value) {
          await loadAbility(id.value);
        }
      });
      
      return {
        id,
        ability,
        apCost,
        mpCost,
        selectedClass,
        selectedClassLevel,
        characterLevelRequired,
        scalingAttribute,
        scalingRate,
        isValid,
        updateClassRequirement,
        updateCharacterLevelRequirement,
        updateScalingAttribute,
        updateScalingRate,
        formatClassName,
        saveAbility,
        goBack,
        openIconPicker,
        AbilityType,
        TimePeriod,
        ABILITY_CLASSES
      };
    }
  })
</script>

<style lang="scss" scoped>
  .rpg-box {
    --background: var(--ion-color-rpg);
    --color: white;
  }

  ion-card {
    margin: 1rem;
  }
  
  .icon-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: var(--ion-color-light);
    
    i {
      font-size: 24px;
      color: var(--ion-color-primary);
    }
  }
  
  ion-list-header {
    --background: rgba(var(--ion-color-rpg-rgb), 0.1);
    margin-top: 1rem;
    
    ion-label {
      font-weight: 600;
      letter-spacing: 0.05rem;
    }
  }
  
  ion-note {
    font-size: 12px;
    opacity: 0.8;
  }
  
  ion-item {
    --padding-start: 8px;
    --inner-padding-end: 8px;
  }
</style>
