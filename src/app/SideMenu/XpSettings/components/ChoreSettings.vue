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
      <ion-card class="max-w-2xl chore-rules">
        <ion-list>
          <ion-item-divider>
            <ion-label>Game rules</ion-label>
          </ion-item-divider>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <h2>Daily streaks</h2>
              <p>A flame on the hero's HUD counts days in a row with a quest done. Streaks of 3, 7, 14 and 30 days open a chest of XP and GP, and every 7th day earns a shield that saves one missed day. Miss a day with no shield and the streak starts over.</p>
            </ion-label>
            <ion-toggle
              data-cy="streaks-toggle"
              :checked="rules.streaks"
              :disabled="!canManage"
              @ionChange="rules.setStreaks($event.detail.checked)"
            ></ion-toggle>
          </ion-item>
        </ion-list>
      </ion-card>
      <xp-late-chores-card :can-manage="canManage" />
      <ion-card class="max-w-2xl">
        <ion-card-content>
          <p>Today each quest carries its own rules: GM Review or Honor System, due time, repeats and reward, set in the Compendium. More family-wide chore rules are on the way.</p>
        </ion-card-content>
      </ion-card>
      <xp-coming-soon-card :items="items" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
} from "@ionic/vue";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { canManageFamily } from "@/router/_Guards/gm.guard";
import XpComingSoonCard from "./XpComingSoonCard.vue";
import XpLateChoresCard from "./XpLateChoresCard.vue";
import { CHORE_COMING_SOON } from "./comingSoon";

const items = CHORE_COMING_SOON;
const rules = useGameRulesStore();
void rules.load();
// Only a Game Master changes the family's rules; a hero sees how they are set
const canManage = canManageFamily();
</script>
