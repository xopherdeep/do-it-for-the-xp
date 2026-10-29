<template>
  <ion-card class="max-w-2xl xp-family-cloud-card" data-cy="family-cloud-card">
    <ion-card-header>
      <div class="flex items-center justify-between">
        <ion-card-title>
          <i class="fad fa-cloud text-rpg mr-2"></i>
          Cloud Account &amp; Sync
        </ion-card-title>
        <ion-button v-if="townHall.isLinked" size="small" fill="clear" :disabled="isRefreshing" @click="refreshCloud">
          <ion-spinner v-if="isRefreshing" name="crescent" slot="icon-only" />
          <i v-else class="fad fa-sync-alt fa-lg" slot="icon-only"></i>
        </ion-button>
      </div>
    </ion-card-header>

    <ion-card-content v-if="!townHall.isLinked">
      <p class="mb-3">
        Connect to your online For the XP account to preserve heroes, sync progress across devices, and link hero phones.
      </p>
      <ion-button size="small" router-link="/xp-settings/account" data-cy="cloud-card-connect-btn">
        <i class="fad fa-link mr-2"></i>
        Connect Account
      </ion-button>
    </ion-card-content>

    <template v-else>
      <ion-list lines="inset">
        <!-- Account row -->
        <ion-item>
          <ion-label class="ion-text-wrap">
            <h2>{{ townHall.activeLink?.displayName }}</h2>
            <p>Signed in as {{ townHall.activeLink?.userLogin }}</p>
          </ion-label>
          <ion-badge slot="end" :color="statusBadgeColor">
            {{ statusBadgeLabel }}
          </ion-badge>
        </ion-item>

        <!-- Mismatch warning row -->
        <ion-item v-if="isOtherFamily" color="warning" class="mismatch-banner">
          <ion-label class="ion-text-wrap">
            <h3 class="font-bold">Cloud Family Mismatch</h3>
            <p>This account is linked to another family on the cloud.</p>
          </ion-label>
          <ion-button slot="end" size="small" color="dark" data-cy="cloud-card-resolve-btn" @click="openConflictModal">
            Resolve
          </ion-button>
        </ion-item>

        <!-- Heroes sync summary -->
        <ion-item-divider>
          <ion-label>Hero Sync Status</ion-label>
        </ion-item-divider>

        <ion-item v-for="hero in localHeroes" :key="hero.id" data-cy="cloud-hero-row">
          <ion-label class="ion-text-wrap">
            <h2>{{ heroName(hero) }}</h2>
            <p v-if="!hero.name?.nick" class="text-warning text-xs">
              Needs a nickname to sync with cloud
            </p>
            <p v-else class="text-xs text-gray-500">
              Age: {{ heroAgeLabel(hero) }}
            </p>
          </ion-label>
          <ion-badge slot="end" :color="heroSyncStatus(hero).color">
            <i :class="['fad', heroSyncStatus(hero).icon, 'mr-1']"></i>
            {{ heroSyncStatus(hero).label }}
          </ion-badge>
        </ion-item>

        <!-- Remote heroes not currently on device -->
        <template v-if="cloudOnlyHeroes.length > 0">
          <ion-item-divider>
            <ion-label>Cloud Heroes on Other Devices</ion-label>
          </ion-item-divider>
          <ion-item v-for="hero in cloudOnlyHeroes" :key="hero.heroId" class="cloud-only-hero">
            <ion-label class="ion-text-wrap">
              <h2>{{ hero.nickname }}</h2>
              <p class="text-xs text-gray-500">Registered in cloud family</p>
            </ion-label>
            <ion-badge slot="end" color="medium">
              <i class="fad fa-cloud-download mr-1"></i>
              Remote
            </ion-badge>
          </ion-item>
        </template>
      </ion-list>

      <div class="cloud-card-actions ion-padding-top">
        <ion-button fill="outline" size="small" router-link="/xp-settings/account" class="mr-2">
          Manage Account
        </ion-button>
        <ion-button v-if="isOtherFamily" size="small" color="warning" @click="openConflictModal">
          Resolve Mismatch
        </ion-button>
      </div>
    </template>
  </ion-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonSpinner,
  modalController,
} from "@ionic/vue";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useTownHallStore } from "@/lib/store/stores/townHall";
import { useUserStore } from "@/lib/store/stores/user";
import { ageGroupOf } from "@/lib/services/multiplayer/ageGroup";
import XpFamilyConflictModal from "./XpFamilyConflictModal.vue";
import { proToast } from "@/lib/services/pro/proUi";
import debug from "@/lib/utils/debug";

