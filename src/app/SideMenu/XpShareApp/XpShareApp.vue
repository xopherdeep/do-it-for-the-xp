<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
          <ion-icon
            :ios="infiniteOutline"
            :md="infiniteSharp"
            class="fa-2x ml-2"
          />
        </ion-buttons>
        <ion-title> Party Invites </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-grid class="max-w-2xl">
        <!-- Family Party & Multiplayer Card -->
        <ion-row>
          <ion-card class="family-party-card w-full">
            <ion-card-header class="ion-text-center">
              <ion-icon
                :icon="peopleCircleOutline"
                class="intro-icon"
              ></ion-icon>
              <ion-card-title>Invite Your Family</ion-card-title>
              <ion-card-subtitle>Play together in the same household party</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content class="ion-text-center">
              Add the heroes in your family to this console, or link their own phones.
            </ion-card-content>

            <div class="ion-padding-horizontal ion-padding-bottom">
              <ion-button
                expand="block"
                class="ion-margin-bottom"
                data-cy="invite-add-hero"
                @click="openAddProfile"
              >
                <i class="fad fa-user-plus mr-2"></i>
                Add Hero on this Device
              </ion-button>

              <ion-button
                expand="block"
                fill="outline"
                color="primary"
                class="ion-margin-bottom"
                data-cy="invite-link-phone"
                @click="openHeroPhonePicker"
              >
                <i class="fad fa-mobile-alt mr-2"></i>
                Link a Hero's Phone (QR Code)
              </ion-button>

              <ion-item
                v-if="family.enabled && family.parentAuth === null"
                lines="none"
                class="town-hall-notice ion-margin-top"
              >
                <ion-label class="ion-text-wrap text-sm text-yellow-700">
                  Connect to Town Hall to link kid phones and sync party progress.
                </ion-label>
                <ion-button
                  slot="end"
                  size="small"
                  fill="outline"
                  color="warning"
                  @click="goToTownHall"
                >
                  Town Hall
                </ion-button>
              </ion-item>

              <ion-button
                expand="block"
                fill="clear"
                size="small"
                class="ion-margin-top"
                @click="goToFamilySettings"
              >
                <i class="fad fa-cog mr-2"></i>
                Family Settings
              </ion-button>
            </div>
          </ion-card>
        </ion-row>

        <!-- Invite Friends & Allies Card -->
        <ion-row>
          <ion-card class="share-intro-card w-full">
            <ion-card-header class="ion-text-center">
              <i class="fad fa-users-crown text-4xl text-primary mb-2"></i>
              <ion-card-title>Invite Friends & Allies</ion-card-title>
            </ion-card-header>
            <ion-card-content class="ion-text-center">
              Send another family on the adventure.
            </ion-card-content>
            <div class="ion-padding-horizontal ion-padding-bottom">
              <ion-button
                expand="block"
                class="share-button ion-margin-bottom"
                @click="shareApp"
              >
                <ion-icon :icon="sendOutline" slot="start"></ion-icon>
                Share Party Invite
              </ion-button>

              <ion-button
                expand="block"
                fill="outline"
                class="ion-margin-bottom"
                @click="copyInviteLink"
              >
                <ion-icon :icon="copyOutline" slot="start"></ion-icon>
                Copy Invite Link
              </ion-button>
            </div>
          </ion-card>
        </ion-row>

        <ion-row>
          <p class="ion-text-center share-count w-full" v-if="shareCount > 0">
            You've shared this quest {{ shareCount }} times! Keep it up!
          </p>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import { Share } from "@capacitor/share";
import {
  actionSheetController,
  modalController,
  toastController,
} from "@ionic/vue";
import {
  copyOutline,
  infiniteOutline,
  infiniteSharp,
  peopleCircleOutline,
  sendOutline,
} from "ionicons/icons";
import AddProfile from "@/app/SideMenu/SwitchProfile/AddProfile/AddProfile.vue";
import XpHeroPhonesModal from "@/app/SideMenu/XpSettings/components/XpHeroPhonesModal.vue";
import Ionic from "@/lib/mixins/ionic";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

