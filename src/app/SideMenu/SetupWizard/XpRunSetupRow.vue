<template>
  <ion-item button :detail="true" lines="none" data-cy="run-setup-row" @click="run">
    <ion-icon slot="start" color="rpg" :icon="sparklesOutline"></ion-icon>
    <ion-label class="ion-text-wrap">
      <h2>Run setup again</h2>
      <p>Name the heroes and pick chores from the library.</p>
    </ion-label>
  </ion-item>
</template>

<script setup lang="ts">
  import { IonItem, IonIcon, IonLabel } from "@ionic/vue";
  import { sparklesOutline } from "ionicons/icons";
  import { openSetupWizard } from "./useSetupOffer";

  // Runs whether or not the game is empty: the wizard merges into what is there
  const run = () => openSetupWizard();
</script>
