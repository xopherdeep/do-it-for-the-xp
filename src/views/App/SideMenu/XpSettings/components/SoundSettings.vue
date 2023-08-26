<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-button :router-link="`/xp-settings/`">
            <ion-icon :icon="arrowBack" slot="icon-only" />
          </ion-button>
        </ion-buttons>
        <ion-title> Sound Settings </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box">
      <!-- Toggles in a List -->
      <InputSettings />
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";

  import ionic from "@/mixins/ionic";
  import InputSettings from "./InputSettings.vue";

  import { arrowBack } from "ionicons/icons";

  export default defineComponent({
    components: {
      InputSettings,
    },
    mixins: [ionic],
    setup() {
      return {
        arrowBack,
      };
    },
  });
</script>
