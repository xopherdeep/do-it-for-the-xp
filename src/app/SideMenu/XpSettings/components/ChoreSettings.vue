<template>
  <ion-page class="chore-settings xp-settings-page">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Chores</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl">
        <ion-card-content>
          <p>Today each quest carries its own rules: GM Review or Honor System, due time, repeats and reward, set in the Compendium. Family-wide chore rules are on the way.</p>
        </ion-card-content>
      </ion-card>
      <xp-coming-soon-card :items="items" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButtons, IonCard, IonCardContent, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import XpComingSoonCard from "./XpComingSoonCard.vue";
import { CHORE_COMING_SOON } from "./comingSoon";

const items = CHORE_COMING_SOON;
</script>
