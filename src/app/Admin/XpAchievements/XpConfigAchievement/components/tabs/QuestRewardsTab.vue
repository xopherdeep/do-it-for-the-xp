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
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import AchievementRewardsTab from "../AchievementRewardsTab.vue";
import XpSplashHeader from "@/components/atoms/SplashHeader/XpSplashHeader.vue";
import XpLoading from '@/components/molecules/Loading/XpLoading.vue';
import { AchievementFormInjectionKey } from "../../hooks/useAchievementForm";

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
  decreaseDifficulty
} = inject(AchievementFormInjectionKey)!;
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

.content-wrapper {
  width: 100%;
}
</style>
