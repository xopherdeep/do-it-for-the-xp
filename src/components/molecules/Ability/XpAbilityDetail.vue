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
          <ion-badge color="primary">{{ toTitleCase(ability.type) }}</ion-badge>
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
} from '@/hooks/abilities/abilityConstants';
import { toTitleCase } from '@/lib/utils/format';
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
      
      const isAlreadyUsed = props.abilityStatus === AbilityStatus.Used ||
          props.abilityStatus === AbilityStatus.Cooling;
      if (isAlreadyUsed) {
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
    
    const formatClassName = (className: string | number) => {
      return className.toString().replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };
    
    const formatAttribute = (attribute: string) => {
      return attribute.replace(/\b\w/g, l => l.toUpperCase());
    };
    
    const formatDate = (date: string | Date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString();
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
      toTitleCase,
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

<style lang="scss" scoped src="./_XpAbilityDetail.scss" />