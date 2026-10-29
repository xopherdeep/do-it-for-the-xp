<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-title>Cloud Family Mismatch</ion-title>
      <ion-buttons slot="end">
        <ion-button data-cy="close-conflict-modal" @click="closeModal">
          <i class="fad fa-times"></i>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding xp-family-conflict-modal rpg-box bg-slide">
    <div v-if="isLoading" class="ion-text-center ion-padding">
      <ion-spinner name="crescent"></ion-spinner>
      <p>Reading cloud family details...</p>
    </div>

    <template v-else>
      <ion-card class="max-w-2xl mx-auto">
        <ion-card-header>
          <ion-card-title>Different Family on Cloud</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>
            Your online account already has a registered family on the cloud, created previously or on another device.
            This device has its own separate local family.
          </p>
          <div v-if="errorMessage" class="error-notice ion-margin-top">
            <p class="text-danger font-semibold">{{ errorMessage }}</p>
          </div>
        </ion-card-content>
      </ion-card>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto ion-margin-top">
        <ion-card class="m-0">
          <ion-card-header>
            <ion-card-title class="text-base">
              <i class="fad fa-cloud mr-2 text-rpg"></i> Cloud Family
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p class="text-xs text-gray-500 mb-2">ID: {{ shortId(cloudFamilyId) }}</p>
            <p class="font-semibold text-sm mb-1">Registered Heroes ({{ cloudHeroes.length }}):</p>
            <ul v-if="cloudHeroes.length > 0" class="pl-4 list-disc text-sm">
              <li v-for="hero in cloudHeroes" :key="hero.heroId">
                {{ hero.nickname || "Hero without nickname" }}
              </li>
            </ul>
            <p v-else class="text-sm italic text-gray-400">No heroes registered on cloud.</p>
          </ion-card-content>
        </ion-card>

        <ion-card class="m-0">
          <ion-card-header>
            <ion-card-title class="text-base">
              <i class="fad fa-mobile-alt mr-2 text-rpg"></i> This Device
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p class="text-xs text-gray-500 mb-2">ID: {{ shortId(localFamilyId) }}</p>
            <p class="font-semibold text-sm mb-1">Local Heroes ({{ localHeroes.length }}):</p>
            <ul v-if="localHeroes.length > 0" class="pl-4 list-disc text-sm">
              <li v-for="hero in localHeroes" :key="hero.id">
                {{ hero.name?.nick || hero.name?.full || hero.name?.first || "Unnamed hero" }}
              </li>
            </ul>
            <p v-else class="text-sm italic text-gray-400">No heroes on this device.</p>
          </ion-card-content>
        </ion-card>
      </div>

      <ion-card class="max-w-2xl mx-auto ion-margin-top">
        <ion-card-header>
          <ion-card-title>How would you like to proceed?</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item class="action-item">
              <ion-label class="ion-text-wrap">
                <h3 class="font-bold">Connect to Cloud Family</h3>
                <p>
                  Adopt the cloud family ID on this device. Your local heroes will be preserved and registered to the cloud family.
                </p>
              </ion-label>
              <ion-button
                slot="end"
                color="primary"
                :disabled="isBusy || !cloudFamilyId"
                data-cy="adopt-cloud-family-btn"
                @click="confirmAdopt"
              >
                Connect
              </ion-button>
            </ion-item>

            <ion-item class="action-item">
              <ion-label class="ion-text-wrap">
                <h3 class="font-bold">Keep Device Isolated</h3>
                <p>
                  Disconnect the online account so your local profiles remain separate and untouched.
                </p>
              </ion-label>
              <ion-button
                slot="end"
                fill="outline"
                color="medium"
                :disabled="isBusy"
                data-cy="unlink-cloud-btn"
                @click="confirmUnlink"
              >
                Disconnect
              </ion-button>
            </ion-item>

            <ion-item class="action-item">
              <ion-label class="ion-text-wrap">
                <h3 class="font-bold">Download Local Backup</h3>
                <p>Save a safety snapshot of all profiles and data on this device first.</p>
              </ion-label>
              <ion-button
                slot="end"
                fill="outline"
                color="secondary"
                :disabled="isBusy"
                data-cy="download-backup-btn"
                @click="downloadBackup"
              >
                Back Up
              </ion-button>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>
    </template>
  </ion-content>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonTitle,
  IonToolbar,
  alertController,
  modalController,
} from "@ionic/vue";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useTownHallStore } from "@/lib/store/stores/townHall";
import { useUserStore } from "@/lib/store/stores/user";
import { adoptFamily, ensureIdentity } from "@/lib/services/pro/familyIdentity";
import { getFamily, type ServerHero } from "@/lib/services/multiplayer/familyServer";
import backupService from "@/lib/services/core/BackupService";
import { proToast } from "@/lib/services/pro/proUi";
import debug from "@/lib/utils/debug";