export default defineComponent({
  name: "XpShareApp",
  mixins: [Ionic],

  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const family = useFamilyStore();
    const shareCount = ref(0);

    const openAddProfile = async () => {
      try {
        const modal = await modalController.create({
          component: AddProfile,
          cssClass: "fullscreen",
        });
        await modal.present();
        await modal.onDidDismiss();
        await userStore.loadUsers();
        await family.registerHeroes();
      } catch (error) {
        debug.error("Could not open AddProfile modal:", error);
      }
    };

    const openHeroPhonesModal = async (heroId: string, nickname: string) => {
      try {
        const modal = await modalController.create({
          component: XpHeroPhonesModal,
          componentProps: { heroId, nickname },
        });
        await modal.present();
      } catch (error) {
        debug.error("Could not open hero phones modal:", error);
      }
    };

    const openHeroPhonePicker = async () => {
      const heroes = userStore.usersAz;
      const hasHeroes = heroes.length > 0;
      if (!hasHeroes) {
        const toast = await toastController.create({
          message: "Add a hero profile first to link a phone.",
          duration: 2500,
          position: "bottom",
          color: "warning",
        });
        await toast.present();
        return;
      }

      const hasSingleHero = heroes.length === 1;
      if (hasSingleHero) {
        const first = heroes[0];
        const heroId = first.id as string;
        const nickname = first.name?.nick || first.name?.full || "Hero";
        void openHeroPhonesModal(heroId, nickname);
        return;
      }

      const buttons = heroes.map((hero: any) => ({
        text: hero.name?.nick || hero.name?.full || "Hero",
        handler: () => {
          const heroId = hero.id as string;
          const nickname = hero.name?.nick || hero.name?.full || "Hero";
          void openHeroPhonesModal(heroId, nickname);
        },
      }));

      buttons.push({
        text: "Cancel",
        role: "cancel",
      } as any);

      const sheet = await actionSheetController.create({
        header: "Link a Hero Phone",
        subHeader: "Select which hero device you are linking",
        buttons,
      });
      await sheet.present();
    };

    const goToTownHall = () => {
      void router.push({
        name: "town-hall",
        params: { userId: userStore.currentUser?.id ?? undefined },
      });
    };

    const goToFamilySettings = () => {
      void router.push({ name: "xp-settings-family" });
    };

    const copyInviteLink = async () => {
      const url = "https://doit.forthexp.com";
      try {
        const canWriteClipboard = Boolean(navigator?.clipboard?.writeText);
        if (canWriteClipboard) {
          await navigator.clipboard.writeText(url);
        }
        const toast = await toastController.create({
          message: "Party invite link copied to clipboard!",
          duration: 2000,
          position: "bottom",
          color: "success",
        });
        await toast.present();
      } catch (error) {
        debug.error("Could not copy link:", error);
      }
    };

    const shareApp = async () => {
      try {
        await Share.share({
          title: "Join my Party on Do-it-for-the-XP!",
          text: "Level up your life and quests with me on Do-it-for-the-XP!",
          url: "https://doit.forthexp.com",
          dialogTitle: "Share Party Invite",
        });

        shareCount.value++;

        const toast = await toastController.create({
          message: "Invite sent! May your party grow strong!",
          duration: 2500,
          position: "bottom",
          color: "success",
          cssClass: "rpg-toast",
        });
        await toast.present();
      } catch (error) {
        const message = (error as { message?: unknown } | null)?.message;
        const wasShareCancelled =
          typeof message === "string" && message.includes("Abort");
        if (wasShareCancelled) {
          debug.log("Share dialog was cancelled by the user.");
        } else {
          debug.error("Share failed:", error);
          const toast = await toastController.create({
            message: "Could not share. Please try again!",
            duration: 2000,
            position: "bottom",
            color: "danger",
          });
          await toast.present();
        }
      }
    };

    return {
      family,
      shareCount,
      openAddProfile,
      openHeroPhonePicker,
      goToTownHall,
      goToFamilySettings,
      copyInviteLink,
      shareApp,
      // Icons
      peopleCircleOutline,
      sendOutline,
      copyOutline,
      infiniteOutline,
      infiniteSharp,
    };
  },
});
</script>

<style scoped>
  /* General Page Styling */
  .share-content {
    --background: linear-gradient(
      135deg,
      var(--ion-color-light-shade),
      var(--ion-color-light)
    );
  }

  ion-toolbar {
    --background: var(--ion-color-primary);
    --color: var(--ion-color-primary-contrast);
  }

  /* Card Styling */
  ion-card {
    margin-left: 0;
    margin-right: 0;
    margin-bottom: 20px;
    border-radius: 16px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    background: var(--ion-color-light);
    /* Slightly off-white background for cards */
  }

  .share-intro-card ion-card-header {
    padding-top: 24px;
    padding-bottom: 8px;
  }

  .intro-icon {
    font-size: 4rem;
    /* Larger icon */
    color: var(--ion-color-primary);
    margin-bottom: 8px;
  }

  ion-card-title {
    font-weight: bold;
    color: var(--ion-color-dark);
  }

  ion-card-subtitle {
    color: var(--ion-color-medium-shade);
    font-size: 0.9rem;
  }

  /* Share Count */
  .share-count {
    font-weight: 500;
    color: var(--ion-color-primary);
    margin-top: 16px;
    margin-bottom: 16px;
    font-style: italic;
  }

  /* Footer & Button */
  ion-footer ion-toolbar {
    --background: transparent;
    /* Make footer toolbar transparent */
    padding-bottom: var(--ion-safe-area-bottom, 8px);
    /* Add padding for safe area */
  }

  .share-button {
    --background: linear-gradient(
      90deg,
      var(--ion-color-primary),
      var(--ion-color-secondary)
    );
    --background-activated: linear-gradient(
      90deg,
      var(--ion-color-primary-shade),
      var(--ion-color-secondary-shade)
    );
    --border-radius: 25px;
    /* Pill shape */
    font-weight: bold;
    height: 50px;
    --box-shadow: 0 4px 10px rgba(var(--ion-color-primary-rgb), 0.3);
    color: var(--ion-color-primary-contrast);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 8px 16px;
    /* Add horizontal margin */
  }
</style>
