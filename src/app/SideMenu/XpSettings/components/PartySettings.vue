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

      <ion-card v-if="leaveNote" class="max-w-2xl">
        <ion-card-content>
          <p data-cy="party-home-note">{{ leaveNote }}</p>
        </ion-card-content>
      </ion-card>

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

      <party-outside :can-edit="canEdit" />

      <xp-coming-soon-card :items="items" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
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
import { usePartyMembership } from "@/hooks/usePartyMembership";
import type { HeroPartyMode } from "@/lib/services/party/partyRules";
import { usePartyStore } from "@/lib/store/stores/party";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily } from "@/router/_Guards/gm.guard";
import debug from "@/lib/utils/debug";
import PartyHeroModes from "./PartyHeroModes.vue";
import PartyOutside from "./PartyOutside.vue";
import XpComingSoonCard from "./XpComingSoonCard.vue";
import { PARTY_COMING_SOON } from "./comingSoon";
import { leaveNoteFor, type HeroModeRow } from "./partyModes";

const userStore = useUserStore();
const store = usePartyStore();
const { removeHeroFromParties } = usePartyMembership();
const items = PARTY_COMING_SOON;
const leaveNote = ref("");

const heroes = computed<HeroModeRow[]>(() =>
  userStore.usersAz.map((user: any) => ({
    id: String(user.id),
    name: user.name?.nick || user.name?.full || "Hero",
  }))
);
const modes = computed(() => Object.fromEntries(heroes.value.map((hero) => [hero.id, store.modeOf(hero.id)])));
const canEdit = computed(() => canManageFamily(userStore));
const isReadOnly = computed(() => !canEdit.value);

/** A hero set to stay home leaves the parties with other families they are in, and is told so (or told why not) */
const setMode = async (heroId: string, mode: HeroPartyMode): Promise<void> => {
  store.setMode(heroId, mode);
  const staysHome = mode === "home";
  const name = heroes.value.find((hero) => hero.id === heroId)?.name ?? "This hero";
  leaveNote.value = staysHome ? leaveNoteFor(name, await removeHeroFromParties(heroId)) : "";
};

onMounted(() => {
  store.load().catch((error) => debug.error("party: could not read the party settings", error));
});
</script>
