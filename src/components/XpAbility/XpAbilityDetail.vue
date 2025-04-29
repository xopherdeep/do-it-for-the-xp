<template>
  <div class="ability-detail" :class="[ability.type, statusClass]">
    <div class="ability-header">
      <div class="ability-icon">
        <ion-icon v-if="!ability.iconPrefix" :icon="getAbilityIcon()" size="large"></ion-icon>
        <i v-else :class="getIconClass()" class="fa-lg"></i>
      </div>
      <div class="ability-title">
        <h2>{{ ability.name }}</h2>
        <div class="ability-badges">
          <ion-badge color="primary">{{ capitalize(ability.type) }}</ion-badge>
          <ion-badge color="tertiary">{{ formatFrequency(ability.frequency) }}</ion-badge>
          <ion-badge :color="getStatusColor()">{{ formatStatus(abilityStatus) }}</ion-badge>
        </div>
      </div>
    </div>
    
    <p class="ability-description">{{ ability.description }}</p>
    
    <div class="ability-requirements">
      <h3>Requirements</h3>
      <div class="requirements-grid">
        <div class="requirement">
          <ion-icon :icon="starOutline"></ion-icon>
          <span>{{ ability.apRequirement.amount }} AP ({{ formatPeriod(ability.apRequirement.period) }})</span>
        </div>
        
        <div class="requirement" v-if="ability.mpCost > 0">
          <ion-icon :icon="flameOutline"></ion-icon>
          <span>{{ ability.mpCost }} MP to cast</span>
        </div>
        
        <!-- Character level requirement -->
        <div class="requirement" v-if="ability.characterRequirement?.level">
          <ion-icon :icon="personOutline"></ion-icon>
          <span>Level {{ ability.characterRequirement.level }}+ required</span>
        </div>
        
        <!-- Class requirements -->
        <div class="requirement" v-if="ability.characterRequirement?.class">
          <ion-icon :icon="bookOutline"></ion-icon>
          <span>
            <div v-for="(level, className) in ability.characterRequirement.class" :key="className">
              {{ formatClassName(className) }} Lv.{{ level }}+
            </div>
          </span>
        </div>
        
        <!-- Prerequisites -->
        <div class="requirement" v-if="prerequisites.length > 0">
          <ion-icon :icon="keyOutline"></ion-icon>
          <span>
            <div v-for="prereq in prerequisites" :key="prereq.id">
              {{ prereq.name }}
            </div>
          </span>
        </div>
      </div>
    </div>
    
    <!-- Effect information for in-game abilities -->
    <div class="ability-effect" v-if="ability.effect">
      <h3>Effect</h3>
      <p>{{ ability.effect }}</p>
      
      <!-- Ability scaling display -->
      <div class="ability-scaling" v-if="ability.scaling">
        <h4>Scaling</h4>
        <p>
          Scales with {{ formatAttribute(ability.scaling.attribute) }}: 
          +{{ (ability.scaling.rate * 100).toFixed(0) }}% per point
        </p>
        <div class="scaling-visualization" v-if="characterStats">
          <div class="base-effect">
            Base
          </div>
          <div class="scaled-effect" :style="{ width: `${getScalingWidth()}%` }">
            +{{ getScalingBonus() }}%
          </div>
        </div>
      </div>
    </div>
    
    <!-- Usage information -->
    <div class="ability-usage">
      <h3>Usage</h3>
      <p>Can be used {{ formatFrequency(ability.frequency).toLowerCase() }}</p>
      <div v-if="ability.lastUsed" class="last-used">
        Last used: {{ formatDate(ability.lastUsed) }}
      </div>
      
      <ion-button 
        expand="block" 
        :disabled="!canUseAbility"
        :color="getActionColor()"
        @click="useAbility"
      >
        {{ getActionLabel() }}
      </ion-button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue';
