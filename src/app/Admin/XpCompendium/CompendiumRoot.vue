<template>
  <ion-page class="bg-slide bg-slide-dark">
    <ion-router-outlet></ion-router-outlet>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { IonPage, IonRouterOutlet } from '@ionic/vue';

export default defineComponent({
  name: 'CompendiumRoot',
  components: {
    IonPage,
    IonRouterOutlet
  }
});
</script>
