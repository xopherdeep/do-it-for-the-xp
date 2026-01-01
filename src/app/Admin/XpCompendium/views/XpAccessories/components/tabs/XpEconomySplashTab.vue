<template>
  <ion-page class="xp-economy-dashboard-splash">
    <ion-content
      class="transparent-content xp-economy-dashboard"
      :fullscreen="true"
    >
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="loading-wrapper"
      >
        <XpLoading />
      </div>

      <!-- Content (shown when loaded) -->
      <div
        v-if="!isLoading"
        class="content-wrapper"
      >
        <!-- Splash Header -->
        <XpSplashHeader
          icon="fa-coins"
          tagline="Manage your game's economy"
          v-model="dashboardTitle"
        />

        <!-- Economy Summary Card (Dialpad Style) -->
        <div class="economy-summary-card">
          <!-- Card Glow Effect -->
          <div class="card-glow"></div>

          <!-- Stats Grid - Navigation Dialpad -->
          <XpStatGrid>
            <!-- Row 1: Main Navigation -->
            <div class="stats-row navigation">
              <XpStatBlock
                icon="fa-store"
                label="SHOPS"
                :value="shopCount"
                variant="gp"
                :is-set="true"
                :clickable="true"
                @click="goToTab('shops')"
              />
              <XpStatBlock
                icon="fa-tshirt"
                label="ITEMS"
                :value="itemCount"
                variant="party"
                :is-set="true"
                :clickable="true"
                @click="goToTab('items')"
              />
              <XpStatBlock
                icon="fa-key-skeleton"
                label="KEY ITEMS"
                :value="keyItemCount"
                variant="xp"
                :is-set="true"
                :clickable="true"
                @click="goToTab('key-items')"
              />
            </div>
          </XpStatGrid>

          <!-- Click Prompt -->
          <div class="card-prompt">
            <i class="fad fa-hand-pointer"></i>
            <span>Tap to manage</span>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { IonContent, IonPage } from "@ionic/vue";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import XpSplashHeader from "@/components/atoms/SplashHeader/XpSplashHeader.vue";
import XpStatGrid from "@/components/molecules/StatGrid/XpStatGrid.vue";
import XpStatBlock from "@/components/atoms/StatBlock/XpStatBlock.vue";

defineOptions({
  name: "XpEconomySplashTab"
});

const router = useRouter();
const isLoading = ref(false);
const dashboardTitle = ref("Economy & Rewards");

// Placeholder counts - these could be reactive based on actual data
const shopCount = ref(0);
const itemCount = ref(0);
const keyItemCount = ref(0);

const goToTab = (tabPath: string) => {
  router.push(`/game-master/compendium/economy/${tabPath}`);
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
    padding: 24px 16px 40px;
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .economy-summary-card {
    position: relative;
    background: linear-gradient(145deg,
        rgba(20, 20, 30, 0.95) 0%,
        rgba(10, 10, 20, 0.98) 100%);
    border-radius: 20px;
    border: 2px solid rgba(255, 255, 255, 0.08);
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    width: 100%;

    &:hover {
      border-color: rgba(var(--ion-color-warning-rgb), 0.4);

      .card-glow {
        opacity: 1;
      }

      .card-prompt {
        opacity: 1;
        transform: translateY(0);
      }
    }
  }

  .card-glow {
    position: absolute;
    inset: 0;
    opacity: 0.6;
    transition: opacity 0.4s;
    pointer-events: none;
    background: radial-gradient(ellipse at center,
        rgba(var(--ion-color-warning-rgb), 0.15) 0%,
        transparent 70%);
  }

  .stats-row {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
  }

  .card-prompt {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0.75rem;
    background: rgba(var(--ion-color-warning-rgb), 0.1);
    border-top: 1px solid rgba(var(--ion-color-warning-rgb), 0.2);
    opacity: 0.6;
    transform: translateY(4px);
    transition: all 0.3s;

    i {
      font-size: 0.9rem;
      color: var(--ion-color-warning);
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

    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.5;
    }
  }
</style>
