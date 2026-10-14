<template>
  <ion-page class="reward-settings xp-settings-page">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Rewards</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl">
        <ion-card-content>
          <p>Today heroes spend GP in the shops, and Real Life rewards wait in Approvals until a Game Master hands them over. More reward rules are on the way.</p>
        </ion-card-content>
      </ion-card>
      <xp-coming-soon-card :items="items" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButtons, IonCard, IonCardContent, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import XpComingSoonCard from "./XpComingSoonCard.vue";
import { REWARD_COMING_SOON } from "./comingSoon";

const items = REWARD_COMING_SOON;
</script>
