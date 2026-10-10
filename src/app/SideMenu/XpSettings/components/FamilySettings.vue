<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/xp-settings/`"></ion-back-button>
        </ion-buttons>
        <ion-title> Family Settings </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl">
        <ion-grid>
          <ion-row>
            <ion-col>
              <ion-card-title> Your Family </ion-card-title>
              <ion-card-header>
                <h1>McJudyPollard</h1>
              </ion-card-header>

              <ion-item>
                <ion-label>
                  My Family Setup is Complete
                  <p>Prevent making changes to the family</p>
                </ion-label>
                <ion-toggle @ionChange="toggleFamily"> </ion-toggle>
              </ion-item>
            </ion-col>
          </ion-row>
        </ion-grid>
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>Adults</ion-label>
              <ion-button slot="end" v-if="!lockFamily && canManage" @click="openModal({ presetGameMaster: true })">
                Add Adult
              </ion-button>
            </ion-item-divider>
            <xp-profile-item v-for="profile in profiles.filter((p) => p.isAdult)" :key="profile.id" :profile="profile"
              :isLocked="lockFamily || !canManage" @clickAddProfile="clickEditProfile" @clickDeleteProfile="clickDeleteProfile" />
          </ion-item-group>

          <ion-item-group>
            <ion-item-divider>
              <ion-label>Kids</ion-label>
              <ion-button slot="end" v-if="!lockFamily && canManage" @click="openModal({ presetGameMaster: false })">
                Add Kid
              </ion-button>
            </ion-item-divider>

            <xp-profile-item v-for="profile in profiles.filter((p) => !p.isAdult)" :key="profile.id" :profile="profile"
              :isLocked="lockFamily || !canManage" @clickAddProfile="clickEditProfile" @clickDeleteProfile="clickDeleteProfile" />
          </ion-item-group>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import ionic from "@/lib/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { profileStorage } from "@/lib/databases/profileStorage";
import { ProfileDb } from "@/lib/databases";
import User from "@/lib/utils/User";
import { alertController, modalController, toastController } from "@ionic/vue";
import XpProfileItem from "./ProfileItem.vue";
import AddProfile from "@/app/SideMenu/SwitchProfile/AddProfile/AddProfile.vue";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily, deleteProfileProblem, FAMILY_GM_ONLY_MESSAGE } from "@/router/_Guards/gm.guard";
import { heroAvatarSrc } from "@/lib/hero-look/look";

export default defineComponent({
  name: "xp-settings-family",
  mixins: [ionic],
  components: { XpProfileItem },
  setup() {
    const lockFamily = ref(false);
    const toppings = [];
    const toggleFamily = () => (lockFamily.value = !lockFamily.value);
    const userStore = useUserStore();
    const profileDb = new ProfileDb(profileStorage);
    const requireAvatar = require.context("@/assets/images/avatars/", false, /\.svg$/);

    // Get profiles from Pinia store
    const profiles = computed(() => userStore.usersAz);

    // Only a Game Master adds, edits or deletes profiles; heroes see the list without the buttons
    const canManage = computed(() => canManageFamily(userStore));

    // Methods
    const loadProfiles = async () => {
      await userStore.loadUsers();
    };

    // Load profiles when component mounts
    loadProfiles();

    return {
      userStore,
      requireAvatar,
      profiles,
      canManage,
      profileDb,
      lockFamily,
      toggleFamily,
      toppings,
      arrowBack,
      loadProfiles,
    };
  },
  methods: {
    async refuse(message: string) {
      const toast = await toastController.create({
        message,
        duration: 2500,
        position: "top",
        cssClass: "rpg-toast",
      });
      await toast.present();
    },
    async clickEditProfile(profile: User) {
      if (!this.canManage) return this.refuse(FAMILY_GM_ONLY_MESSAGE);
      await this.openModal({ profile });
    },
    async openModal(componentProps?: any) {
      if (!this.canManage) return this.refuse(FAMILY_GM_ONLY_MESSAGE);
      const modal = await modalController.create({
        component: AddProfile,
        cssClass: "fullscreen",
        componentProps,
      });
      modal.onDidDismiss().then(this.loadProfiles);
      modal.present();
    },
    async deleteProfile(profile: User) {
      // Backstop for the alert: refuse again at the moment of deleting
      const problem = deleteProfileProblem(profile, this.userStore);
      if (problem) return this.refuse(problem);
      const { profileDb, loadProfiles } = this;
      await profileDb
        .removeProfile(profile.id)
        .then(loadProfiles)
        .then(profileDb.showDeleteToast);
    },
    async clickDeleteProfile(profile: User) {
      const problem = deleteProfileProblem(profile, this.userStore);
      if (problem) return this.refuse(problem);
      const alert = await alertController.create({
        header: "Delete " + profile.name.full + "?",
        subHeader: "Are you sure you want to delete this profile?",
        message: "This action cannot be undone.",
        mode: "ios",
        buttons: [
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              // handlerMessage.value = "Alert canceled";
            },
          },
          {
            text: "OK",
            role: "confirm",
            handler: () => this.deleteProfile(profile),
          },
        ],
      });
      await alert.present();
    },
    getUserAvatar(user) {
      return heroAvatarSrc(user, (key: string) => this.requireAvatar(key)) || undefined;
    },
  },
});
</script>

<style lang="scss"></style>
