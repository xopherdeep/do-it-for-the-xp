<template>
  <ion-card-content class="achievement-heros-tab">
    <!-- Assignment Type Selector -->
    <div class="assignment-selector" @click="$emit('open-assignment-modal')">
      <div class="assignment-icon">
        <i :class="['fad', activePartyType.icon]"></i>
      </div>
      <div class="assignment-info">
        <span class="assignment-name">{{ activePartyType.name }}</span>
        <span class="assignment-desc">{{ activePartyType.shortDesc }}</span>
      </div>
      <i class="fad fa-chevron-right assignment-chevron"></i>
    </div>

    <!-- Assignment Explanation -->
    <div class="assignment-explanation">
      <div class="explanation-header">
        <i class="fad fa-info-circle"></i>
        <span>How it works</span>
      </div>
      <p class="explanation-text">{{ assignmentExplanation }}</p>
      <div class="reward-info" v-if="rewardExplanation">
        <i class="fad fa-coins"></i>
        <span>{{ rewardExplanation }}</span>
      </div>
    </div>

    <!-- Hero Picker (only show if not open bounty) -->
    <div v-if="!isOpenToAll" class="hero-picker-section">
      <div class="section-header">
        <i class="fad fa-users"></i>
        <span>Select Heroes</span>
      </div>
      <XpHeroPicker
        v-model="localAssignees"
        :users="users"
        :is-open-to-all="false"
        :show-header="false"
      />
    </div>

    <!-- Open Bounty Message -->
    <div v-else class="open-bounty-notice">
      <i class="fad fa-globe-americas"></i>
      <div class="notice-content">
        <span class="notice-title">Open to All Heroes</span>
        <span class="notice-desc">Any party member can claim this quest</span>
      </div>
    </div>
  </ion-card-content>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonCardContent } from '@ionic/vue';
import User from '@/lib/utils/User';
import XpHeroPicker from '@/components/molecules/HeroPicker/XpHeroPicker.vue';

interface PartyType {
  value: string;
  name: string;
  shortDesc?: string;
  icon: string;
  example?: string;
}

interface Props {
  modelValue: string[];
  users: User[];
  activePartyType: PartyType;
  assignmentType: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  'open-assignment-modal': [];
}>();

defineOptions({
  name: 'AchievementHerosTab'
});

const localAssignees = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const isOpenToAll = computed(() => props.assignmentType === 'asNeeded');

const assignmentExplanation = computed(() => {
  switch (props.assignmentType) {
    case 'asNeeded':
      return 'This quest is posted publicly. The first hero to complete it claims the reward. Great for common chores or bonus tasks.';
    case 'individual':
      return 'Each selected hero must complete this quest individually. Everyone gets their own rewards upon personal completion.';
    case 'collaborate':
      return 'All selected heroes work together as a team. The quest is complete when everyone contributes. Rewards are shared equally.';
    case 'rotate':
      return 'This quest rotates through selected heroes. Each time it resets, the next hero in line is assigned. Fair distribution over time.';
    case 'compete':
      return 'Heroes race to complete this quest! The first to finish wins bonus rewards. Creates friendly competition.';
    default:
      return 'Select how this quest is assigned to heroes.';
  }
});

const rewardExplanation = computed(() => {
  switch (props.assignmentType) {
    case 'asNeeded':
      return 'Full reward to whoever claims it first';
    case 'individual':
      return 'Each hero earns the full reward';
    case 'collaborate':
      return 'Rewards split evenly among team members';
    case 'rotate':
      return 'Full reward to the assigned hero each turn';
    case 'compete':
      return 'Winner gets bonus XP, others get participation points';
    default:
      return '';
  }
});
</script>

<style lang="scss" scoped>
.achievement-heros-tab {
  width: 100%;
  padding: 1rem;
}

.assignment-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(var(--ion-color-rpg-rgb), 0.1);
  border: 2px solid rgba(var(--ion-color-rpg-rgb), 0.3);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1rem;

  &:hover {
    background: rgba(var(--ion-color-rpg-rgb), 0.15);
    border-color: var(--ion-color-rpg);
    transform: translateY(-2px);
  }
}

.assignment-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--ion-color-rpg-rgb), 0.2);
  border-radius: 12px;

  i {
    font-size: 1.75rem;
    color: var(--ion-color-rpg);
  }
}

.assignment-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.assignment-name {
  font-family: "Press Start 2P";
  font-size: 0.7rem;
  color: var(--ion-color-light);
}

.assignment-desc {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

.assignment-chevron {
  color: var(--ion-color-medium);
  font-size: 1rem;
}

.assignment-explanation {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.explanation-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: var(--ion-color-primary);

  i {
    font-size: 1rem;
  }

  span {
    font-family: "Press Start 2P";
    font-size: 0.55rem;
    text-transform: uppercase;
  }
}

.explanation-text {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  margin: 0 0 0.75rem;
}

.reward-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(var(--ion-color-warning-rgb), 0.1);
  border-radius: 8px;

  i {
    color: var(--ion-color-warning);
    font-size: 1rem;
  }

  span {
    font-size: 0.8rem;
    color: var(--ion-color-warning);
    font-weight: 500;
  }
}

.hero-picker-section {
  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 0;
    color: var(--ion-color-light);

    i {
      font-size: 1.25rem;
    }

    span {
      font-family: "Press Start 2P";
      font-size: 0.6rem;
      text-transform: uppercase;
    }
  }
}

.open-bounty-notice {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(var(--ion-color-success-rgb), 0.1);
  border: 1px solid rgba(var(--ion-color-success-rgb), 0.3);
  border-radius: 12px;

  > i {
    font-size: 2.5rem;
    color: var(--ion-color-success);
  }
}

.notice-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notice-title {
  font-family: "Press Start 2P";
  font-size: 0.7rem;
  color: var(--ion-color-success);
}

.notice-desc {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}
</style>
