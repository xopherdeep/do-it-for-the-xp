<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
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

      <xp-family-phones v-if="canManage" />

      <ion-card v-if="canManage" class="max-w-2xl family-items">
        <ion-card-header>
          <ion-card-title> Items </ion-card-title>
        </ion-card-header>
        <ion-list>
          <ion-item>
            <ion-label>
              Trusted hour
              <p>The Trusted Hour Power lets a hero's claims skip the approval queue for 1 hour</p>
            </ion-label>
            <ion-toggle :checked="family.trustedHour" @ionChange="setFamily({ trustedHour: $event.detail.checked })"> </ion-toggle>
          </ion-item>
          <ion-item>
            <ion-label>
              Bedtime
              <p>When the family's night begins and ends</p>
            </ion-label>
            <ion-toggle :checked="family.bedtime.enabled" @ionChange="setBedtime({ enabled: $event.detail.checked })"> </ion-toggle>
          </ion-item>
          <ion-item v-if="family.bedtime.enabled">
            <ion-label>From</ion-label>
            <input type="time" :value="family.bedtime.from" @change="setBedtime({ from: $event.target.value })" />
            <ion-label class="ion-text-end">To</ion-label>
            <input type="time" :value="family.bedtime.to" @change="setBedtime({ to: $event.target.value })" />
          </ion-item>
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
import XpFamilyPhones from "./XpFamilyPhones.vue";
import AddProfile from "@/app/SideMenu/SwitchProfile/AddProfile/AddProfile.vue";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily, deleteProfileProblem, FAMILY_GM_ONLY_MESSAGE } from "@/router/_Guards/gm.guard";
import { heroAvatarSrc } from "@/lib/hero-look/look";
import {
  DEFAULT_FAMILY_SETTINGS,
  loadFamilySettings,
  saveFamilySettings,
  type FamilySettings,
} from "@/lib/services/family/familySettings";

export default defineComponent({
  name: "xp-settings-family",
  mixins: [ionic],
  components: { XpProfileItem, XpFamilyPhones },
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

    // The Items card: what the Game Master allows Tesla's Bolt, Night's Light and Gale's Wind to do
    const family = ref<FamilySettings>(JSON.parse(JSON.stringify(DEFAULT_FAMILY_SETTINGS)));
    loadFamilySettings().then((loaded) => (family.value = loaded));
    const setFamily = (change: Partial<FamilySettings>) => {
      if (!canManage.value) return;
      family.value = { ...family.value, ...change };
      void saveFamilySettings(family.value);
    };
    const setBedtime = (change: Partial<FamilySettings["bedtime"]>) => {
      if (!/^\d\d:\d\d$/.test(change.from ?? change.to ?? "00:00")) return;
      setFamily({ bedtime: { ...family.value.bedtime, ...change } });
    };

    return {
      family,
      setFamily,
      setBedtime,
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
