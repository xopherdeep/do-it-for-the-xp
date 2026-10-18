<template>
  <ion-page class="packs-settings xp-settings-page">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Packs</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <div class="packs max-w-5xl mx-auto">
        <ion-card class="pack-card packs__intro">
          <ion-card-content>
            A pack adds a ready-made set of quests, beasts, rewards and house rules. What you made yourself always stays.
          </ion-card-content>
        </ion-card>

        <div class="packs__grid">
          <xp-pack-card
            v-for="pack in builtIns"
            :key="pack.id"
            :pack="pack"
            :status="statuses[pack.id]"
            :busy="isBusy"
            @load="confirmLoad"
            @remove="confirmRemove"
          />
        </div>

        <h2 class="packs__heading">Share your own</h2>
        <div class="packs__grid">
          <ion-card class="pack-card" data-cy="packs-share">
            <ion-card-header>
              <div class="pack-card__head">
                <i class="fad fa-file-export fa-2x icon-colors"></i>
                <div>
                  <ion-card-title>Your family's pack</ion-card-title>
                  <ion-card-subtitle>Quests, Powers and rewards you made</ion-card-subtitle>
                </div>
              </div>
            </ion-card-header>
            <ion-card-content>
              <p>Save what you made as a pack file, or load a pack another family sent you. Share it on the Town Hall's Pack Exchange too.</p>
              <div class="pack-card__actions">
                <ion-button size="small" :disabled="isBusy" data-cy="packs-export" @click="exportToFile">Save as a file</ion-button>
                <ion-button size="small" fill="outline" :disabled="isBusy" data-cy="packs-import" @click="importFromFile">
                  Import a pack file
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>

          <xp-pack-card
            v-for="pack in added"
            :key="pack.id"
            :pack="pack"
            :status="statuses[pack.id]"
            :busy="isBusy"
            @load="confirmLoad"
            @remove="confirmRemove"
          />
        </div>

        <h2 class="packs__heading">Made to fit your home</h2>
        <div class="packs__grid">
          <ion-card class="pack-card">
            <ion-card-header>
              <div class="pack-card__head">
                <i class="fad fa-box-open fa-2x icon-colors"></i>
                <div>
                  <ion-card-title>Moving House</ion-card-title>
                  <ion-card-subtitle>Families on the move</ion-card-subtitle>
                </div>
              </div>
            </ion-card-header>
            <ion-card-content>
              <p>Quests for packing and moving your home, sized for each hero, with your old house as a temple.</p>
              <div class="pack-card__actions">
                <ion-button size="small" :disabled="isBusy" @click="openBuilder('moving')">Set up</ion-button>
              </div>
            </ion-card-content>
          </ion-card>

          <ion-card class="pack-card">
            <ion-card-header>
              <div class="pack-card__head">
                <i class="fad fa-broom fa-2x icon-colors"></i>
                <div>
                  <ion-card-title>Home chores</ion-card-title>
                  <ion-card-subtitle>Any household</ion-card-subtitle>
                </div>
              </div>
            </ion-card-header>
            <ion-card-content>
              <p>Everyday chores for the rooms and pets you have, sized for each hero.</p>
              <div class="pack-card__actions">
                <ion-button size="small" :disabled="isBusy" @click="openBuilder('home')">Set up</ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </div>

      <moving-house-modal :is-open="showMoving" @close="closeBuilder" />
      <home-chores-modal :is-open="showHome" @close="closeBuilder" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  IonButton,
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
  onIonViewWillEnter,
} from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import XpPackCard from "@/components/molecules/PackCard/XpPackCard.vue";
import {
  allowedToManagePacks,
  confirmLoadPack,
  confirmRemovePack,
  exportPackFile,
  importPackFile,
  usePackLibrary,
} from "@/hooks/usePackLibrary";
import type { XpPack } from "@/lib/services/core/packs/packFormat";
import { BUILT_IN_PACKS } from "@/lib/services/core/packs/catalog";
import HomeChoresModal from "./HomeChoresModal.vue";
import MovingHouseModal from "./MovingHouseModal.vue";

const builtIns = BUILT_IN_PACKS;
const shelf = usePackLibrary();
const { added, isBusy, statuses, refreshPacks } = shelf;
const confirmLoad = (pack: XpPack) => confirmLoadPack(shelf, pack);
const confirmRemove = (pack: XpPack) => confirmRemovePack(shelf, pack);
const importFromFile = () => importPackFile(shelf);
const exportToFile = () => exportPackFile(shelf);
const showMoving = ref(false);
const showHome = ref(false);

onMounted(refreshPacks);
onIonViewWillEnter(refreshPacks);

/** The Moving House and Home chores packs are built from the family's answers, so they open a setup dialog */
const openBuilder = async (which: "moving" | "home") => {
  const isPermitted = await allowedToManagePacks();
  if (!isPermitted) return;
  play$fx("select");
  const isMovingPack = which === "moving";
  if (isMovingPack) showMoving.value = true;
  else showHome.value = true;
};

const closeBuilder = () => {
  showMoving.value = false;
  showHome.value = false;
  refreshPacks();
};
</script>

<style lang="scss" scoped>
// The gap rule of the Settings grid: each card's border is a 16px box-shadow drawn outside it, so the page pads
// 16px more and cards sit 48px apart; every visible gap (edges, between cards, around the heading) comes out 16px
.packs {
  padding: 16px;


  &__heading {
    display: inline-block;
    margin: 32px 0;
    padding: 4px 12px;
    font-size: 1.1rem;
    color: #fff;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 4px;
  }

  &__grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 48px;

    @media (min-width: 768px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}

.pack-card {
  // beat the theme's ion-card width and margin (set under ion-app#earthbound)
  width: 100% !important;
  margin: 0 !important;
  display: flex;
  flex-direction: column;

  &__head {
    display: flex;
    align-items: center;
    gap: 12px;

    > div {
      flex: 1;
      min-width: 0;
    }
  }

  &__badge {
    align-self: flex-start;
  }

  &__contents {
    margin-top: 8px;
    opacity: 0.85;
    font-size: 0.9em;
  }

  &__terms {
    margin-top: 4px;
    font-style: italic;
    font-size: 0.9em;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  &.packs__intro {
    margin-bottom: 48px !important;
    line-height: 1.4;
  }

  ion-card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}
</style>
