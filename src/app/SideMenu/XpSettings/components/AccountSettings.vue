<template>
  <ion-page class="account-settings xp-settings-page">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Account</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card v-if="!isGameMaster" class="max-w-2xl">
        <ion-card-content>
          <p>Only a Game Master manages the family's account.</p>
        </ion-card-content>
      </ion-card>

      <template v-else>
        <ion-card class="max-w-2xl" data-cy="account-family">
          <ion-card-header>
            <ion-card-title>Family account</ion-card-title>
          </ion-card-header>
          <ion-card-content v-if="townHall.activeLink">
            <p class="account-name">{{ townHall.activeLink.displayName }}</p>
            <p>Signed in as {{ townHall.activeLink.userLogin }}</p>
            <p data-cy="account-email">Email: {{ emailLabel }}</p>
            <div class="pro-actions">
              <ion-button fill="outline" class="pro-button-outline" @click="openSite(profileUrl())">Edit on the site</ion-button>
              <ion-button fill="outline" class="pro-button-outline" @click="openSite(passwordResetUrl())">Change password</ion-button>
            </div>
            <p class="account-note">You'll sign in on the site.</p>
            <div v-if="isOtherFamily" class="account-conflict-banner ion-margin-top" data-cy="account-conflict">
              <p class="text-danger font-semibold mb-1">
                <i class="fad fa-exclamation-triangle mr-1"></i> Cloud Family Mismatch
              </p>
              <p class="text-sm mb-2">
                This account runs a different family on the cloud. Resolve the mismatch to enable multiplayer and sync.
              </p>
              <ion-button size="small" color="warning" @click="openConflictModal">
                Resolve Mismatch
              </ion-button>
            </div>
            <div class="pro-actions">
              <ion-button fill="outline" class="pro-button-outline account-unlink" data-cy="account-unlink" @click="confirmUnlink">
                Unlink this device
              </ion-button>
            </div>
          </ion-card-content>
          <ion-card-content v-else>
            <p v-if="townHall.signedInThroughWebsite">You're signed in through the website.</p>
            <p>Link your For the XP account to post for your family from any device.</p>
            <div class="pro-actions">
              <ion-button class="pro-button" data-cy="account-link" @click="handleLinkAccount">Link account</ion-button>
              <ion-button fill="outline" class="pro-button-outline" @click="openSite(SIGNUP_URL)">Create one</ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card class="max-w-2xl">
          <ion-card-header>
            <ion-card-title>Plan</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p data-cy="account-plan">{{ planLabel }}</p>
            <div class="pro-actions">
              <ion-button router-link="/xp-settings/pro" fill="outline" class="pro-button-outline">XP Pro</ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <xp-coming-soon-card :items="items" title="Sign-in options" />
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// The old develop branch had a mock of this page (tools/reference/develop/AccountSettings.vue.txt); this one is wired to the Town Hall link.
import { computed, onMounted, ref, watch } from "vue";
import { IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, alertController, modalController } from "@ionic/vue";
import XpComingSoonCard from "./XpComingSoonCard.vue";
import XpFamilyConflictModal from "./XpFamilyConflictModal.vue";
import { ACCOUNT_COMING_SOON } from "./comingSoon";
import { useTownHallStore, type LinkResult } from "@/lib/store/stores/townHall";
import { useUserStore } from "@/lib/store/stores/user";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useProStore } from "@/lib/store/stores/pro";
import backupService from "@/lib/services/core/BackupService";
import { useTownHallLink } from "@/app/Console/MyPortal/HomeTown/TownHall/components/useTownHallLink";
import { SIGNUP_URL, passwordResetUrl, profileUrl, townHallSiteUrl } from "@/lib/services/townhall/townHallSite";
import { PLAN_NAMES } from "@/lib/services/pro/proPlans";
import { proToast } from "@/lib/services/pro/proUi";
import { canManageFamily } from "@/router/_Guards/gm.guard";
import debug from "@/lib/utils/debug";

const items = ACCOUNT_COMING_SOON;
const townHall = useTownHallStore();
const family = useFamilyStore();
const pro = useProStore();
const userStore = useUserStore();
const isOtherFamily = computed(() => family.home === "other-family" || (family.problem as string) === "other-family");
// A computed, not a one-time read: after a reload the profiles load a moment later, and the page must follow them
const isGameMaster = computed(() => canManageFamily(userStore));

// The email lives on the site; it is read for display and never stored. undefined = still loading, null = unavailable
const email = ref<string | null | undefined>(undefined);
const emailLabel = computed(() => {
  const isLoading = email.value === undefined;
  if (isLoading) return "…";
  return email.value || "not on file";
});

const planLabel = computed(() => {
  const isOff = !pro.isPro;
  if (isOff) return "XP Pro is off";
  const name = pro.plan ? PLAN_NAMES[pro.plan] ?? pro.plan : "";
  return `XP Pro is on: ${name}`;
});

