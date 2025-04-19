<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button
            @click="$fx.ui[$fx.theme.ui].select.play()"
          ></ion-menu-button>
          <ion-icon
            :ios="fingerPrintOutline"
            :md="fingerPrintSharp"
            class="fa-2x ml-2"
          />
        </ion-buttons>
        <ion-title> Choose A Profile </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content
      :fullscreen="true"
      id="container"
      class="ion-padding rpg-box"
    >
      <ion-refresher
        slot="fixed"
        @ionRefresh="handleRefresh($event)"
      >
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div
        v-show="isLoading"
        class="flex justify-center items-center h-full"
      >
        <ion-spinner name="circles"></ion-spinner>
      </div>

      <ion-card
        v-show="!isLoading"
        class="max-w-4xl"
      >
        <ion-list>
          <ion-item
            detail
            button
            @click="openNewProfileModal"
          >
            <ion-buttons
              slot="start"
              class="icon-colors"
            >
              <i class="fad fa-heartbeat fa-3x"></i>
            </ion-buttons>
            <ion-label class="py-4">
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
            class="profile-item rpg-box"
          >
            <div
              slot="start"
              class="profile-info stats-container py-4"
            >
              <div class="level">
                <span class="label">LVL</span>
                <span class="value">{{ profile?.stats?.level || 1 }}</span>
              </div>
              <div class="avatar-container">
                <ion-avatar>
                  <ion-img :src="getUserAvatar(profile)" />
                </ion-avatar>
                <div class="role-icons icon-colors">
                  <i :class="`fad fa-${getJobClassIcon(profile)}`"></i>
                  <i :class="`fad fa-${getFoodIcon(profile)}`"></i>
                </div>
              </div>
              <ion-label class="name-container">
                <h1>{{ profile.name.nick }}</h1>
                <p>{{ profile.name.full }}</p>
              </ion-label>
            </div>

            <div
              slot="end"
              class="stats-container"
            >
              <ion-chip
                class="wallet"
                color="warning"
              >
                <xp-gp :gp="profile?.stats?.gp.wallet" />
              </ion-chip>
            </div>
          </ion-item>
        </ion-list>
      </ion-card>

      <!-- Loading indicator for profile selection -->
      <ion-loading
        :is-open="isProfileLoading"
        message="Loading Profile..."
        :duration="0"
      >
      </ion-loading>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  toastController, // <-- Import toastController
  IonLoading,
  useIonRouter,
  onIonViewWillEnter,
  onIonViewDidLeave,
} from "@ionic/vue";
import { useStore } from "vuex";
import { computed, defineComponent, ref, onUnmounted } from "vue";
import { peopleCircleSharp, peopleCircleOutline, fingerPrintOutline, fingerPrintSharp } from "ionicons/icons";
import User from "@/utils/User";
import { Drivers, Storage } from "@ionic/storage";
import { modalController } from "@ionic/vue";
import { ProfileDb } from "@/databases";
import AddProfile from "./AddProfile/AddProfile.vue";
import XpGp from "@/components/XpGp/XpGp.vue";
import DialPad from "./DialPad.vue";
import ionic from "@/mixins/ionic";
import { FOOD_OPTIONS, JOB_CLASS_OPTIONS } from "@/constants";

const requireAvatar = require.context("@/assets/images/avatars/");

