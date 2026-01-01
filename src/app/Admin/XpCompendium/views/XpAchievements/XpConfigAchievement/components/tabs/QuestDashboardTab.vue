<template>
  <ion-page class="achievement-type-tab">
    <ion-content
      class="bg-slide bg-slide-dark"
      :fullscreen="true"
    >
      <!-- Loading State -->
      <div
        v-if="loading"
        class="loading-wrapper"
      >
        <XpLoading />
      </div>

      <div
        v-if="!loading"
        class="content-wrapper"
      >
        <!-- Splash Header -->
        <XpSplashHeader
          v-model="achievement.achievementName"
          :icon="activeLoreCombo.icon"
          :tagline="activeLoreCombo.tagline"
          placeholder="Name Your Quest..."
        />
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
          @navigate="goToTab"
          @open-category-modal="addCategoryModalOpen = true"
          @open-category-help="showCategoryHelp"
          @open-type-modal="showQuestTypeSelector = true"
          @open-approval-modal="showApprovalModal = true"
          @open-bonus-modal="showBonusModal = true"
          class="type-tab-content"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IonPage, IonContent } from '@ionic/vue';
import AchievementSummaryCard from "../AchievementSummaryCard.vue";
import XpSplashHeader from "@/components/atoms/SplashHeader/XpSplashHeader.vue";
import XpLoading from '@/components/molecules/Loading/XpLoading.vue';
import { AchievementFormInjectionKey } from "../../hooks/useAchievementForm";

const router = useRouter();
const route = useRoute();
const {
  achievement,
  loading,
  isValidAdventure,
  activeAdventureType,
  activePartyType,
  activeLoreCombo,
  scheduleSummary,
  activeScheduleIcon,
  categories,
  addCategoryModalOpen,
  showQuestTypeSelector,
  showApprovalModal,
  showBonusModal
} = inject(AchievementFormInjectionKey)!;

import { alertController } from '@ionic/vue';

const goToTab = (tabRelative: string) => {
  const base = route.path.substring(0, route.path.lastIndexOf('/'));
  router.push(`${base}/${tabRelative}`);
};

const showCategoryHelp = async () => {
  const alert = await alertController.create({
    header: 'Categories & Stats',
    message: 'Categories determine which stats you earn:\n\n• STR: Physical Tasks\n• INT: Mental/Learning\n• CHA: Social/Networking\n• DEX: Precision/Speed\n\nChoose wisely to build the character you want to become!',
    buttons: ['Got it']
  });
  await alert.present();
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

  .content-wrapper {
    width: 100%;
  }
</style>
