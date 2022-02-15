<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <ion-button :router-link="`/my-portal/${userId}`">
            <ion-icon :icon="arrowBack" slot="icon-only" />
          </ion-button>
        </ion-buttons>
        <ion-title>
          My Inventory
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
    IonButton,
      IonToolbar,
    },
    setup() {
      return {
        arrowBack,
      };
    },
  });
</script>
