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
      <ion-card class="max-w-2xl">
        <ion-card-content>
          <p>
            Your household is always a party. Raids are fought together, and heroes can also join parties with other
            families once a Game Master says yes.
          </p>
        </ion-card-content>
      </ion-card>

      <party-hero-modes :heroes="heroes" :modes="modes" :can-edit="canEdit" @change="setMode" />

      <ion-card class="max-w-2xl" data-cy="party-raid-defaults">
        <ion-card-header>
          <ion-card-title>How long raids last</ion-card-title>
          <ion-card-subtitle>The usual length when a raid begins</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <raid-window-picker
            :model-value="store.defaultWindow"
            cy-prefix="party-default-window"
            :disabled="isReadOnly"
            @update:model-value="store.setDefaultWindow"
          />
        </ion-card-content>
      </ion-card>

      <xp-coming-soon-card :items="items" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import {
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import RaidWindowPicker from "@/app/Console/MyPortal/party/RaidWindowPicker.vue";
import type { HeroPartyMode } from "@/lib/services/party/partyRules";
import { usePartyStore } from "@/lib/store/stores/party";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily } from "@/router/_Guards/gm.guard";
import debug from "@/lib/utils/debug";
import PartyHeroModes from "./PartyHeroModes.vue";
import XpComingSoonCard from "./XpComingSoonCard.vue";
import { PARTY_COMING_SOON } from "./comingSoon";
import type { HeroModeRow } from "./partyModes";

const userStore = useUserStore();
const store = usePartyStore();
const items = PARTY_COMING_SOON;

const heroes = computed<HeroModeRow[]>(() =>
  userStore.usersAz.map((user: any) => ({
    id: String(user.id),
    name: user.name?.nick || user.name?.full || "Hero",
  }))
);
const modes = computed(() => Object.fromEntries(heroes.value.map((hero) => [hero.id, store.modeOf(hero.id)])));
const canEdit = computed(() => canManageFamily(userStore));
const isReadOnly = computed(() => !canEdit.value);

const setMode = (heroId: string, mode: HeroPartyMode): void => store.setMode(heroId, mode);

onMounted(() => {
  store.load().catch((error) => debug.error("party: could not read the party settings", error));
});
</script>
