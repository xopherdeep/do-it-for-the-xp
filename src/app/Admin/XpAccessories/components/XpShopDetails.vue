<template>
  <XpPage
    class="xp-shop-details"
    headerClass="transparent-toolbar ion-no-border"
    :pageStyle="pageStyle"
  >
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>

      <ion-tab-bar
        slot="bottom"
        color="rpg-dark"
        class="shop-tab-bar"
        v-if="shopId"
      >
        <ion-tab-button
          tab="splash"
          :href="`/game-master/compendium/setup/economy/shops/${shopId}/splash`"
        >
          <ion-icon :icon="bookOutline" />
          <ion-label>Info</ion-label>
        </ion-tab-button>

        <ion-tab-button
          tab="items"
          :href="`/game-master/compendium/setup/economy/shops/${shopId}/items`"
        >
          <ion-icon :icon="shirtOutline" />
          <ion-label>Items</ion-label>
        </ion-tab-button>

        <ion-tab-button
          tab="hours"
          :href="`/game-master/compendium/setup/economy/shops/${shopId}/hours`"
        >
          <ion-icon :icon="timeOutline" />
          <ion-label>Hours</ion-label>
        </ion-tab-button>

        <ion-tab-button
          tab="decorate"
          :href="`/game-master/compendium/setup/economy/shops/${shopId}/decorate`"
        >
          <ion-icon :icon="brushOutline" />
          <ion-label>Shop</ion-label>
        </ion-tab-button>

        <ion-tab-button
          tab="clerk"
          :href="`/game-master/compendium/setup/economy/shops/${shopId}/clerk`"
        >
          <ion-icon :icon="personOutline" />
          <ion-label>Clerk</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>

    <!-- Passing the background image via style since it's dynamic per shop -->
  </XpPage>
</template>

<script lang="ts">
  import { defineComponent, computed, provide, toRef } from "vue";
  import Ionic from "@/lib/mixins/ionic";
  import {
    bookOutline,
    shirtOutline,
    timeOutline,
    brushOutline,
    personOutline,
  } from "ionicons/icons";
  import XpPage from "@/components/templates/pages/XpPage.vue";
  import { useShopData } from "../hooks/useShopData";

  export default defineComponent({
    name: "XpShopDetails",
    mixins: [Ionic],
    components: {
      XpPage,
    },
    props: {
      shopId: {
        type: String,
        required: true,
      },
    },
    setup(props) {
      // Composition API for efficient data handling
      const { shop, isLoading, bgImage } = useShopData(toRef(props, "shopId"));

      // Provide legacy keys for children that expect them
      provide("shop", shop);
      provide("isLoading", isLoading);

      // Dynamic page style for the background
      const pageStyle = computed(() => ({
        "--background": bgImage.value
          ? `url(${bgImage.value}) no-repeat center center / cover`
          : "var(--ion-color-dark)",
        position: "relative",
      }));

      return {
        pageStyle,

        bookOutline,
        shirtOutline,
        timeOutline,
        brushOutline,
        personOutline,
      };
    },
  });
</script>

<style lang="scss" scoped>
  // Add a darkened overlay to the page background
  .xp-shop-details::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
    z-index: 0;
    pointer-events: none;
  }

  ion-router-outlet {
    z-index: 1; // Ensure content is above overlay
  }

  ion-tabs {
    background: transparent;
  }

  .shop-tab-bar {
    --background: rgba(var(--ion-color-step-950-rgb, 20, 20, 30), 0.9);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: env(safe-area-inset-bottom);
    height: calc(60px + env(safe-area-inset-bottom));
    z-index: 10;

    ion-tab-button {
      --color: var(--ion-color-medium);
      --color-selected: var(--eb-color-pale-yellow, #f4d03f);
      background: transparent;

      i {
        font-size: 1.5rem;
        margin-bottom: 4px;
        transition: transform 0.2s ease;
      }

      &.tab-selected i {
        transform: translateY(-2px);
        color: var(--eb-color-pale-yellow);
      }

      ion-label {
        font-family: var(--xp-font-body);
        font-size: 0.7rem;
        font-weight: 600;
      }
    }
  }
</style>