import { 
  Ability, 
  AbilityType, 
  AbilityStatus, 
  TimePeriod 
} from '@/lib/types/abilities';
import {
  starOutline,
  flameOutline,
  personOutline,
  bookOutline,
  keyOutline,
  timeOutline,
  waterOutline,
  flashOutline,
  medkitOutline,
  shieldOutline,
  colorWandOutline,
  homeOutline,
  tvOutline,
  gameControllerOutline,
  peopleOutline,
  calendarOutline,
  refreshOutline,
  listOutline,
  pizzaOutline,
  planetOutline,
  giftOutline,
  appsOutline,
  helpOutline
} from 'ionicons/icons';

export default defineComponent({
  name: 'XpAbilityDetail',
  props: {
    ability: {
      type: Object as PropType<Ability>,
      required: true
    },
    abilityStatus: {
      type: String as PropType<AbilityStatus>,
      default: AbilityStatus.Locked
    },
    prerequisites: {
      type: Array as PropType<Ability[]>,
      default: () => []
    },
    characterStats: {
      type: Object as PropType<{ [stat: string]: number }>,
      default: () => ({})
    },
    availableMp: {
      type: Number,
      default: 0
    }
  },
  setup(props, { emit }) {
    const statusClass = computed(() => {
      return `status-${props.abilityStatus.toLowerCase()}`;
    });
    
    const canUseAbility = computed(() => {
      return props.abilityStatus === AbilityStatus.Available && 
             props.availableMp >= props.ability.mpCost;
    });
    
    const getAbilityIcon = () => {
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
        peopleOutline,
        calendarOutline,
        refreshOutline,
        listOutline,
        pizzaOutline,
        planetOutline,
        giftOutline,
        appsOutline,
        helpOutline
      };
      
      return iconMap[props.ability.icon] || colorWandOutline;
    };
    
    const getIconClass = () => {
      // If the ability has a specific iconPrefix, use it, otherwise default to solid
      const prefix = props.ability.iconPrefix || 'fas';
      return `${prefix} fa-${props.ability.icon}`;
    };
    
    const getStatusColor = () => {
      switch (props.abilityStatus) {
        case AbilityStatus.Available:
          return 'success';
        case AbilityStatus.Unlocked:
          return 'warning';
        case AbilityStatus.Used:
        case AbilityStatus.Cooling:
          return 'medium';
        case AbilityStatus.Locked:
        default:
          return 'danger';
      }
    };
    
    const getActionColor = () => {
      if (!canUseAbility.value) {
        return 'medium';
      }
      return props.ability.type === AbilityType.RealLife ? 'success' : 'primary';
    };
    
    const getActionLabel = () => {
      if (props.abilityStatus === AbilityStatus.Locked) {
        return 'Locked';
      }
      
      if (props.abilityStatus === AbilityStatus.Used || 
          props.abilityStatus === AbilityStatus.Cooling) {
        return 'Already Used';
      }
      
      if (props.availableMp < props.ability.mpCost) {
        return 'Not Enough MP';
      }
      
      return props.ability.type === AbilityType.RealLife ? 'Claim Reward' : 'Cast Ability';
    };
    
    const formatFrequency = (frequency: TimePeriod) => {
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
        default:
          return 'Once';
      }
    };
    
    const formatPeriod = (period: TimePeriod) => {
      if (period === TimePeriod.Flat) {
        return 'total';
      }
      return formatFrequency(period).toLowerCase();
    };
    
    const formatStatus = (status: AbilityStatus) => {
      switch (status) {
        case AbilityStatus.Available:
          return 'Available';
        case AbilityStatus.Unlocked:
          return 'Unlocked';
        case AbilityStatus.Used:
          return 'Used';
        case AbilityStatus.Cooling:
          return 'Cooling Down';
        case AbilityStatus.Locked:
        default:
          return 'Locked';
      }
    };
    
    const formatClassName = (className: string) => {
      return className.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };
    
    const formatAttribute = (attribute: string) => {
      return attribute.replace(/\b\w/g, l => l.toUpperCase());
    };
    
    const formatDate = (date: Date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString();
    };
    
    const capitalize = (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    };
    
    const getScalingBonus = () => {
      if (!props.ability.scaling) return 0;
      
      const attributeValue = props.characterStats[props.ability.scaling.attribute] || 0;
      return Math.round(attributeValue * props.ability.scaling.rate * 100);
    };
    
    const getScalingWidth = () => {
      const bonus = getScalingBonus();
      // Cap at 100% for visual purposes
      return Math.min(bonus, 100);
    };
    
    const useAbility = () => {
      if (!canUseAbility.value) return;
      
      emit('use-ability', props.ability.id);
    };
    
    return {
      statusClass,
      canUseAbility,
      getAbilityIcon,
      getIconClass,
      getStatusColor,
      getActionColor,
      getActionLabel,
      formatFrequency,
      formatPeriod,
      formatStatus,
      formatClassName,
      formatAttribute,
      formatDate,
      capitalize,
      getScalingBonus,
      getScalingWidth,
      useAbility,
      
      // Icons
      starOutline,
      flameOutline,
      personOutline,
      bookOutline,
      keyOutline
    };
  }
});
</script>

