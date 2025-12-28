<template>
  <div 
    class="xp-stat-block"
    :class="[
      variant,
      { 
        'is-set': isSet, 
        'clickable': clickable 
      }
    ]"
    @click="handleClick"
  >
    <div class="stat-icon">
      <i :class="['fad', 'fa-fw', icon]"></i>
    </div>
    <div class="stat-label">
      {{ label }}
      <i v-if="showHelp" class="fad fa-question-circle ml-1" @click.stop="$emit('help')"></i>
    </div>
    <div class="stat-value" :class="valueClass">{{ displayValue }}</div>

    <!-- Completion Checkmark -->
    <div v-if="isSet" class="completion-check">
      <i class="fal fa-check"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  icon: string;
  label: string;
  value?: string | number;
  variant?: 'type' | 'party' | 'when' | 'xp' | 'gp' | 'ap' | 'category' | 'approval' | 'bonus' | 'combo' | 'default';
  isSet?: boolean;
  clickable?: boolean;
  valueClass?: string;
  showHelp?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  isSet: false,
  clickable: false,
  valueClass: '',
  showHelp: false
});

const emit = defineEmits<{
  click: [];
  help: [];
}>();

defineOptions({
  name: 'XpStatBlock'
});

const displayValue = computed(() => {
  if (props.value === undefined || props.value === null) return '';
  if (typeof props.value === 'number') {
    return props.value.toLocaleString();
  }
  return props.value;
});

const handleClick = () => {
  if (props.clickable) {
    emit('click');
  }
};
</script>

<style lang="scss" scoped>
.xp-stat-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  min-width: 0;
  transition: all 0.3s;
  opacity: 0.5;
  position: relative;

  &.clickable {
    cursor: pointer;
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
    }
    
    &:active {
      transform: translateY(0);
    }
  }

  &.is-set {
    opacity: 1;

    // XP variant
    &.xp {
      border-color: rgba(var(--ion-color-success-rgb), 0.3);
      background: rgba(var(--ion-color-success-rgb), 0.1);
      .stat-icon i { color: var(--ion-color-success); }
      .stat-value { color: var(--ion-color-success); }
      .completion-check { color: var(--ion-color-success); }
    }

    // GP variant
    &.gp {
      border-color: rgba(var(--ion-color-warning-rgb), 0.3);
      background: rgba(var(--ion-color-warning-rgb), 0.1);
      .stat-icon i { color: var(--ion-color-warning); }
      .stat-value { color: var(--ion-color-warning); }
      .completion-check { color: var(--ion-color-warning); }
    }

    // AP variant
    &.ap {
      border-color: rgba(var(--ion-color-danger-rgb), 0.3);
      background: rgba(var(--ion-color-danger-rgb), 0.1);
      .stat-icon i { color: var(--ion-color-danger); }
      .stat-value { color: var(--ion-color-danger); }
      .completion-check { color: var(--ion-color-danger); }
    }

    // Type variant (purple gradient)
    &.type {
      border-color: rgba(157, 78, 221, 0.4);
      background: linear-gradient(135deg, rgba(157, 78, 221, 0.1), rgba(157, 78, 221, 0.2));
      .stat-icon i { color: #9d4edd; }
      .stat-value { color: #e0aaff; }
      .completion-check { color: #9d4edd; }
    }

    // Party variant (blue gradient)
    &.party {
      border-color: rgba(72, 149, 239, 0.4);
      background: linear-gradient(135deg, rgba(72, 149, 239, 0.1), rgba(72, 149, 239, 0.2));
      .stat-icon i { color: #4895ef; }
      .stat-value { color: #ade8f4; }
      .completion-check { color: #4895ef; }
    }

    // When variant
    &.when {
      border-color: rgba(var(--ion-color-tertiary-rgb), 0.3);
      background: rgba(var(--ion-color-tertiary-rgb), 0.1);
      .stat-icon i { color: var(--ion-color-tertiary); }
      .stat-value { 
        color: var(--ion-color-tertiary);
        font-size: 0.55rem;
        line-height: 1.2;
        text-align: center;
      }
      .completion-check { color: var(--ion-color-tertiary); }
    }

    // Combo variant (indigo)
    &.combo {
      border-color: rgba(99, 102, 241, 0.3);
      background: rgba(99, 102, 241, 0.1);
      .stat-icon i { 
        color: #818cf8; 
        filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5));
      }
      .stat-label { 
        color: rgba(255, 255, 255, 0.5); 
        font-size: 0.45rem; 
        text-align: center;
        width: 100%;
      }
      .completion-check { color: #818cf8; }
    }

    // Category variant
    &.category {
      border-color: rgba(99, 102, 241, 0.5);
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.25));
      .stat-icon i { 
        color: #818cf8; 
        filter: drop-shadow(0 0 5px rgba(99, 102, 241, 0.6));
      }
      .stat-value { 
        color: #c7d2fe; 
        white-space: pre-wrap;
        text-align: center;
        width: 100%;
        line-height: 1.2;
        font-size: 0.8rem; 
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      }
      .completion-check { color: #818cf8; }
    }

    // Approval variant
    &.approval {
      border-color: rgba(var(--ion-color-primary-rgb), 0.3);
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      .stat-icon i { color: var(--ion-color-primary); }
      .stat-value { color: var(--ion-color-primary); }
      .completion-check { color: var(--ion-color-primary); }
    }

    // Bonus variant
    &.bonus {
      border-color: rgba(var(--ion-color-tertiary-rgb), 0.3);
      background: rgba(var(--ion-color-tertiary-rgb), 0.1);
      .stat-icon i { color: var(--ion-color-tertiary); }
      .stat-value { color: var(--ion-color-tertiary); }
      .completion-check { color: var(--ion-color-tertiary); }
    }
  }

  .completion-check {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 0.75rem;
    opacity: 0.8;
  }

  .stat-icon {
    margin-bottom: 8px;
    height: 2.5rem;
    width: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    
    i { 
      font-size: 2rem; 
      color: rgba(255, 255, 255, 0.3); 
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .stat-label {
    font-family: "Press Start 2P";
    font-size: 0.45rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .stat-value {
    font-family: "Press Start 2P";
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.5);
    white-space: pre-wrap;
    
    &.text-xs {
      font-size: 0.6rem;
    }
    
    &.text-center {
      text-align: center;
      width: 100%;
    }
  }
}
</style>
