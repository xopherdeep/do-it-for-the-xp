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
          <ion-item v-for="(hero, index) in makerHeroes" :key="hero.id" :lines="index === makerHeroes.length - 1 ? 'none' : undefined">
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
          <ion-item v-if="!makerHeroes.length" lines="none">
            <ion-label><p>No heroes yet.</p></ion-label>
          </ion-item>
        </ion-list>
      </ion-card>

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
  IonAvatar,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
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
import RaidWindowPicker from "@/app/Console/MyPortal/party/RaidWindowPicker.vue";
import { usePartyMembership } from "@/hooks/usePartyMembership";
import type { HeroPartyMode } from "@/lib/services/party/partyRules";
import { usePartyStore } from "@/lib/store/stores/party";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useUserStore } from "@/lib/store/stores/user";
import { canAccessGameMaster, canManageFamily } from "@/router/_Guards/gm.guard";
import { heroName } from "@/lib/services/gp/gpGifts";
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

const rules = useGameRulesStore();
void rules.load();

/** Only a Game Master picks the Makers: this is a family rule, and a hero's phone cannot change it */
const canManage = computed(() => canAccessGameMaster(userStore));
/** Every profile that is not a Game Master; a Game Master can always make things, so they need no switch */
const makerHeroes = computed(() => Object.values(userStore.users as Record<string, any>).filter((profile) => profile && !profile.isAdult));

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
  const hero = heroes.value.find((h: any) => String(h.id) === heroId);
  const name = hero?.name?.nick || hero?.name?.full || "This hero";
  leaveNote.value = staysHome ? leaveNoteFor(name, await removeHeroFromParties(heroId)) : "";
};

onMounted(() => {
  store.load().catch((error) => debug.error("party: could not read the party settings", error));
});
</script>
