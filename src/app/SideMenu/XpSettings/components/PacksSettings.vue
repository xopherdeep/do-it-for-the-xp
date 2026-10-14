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
        <p class="packs__intro">
          A pack adds a ready-made set of quests, beasts, rewards and house rules. What you made yourself always stays.
        </p>

        <div class="packs__grid">
          <ion-card
            v-for="pack in packs"
            :key="pack.id"
            class="pack-card"
            :data-cy="`pack-${pack.id}`"
          >
            <ion-card-header>
              <div class="pack-card__head">
                <i :class="['fad', `fa-${pack.icon || 'box-open'}`, 'fa-2x', 'icon-colors']"></i>
                <div>
                  <ion-card-title>{{ pack.name }}</ion-card-title>
                  <ion-card-subtitle>{{ pack.audience }}</ion-card-subtitle>
                </div>
                <ion-badge
                  v-if="statusOf(pack).state !== 'none'"
                  :color="statusOf(pack).state === 'loaded' ? 'success' : 'warning'"
                  class="pack-card__badge"
                >
                  {{ statusOf(pack).state === "loaded" ? "Loaded" : "Partly loaded" }}
                </ion-badge>
              </div>
            </ion-card-header>
            <ion-card-content>
              <p>{{ pack.description }}</p>
              <p class="pack-card__contents">{{ packSummary(pack) }}</p>
              <p v-if="termsLine(pack)" class="pack-card__terms">{{ termsLine(pack) }}</p>
              <div class="pack-card__actions">
                <ion-button size="small" :disabled="isBusy" @click="confirmLoad(pack)">
                  {{ statusOf(pack).state === "none" ? "Load" : "Load again" }}
                </ion-button>
                <ion-button
                  v-if="statusOf(pack).state !== 'none'"
                  size="small"
                  fill="outline"
                  color="danger"
                  :disabled="isBusy"
                  @click="confirmRemove(pack)"
                >
                  Remove
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
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
  IonBadge,
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
  alertController,
  loadingController,
  toastController,
  onIonViewWillEnter,
} from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { BUILT_IN_PACKS } from "@/lib/services/core/packs/catalog";
import type { XpPack } from "@/lib/services/core/packs/packFormat";
import {
  emptySnapshot,
  loadPack,
  packStatus,
  packSummary,
  planRemoval,
  readSnapshot,
  removePack,
} from "@/lib/services/core/packs/packService";
import type { PackSnapshot, PackStatus } from "@/lib/services/core/packs/packService";
import { canManageFamily, RESTORE_GM_ONLY_MESSAGE } from "@/router/_Guards/gm.guard";
import { dialogMessage } from "@/lib/utils/dialogMessage";
import debug from "@/lib/utils/debug";
import HomeChoresModal from "./HomeChoresModal.vue";
import MovingHouseModal from "./MovingHouseModal.vue";

const RPG_ALERT = "rpg-alert";
const DEFAULT_TERMS = { member: "Hero", members: "Heroes", gm: "Game Master" };

const packs = BUILT_IN_PACKS;
const snapshot = ref<PackSnapshot>(emptySnapshot());
const isBusy = ref(false);
const showMoving = ref(false);
const showHome = ref(false);

const statusOf = (pack: XpPack): PackStatus => packStatus(pack, packs, snapshot.value);

/** Only packs that rename the players say so; the Family pack keeps Heroes and the Game Master */
const termsLine = (pack: XpPack): string => {
  const terms = pack.terms;
  if (!terms || (terms.members === DEFAULT_TERMS.members && terms.gm === DEFAULT_TERMS.gm)) return "";
  return `Made for ${terms.members.toLowerCase()} and their ${terms.gm.toLowerCase()}.`;
};

const refresh = async () => {
  try {
    snapshot.value = await readSnapshot();
  } catch (error) {
    debug.error("Packs: reading the Compendium failed", error);
  }
};

onMounted(refresh);
onIonViewWillEnter(refresh);

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Packs change everyone's Compendium, so a hero who taps one is told to ask a Game Master */
const allowed = async (): Promise<boolean> => {
  if (canManageFamily()) return true;
  play$fx("no");
  const toast = await toastController.create({
    message: RESTORE_GM_ONLY_MESSAGE,
    duration: 2500,
    position: "middle",
    cssClass: "rpg-toast",
    buttons: [{ text: "OK", role: "cancel" }],
  });
  await toast.present();
  return false;
};