async function announce(result: LinkResult): Promise<void> {
  const isLinked = result === "linked";
  if (isLinked) {
    await proToast(`Linked as ${townHall.activeLink?.displayName ?? ""}.`, "success");
    await loadEmail();
    return;
  }
  const isRejected = result === "rejected";
  if (isRejected) await proToast("Nothing changed.");
  const isFailed = result === "failed";
  if (isFailed) await proToast("The link didn't go through, and nothing was saved. Try again.", "danger");
}

const link = useTownHallLink({
  store: townHall,
  heroId: () => userStore.currentUser.id,
  returnRoute: () => "/xp-settings/account",
  isGameMaster: () => canManageFamily(),
  announce,
});

async function loadEmail(): Promise<void> {
  email.value = undefined;
  try {
    const profile = await townHall.fetchProfile();
    email.value = profile?.email ?? null;
  } catch (error) {
    debug.error("[AccountSettings] the profile could not be read", error);
    email.value = null;
  }
}

function openSite(url: string): void {
  window.open(url, "_blank", "noopener");
}

async function unlinkNow(): Promise<void> {
  const result = await link.removeLink();
  email.value = undefined;
  const isStillOnSite = result === "removed-here-only";
  if (isStillOnSite) {
    const host = new URL(townHallSiteUrl()).host;
    await proToast(`Done here. To finish, remove "Do It For The XP" from your profile on ${host}.`);
    return;
  }
  await proToast("This device no longer posts for your family.", "success");
}

async function confirmUnlink(): Promise<void> {
  const alert = await alertController.create({
    header: "Unlink this device?",
    message: "This device stops posting for your family. The account stays on the site.",
    cssClass: "rpg-alert",
    buttons: [
      { text: "Cancel", role: "cancel" },
      { text: "Unlink", role: "confirm", handler: () => void unlinkNow().catch((error) => debug.error("[AccountSettings] unlink failed", error)) },
    ],
  });
  await alert.present();
}

async function handleLinkAccount(): Promise<void> {
  const hasProfiles = Object.keys(userStore.users).length > 0;
  if (!hasProfiles) {
    await link.openAuthorizePage();
    return;
  }

  const alert = await alertController.create({
    header: "Back up before linking?",
    message: "Save a backup of your local heroes and quests to your device before linking your cloud account.",
    cssClass: "rpg-alert",
    buttons: [
      { text: "Cancel", role: "cancel" },
      {
        text: "Link without backup",
        handler: () => {
          void link.openAuthorizePage();
        },
      },
      {
        text: "Back up & Link",
        handler: () => {
          void (async () => {
            try {
              await backupService.exportAll();
              await proToast("Backup downloaded safely.", "success");
            } catch (err) {
              debug.error("[AccountSettings] pre-link backup failed", err);
            }
            await link.openAuthorizePage();
          })();
        },
      },
    ],
  });
  await alert.present();
}

async function openConflictModal(): Promise<void> {
  const modal = await modalController.create({
    component: XpFamilyConflictModal,
    cssClass: "rpg-modal",
  });
  await modal.present();
}

// The link loads once, as soon as a Game Master is on screen: at mount, or later when a reload signs them back in
let hasLoadedAccount = false;
async function loadAccount(): Promise<void> {
  const hasNothingToLoad = hasLoadedAccount || !isGameMaster.value;
  if (hasNothingToLoad) return;
  hasLoadedAccount = true;
  try {
    await link.loadLink();
    await link.completeReturn();
    const hasLink = Boolean(townHall.activeLink);
    if (hasLink) await loadEmail();
  } catch (error) {
    debug.error("[AccountSettings] the account could not be loaded", error);
  }
}

onMounted(loadAccount);
watch(isGameMaster, loadAccount);
</script>

<style lang="scss" scoped>
// Same look as XP Pro's buttons (_ProSettings.scss); copied so this page does not import another page's styles
.pro-button {
  --background: var(--gs-accent, #f8e8a8);
  --background-activated: var(--gs-accent, #f8e8a8);
  --color: var(--gs-window-color, #2c0a2a);
  --border-radius: 4px;
  --box-shadow: 0 3px 0 rgba(0, 0, 0, 0.45);
  letter-spacing: 1px;
}

.pro-button-outline {
  --color: var(--gs-accent, #f8e8a8);
  --border-color: var(--gs-accent, #f8e8a8);
  --border-width: 2px;
  --border-radius: 4px;
  letter-spacing: 1px;
}

.pro-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.account-name {
  font-size: 1.2em;
}

.account-note {
  text-align: center;
  font-size: 0.85em;
  opacity: 0.8;
}

.account-unlink {
  --color: #ff9a8a;
  --border-color: #ff9a8a;
}
</style>
