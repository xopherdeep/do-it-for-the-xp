<template>
  <ion-page class="sound-settings xp-settings-page">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Sound</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <AudioSettings />
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";

  import ionic from "@/lib/mixins/ionic";
  import AudioSettings from "@/components/organisms/AudioSettings/AudioSettings.vue";

  export default defineComponent({
    name: "sound-settings",
    components: {
      AudioSettings,
    },
    mixins: [ionic],
  });
</script>
