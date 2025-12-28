<template>
  <ion-page class="xp-economy-splash">
    <ion-content class="transparent-content" :fullscreen="true">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-wrapper">
        <XpLoading />
      </div>

      <!-- Content (shown when loaded) -->
      <div v-if="!isLoading" class="content-wrapper">
        <!-- Header Section -->
        <div class="splash-header">
          <div class="splash-icon-wrapper">
            <i class="fad fa-coins fa-4x"></i>
          </div>
          <XpText variant="title" class="splash-title">Economy & Rewards</XpText>
          <XpText variant="body" class="splash-description">
            Manage shops, items, and key items that heroes can earn and purchase.
          </XpText>
        </div>

        <!-- Navigation Grid -->
        <XpDashboardGrid :cols="3">
          <XpNavTile
            label="Shops"
            icon-name="fa-store"
            color="warning"
            :on-click="() => goToTab('shops')"
          />
          <XpNavTile
            label="Items"
            icon-name="fa-shirt"
            color="primary"
            :on-click="() => goToTab('items')"
          />
          <XpNavTile
            label="Key Items"
            icon-name="fa-key-skeleton"
            color="success"
            :on-click="() => goToTab('key-items')"
          />
        </XpDashboardGrid>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import { IonPage, IonContent } from "@ionic/vue";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import XpText from "@/components/atoms/Text/XpText.vue";
import XpDashboardGrid from "@/components/molecules/StatGrid/XpDashboardGrid.vue";
import XpNavTile from "@/components/molecules/StatGrid/XpNavTile.vue";

export default defineComponent({
  name: "XpEconomySplash",
  components: {
    IonPage,
    IonContent,
    XpLoading,
    XpText,
    XpDashboardGrid,
    XpNavTile
  },
  setup() {
    const router = useRouter();
    const isLoading = ref(false);

    const goToTab = (tabPath: string) => {
      router.push(`/game-master/compendium/setup/economy/${tabPath}`);
    };

    return {
      isLoading,
      goToTab
    };
  }
});
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

.splash-header {
  text-align: center;
  padding-top: 1rem;

  .splash-icon-wrapper {
    margin-bottom: 0.5rem;
    i {
      color: var(--ion-color-warning);
      filter: drop-shadow(0 0 20px rgba(var(--ion-color-warning-rgb), 0.5));
    }
  }

  .splash-title {
    margin: 0 0 0.5rem;
  }

  .splash-description {
    max-width: 600px;
    margin: 0 auto;
  }
}
</style>
