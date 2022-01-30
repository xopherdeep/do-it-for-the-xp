<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Speakers</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">Speakers Tab</ion-content>
  </ion-page>
</template>

<script>
import { defineComponent } from 'vue';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/vue';

export default defineComponent({
  components: { IonContent, IonHeader, IonPage, IonTitle, IonToolbar }
});
</script>