const family = useFamilyStore();
const townHall = useTownHallStore();
const userStore = useUserStore();

const isRefreshing = ref(false);

const isOtherFamily = computed(
  () => family.home === "other-family" || (family.problem as string) === "other-family"
);

const localHeroes = computed(() => Object.values(userStore.users).filter((u) => !u.isAdult));

const cloudOnlyHeroes = computed(() => {
  const localHeroIds = new Set(localHeroes.value.map((h) => h.id));
  const localNicknames = new Set(
    localHeroes.value.map((h) => (h.name?.nick || "").toLowerCase()).filter(Boolean)
  );
  return family.heroes.filter(
    (serverHero) =>
      !localHeroIds.has(serverHero.heroId) &&
      !localNicknames.has((serverHero.nickname || "").toLowerCase())
  );
});

const statusBadgeColor = computed(() => {
  if (isOtherFamily.value) return "danger";
  if (family.home === "home") return "success";
  if (family.home === "home-elsewhere") return "secondary";
  return "medium";
});

const statusBadgeLabel = computed(() => {
  if (isOtherFamily.value) return "Mismatch";
  if (family.home === "home") return "Home Device";
  if (family.home === "home-elsewhere") return "Family Device";
  return "Connected";
});

const heroName = (hero: { name?: { nick?: string; full?: string; first?: string } }): string => {
  return hero.name?.nick || hero.name?.full || hero.name?.first || "Hero";
};

const heroAgeLabel = (hero: { id: string; birthday?: string }): string => {
  const group = ageGroupOf(hero, family.ageGroupPicks[hero.id]);
  if (group === "teen") return "Teen (13-17)";
  if (group === "adult") return "Adult (18+)";
  return "Child (Under 13)";
};

interface SyncStatus {
  label: string;
  color: string;
  icon: string;
}

const heroSyncStatus = (hero: { id: string; name?: { nick?: string } }): SyncStatus => {
  if (!hero.name?.nick) {
    return { label: "No Nickname", color: "warning", icon: "fa-exclamation-triangle" };
  }
  const isRegistered = family.heroes.some(
    (sh) =>
      sh.heroId === hero.id ||
      (sh.nickname && sh.nickname.toLowerCase() === hero.name?.nick?.toLowerCase())
  );
  if (isRegistered) {
    return { label: "Synced", color: "success", icon: "fa-check-circle" };
  }
  return { label: "Local Ready", color: "medium", icon: "fa-arrow-alt-circle-up" };
};

async function refreshCloud(): Promise<void> {
  const auth = townHall.auth;
  const isGuest = auth.kind === "none";
  if (isGuest) return;

  isRefreshing.value = true;
  try {
    await family.bind();
    await proToast("Cloud status updated.", "success");
  } catch (error) {
    debug.error("[XpFamilyCloudCard] refresh failed", error);
    await proToast("Cloud refresh failed.", "danger");
  } finally {
    isRefreshing.value = false;
  }
}

async function openConflictModal(): Promise<void> {
  const modal = await modalController.create({
    component: XpFamilyConflictModal,
    cssClass: "rpg-modal",
  });
  await modal.present();
}
</script>

<style lang="scss" scoped>
.xp-family-cloud-card {
  ion-item-divider {
    font-size: 13px;
    font-weight: 600;
  }

  .mismatch-banner {
    --background: var(--ion-color-warning-tint, rgba(255, 244, 204, 0.9));
    --color: var(--ion-color-warning-contrast, rgba(34, 34, 34, 1));
  }

  .cloud-card-actions {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
