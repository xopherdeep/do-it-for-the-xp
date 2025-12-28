<template>
  <div 
    class="achievement-summary-card"
    :class="{ 'is-ready': isReady, 'is-draft': !isReady }"
    @click="$emit('click')"
  >
    <!-- Card Glow Effect -->
    <div class="quest-card-glow"></div>
    
    <!-- Status Ribbon (Top Right) -->
    <div class="status-ribbon" :class="isReady ? 'ready' : 'draft'">
      <i :class="['fad', isReady ? 'fa-shield-check' : 'fa-pencil']"></i>
      <span>{{ isReady ? 'READY' : 'DRAFT' }}</span>
    </div>
    
    <!-- Stats Grid - 3 Rows -->
    <XpStatGrid>
      <!-- Row 1: Strategy & Timing -->
      <div class="stats-row strategy">
        <XpStatBlock
          :icon="activeAdventureType.icon"
          label="TYPE"
          :value="activeAdventureType.name"
          variant="type"
          :is-set="activeAdventureType.name !== 'Select'"
          :clickable="true"
          value-class="text-xs text-center"
          @click="$emit('open-type-modal')"
        />
        <XpStatBlock
          :icon="activePartyType.icon"
          :label="activePartyType.name"
          :value="heroCountDisplay"
          variant="party"
          :is-set="heroCount > 0 || isOpenBounty"
          :clickable="true"
          @click="$emit('navigate', 'heros')"
        />
        <XpStatBlock
          :icon="activeScheduleIcon"
          label="WHEN"
          :value="scheduleSummary"
          variant="when"
          :is-set="true"
          :clickable="true"
          value-class="text-xs"
          @click="$emit('navigate', 'when')"
        />
      </div>

      <!-- Row 2: Configuration -->
      <div class="stats-row configuration">
        <XpStatBlock
          icon="fa-tags"
          label="CATEGORY"
          :value="categoryName"
          variant="category"
          :is-set="true"
          :clickable="true"
          :show-help="true"
          @click="$emit('open-category-modal')"
          @help="$emit('open-category-help')"
        />
        <XpStatBlock
          :icon="achievement.requiresApproval ? 'fa-clipboard-list-check' : 'fa-trophy-alt'"
          label="APPROVAL"
          :value="achievement.requiresApproval ? 'REVIEW' : 'HONOR'"
          variant="approval"
          :is-set="true"
          :clickable="true"
          @click="$emit('open-approval-modal')"
        />
        <XpStatBlock
          :icon="achievement.bonusAchievement ? 'fa-question-square' : 'fa-exclamation'"
          label="PRIORITY"
          :value="achievement.bonusAchievement ? 'BONUS' : 'REQD'"
          variant="bonus"
          :is-set="true"
          :clickable="true"
          @click="$emit('open-bonus-modal')"
        />
      </div>

      <!-- Row 3: Rewards -->
      <div class="stats-row rewards">
        <XpStatBlock
          icon="fa-hand-holding-seedling"
          label="XP"
          :value="achievement.xp || 0"
          variant="xp"
          :is-set="(achievement.xp || 0) > 0"
          :clickable="true"
          @click="$emit('navigate', 'points')"
        />
        <XpStatBlock
          icon="fa-hand-holding-usd"
          label="GP"
          :value="achievement.gp || 0"
          variant="gp"
          :is-set="(achievement.gp || 0) > 0"
          :clickable="true"
          @click="$emit('navigate', 'points')"
        />
        <XpStatBlock
          icon="fa-hand-holding-magic"
          label="AP"
          :value="achievement.ap || 0"
          variant="ap"
          :is-set="(achievement.ap || 0) > 0"
          :clickable="true"
          @click="$emit('navigate', 'points')"
        />
      </div>
    </XpStatGrid>

    <!-- Click Prompt -->
    <div class="quest-card-prompt">
      <i class="fad fa-hand-pointer"></i>
      <span>Tap to configure</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import XpStatBlock from '@/components/atoms/StatBlock/XpStatBlock.vue';
