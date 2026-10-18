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
      <ion-card class="max-w-2xl" data-cy="auto-save-settings">
        <ion-list>
          <ion-item-divider>
            <ion-label>Savings</ion-label>
          </ion-item-divider>
          <ion-item lines="none" class="setting-stacked">
            <div class="setting-stacked__body">
              <ion-label class="ion-text-wrap">
                <h2>Auto-save GP</h2>
                <p>Put a share of every reward (quests, won fights, streak chests, temple treasure) straight into the hero's savings at the Gold Bank.</p>
              </ion-label>
              <ion-select
                class="setting-stacked__select"
                interface="action-sheet"
                aria-label="Auto-save GP"
                data-cy="auto-save-percent"
                :value="rules.autoSavePercent"
                :disabled="!canManage"
                @ionChange="rules.setAutoSavePercent(Number($event.detail.value))"
              >
                <ion-select-option v-for="percent in percents" :key="percent" :value="percent">{{ percentLabel(percent) }}</ion-select-option>
              </ion-select>
            </div>
          </ion-item>
        </ion-list>
      </ion-card>
      <ion-card class="max-w-2xl">
        <ion-card-content>
          <p>Each quest also carries its own rules: GM Review or Honor System, due time, repeats and reward, set in the Compendium.</p>
        </ion-card-content>
      </ion-card>
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
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from "@ionic/vue";
import { computed } from "vue";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily } from "@/router/_Guards/gm.guard";
import { AUTO_SAVE_PERCENTS } from "@/lib/services/family/familySettings";
import XpLateChoresCard from "./XpLateChoresCard.vue";

const percents = AUTO_SAVE_PERCENTS;
const percentLabel = (percent: number): string => (percent ? `${percent}% to savings` : "Off");
const rules = useGameRulesStore();
void rules.load();
// Only a Game Master changes the family's rules; a hero sees how they are set. Read live: on a cold start the
// profiles load after the page does
const userStore = useUserStore();
const canManage = computed(() => canManageFamily(userStore));
</script>
