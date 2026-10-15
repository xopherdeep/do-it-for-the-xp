<template>
  <ion-page class="account-settings xp-settings-page">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Account</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl">
        <ion-card-content>
          <p>Today there is no account to sign in to: your family, quests and heroes live on this device, and Settings, General backs them up to a file. Account settings arrive with sign-in.</p>
        </ion-card-content>
      </ion-card>
      <xp-coming-soon-card :items="items" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButtons, IonCard, IonCardContent, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import XpComingSoonCard from "./XpComingSoonCard.vue";
import { ACCOUNT_COMING_SOON } from "./comingSoon";

// The old develop branch had a working-looking page for these (tools/reference/develop/AccountSettings.vue.txt);
// it saved nothing, so this page lists them as planned until a backend holds real accounts.
const items = ACCOUNT_COMING_SOON;
</script>
