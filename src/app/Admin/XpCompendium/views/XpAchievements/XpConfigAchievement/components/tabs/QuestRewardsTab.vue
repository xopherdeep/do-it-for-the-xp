<template>
  <ion-page class="achievement-rewards-tab">
    <ion-content class="bg-slide bg-slide-dark" :fullscreen="true">
      <!-- Loading State -->
      <div v-if="loading" class="loading-wrapper">
        <XpLoading />
      </div>

      <div v-if="!loading" class="content-wrapper">
        <!-- Splash Header -->
        <XpSplashHeader 
          v-model="achievement.achievementName"
          :icon="activeLoreCombo.icon"
          :tagline="activeLoreCombo.tagline"
          placeholder="Name Your Quest..."
        />

        <AchievementRewardsTab
          :achievement="achievement"
          :fibonacci-index="fibonacciIndex"
          :fibonacci-array="fibonacciArray"
          :fibonacci-descriptions="fibonacciDescriptions"
          :difficulty-icon="difficultyIcon"
          :is-fibonacci="isFibonacci"
          :display-fibonacci-value="displayFibonacciValue"
          @update:achievement="Object.assign(achievement, $event)"
          @update:fibonacciIndex="handleDifficultyChange({ detail: { value: $event } })"
          @increase-difficulty="increaseDifficulty"
          @decrease-difficulty="decreaseDifficulty"
        >
          <template #after-difficulty>
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
          </template>
        </AchievementRewardsTab>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { IonPage, IonContent, IonItem, IonLabel, IonChip, IonInput, IonButton } from '@ionic/vue';
import AchievementRewardsTab from "../AchievementRewardsTab.vue";
import XpSplashHeader from "@/components/atoms/SplashHeader/XpSplashHeader.vue";
import XpLoading from '@/components/molecules/Loading/XpLoading.vue';
import { AchievementFormInjectionKey } from "../../hooks/useAchievementForm";
import { MAX_ESTIMATED_MINUTES } from "@/lib/services/quests/questFormRules";
import type { QuestTier } from "@/lib/services/temples/questRooms";

const {
  achievement,
  loading,
  activeLoreCombo,
  fibonacciIndex,
  fibonacciArray,
  fibonacciDescriptions,
  difficultyIcon,
  isFibonacci,
  displayFibonacciValue,
  handleDifficultyChange,
  increaseDifficulty,
  decreaseDifficulty,
  questTierKey,
  questTierName,
  minutes,
  minutesText,
  isMinutesEdited,
  defaultMinutesText,
  setMinutes,
  resetMinutes
} = inject(AchievementFormInjectionKey)!;

const TIER_COLORS: Record<QuestTier, string> = { monster: 'success', miniboss: 'warning', boss: 'danger' };
const TIER_ICONS: Record<QuestTier, string> = { monster: 'fa-ghost', miniboss: 'fa-skull', boss: 'fa-dragon' };

// A half-typed or blank field never reached the form, so show the minutes the quest really has again
const showMinutes = (event: Event) => {
  (event.target as HTMLElement & { value: string }).value = String(minutes.value);
};
</script>

<style lang="scss" scoped>
.transparent-content {
  --background: transparent;
}

.loading-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  padding: 24px;
}

// A column as tall as the screen, so the form below the header fills it
.content-wrapper {
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
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
  color: var(--ion-color-medium);
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
