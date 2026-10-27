<template>
  <ion-page class="party-settings xp-settings-page">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Party</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl" data-cy="maker-settings">
        <ion-list>
          <ion-item-divider>
            <ion-label>Makers</ion-label>
          </ion-item-divider>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>A Maker can draw beasts and suggest quests. A Game Master checks every one before it enters the game.</p>
            </ion-label>
          </ion-item>
          <ion-item v-for="(hero, index) in heroes" :key="hero.id" :lines="index === heroes.length - 1 ? 'none' : undefined">
            <ion-avatar slot="start">
              <ion-img :src="$getUserAvatar(hero)" />
            </ion-avatar>
            <ion-label>
              <h2>{{ heroName(hero) }}</h2>
            </ion-label>
            <ion-toggle
              :data-cy="`maker-${hero.id}`"
              :checked="rules.makers.includes(String(hero.id))"
              :disabled="!canManage"
              :aria-label="`${heroName(hero)} is a Maker`"
              @ionChange="rules.setMaker(String(hero.id), $event.detail.checked)"
            ></ion-toggle>
          </ion-item>
          <ion-item v-if="!heroes.length" lines="none">
            <ion-label><p>No heroes yet.</p></ion-label>
          </ion-item>
        </ion-list>
      </ion-card>

      <ion-card class="max-w-2xl">
        <ion-card-content>
          <p>Today your party is your family. Playing with other families is on the way.</p>
        </ion-card-content>
      </ion-card>
      <xp-coming-soon-card :items="items" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  IonAvatar,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonImg,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
} from "@ionic/vue";
import XpComingSoonCard from "./XpComingSoonCard.vue";
import { PARTY_COMING_SOON } from "./comingSoon";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useUserStore } from "@/lib/store/stores/user";
import { canAccessGameMaster } from "@/router/_Guards/gm.guard";
import { heroName } from "@/lib/services/gp/gpGifts";

const items = PARTY_COMING_SOON;

const userStore = useUserStore();
const rules = useGameRulesStore();
void rules.load();

/** Only a Game Master picks the Makers: this is a family rule, and a hero's phone cannot change it */
const canManage = computed(() => canAccessGameMaster(userStore));
/** Every profile that is not a Game Master; a Game Master can always make things, so they need no switch */
const heroes = computed(() => Object.values(userStore.users as Record<string, any>).filter((profile) => profile && !profile.isAdult));
</script>