export const profileStorage = new Storage({
  name: "__profiles",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export default defineComponent({
  name: "switch-profile",
  components: {
    IonLoading, // <-- Add IonLoading component
    XpGp,
  },
  mixins: [ionic],
  setup() {
    // State management
    const isLoading = ref(false); // For initial list loading
    const isProfileLoading = ref(false); // For selected profile loading
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
        isProfileLoading.value = true; // Start loading indicator

        // Login the user first and wait for it to complete
        await store.dispatch("loginUser", profile);

        // Then navigate to their home page
        await ionRouter.navigate(
          `/my-portal/${profile.id}/my-home`,
          "forward"
        );
      } catch (error: any) {
        console.error("Login/Navigation error:", error);
        const toast = await toastController.create({
          message: `Failed to load profile: ${error.message || error}`,
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      } finally {
        // Add a slight delay before hiding the loading indicator
        await new Promise(resolve => setTimeout(resolve, 500));
        isProfileLoading.value = false;
      }
    };

    // Profile functions
    const getUserAvatar = (user: User) => {
      if (user?.avatar) {
        return requireAvatar(`./${user.avatar}.svg`);
      }
      return ""; // Return empty string or default avatar path
    };

    const getJobClassIcon = (profile: User) => {
      const findJobClass = (job) => job?.name === profile?.jobClass;
      const selectedJob = JOB_CLASS_OPTIONS.find(findJobClass);
      // Remove fa- prefix since it's added in the template
      return selectedJob ? selectedJob.icon.replace('fa-', '') : 'question';
    };

    const getFoodIcon = (profile: User) => {
      const findFavoriteFood = (food) => food.value === profile?.favoriteFood;
      const selectedFood = FOOD_OPTIONS.find(findFavoriteFood);
      // Remove fa- prefix since it's added in the template
      return selectedFood ? selectedFood.icon.replace('fa-', '') : 'utensils';
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
    onIonViewWillEnter(async () => {
      // Load profiles when entering the view
      await loadProfiles();
    });

    onIonViewDidLeave(() => {
      // Reset loading states when leaving the view
      isLoading.value = false;
      isProfileLoading.value = false;
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
      getJobClassIcon,
      getFoodIcon,
      selectProfile,
      openNewProfileModal,
      handleRefresh,
      isProfileLoading, // <-- Expose isProfileLoading
      fingerPrintOutline,
      fingerPrintSharp,
    };
  },
});
</script>
<style scoped lang="scss">
ion-content {
  --background: transparent;
}

.switch-profile {
  ion-card {
    text-align: center;
    /* width: calc(100% - 35px); */
    // min-width: calc(15vw)
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
    /* margin: 0; */
  }

  #container a {
    text-decoration: none;
  }

  &#container {
    height: 100vh;
    background-color: #68a8d8;
    background-image: linear-gradient(45deg,
        #80d890 25%,
        transparent 25%,
        transparent 75%,
        #80d890 75%),
      linear-gradient(45deg,
        #80d890 25%,
        transparent 25%,
        transparent 75%,
        #80d890 75%);
    background-size: 60px 60px;
    background-position: 0 0, 30px 30px;
    animation: slide 4s infinite linear;
  }
}

.switch-profile {
  ion-card {
    text-align: center;
    /* width: calc(100% - 35px); */
    // min-width: calc(15vw)
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
    /* margin: 0; */
  }

  #container a {
    text-decoration: none;
  }

  ion-badge {
    padding: 6px 8px;
    border-radius: 12px;
    font-weight: 500;
    min-width: 60px;
    text-align: center;

    &[color="tertiary"] {
      --ion-color-base: var(--ion-color-tertiary);
    }

    &[color="warning"] {
      --ion-color-base: var(--ion-color-warning);
    }
  }
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

.avatar-group {
  display: flex;
  align-items: center;
  gap: 8px;

  .profile-icons {
    display: flex;
    flex-direction: column;
    gap: 4px;

    i {
      font-size: 1.2em;
    }
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

.profile-item {
  --padding-start: 1rem;
  --inner-padding-end: 1rem;
  margin-bottom: 0.5rem;

  &::part(native) {
    align-items: center;
  }
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-container {
  position: relative;
  display: flex;
  align-items: center;

  ion-avatar {
    width: 50px;
    height: 50px;
  }

  .role-icons {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 0.75rem;

    i {
      font-size: 1.5rem;

      // Set default duotone colors if not overridden
      /* --fa-primary-color: var(--ion-color-primary);
      --fa-secondary-color: var(--ion-color-primary-shade); */
      /* --fa-secondary-opacity: 0.6; */

      &:last-child {
        /* --fa-primary-color: var(--ion-color-success);
        --fa-secondary-color: var(--ion-color-success-shade); */
      }
    }
  }
}

.name-container {
  h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    color: var(--ion-color-dark);
  }

  p {
    font-size: 0.85rem;
    margin: 0.25rem 0 0;
    color: var(--ion-color-medium);
  }
}

.stats-container {
  display: flex;
  align-items: center;
  gap: 1rem;

  .level {
    display: flex;
    flex-direction: column;
    align-items: center;
    /* background: var(--ion-color-tertiary-dark); */
    padding: 0.25rem 0.75rem;
    border-radius: 8px;
    min-width: 3rem;

    .label {
      font-size: 0.9rem;
      color: var(--ion-color-tertiary);
      font-weight: 600;
      /* text-transform: uppercase; */
    }

    .value {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--ion-color-tertiary);
    }
  }

  .wallet {
    /* background: var(--ion-color-warning-tint); */
    padding: 0.25rem 0.75rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    color: var(--ion-color-warning);
    font-size: 1.4rem;
    font-weight: 700;
    font-family: "Twoson";
  }
}
</style>