<style lang="scss" scoped>
.ability-detail {
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  background-color: var(--ion-card-background);
  
  &.real-life {
    border-left: 4px solid var(--ion-color-success);
  }
  
  &.in-game {
    border-left: 4px solid var(--ion-color-primary);
  }
  
  &.status-locked {
    opacity: 0.7;
  }
  
  &.status-used,
  &.status-cooling {
    opacity: 0.8;
  }
}

.ability-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  
  .ability-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--ion-color-light);
    border-radius: 50%;
    margin-right: 16px;
    flex-shrink: 0;
  }
  
  .ability-title {
    flex: 1;
    
    h2 {
      margin: 0 0 4px 0;
      font-weight: bold;
    }
  }
  
  .ability-badges {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    
    ion-badge {
      font-size: 0.7em;
    }
  }
}

.ability-description {
  margin-bottom: 16px;
  font-style: italic;
  color: var(--ion-color-medium);
}

.ability-requirements,
.ability-effect,
.ability-usage {
  margin-bottom: 16px;
  
  h3 {
    font-size: 1em;
    font-weight: bold;
    margin-bottom: 8px;
    color: var(--ion-color-dark);
    display: flex;
    align-items: center;
    
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background-color: var(--ion-color-light-shade);
      margin-left: 8px;
    }
  }
  
  h4 {
    font-size: 0.9em;
    font-weight: bold;
    margin-top: 12px;
    margin-bottom: 4px;
    color: var(--ion-color-medium);
  }
}

.requirements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  
  .requirement {
    display: flex;
    align-items: center;
    font-size: 0.9em;
    
    ion-icon {
      margin-right: 8px;
      flex-shrink: 0;
    }
  }
}

.ability-scaling {
  margin-top: 12px;
  
  .scaling-visualization {
    margin-top: 8px;
    height: 24px;
    display: flex;
    align-items: center;
    
    .base-effect {
      background-color: var(--ion-color-light);
      height: 100%;
      padding: 0 8px;
      display: flex;
      align-items: center;
      border-radius: 4px 0 0 4px;
      font-size: 0.8em;
      color: var(--ion-color-dark);
    }
    
    .scaled-effect {
      background-color: var(--ion-color-primary);
      height: 100%;
      min-width: 40px;
      padding: 0 8px;
      display: flex;
      align-items: center;
      border-radius: 0 4px 4px 0;
      font-size: 0.8em;
      color: white;
      transition: width 0.3s ease;
    }
  }
}

.last-used {
  font-size: 0.8em;
  color: var(--ion-color-medium);
  margin-bottom: 12px;
}
</style>