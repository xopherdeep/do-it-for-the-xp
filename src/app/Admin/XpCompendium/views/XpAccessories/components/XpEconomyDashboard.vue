<template>
  <xp-rpg-page title="Economy" headerIcon="fa-hand-holding-box" backButtonHref="/game-master/compendium"
    class="xp-economy-dashboard" :hideHeader="true">
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>

      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="splash" href="/game-master/compendium/economy/dashboard">
          <i class="fad fa-home fa-2x"></i>
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="shops" href="/game-master/compendium/economy/shops">
          <i class="fad fa-store fa-2x"></i>
          <ion-label>Shops</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="items" href="/game-master/compendium/economy/items">
          <i class="fad fa-box fa-2x"></i>
          <ion-label>Items</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="key-items" href="/game-master/compendium/economy/key-items">
          <i class="fad fa-key fa-2x"></i>
          <ion-label>Key Items</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </xp-rpg-page>
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
import XpRpgPage from "@/components/templates/pages/XpRpgPage.vue";

export default defineComponent({
  name: "XpEconomyDashboard",
  mixins: [Ionic],
  components: {
    IonRouterOutlet,
    XpRpgPage
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
