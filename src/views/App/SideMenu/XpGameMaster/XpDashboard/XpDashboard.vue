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
      <ion-grid>
        <ion-row>
          <ion-col>
            <xp-impersonate-profile />
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col>
            <xp-reward-shelf />
          </ion-col>
          <ion-col>
            <xp-action-items />
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col>
            <xp-do-this-not-that />
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import ionic from "@/mixins/ionic";
  import XpRewardShelf from "./components/XpRewardShelf.vue";
  import XpImpersonateProfile from "./components/XpImpersonateProfile.vue";
  import XpActionItems from "./components/XpActionItems.vue";
  import XpDoThisNotThat from "./components/XpDoThisNotThat.vue";

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
