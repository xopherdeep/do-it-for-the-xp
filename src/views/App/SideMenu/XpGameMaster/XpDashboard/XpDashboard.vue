<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button @click="$fx.ui[$fx.theme.ui].select.play()"></ion-menu-button>
          <!-- <ion-back-button defaultHref="/switch-profile" /> -->
        </ion-buttons>
        <ion-title> XP Game Master Dashboard </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-list-header>
          <ion-label>
            Action Items
            <p>
              Stay on top of all approvals.
            </p>
          </ion-label>
        </ion-list-header>
        <xp-action-items />
        <ion-list-header>
          <ion-label>
            Reward Shelf
            <p>
              Create rewards, redeem points.
            </p>
          </ion-label>
        </ion-list-header>
        <xp-reward-shelf />
        <xp-do-this-not-that />
        <ion-list-header>
          <ion-label>
            Impersonate Profile
            <p>
              Clicking a profile will impersonate that user.
            </p>
          </ion-label>
        </ion-list-header>
        <xp-impersonate-profile />
      </ion-list>
    </ion-content>
    <ion-fab
      vertical="bottom"
      horizontal="center"
    >
      <ion-fab-button>
        <i class="fad fa-shield fa-2x"></i>
      </ion-fab-button>
      Badges

    </ion-fab>
  </ion-page>
</template>

<script lang="ts">
  import ionic from "@/mixins/ionic";
  import XpRewardShelf from "./components/XpRewardShelf.vue";
  import XpImpersonateProfile from "./components/XpImpersonateProfile.vue";
  import XpActionItems from "./components/XpActionItems.vue";
  import XpDoThisNotThat from "./components/XpDoThisNotThatItem.vue";

  import { defineComponent } from "vue";
  export default defineComponent({
    name: "xp-dashboard",
    mixins: [ionic],
    components: {
      XpRewardShelf,
      XpImpersonateProfile,
      XpActionItems,
      XpDoThisNotThat,
    },
  });
</script>

<style lang="scss">
  .xp-dashboard {
    ion-card {
      ion-card-title {
        top: 0;
        position: relative !important;
      }
    }
  }
</style>