import XpStatGrid from '@/components/molecules/StatGrid/XpStatGrid.vue';

interface Category {
  id: string;
  name: string;
}

interface AdventureType {
  icon: string;
  name: string;
}

interface Achievement {
  xp?: number;
  gp?: number;
  ap?: number;
  categoryId?: string;
  requiresApproval?: boolean;
  bonusAchievement?: boolean;
}

interface Props {
  achievement: Achievement;
  isReady: boolean;
  activeAdventureType: AdventureType;
  activePartyType: AdventureType;
  scheduleSummary: string;
  activeScheduleIcon: string;
  categories: Category[];
  heroCount?: number;
  isOpenBounty?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  heroCount: 0,
  isOpenBounty: false
});

defineEmits<{
  click: [];
  navigate: [segment: string];
  'open-category-modal': [];
  'open-category-help': [];
  'open-type-modal': [];
  'open-approval-modal': [];
  'open-bonus-modal': [];
}>();

defineOptions({
  name: 'AchievementSummaryCard'
});

const categoryName = computed(() => {
  const category = props.categories.find(c => c.id === props.achievement.categoryId);
  return category?.name || 'Select';
});

const heroCountDisplay = computed(() => {
  if (props.isOpenBounty) {
    return 'ALL';
  }
  return props.heroCount;
});
</script>

<style lang="scss" scoped>
.achievement-summary-card {
  position: relative;
  background: linear-gradient(145deg, 
    rgba(20, 20, 30, 0.95) 0%, 
    rgba(10, 10, 20, 0.98) 100%);
  border-radius: 20px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(var(--ion-color-rpg-rgb), 0.4);

    .quest-card-glow {
      opacity: 1;
    }

    .quest-card-prompt {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &.is-ready {
    border-color: rgba(var(--ion-color-success-rgb), 0.4);

    .quest-card-glow {
      background: radial-gradient(ellipse at center, 
        rgba(var(--ion-color-success-rgb), 0.15) 0%, 
        transparent 70%);
    }
  }

  &.is-draft {
    .quest-card-glow {
      background: radial-gradient(ellipse at center, 
        rgba(var(--ion-color-warning-rgb), 0.1) 0%, 
        transparent 70%);
    }
  }
}

.quest-card-glow {
  position: absolute;
  inset: 0;
  opacity: 0.6;
  transition: opacity 0.4s;
  pointer-events: none;
  background: radial-gradient(ellipse at center, 
    rgba(var(--ion-color-rpg-rgb), 0.15) 0%, 
    transparent 70%);
}

.status-ribbon {
  position: absolute;
  top: 12px;
  left: -32px;
  padding: 6px 40px;
  font-family: "Press Start 2P";
  font-size: 0.5rem;
  text-transform: uppercase;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 2;

  &.ready {
    background: linear-gradient(90deg, var(--ion-color-success), var(--ion-color-success-shade));
    color: #fff;
    box-shadow: 0 2px 12px rgba(var(--ion-color-success-rgb), 0.4);
  }

  &.draft {
    background: linear-gradient(90deg, var(--ion-color-warning), var(--ion-color-warning-shade));
    color: #000;
    box-shadow: 0 2px 12px rgba(var(--ion-color-warning-rgb), 0.4);
  }

  i { font-size: 0.6rem; }
}

.stats-row {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
}

.quest-card-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0.75rem;
  background: rgba(var(--ion-color-rpg-rgb), 0.1);
  border-top: 1px solid rgba(var(--ion-color-rpg-rgb), 0.2);
  opacity: 0.6;
  transform: translateY(4px);
  transition: all 0.3s;

  i {
    font-size: 0.9rem;
    color: var(--ion-color-rpg);
    animation: pulse-pointer 1.5s infinite;
  }

  span {
    font-family: "Press Start 2P";
    font-size: 0.45rem;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
  }
}

@keyframes pulse-pointer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
