<template>
  <ion-item v-if="canManage" button :detail="true" lines="none" data-cy="run-setup-row" @click="run">
    <ion-icon slot="start" color="rpg" :icon="sparklesOutline"></ion-icon>
    <ion-label class="ion-text-wrap">
      <h2>Run setup again</h2>
      <p>Name the heroes and pick chores from the library.</p>
    </ion-label>
  </ion-item>
</template>

<script setup lang="ts">
  import { computed } from "vue";
  import { IonItem, IonIcon, IonLabel } from "@ionic/vue";
  import { sparklesOutline } from "ionicons/icons";
  import { canManageFamily } from "@/router/_Guards/gm.guard";
  import { useUserStore } from "@/lib/store/stores/user";
  import { openSetupWizard } from "./useSetupOffer";

  // Setup rewrites the world like a restore: a Game Master (or a device with none yet) only, like the backup rows
  const userStore = useUserStore();
  const canManage = computed(() => canManageFamily(userStore));

  // Runs whether or not the game is empty: the wizard merges into what is there
  const run = () => openSetupWizard();
</script>
