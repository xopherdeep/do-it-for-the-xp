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

    <ion-content
      :fullscreen="true"
      class="rpg-box"
    >
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-card>
              <ion-card-title> Your Family </ion-card-title>
              <ion-card-header>
                <h1>McJudyPollard</h1>
              </ion-card-header>
            </ion-card>
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
            <ion-button
              slot="end"
              v-if="!lockFamily"
              @click="openModal({ showIsAdult: true })"
            >
              Add Adult
            </ion-button>
          </ion-item-divider>
          <xp-profile-item
            v-for="profile in profiles.filter((p) => p.isAdult)"
            :key="profile.id"
            :profile="profile"
            :isLocked="lockFamily"
            @clickAddProfile="clickEditProfile"
            @clickDeleteProfile="clickDeleteProfile"
          />
        </ion-item-group>

        <ion-item-group>
          <ion-item-divider>
            <ion-label>Kids</ion-label>
            <ion-button
              slot="end"
              v-if="!lockFamily"
              @click="openModal({ showIsAdult: true })"
            >
              Add Kid
            </ion-button>
          </ion-item-divider>

          <xp-profile-item
            v-for="profile in profiles.filter((p) => !p.isAdult)"
            :key="profile.id"
            :profile="profile"
            :isLocked="lockFamily"
            @clickAddProfile="clickEditProfile"
            @clickDeleteProfile="clickDeleteProfile"
          />
        </ion-item-group>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref } from "vue";

  import ionic from "@/mixins/ionic";

  import { arrowBack } from "ionicons/icons";

  import { profileStorage } from "../../SwitchProfile/SwitchProfile.vue";
  import { ProfileDb } from "@/databases";
  import User from "@/utils/User";

  import { alertController, modalController } from "@ionic/vue";

  import XpProfileItem from "./ProfileItem.vue";
  import XpGp from "@/components/XpGp/XpGp.vue";

  import { useStore } from "vuex";

  import AddProfile from "../../SwitchProfile/AddProfile/AddProfile.vue";


  const FamilySettings = defineComponent({
    name: "xp-settings-family",
    mixins: [ionic],
    components: { XpProfileItem },
    mounted() {
      this.loadProfiles();
    },
    methods: {
      async clickEditProfile(profile: User) {
        await this.openModal({
          profile,
          showIsAdult: true
        });
      },
      async openModal(componentProps?: any) {
        const modal = await modalController.create({
          component: AddProfile,
          componentProps,
        });
        modal.onDidDismiss().then(this.loadProfiles);
        modal.present();
      },
      async deleteProfile(profile: User) {
        const { profileDb, loadProfiles } = this;
        await profileDb
          .remove(profile.id)
          .then(loadProfiles)
          .then(profileDb.showDeleteToast);
      },
      async clickDeleteProfile(profile: User) {
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
        const { avatar } = user;
        if (avatar) {
          return this.requireAvatar(`./${user.avatar}.svg`);
        }
      },
      async loadProfiles() {
        await this.profileDb.getAll().then((profiles) => {
          const sortedProfiles = Object.values(profiles).sort((a, b) => {
            return a.name.full.localeCompare(b.name.full);
          });
          this.profiles = sortedProfiles;
          this.store.dispatch("loadUsers");
        });
      },
    },
    setup() {
      const lockFamily = ref(false);
      const toppings = [];
      const toggleFamily = () => (lockFamily.value = !lockFamily.value);
      const profileDb = new ProfileDb(profileStorage);
      const profiles = ref([] as User[]);
      const store = useStore()

      const requireAvatar = require.context("@/assets/images/avatars/");

      return {
        store,
        requireAvatar,
        profiles,
        profileDb,
        lockFamily,
        toggleFamily,
        toppings,
        arrowBack,
      };
    },
  });

  export default FamilySettings;
</script>

<style lang="scss"></style>
