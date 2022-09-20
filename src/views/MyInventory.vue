<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <ion-back-button 
            :default-href="`/my-portal/${user.id}/my-home`"
          ></ion-back-button>
        </ion-buttons>
        <ion-title>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">Schedule Tab</ion-content>
  </ion-page>
</template>

<script>
  import { defineComponent } from "vue";
  import { arrowBack } from "ionicons/icons";
  import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonButtons,
    IonButton,
    IonToolbar,
  } from "@ionic/vue";

  export default defineComponent({
    props: ["userId"],

    components: {
      IonContent,
      IonHeader,
      IonPage,
      IonTitle,
      IonButtons,
      IonToolbar,
    },
    setup() {
      return {
        arrowBack,
      };
    },
  });
</script>
