<template>
  <ion-page class="xp-shop-dashboard-tab">
    <ion-content
      class="ion-padding transparent-content"
      :fullscreen="true"
    >
      <div
        v-if="isLoading"
        class="loading-wrapper-centered"
      >
        <XpLoading />
      </div>

      <div
        v-else-if="shop"
        class="content-wrapper"
      >
        <div class="shop-header">
          <div class="shop-icon-wrapper">
            <i class="fad fa-store fa-4x"></i>
          </div>
          <h1 class="shop-name">{{ shop.name }}</h1>
          <p class="shop-description">{{ shop.description }}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <i class="fad fa-globe-americas fa-2x text-primary"></i>
            <div class="stat-info">
              <span class="stat-value text-capitalize">{{ shop.world || 'Unknown' }}</span>
              <span class="stat-label">World</span>
            </div>
          </div>

          <div class="stat-card">
            <i class="fad fa-boxes fa-2x text-warning"></i>
            <div class="stat-info">
              <span class="stat-value">{{ shop.items?.length || 0 }}</span>
              <span class="stat-label">Items</span>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, inject, Ref } from "vue";
import Ionic from "@/mixins/ionic";
import { ShopInterface } from "@/lib/databases/ShopsDb";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";

export default defineComponent({
  name: "XpShopDashboardTab",
  mixins: [Ionic],
  components: {
    XpLoading
  },
  setup() {
    const shop = inject<Ref<ShopInterface | null>>('shop');
    const isLoading = inject<Ref<boolean>>('isLoading');

    return {
      shop,
      isLoading
    };
  }
});
</script>

<style lang="scss" scoped>
  .transparent-content {
    --background: transparent;
  }

  .content-wrapper {
    padding: 24px 16px;
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .shop-header {
    text-align: center;
    padding-top: 1rem;

    .shop-icon-wrapper {
      margin-bottom: 1rem;

      i {
        color: var(--eb-color-pale-yellow);
        filter: drop-shadow(0 0 20px rgba(var(--ion-color-warning-rgb), 0.5));
      }
    }

    .shop-name {
      font-family: "Twoson", serif;
      font-size: 2.5rem;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.8);
      margin: 0 0 0.5rem;
    }

    .shop-description {
      font-family: "Apple Kid", sans-serif;
      font-size: 1.1rem;
      color: rgba(255, 255, 255, 0.8);
      margin: 0;
      line-height: 1.5;
      max-width: 600px;
      margin: 0 auto;
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    justify-items: center;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    background: rgba(25, 27, 46, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    width: 100%;
    max-width: 250px;

    i {
      width: 32px;
      text-align: center;
      margin-bottom: 0;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-family: "StatusPlz", monospace;
      font-size: 1.2rem;
      color: #fff;
    }

    .stat-label {
      font-family: "Apple Kid", sans-serif;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  }

  .text-primary {
    color: var(--ion-color-primary);
  }

  .text-warning {
    color: var(--ion-color-warning);
  }

  .text-capitalize {
    text-transform: capitalize;
  }
</style>
