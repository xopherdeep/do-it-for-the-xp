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
          This is where you can add your abilities.
        </ion-card-content>
      </ion-card>
      
      <ion-list>
        <ion-item>
          <ion-label position="floating">
            Enter name of Ability
          </ion-label>
          <ion-input v-model="ability.name" />
        </ion-item>

        <ion-item>
          <ion-label position="floating">
            Description
          </ion-label>
          <ion-textarea
            v-model="ability.description"
            rows="3"
          ></ion-textarea>
        </ion-item>

        <ion-item>
          <ion-label>Type</ion-label>
          <ion-select v-model="ability.type">
            <ion-select-option :value="AbilityType.RealLife">Real Life Reward</ion-select-option>
            <ion-select-option :value="AbilityType.InGame">In-Game Ability</ion-select-option>
          </ion-select>
        </ion-item>
        
        <ion-item v-if="ability.type === AbilityType.InGame">
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

        <ion-item>
          <ion-label position="floating">AP Cost</ion-label>
          <ion-input
            type="number"
            v-model="apCost"
            min="0"
          ></ion-input>
        </ion-item>

        <!-- Additional fields will be added here -->
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
      const selectedClass = ref('none');
      const selectedClassLevel = ref(1);
      
      // Computed properties
      const isValid = computed(() => {
        return ability.value.name && ability.value.name.trim() !== '';
      });
      
      // Methods
      const loadAbility = async (abilityId: string) => {
        const loadedAbility = await abilitiesDb.getAbilityById(abilityId);
        if (loadedAbility) {
          ability.value = { ...loadedAbility };
          apCost.value = loadedAbility.apRequirement.amount;
          
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
      
      const formatClassName = (className: string): string => {
        return className.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      };
      
      const saveAbility = async () => {
        const abilityToSave = { ...ability.value };
        
        // Update AP amount from apCost ref
        abilityToSave.apRequirement.amount = apCost.value;
        
        if (!abilityToSave.id) {
          // New ability
          abilityToSave.id = uuidv4();
        }
        
        // Save to DB
        await abilitiesDb.setAbility(abilityToSave);
        
        // Navigate back
        goBack();
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
        selectedClass,
        selectedClassLevel,
        isValid,
        updateClassRequirement,
        formatClassName,
        saveAbility,
        goBack,
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
</style>
