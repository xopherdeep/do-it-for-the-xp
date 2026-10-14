<template>
  <!-- Step 4, How hard?: what the difficulty decides (the temple room, how long, the pay) and how the quest is checked.
       The difficulty itself is the slider at the bottom of the step (XpConfigAchievement), in thumb reach. -->
  <div class="quest-rewards-tab" data-test="step-hard">
    <div class="difficulty-readout" data-test="difficulty-readout">
      <i :class="['fad', 'fa-2x', difficultyIcon]" aria-hidden="true"></i>
      <span class="difficulty-readout__text">{{ difficultyText }}</span>
    </div>

    <ion-list class="effort-list" lines="none">
      <!-- The temple room this difficulty fills -->
      <ion-item class="quest-tier-item" lines="none">
        <i
          slot="start"
          class="fad fa-2x tier-icon"
          :class="[TIER_ICONS[questTierKey], `tier-${questTierKey}`]"
        />
        <ion-label class="ion-text-wrap">
          Temple room
          <p>This difficulty fills a {{ questTierName }} room in a temple.</p>
        </ion-label>
        <ion-chip
          slot="end"
          class="tier-chip"
          :color="TIER_COLORS[questTierKey]"
          data-test="tier-chip"
        >{{ questTierName }}</ion-chip>
      </ion-item>

      <!-- How long the chore takes: sets the beast's strike clock; follows the difficulty until edited -->
      <ion-item class="quest-minutes-item" lines="none">
        <ion-label class="ion-text-wrap">
          About how long?
          <p>
            {{ minutesText }}: the beast strikes if the chore takes longer.
          </p>
          <ion-button
            v-if="isMinutesEdited"
            class="minutes-reset"
            fill="clear"
            size="small"
            data-test="minutes-reset"
            @click="resetMinutes"
          >Reset to {{ defaultMinutesText }}</ion-button>
        </ion-label>
        <ion-input
          slot="end"
          class="minutes-input ion-text-right"
          type="number"
          inputmode="numeric"
          min="1"
          :max="MAX_ESTIMATED_MINUTES"
          :value="minutes"
          aria-label="Minutes the chore takes"
          data-test="minutes-input"
          @ionInput="setMinutes($event.detail.value)"
          @ionBlur="showMinutes($event)"
        ></ion-input>
        <span slot="end" class="minutes-unit">min</span>
      </ion-item>
    </ion-list>

    <!-- The pay: XP, GP and AP follow the difficulty, and each can still be set by hand -->
    <AchievementRewardsTab
      :achievement="achievement"
      @update:achievement="Object.assign(achievement, $event)"
    />

    <!-- Who checks the chore, and whether it is required: each opens its own explanation -->
    <xp-app-section label="Checking and priority">
      <xp-app-row
        :icon="achievement.requiresApproval ? 'clipboard-list-check' : 'trophy-alt'"
        title="Approval"
        :subtitle="approvalLine"
        data-test="approval-row"
        @click="showApprovalModal = true"
      />
      <xp-app-row
        :icon="achievement.bonusAchievement ? 'question-square' : 'exclamation'"
        title="Priority"
        :subtitle="priorityLine"
        data-test="priority-row"
        @click="showBonusModal = true"
      />
    </xp-app-section>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { IonButton, IonChip, IonInput, IonItem, IonLabel, IonList } from '@ionic/vue';
import AchievementRewardsTab from "../AchievementRewardsTab.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import XpAppSection from "@/components/organisms/XpApp/XpAppSection.vue";
import { AchievementFormInjectionKey } from "../../hooks/useAchievementForm";
import { MAX_ESTIMATED_MINUTES } from "@/lib/services/quests/questFormRules";
import { approvalHint, difficultyLabel, priorityHint } from "@/lib/services/quests/QuestLabels";
import type { QuestTier } from "@/lib/services/temples/questRooms";

const {
  achievement,
  difficultyIcon,
  questTierKey,
  questTierName,
  minutes,
  minutesText,
  isMinutesEdited,
  defaultMinutesText,
  setMinutes,
  resetMinutes,
  showApprovalModal,
  showBonusModal
} = inject(AchievementFormInjectionKey)!;

const TIER_COLORS: Record<QuestTier, string> = { monster: 'success', miniboss: 'warning', boss: 'danger' };
const TIER_ICONS: Record<QuestTier, string> = { monster: 'fa-ghost', miniboss: 'fa-skull', boss: 'fa-dragon' };

// "Difficulty: Easy (3)": the slider at the bottom of the step moves it
const difficultyText = computed(() => difficultyLabel(achievement.value.difficulty));

const approvalLine = computed(
  () => `${achievement.value.requiresApproval ? 'Review' : 'Honor system'}: ${approvalHint(achievement.value.requiresApproval)}`
);
const priorityLine = computed(
  () => `${achievement.value.bonusAchievement ? 'Bonus' : 'Required'}: ${priorityHint(achievement.value.bonusAchievement)}`
);

// A half-typed or blank field never reached the form, so show the minutes the quest really has again
const showMinutes = (event: Event) => {
  (event.target as HTMLElement & { value: string }).value = String(minutes.value);
};
</script>

<style lang="scss" scoped>
.quest-rewards-tab {
  padding: 0 0 8px;
  color: var(--xp-app-text);
}

// What the slider at the bottom says, in the cream of the app
.difficulty-readout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 8px 12px 12px;
  padding: 12px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-section);

  i {
    color: var(--xp-app-accent);
  }
}

.difficulty-readout__text {
  font-family: var(--xp-app-font-title);
  font-size: 1.1rem;
  text-transform: var(--xp-app-title-transform);
}

// A column as tall as the screen, so the form below the header fills it
.content-wrapper {
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.effort-list {
  background: transparent;
}

.tier-icon {
  &.tier-monster {
    color: var(--ion-color-success);
  }

  &.tier-miniboss {
    color: var(--ion-color-warning);
  }

  &.tier-boss {
    color: var(--ion-color-danger);
  }
}

.tier-chip {
  margin: 0;
  min-height: 32px;
  font-size: 14px;
  font-weight: 700;
}

.minutes-input {
  width: 72px;
  max-width: 72px;
  min-height: 44px;
  --padding-end: 8px;
  --padding-start: 8px;
  font-size: 1.1rem;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  background: rgba(var(--ion-color-step-50-rgb), 0.5);
}

.minutes-unit {
  margin-inline-start: 8px;
  font-size: 14px;
  color: var(--xp-app-text-dim);
}

.minutes-reset {
  margin: 4px 0 0;
  --padding-start: 0;
  min-height: 36px;
  text-transform: none;
  text-decoration: underline;
  font-size: 0.8rem;
}
</style>