const withLoading = async <T,>(message: string, task: () => Promise<T>): Promise<T> => {
  isBusy.value = true;
  let loading: Awaited<ReturnType<typeof loadingController.create>> | undefined;
  try {
    loading = await loadingController.create({ message });
    await loading.present();
    return await task();
  } finally {
    isBusy.value = false;
    await loading?.dismiss();
  }
};

/** Caches and open screens still hold the old Compendium, so the only button reloads the app */
const showDone = async (header: string, lead: string) => {
  const alert = await alertController.create({
    header,
    cssClass: RPG_ALERT,
    message: dialogMessage({ lead, note: "Reload so every screen shows the change." }),
    backdropDismiss: false,
    buttons: [{ text: "Reload app", handler: () => window.location.reload() }],
  });
  await alert.present();
};

const showFailed = async (header: string, error: unknown) => {
  const alert = await alertController.create({ header, cssClass: RPG_ALERT, message: errorMessage(error), buttons: ["OK"] });
  await alert.present();
};

const confirmLoad = async (pack: XpPack) => {
  if (!(await allowed())) return;
  play$fx("select");
  const again = statusOf(pack).state !== "none";
  const alert = await alertController.create({
    header: `Load the ${pack.name} pack?`,
    cssClass: RPG_ALERT,
    message: dialogMessage({
      lead: pack.description,
      groups: [
        { title: "Adds", tone: "add", lines: [packSummary(pack)] },
        { title: "Keeps", tone: "keep", lines: ["Everything you made yourself", "Profiles, temples, logs and chat"] },
      ],
      note: again ? "Pack entries you edited go back to the original." : undefined,
    }),
    buttons: [
      { text: "Cancel", role: "cancel" },
      { text: again ? "Load again" : "Load pack", handler: () => { runLoad(pack); } },
    ],
  });
  await alert.present();
};

const runLoad = async (pack: XpPack) => {
  try {
    const result = await withLoading("Adding the pack...", () => loadPack(pack));
    await showDone(`${pack.name} pack loaded`, `Added ${result.total} entries from the ${pack.name} pack.`);
  } catch (error) {
    await showFailed("Loading the pack failed", error);
  }
};

const confirmRemove = async (pack: XpPack) => {
  if (!(await allowed())) return;
  play$fx("select");
  const plan = planRemoval(pack, packs, snapshot.value);
  const alert = await alertController.create({
    header: `Remove the ${pack.name} pack?`,
    cssClass: [RPG_ALERT, "rpg-alert--danger"],
    message: dialogMessage({
      lead: `Takes ${plan.total} of this pack's entries back out.`,
      groups: [
        {
          title: "Keeps",
          tone: "keep",
          lines: [
            "Everything you made yourself",
            "Anything another loaded pack uses",
            "Beasts and categories your quests use",
          ],
        },
      ],
      note: "Pack entries you edited go too. This can't be undone.",
    }),
    buttons: [
      { text: "Cancel", role: "cancel" },
      { text: "Remove pack", role: "destructive", handler: () => { runRemove(pack); } },
    ],
  });
  await alert.present();
};

const runRemove = async (pack: XpPack) => {
  try {
    const removed = await withLoading("Removing the pack...", () => removePack(pack, packs));
    await showDone(`${pack.name} pack removed`, `Took out ${removed} entries from the ${pack.name} pack.`);
  } catch (error) {
    await refresh();
    await showFailed("Removing the pack failed", error);
  }
};

/** The Moving House and Home chores packs are built from the family's answers, so they open a setup dialog */
const openBuilder = async (which: "moving" | "home") => {
  if (!(await allowed())) return;
  play$fx("select");
  if (which === "moving") showMoving.value = true;
  else showHome.value = true;
};

const closeBuilder = () => {
  showMoving.value = false;
  showHome.value = false;
  refresh();
};
</script>

<style lang="scss" scoped>
.packs {
  &__intro {
    margin: 0 0 16px;
    line-height: 1.4;
  }

  &__heading {
    margin: 24px 0 12px;
    font-size: 1.1rem;
  }

  &__grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;

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

  ion-card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}
</style>
