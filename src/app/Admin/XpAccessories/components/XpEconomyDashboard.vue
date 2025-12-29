<template>
  <XpPage
    title="Economy & Rewards"
    headerIcon="fa-coins"
    :hideHeader="true"
    bgClass="bg-slide-dark"
    backButtonHref="/game-master/compendium/setup"
    class="xp-economy-dashboard"
  >
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>

      <ion-tab-bar slot="bottom">
        <ion-tab-button
          tab="splash"
          href="/game-master/compendium/setup/economy/dashboard"
        >
          <ion-icon :icon="homeOutline" />
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button
          tab="shops"
          href="/game-master/compendium/setup/economy/shops"
        >
          <ion-icon :icon="storefrontOutline" />
          <ion-label>Shops</ion-label>
        </ion-tab-button>

        <ion-tab-button
          tab="items"
          href="/game-master/compendium/setup/economy/items"
        >
          <ion-icon :icon="shirtOutline" />
          <ion-label>Items</ion-label>
        </ion-tab-button>

        <ion-tab-button
          tab="key-items"
          href="/game-master/compendium/setup/economy/key-items"
        >
          <ion-icon :icon="keyOutline" />
          <ion-label>Key Items</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>

    <!-- Slotting the action sheet if we wanted to keep it, but it was just a function before. -->
    <!-- Keeping the function based approach in setup, XpPage doesn't restrict that. -->
  </XpPage>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import { useRouter } from "vue-router";
  import { actionSheetController, IonRouterOutlet } from "@ionic/vue";
  import {
    storefrontOutline,
    shirtOutline,
    keyOutline,
    closeOutline,
    homeOutline,
  } from "ionicons/icons";
  import Ionic from "@/lib/mixins/ionic";
  import XpPage from "@/components/templates/pages/XpPage.vue";

  export default defineComponent({
    name: "XpEconomyDashboard",
    mixins: [Ionic],
    components: {
      IonRouterOutlet,
      XpPage,
    },
    setup() {
      const router = useRouter();

      const presentActionSheet = async () => {
        const actionSheet = await actionSheetController.create({
          header: "Economy Actions",
          cssClass: "rpg-action-sheet",
          buttons: [
            {
              text: "New Shop",
              icon: storefrontOutline,
              handler: () => {
                router.push({ name: "xp-create-update-shop" });
              },
            },
            {
              text: "New Item",
              icon: shirtOutline,
              handler: () => {
                router.push({ name: "xp-create-update-accessory" });
              },
            },
            {
              text: "Assign Key Item",
              icon: keyOutline,
              handler: () => {
                // Navigation to key items tab is now handled by the tab bar,
                // but we can still navigate via router if needed.
                router.push({ name: "xp-economy-key-items" });
              },
            },
            {
              text: "Cancel",
              role: "cancel",
              icon: closeOutline,
            },
          ],
        });
        await actionSheet.present();
      };

      return {
        presentActionSheet,
        storefrontOutline,
        shirtOutline,
        keyOutline,
        homeOutline,
      };
    },
  });
</script>

<style lang="scss" scoped>
  .economy-fab {
    margin-bottom: 70px;
    /* Position above the bottom bar */
  }
</style>
