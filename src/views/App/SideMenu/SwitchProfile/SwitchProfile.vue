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
      <ion-card v-if="!loading">
        <ion-list>
          <ion-item detail button @click="openNewProfileModal">
            <ion-label>
              New Profile
              <p>New players Start Here.</p>
            </ion-label>
          </ion-item>
          <ion-item
            v-for="(profile, key) in users"
            :key="key"
            @click="clickProfile(profile)"
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
    loadingController,
  } from "@ionic/vue";
  import { useStore } from "vuex";
  import { computed, defineComponent, ref, watch } from "@vue/runtime-core";
  import { add, peopleCircleSharp, peopleCircleOutline } from "ionicons/icons";
  import type { HTMLIonLoadingElement } from "@ionic/core"; // Correct import path
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
      const loading = ref(false); // Keep for template v-if, managed by controller
      const hasLoaded = ref(false); // Track initial load
      const refresh = ref(false);
      const store = useStore();
      const ionRouter = useIonRouter();
      const storage = new ProfileDb(profileStorage);

      // --- Computed ---
      const users = computed(() => store.getters.usersAz);
      const bgm = computed(() => store.state.bgm);
      // Note: The 'profiles' computed property seemed redundant with 'users', removed it.
      // If it served a different purpose, it needs to be re-evaluated.

      // --- Methods ---
      const loadUsers = () => store.dispatch("loadUsers");

      const loginUser = (profile: User) => store.dispatch("loginUser", profile);

      const clickAddProfile = () => {
        ionRouter.navigate(`/new-profile`, "forward");
      };

      const getUserAvatar = (user: User) => {
        const { avatar } = user;
        if (avatar) {
          return requireAvatar(`./${user.avatar}.svg`);
        }
        return null; // Or a default avatar
      };

      const openProfile = async (profile: User) => {
        // Login action MUST return a promise that resolves after state is committed
        await loginUser(profile);
        // Ensure navigation happens after login state is set
        await ionRouter.navigate(`/my-portal/${profile.id}`, "forward", "replace"); // Use replace to avoid back button issues?
      };

      // --- Loading Indicator ---
      let activeLoader: HTMLIonLoadingElement | null = null; // Keep track of the active loader instance

      const presentLoading = async (message = "Loading Profiles...", duration = 10000) => { // Add default duration
        // Dismiss any existing loader first
        await dismissLoading();

        loading.value = true;
        activeLoader = await loadingController.create({
          message,
          spinner: "circles",
          duration: duration, // Automatically dismiss after duration
        });
        await activeLoader.present();

        // Handle case where loader might be dismissed manually before duration ends
        activeLoader.onDidDismiss().then(() => {
          if (activeLoader) { // Check if it's the same loader instance
             loading.value = false;
             activeLoader = null;
          }
        });
      };

      const dismissLoading = async () => {
        if (activeLoader) {
          try {
            await activeLoader.dismiss();
          } catch (e) {
             // Ignore error if loader already dismissed
          } finally {
             activeLoader = null; // Clear the tracked loader instance
             loading.value = false;
          }
        } else if (loading.value) {
           // Fallback if loader instance wasn't tracked but loading state is true
           try {
             await loadingController.dismiss();
           } catch(e) { /* ignore */ }
           loading.value = false;
        }
      };

      // Updated showLoader for passcode verification - now just presents loader
      const showUnlockLoader = async () => {
        // Use a shorter duration or no duration, rely on explicit dismiss
        await presentLoading("Unlocking Profile...", 0); // 0 duration means no auto-dismiss
      };

      const passcodeVerified = async (dismiss: any) => {
        if (dismiss.data) {
          await showUnlockLoader(); // Show loader without timeout
          try {
             await openProfile(dismiss.data); // Await the profile opening (which includes login and nav)
          } catch (error) {
             console.error("Error opening profile after passcode:", error);
             // Optionally show error message
          } finally {
             await dismissLoading(); // Dismiss loader after process completes or fails
          }
        }
      };

      const showKeyPad = async (profile: User) => {
        const modal = await modalController.create({
          component: DialPad,
          cssClass: "fullscreen",
          componentProps: {
            profile,
          },
        });
        modal.present();
        modal.onDidDismiss().then(passcodeVerified);
      };

      const clickProfile = (profile: User) => {
        const { passcode } = profile;
        if (passcode) {
          showKeyPad(profile);
        } else {
          openProfile(profile);
        }
      };

      // Removed setProfiles and loadProfiles as loadUsers seems to handle fetching from storage via Vuex action
      // If direct storage interaction is needed here, uncomment and adjust loadProfiles
      /*
      const setProfiles = (loadedProfiles: User[]) => {
         // This logic might conflict with Vuex state management if 'users' comes from store
         // Decide if profiles should be managed locally or via Vuex exclusively
         console.log("Setting profiles locally:", loadedProfiles);
         // Example: If you need a local sorted copy:
         // localSortedProfiles.value = loadedProfiles.sort(...)
      };

      const loadProfiles = async () => {
         // return await storage.getAll().then(setProfiles);
         // Prefer using the Vuex action if it reads from storage
         return loadUsers();
      };
      */

      const openNewProfileModal = async () => {
        const modal = await modalController.create({
          component: AddProfile,
          cssClass: "fullscreen",
        });
        modal.onDidDismiss().then(() => {
          loadUsers(); // Reload users from store after modal dismiss
          // If loadProfiles was needed: .then(loadProfiles)
        });
        modal.present();
      };

      // --- Lifecycle Hooks ---
      onIonViewWillEnter(async () => {
        if (!hasLoaded.value) {
          hasLoaded.value = true; // Mark that initial load attempt has started
          await presentLoading();
          try {
            await storage.init(); // Ensure storage is ready before loading
            await loadUsers(); // Assuming loadUsers returns a promise
          } catch (error) {
            console.error("Failed to load users:", error);
            await dismissLoading(); // Dismiss loader on error
            // Optionally show an error message to the user
          }
          // Do NOT dismiss loader here in 'finally' - let the watcher handle it on success
        } else {
           // If hasLoaded is true, maybe still ensure data is present if users array is empty
           if (users.value.length === 0) {
              console.log("View entered again, users empty, attempting reload...");
              await presentLoading();
              try {
                 await storage.init();
                 await loadUsers();
              } catch (error) {
                 console.error("Failed to reload users:", error);
                 await dismissLoading();
              }
           }
        }
      });

      // Watcher to dismiss loader once users are loaded
      watch(users, (newUsers) => {
        if (newUsers && newUsers.length > 0 && loading.value && activeLoader) {
          console.log("Users loaded, dismissing loader via watcher.");
          dismissLoading();
        }
      });

      // --- Return ---
      return {
        loading,
        refresh,
        users, // Use the computed 'users' which gets from 'usersAz' getter
        bgm,
        add,
        peopleCircleSharp,
        peopleCircleOutline,
        ionRouter, // Not strictly needed in return if only used in setup, but good practice if template might need it later
        // storage, // Usually not needed in template
        loadUsers,
        loginUser,
        clickAddProfile,
        getUserAvatar,
        clickProfile,
        openProfile,
        showKeyPad,
        // passcodeVerified, // Only used internally by showKeyPad
        // showLoader, // Only used internally by passcodeVerified
        // setProfiles, // Removed/Commented
        // loadProfiles, // Removed/Commented
        openNewProfileModal,
        // Expose helper directly for template
        $getUserAvatar: getUserAvatar,
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
