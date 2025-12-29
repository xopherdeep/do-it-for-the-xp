<template>
  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button @click="$emit('showDetails')">
      <i class="fad" :class="roomIcon"/>
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { IonFab, IonFabButton  } from '@ionic/vue';

export default defineComponent({
  name: 'RoomActionButton',
  components: {
    IonFab,
    IonFabButton,
  },
  props: {
    roomIcon: {
      type: String,
      required: true
    }
  }
});
</script>

<style scoped>
ion-fab-button {
  --background: rgba(0, 0, 0, 0.6);
  --background-activated: rgba(0, 0, 0, 0.8);
}
</style>