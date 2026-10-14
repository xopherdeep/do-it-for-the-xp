<template>
  <!-- Step 5, Ready?: the quest as the heroes will meet it, the READY / DRAFT ribbon, and a tile per answer that jumps
       back to the step that owns it. The verb at the bottom marks the quest Ready. -->
  <div class="quest-dashboard-tab" data-test="step-ready">
    <button type="button" class="ready-title" data-test="ready-title" @click="go('chore')">
      <i :class="['fad', 'fa-2x', activeLoreCombo.icon]" aria-hidden="true"></i>
      <span class="ready-title__name">{{ achievement.achievementName?.trim() || 'Nameless quest' }}</span>
      <span class="ready-title__tagline">{{ activeLoreCombo.tagline }}</span>
    </button>

    <AchievementSummaryCard
      :achievement="achievement"
      :is-ready="isValidAdventure"
      :active-adventure-type="activeAdventureType"
      :active-party-type="activePartyType"
      :schedule-summary="scheduleSummary"
      :active-schedule-icon="activeScheduleIcon"
      :categories="categories"
      :hero-count="achievement.assignee?.length || 0"
      :is-open-bounty="achievement.type === 'asNeeded'"
      @navigate="onTile"
      @open-category-modal="go('chore')"
      @open-approval-modal="go('hard')"
      @open-bonus-modal="go('hard')"
    />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import AchievementSummaryCard from "../AchievementSummaryCard.vue";
import { AchievementFormInjectionKey } from "../../hooks/useAchievementForm";
import { stepForSegment } from "../../../questConfigWizard";
import type { QuestStepId } from "../../../questConfigWizard";

const emit = defineEmits<{
  /** A tile or the name was tapped: the page jumps to the step that owns the answer */
  go: [step: QuestStepId];
}>();

const {
  achievement,
  isValidAdventure,
  activeAdventureType,
  activePartyType,
  activeLoreCombo,
  scheduleSummary,
  activeScheduleIcon,
  categories
} = inject(AchievementFormInjectionKey)!;

const go = (step: QuestStepId) => emit("go", step);
const onTile = (segment: string) => go(stepForSegment(segment));
</script>

<style lang="scss" scoped>
.quest-dashboard-tab {
  padding: 0 0 8px;
  color: var(--xp-app-text);
}

// The quest's name and its lore line; a tap goes back to rename it
.ready-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 95%;
  margin: 4px auto 14px;
  padding: 6px 8px;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  text-align: center;
  -webkit-tap-highlight-color: transparent;

  i {
    color: var(--xp-app-accent);
  }
}

.ready-title__name {
  font-family: var(--xp-app-font-title);
  font-size: 1.3rem;
  line-height: 1.15;
  overflow-wrap: anywhere;
  text-transform: var(--xp-app-title-transform);
}

.ready-title__tagline {
  color: var(--xp-app-text-dim);
  font-size: 0.85rem;
}
</style>
