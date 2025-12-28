<template>
  <ion-page class="achievement-schedule-tab">
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

        <AchievementScheduleTab
          :achievement="achievement"
          @update:achievement="Object.assign(achievement, $event)"
          @open-ends-modal="endsModalOpen = true"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import AchievementScheduleTab from "../AchievementScheduleTab.vue";
import XpSplashHeader from "@/components/atoms/SplashHeader/XpSplashHeader.vue";
import XpLoading from '@/components/molecules/Loading/XpLoading.vue';
import { AchievementFormInjectionKey } from "../../hooks/useAchievementForm";

const {
  achievement,
  loading,
  activeLoreCombo,
  endsModalOpen
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
