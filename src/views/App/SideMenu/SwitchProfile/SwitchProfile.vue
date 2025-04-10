<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button
            color="primary"
            @click="$fx.ui[$fx.theme.ui].select.play()"
          ></ion-menu-button>
          <ion-button class="m-8">
            <ion-icon :ios="peopleCircleOutline" :md="peopleCircleSharp" />
          </ion-button>
        </ion-buttons>
        <ion-title> Choose Profile Save </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" id="container" class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div v-show="isLoading" class="flex justify-center items-center h-full">
        <ion-spinner name="circles"></ion-spinner>
      </div>

      <ion-card v-show="!isLoading">
        <ion-list>
          <ion-item detail button @click="openNewProfileModal">
            <ion-label>
              New Profile
              <p>New players Start Here.</p>
            </ion-label>
          </ion-item>
          <ion-item
            v-for="profile in users"
            :key="profile.id"
            @click="selectProfile(profile)"
            button
            detail
          >
            <ion-label>
              {{ profile.name.nick }}
              <p>
                <small>
                  {{ profile.name.full }}
                </small>
              </p>
            </ion-label>
            <ion-avatar slot="end">
              <ion-img :src="getUserAvatar(profile)" />
            </ion-avatar>
            <ion-label slot="end" class="w-20 ml-2">
              Level: {{ profile?.stats?.level }}
              <p>
                <xp-gp :gp="profile?.stats?.gp.wallet" />
              </p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import {
    useIonRouter,
    onIonViewWillEnter,
    onIonViewDidLeave,
  } from "@ionic/vue";
  import { useStore } from "vuex";
  import { computed, defineComponent, ref, onUnmounted } from "vue";
  import { peopleCircleSharp, peopleCircleOutline } from "ionicons/icons";
  import User from "@/utils/User";
  import { Drivers, Storage } from "@ionic/storage";
  import { modalController } from "@ionic/vue";
  import { ProfileDb } from "@/databases";
  import AddProfile from "./AddProfile/AddProfile.vue";
  import XpGp from "@/components/XpGp/XpGp.vue";
  import DialPad from "./DialPad.vue";

  const requireAvatar = require.context("@/assets/images/avatars/");

  export const profileStorage = new Storage({
    name: "__profiles",
    driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
  });

  export default defineComponent({
    name: "switch-profile",
    components: { XpGp },
    setup() {
      // State management
      const isLoading = ref(false);
      const store = useStore();
      const ionRouter = useIonRouter();
      const storage = new ProfileDb(profileStorage);

      // Computed properties
      const users = computed(() => store.getters.usersAz);
      const bgm = computed(() => store.state.bgm);

      // Data loading function
      const loadProfiles = async () => {
        isLoading.value = true;

        try {
          await storage.init();
          await store.dispatch("loadUsers");
        } catch (error) {
          console.error("Failed to load profiles:", error);
          // You could add a toast or alert here to notify user of the error
        } finally {
          isLoading.value = false;
        }
      };

      // Pull-to-refresh handler
      const handleRefresh = async (event: any) => {
        try {
          await loadProfiles();
        } finally {
          event.target.complete();
        }
      };

      // Navigation functions
      const navigateToUserPortal = async (profile: User) => {
        try {
          // Login the user first
          await store.dispatch("loginUser", profile);
          // Then navigate to their portal
          await ionRouter.navigate(
            `/my-portal/${profile.id}/my-home`,
            "forward",
            "replace"
          );
        } catch (error) {
          console.error("Navigation error:", error);
          // Handle navigation error
        }
      };

      // Profile functions
      const getUserAvatar = (user: User) => {
        if (user?.avatar) {
          return requireAvatar(`./${user.avatar}.svg`);
        }
        return ""; // Return empty string or default avatar path
      };

      const selectProfile = async (profile: User) => {
        if (profile.passcode) {
          openPasscodeModal(profile);
        } else {
          navigateToUserPortal(profile);
        }
      };

      // Modal management
      const openPasscodeModal = async (profile: User) => {
        const modal = await modalController.create({
          component: DialPad,
          cssClass: "fullscreen",
          componentProps: { profile },
        });

        await modal.present();

        const { data } = await modal.onDidDismiss();
        if (data) {
          navigateToUserPortal(profile);
        }
      };

      const openNewProfileModal = async () => {
        const modal = await modalController.create({
          component: AddProfile,
          cssClass: "fullscreen",
        });

        await modal.present();

        const { data } = await modal.onDidDismiss();
        if (data) {
          // If profile was created successfully
          loadProfiles();
        }
      };

      // Lifecycle hooks
      onIonViewWillEnter(() => {
        loadProfiles();
      });

      onIonViewDidLeave(() => {
        // Clean up or reset any state needed when navigating away
      });

      onUnmounted(() => {
        // Additional cleanup if needed
      });

      return {
        isLoading,
        users,
        bgm,
        peopleCircleSharp,
        peopleCircleOutline,
        getUserAvatar,
        selectProfile,
        openNewProfileModal,
        handleRefresh,
      };
    },
  });
</script>
<style scoped lang="scss">
  ion-content {
    --background: transparent;

    &#container {
      height: 100vh;
      background-color: #68a8d8;
      background-image: linear-gradient(
          45deg,
          #80d890 25%,
          transparent 25%,
          transparent 75%,
          #80d890 75%
        ),
        linear-gradient(
          45deg,
          #80d890 25%,
          transparent 25%,
          transparent 75%,
          #80d890 75%
        );
      background-size: 60px 60px;
      background-position: 0 0, 30px 30px;
      animation: slide 4s infinite linear;
    }
  }

  .switch-profile {
    ion-card {
      text-align: center;
      width: calc(100% - 35px);
      // min-width: calc(15vw)
    }

    ion-avatar {
      margin: auto;
    }

    // #container {
    //   text-align: center;
    //   position: absolute;
    //   left: 0;
    //   right: 0;
    //   top: 50%;
    //   transform: translateY(-50%);
    // }

    #container strong {
      font-size: 20px;
      line-height: 26px;
    }

    #container p {
      font-size: 16px;
      line-height: 22px;
      color: #8c8c8c;
      margin: 0;
    }

    #container a {
      text-decoration: none;
    }
  }

  // Styles for the fullscreen modal
  ion-modal.fullscreen-modal {
    --height: 100%;
    --width: 100%;
    --border-radius: 0; // Optional: remove rounded corners if any
  }

  ion-modal {
    .img-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      flex-grow: 1;
      margin: 1em;
    }

    ion-input {
      text-align: right;
    }
  }

  @keyframes slide {
    from {
      background-position: 0 0, 30px 30px;
    }

    to {
      background-position: 0 0, -30px -30px;
    }
  }
</style>
