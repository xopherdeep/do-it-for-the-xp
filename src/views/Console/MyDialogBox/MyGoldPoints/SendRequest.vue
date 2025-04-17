<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-title>Start New Profile</ion-title>
    </ion-toolbar>

  </ion-header>
  <ion-content>
    <ion-segment>
      <ion-segment-button>
        Send To
      </ion-segment-button>
      <ion-segment-button>
        Request From
      </ion-segment-button>
    </ion-segment>

  </ion-content>
</template>
<script lang="ts">
  import { defineComponent } from 'vue';
  import { modalController } from '@ionic/vue';
  import ionic from '@/mixins/ionic';

  export default defineComponent({
    name: "xp-send-request",
    mixins: [ionic],
    setup() {
      return {
        dismiss: () => modalController.dismiss()
      }
    }

  })
</script>