const family = useFamilyStore();
const townHall = useTownHallStore();
const userStore = useUserStore();

const isLoading = ref(true);
const isBusy = ref(false);
const errorMessage = ref("");

const cloudFamilyId = ref("");
const cloudHeroes = ref<ServerHero[]>([]);
const localFamilyId = ref("");

const localHeroes = computed(() => Object.values(userStore.users).filter((u) => !u.isAdult));

const shortId = (id: string): string => {
  if (!id) return "None";
  return id.length > 12 ? `${id.slice(0, 8)}...` : id;
};

async function loadCloudDetails(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const identity = await ensureIdentity();
    localFamilyId.value = identity.familyId;

    const auth = townHall.auth;
    const isGuest = auth.kind === "none";
    if (isGuest) {
      errorMessage.value = "Sign in to Town Hall required to inspect cloud family.";
      isLoading.value = false;
      return;
    }

    const answer = await getFamily(auth);
    cloudFamilyId.value = answer.familyId;
    cloudHeroes.value = answer.heroes;
  } catch (error) {
    debug.error("[XpFamilyConflictModal] load failed", error);
    errorMessage.value = "Could not fetch cloud family details. Please check connection.";
  } finally {
    isLoading.value = false;
  }
}

async function confirmAdopt(): Promise<void> {
  const alert = await alertController.create({
    header: "Connect to Cloud Family?",
    message:
      "This device will join the online family. Your local heroes will be kept and registered with this family.",
    cssClass: "rpg-alert",
    buttons: [
      { text: "Cancel", role: "cancel" },
      {
        text: "Connect",
        handler: () => {
          void executeAdopt();
        },
      },
    ],
  });
  await alert.present();
}

async function executeAdopt(): Promise<void> {
  if (!cloudFamilyId.value) return;
  isBusy.value = true;
  try {
    await adoptFamily(cloudFamilyId.value);
    await family.bind();
    await proToast("Connected to cloud family successfully.", "success");
    await modalController.dismiss({ action: "adopted" });
  } catch (error) {
    debug.error("[XpFamilyConflictModal] adopt failed", error);
    await proToast("Could not connect to cloud family. Try again.", "danger");
  } finally {
    isBusy.value = false;
  }
}

async function confirmUnlink(): Promise<void> {
  const alert = await alertController.create({
    header: "Disconnect Cloud Account?",
    message: "This stops online sync and keeps your local family and heroes separate on this device.",
    cssClass: "rpg-alert",
    buttons: [
      { text: "Cancel", role: "cancel" },
      {
        text: "Disconnect",
        role: "destructive",
        handler: () => {
          void executeUnlink();
        },
      },
    ],
  });
  await alert.present();
}

async function executeUnlink(): Promise<void> {
  isBusy.value = true;
  try {
    await townHall.unlink();
    await proToast("Device disconnected from cloud account.", "success");
    await modalController.dismiss({ action: "unlinked" });
  } catch (error) {
    debug.error("[XpFamilyConflictModal] unlink failed", error);
    await proToast("Could not disconnect. Try again.", "danger");
  } finally {
    isBusy.value = false;
  }
}

async function downloadBackup(): Promise<void> {
  try {
    await backupService.exportAll();
    await proToast("Local backup downloaded successfully.", "success");
  } catch (error) {
    debug.error("[XpFamilyConflictModal] backup failed", error);
    await proToast("Backup failed.", "danger");
  }
}

function closeModal(): void {
  void modalController.dismiss();
}

onMounted(() => {
  void loadCloudDetails();
});
</script>

<style lang="scss" scoped>
.xp-family-conflict-modal {
  .action-item {
    --padding-start: 0;
    --inner-padding-end: 0;
    margin-bottom: 1rem;
  }
}
</style>
