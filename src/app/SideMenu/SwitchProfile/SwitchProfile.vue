<template>
  <xp-rpg-page title="Choose A Profile" :loading="isLoading" bg-class="bg-slide">
    <template #start-actions>
      <ion-menu-button @click="$fx.ui[$fx.theme.ui].select.play()" />
      <ion-icon :ios="fingerPrintOutline" :md="fingerPrintSharp" class="fa-2x ml-2" />
    </template>
    <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
      <ion-refresher-content></ion-refresher-content>
    </ion-refresher>

    <ion-grid>
      <!-- Empty State: Authentic Earthbound Window (Unified Mobile & Desktop) -->
      <div v-if="users.length === 0" class="empty-state-view">
        <div class="eb-window empty-window">
          <div class="eb-window-header">
            <span class="eb-window-title">Choose A Profile</span>
            <span class="eb-window-sub">File Select</span>
          </div>

          <div class="empty-banner">
            <div class="empty-icon-frame">
              <i class="fad fa-users-slash" aria-hidden="true"></i>
            </div>
            <h2 class="empty-title">No Adventurers Yet!</h2>
            <p class="empty-blurb">
              Every grand quest begins with a single hero. Create your first profile to begin the journey.
            </p>
          </div>

          <div class="eb-slots-list">
            <!-- Quick Start: name the kids, get three chores and three rewards, play tonight -->
            <div
              class="eb-file-slot eb-quick-slot"
              role="button"
              tabindex="0"
              data-cy="quick-start-slot"
              @click="openQuickStart"
              @keydown.enter="openQuickStart"
            >
              <div class="eb-cursor" aria-hidden="true">&#9654;</div>
              <div class="eb-slot-tag"><i class="fad fa-bolt"></i></div>
              <div class="eb-slot-avatar-frame eb-new-avatar">
                <i class="fad fa-hat-wizard"></i>
              </div>
              <div class="eb-slot-details">
                <div class="eb-slot-hero-name">Quick Start</div>
                <div class="eb-slot-meta-row">
                  <span class="eb-slot-desc">Name your kids and play tonight</span>
                </div>
              </div>
              <div class="eb-slot-badge-column">
                <i class="fad fa-chevron-right eb-new-arrow"></i>
              </div>
            </div>

            <!-- Start New Game Slot (CTA) -->
            <div
              class="eb-file-slot eb-new-slot"
              role="button"
              tabindex="0"
              @click="openNewProfileModal"
              @keydown.enter="openNewProfileModal"
            >
              <div class="eb-cursor" aria-hidden="true">&#9654;</div>
              <div class="eb-slot-tag"><i class="fad fa-sparkles"></i></div>
              <div class="eb-slot-avatar-frame eb-new-avatar">
                <i class="fad fa-plus"></i>
              </div>
              <div class="eb-slot-details">
                <div class="eb-slot-hero-name">Start New Game</div>
                <div class="eb-slot-meta-row">
                  <span class="eb-slot-desc">Create your first hero profile</span>
                </div>
              </div>
              <div class="eb-slot-badge-column">
                <i class="fad fa-chevron-right eb-new-arrow"></i>
              </div>
            </div>

            <!-- Link Kid Phone Slot (when multiplayer enabled) -->
            <div
              v-if="isMultiplayerEnabled"
              class="eb-file-slot eb-link-slot"
              role="button"
              tabindex="0"
              data-cy="link-phone-slot"
              @click="openLinkPhone"
              @keydown.enter="openLinkPhone"
            >
              <div class="eb-cursor" aria-hidden="true">&#9654;</div>
              <div class="eb-slot-tag"><i class="fad fa-mobile-alt"></i></div>
              <div class="eb-slot-avatar-frame eb-link-avatar">
                <i class="fad fa-qrcode"></i>
              </div>
              <div class="eb-slot-details">
                <div class="eb-slot-hero-name">I'm a hero with a family code</div>
                <div class="eb-slot-meta-row">
                  <span class="eb-slot-desc">Link this phone with a code or QR</span>
                </div>
              </div>
              <div class="eb-slot-badge-column">
                <i class="fad fa-chevron-right eb-new-arrow"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Populated Profiles Views -->
      <template v-else>
        <!-- Card View (Default) -->
        <ion-row v-if="!isRetroView" class="md:hidden profile-grid"
          :class="{ 'justify-content-center items-center': users.length === 1 }">
          <ion-col v-for="(user, key) in users" :key="key" :size="users.length === 1 ? '12' : '6'"
            :size-sm="users.length === 1 ? '10' : '4'" :size-md="users.length === 1 ? '8' : '3'"
            :size-xl="users.length === 1 ? '6' : '2'" class="profile-card-col">
            <XpProfileCard :user="user" :is-large="users.length === 1" @select="selectProfile" />
          </ion-col>
        </ion-row>

        <!-- Retro View (Earthbound Save Slots) -->
        <div v-else class="retro-view md:hidden">
          <div class="eb-window">
            <div class="eb-window-header">
              <span class="eb-window-title">Choose A Profile</span>
              <span class="eb-window-sub">File Select</span>
            </div>

            <div class="eb-slots-list">
              <div
                v-for="(user, index) in users"
                :key="user.id"
                class="eb-file-slot"
                role="button"
                tabindex="0"
                @click="selectProfile(user)"
                @keydown.enter="selectProfile(user)"
              >
                <div class="eb-cursor" aria-hidden="true">&#9654;</div>
                <div class="eb-slot-tag">0{{ index + 1 }}</div>
                <div class="eb-slot-avatar-frame">
                  <img v-if="getUserAvatar(user)" :src="getUserAvatar(user)" :alt="user.name.nick" />
                  <i v-else class="fad fa-user-ninja"></i>
                </div>
                <div class="eb-slot-details">
                  <div class="eb-slot-name-row">
                    <span class="eb-slot-hero-name">{{ user.name.nick }}</span>
                    <span v-if="user.isAdult" class="gm-badge" title="Game Master">
                      <i class="fad fa-crown" aria-hidden="true"></i>GM
                    </span>
                  </div>
                  <div class="eb-slot-meta-row">
                    <span class="eb-slot-class">
                      <i :class="`fad fa-${getJobClassIcon(user)}`"></i>
                      {{ user.jobClass || 'Hero' }}
                    </span>
                  </div>
                </div>
                <div class="eb-slot-badge-column">
                  <div class="eb-lvl-pill">
                    <small>LV</small>
                    <span>{{ user?.stats?.level || 1 }}</span>
                  </div>
                  <div class="eb-gp-pill">
                    <i class="fad fa-coins"></i>
                    <span>{{ user?.stats?.gp?.wallet ?? 0 }}</span>
                  </div>
                </div>
              </div>

              <!-- Start New Game Slot -->
              <div
                class="eb-file-slot eb-new-slot"
                role="button"
                tabindex="0"
                @click="openNewProfileModal"
                @keydown.enter="openNewProfileModal"
              >
                <div class="eb-cursor" aria-hidden="true">&#9654;</div>
                <div class="eb-slot-tag"><i class="fad fa-sparkles"></i></div>
                <div class="eb-slot-avatar-frame eb-new-avatar">
                  <i class="fad fa-plus"></i>
                </div>
                <div class="eb-slot-details">
                  <div class="eb-slot-hero-name">Start New Game</div>
                  <div class="eb-slot-meta-row">
                    <span class="eb-slot-desc">Create a new hero profile</span>
                  </div>
                </div>
                <div class="eb-slot-badge-column">
                  <i class="fad fa-chevron-right eb-new-arrow"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ion-row class="ion-no-padding hidden md:block">
          <ion-card v-show="!isLoading" class="max-w-4xl">
            <ion-list>
              <ion-item detail button @click="openNewProfileModal">
                <ion-buttons slot="start" class="icon-colors">
                  <i class="fad fa-heartbeat fa-3x"></i>
                </ion-buttons>
                <ion-label class="py-4">
                  New Profile
                  <p>New players Start Here.</p>
                </ion-label>
              </ion-item>
              <ion-item v-for="user in users" :key="user.id" @click="selectProfile(user)" button detail
                class="profile-item rpg-box">
                <div slot="start" class="profile-info stats-container py-4">
                  <div class="level">
                    <span class="label">LVL</span>
                    <span class="value">{{ user?.stats?.level || 1 }}</span>
                  </div>
                  <div class="avatar-container">
                    <ion-avatar>
                      <ion-img :src="getUserAvatar(user)" />
                    </ion-avatar>
                    <div class="role-icons icon-colors">
                      <i :class="`fad fa-${getJobClassIcon(user)}`"></i>
                      <i :class="`fad fa-${getFoodIcon(user)}`"></i>
                    </div>
                  </div>
                  <ion-label class="name-container">
                    <h1>
                      {{ user.name.nick }}
                      <span v-if="user.isAdult" class="gm-badge" role="img" aria-label="Game Master"
                        title="Game Master"><i class="fad fa-crown" aria-hidden="true" />GM</span>
                    </h1>
                    <p>{{ user.name.full }}</p>
                  </ion-label>
                </div>

                <div slot="end" class="stats-container">
                  <ion-chip class="wallet" color="warning">
                    <xp-gp :gp="user?.stats?.gp.wallet" />
                  </ion-chip>
                </div>
              </ion-item>
            </ion-list>
          </ion-card>
        </ion-row>
      </template>
    </ion-grid>

    <!-- Left FAB: Toggle Grid / List View (Only when profiles exist) -->
    <ion-fab v-if="users.length > 0" vertical="bottom" horizontal="start" slot="fixed" class="ion-no-border md:hidden icon-colors">
      <ion-fab-button color="light" @click="isRetroView = !isRetroView">
        <i class="fad fa-lg" :class="isRetroView ? 'fa-th-large' : 'fa-list'"></i>
      </ion-fab-button>
    </ion-fab>

    <!-- Center FAB: Add Profile -->
    <ion-fab vertical="bottom" horizontal="center" slot="fixed" @click="openNewProfileModal"
      class="ion-no-border md:hidden fab-pulse">
      <ion-fab-button color="danger">
        <i class="fad fa-plus fa-2x"></i>
      </ion-fab-button>
    </ion-fab>

    <!-- Toast for restore success -->
    <ion-toast :is-open="showRestoreToast" :message="restoreMessage" :duration="3000"
      :color="restoreSuccess ? 'success' : 'warning'" position="top" @didDismiss="showRestoreToast = false"></ion-toast>
  </xp-rpg-page>
</template>

<script lang="ts">
import { landingChoiceOf, landingPathFor } from "@/lib/services/core/profilePrefs";
import {
  toastController,
  useIonRouter,
  onIonViewWillEnter,
  onIonViewDidLeave,
} from "@ionic/vue";
import { useUserStore } from "@/lib/store/stores/user";
import { useAudioStore } from "@/lib/store/stores/audio";
import { computed, defineComponent, ref, onUnmounted } from "vue";
import {
  peopleCircleSharp,
  peopleCircleOutline,
  fingerPrintOutline,
  fingerPrintSharp,
  gridOutline,
  listOutline,
} from "ionicons/icons";
import User from "@/lib/utils/User";
import { profileStorage } from "@/lib/databases/profileStorage";
import { modalController } from "@ionic/vue";
import { ProfileDb } from "@/lib/databases";
import AddProfile from "./AddProfile/AddProfile.vue";
import QuickStart from "./QuickStart/QuickStart.vue";
import { rpgToastOptions } from "@/hooks/useToast";
import ProfileLoadingModal from "../../../components/templates/modals/ProfileLoadingModal.vue";
import XpGp from "@/components/atoms/Currency/XpGp.vue";
import XpProfileCard from "@/components/molecules/XpProfileCard/XpProfileCard.vue";
import DialPad from "./DialPad.vue";
import ionic from "@/lib/mixins/ionic";
import { FOOD_OPTIONS, JOB_CLASS_OPTIONS } from "@/constants";
import debug from "@/lib/utils/debug";
import { needsGameMasterPasscode } from "@/router/_Guards/gm.guard";
import { heroAvatarSrc } from "@/lib/hero-look/look";
import XpRpgPage from "@/components/templates/pages/XpRpgPage.vue";
import { useFamilyStore } from "@/lib/store/stores/family";

const requireAvatar = require.context("@/assets/images/avatars/", false, /\.svg$/);

// What a caught value says for a toast: an Error's message, else the value as text
const errorText = (error: unknown): string => (error instanceof Error && error.message) || String(error);

// Re-exported for backwards compatibility; the instance now lives in lib/databases/profileStorage.ts
export { profileStorage };

export default defineComponent({
  name: "switch-profile",
  components: {
    XpGp,
    XpProfileCard,
    XpRpgPage
  },
  mixins: [ionic],
  setup() {
    // State management
    // State management
    const isLoading = ref(false); // For initial list loading
    const userStore = useUserStore();
    const audioStore = useAudioStore();
    const familyStore = useFamilyStore();
    const ionRouter = useIonRouter();
    const storage = new ProfileDb(profileStorage);

    const isMultiplayerEnabled = computed(() => familyStore.enabled);
    const openLinkPhone = () => {
      ionRouter.push("/link");
    };

    // Restore notification state
    // Restore notification state
    const showRestoreToast = ref(false);
    const restoreMessage = ref("");
    const restoreSuccess = ref(false);
    const isRestoringProfiles = ref(false);
    const isRetroView = ref(false);

    // Computed properties
    const users = computed(() => userStore.usersAz);
    const bgm = computed(() => audioStore.bgm);

    // Data loading function
    const loadProfiles = async () => {
      isLoading.value = true;

      try {
        await storage.init();

        // Check if we have profiles, if not try to restore from persistent storage
        const existingProfiles = await storage.getProfiles();

        const hasNoProfiles = !existingProfiles || existingProfiles.length === 0;
        if (hasNoProfiles) {
          if (!isRestoringProfiles.value) {
            isRestoringProfiles.value = true;
            const restored = await storage.restoreProfiles();
            if (restored) {
              restoreSuccess.value = true;
              restoreMessage.value = "Successfully restored your profiles!";
              showRestoreToast.value = true;
            }
            isRestoringProfiles.value = false;
          }
        }

        await userStore.loadUsers();
      } catch (error) {
        debug.error("Failed to load profiles:", error);
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
      // Create and present the loading modal
      const loadingModal = await modalController.create({
        component: ProfileLoadingModal,
        componentProps: {
          userName: profile.name.nick,
          userAvatar: getUserAvatar(profile)
        },
        cssClass: 'profile-loading-modal',
        backdropDismiss: false
      });

      await loadingModal.present();

      try {
        // Login the user first and wait for it to complete
        await userStore.loginUser(profile);

        // Then go to the screen they chose to land on (Settings > General), My Home unless they picked another
        await ionRouter.navigate(landingPathFor(profile, landingChoiceOf(String(profile.id))), "root");
      } catch (error) {
        debug.error("Login/Navigation error:", error);
        const toast = await toastController.create({
          message: `Failed to load profile: ${errorText(error)}`,
          duration: 3000,
          color: "danger",
          position: "top",
        });
        await toast.present();
      } finally {
        // Dismiss the modal after a short delay to ensure smooth transition
        setTimeout(async () => {
          await loadingModal.dismiss();
        }, 500);
      }
    };

    // Profile functions
    const getUserAvatar = (user: User) => {
      return heroAvatarSrc(user, requireAvatar); // "" when there is neither a snapshot nor an avatar
    };

    const getJobClassIcon = (profile: User) => {
      const findJobClass = (job) => job?.name === profile?.jobClass;
      const selectedJob = JOB_CLASS_OPTIONS.find(findJobClass);
      // Remove fa- prefix since it's added in the template
      return selectedJob ? selectedJob.icon.replace("fa-", "") : "question";
    };

    const getFoodIcon = (profile: User) => {
      const findFavoriteFood = (food) => food.value === profile?.favoriteFood;
      const selectedFood = FOOD_OPTIONS.find(findFavoriteFood);
      // Remove fa- prefix since it's added in the template
      return selectedFood ? selectedFood.icon.replace("fa-", "") : "utensils";
    };

    const selectProfile = async (profile: User) => {
      // A Game Master saved before the passcode rule has no 4-digit PIN: set one before letting them in
      if (needsGameMasterPasscode(profile)) {
        const toast = await toastController.create({
          message: "Game Masters need a 4-digit passcode",
          duration: 2500,
          position: "top",
          color: "warning",
        });
        await toast.present();
        const modal = await modalController.create({
          component: AddProfile,
          cssClass: "fullscreen",
          componentProps: { profile, startTab: "account" },
        });
        await modal.present();
        await modal.onDidDismiss();
        await loadProfiles();
        return;
      }
      const hasPasscode = Boolean(profile.passcode);
      if (hasPasscode) {
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
        // If profile created successfully
        loadProfiles();
      }
    };

    // Quick Start seeds the heroes and tonight's quests, then the heroes wait here to be picked
    const openQuickStart = async () => {
      const modal = await modalController.create({
        component: QuickStart,
        cssClass: "fullscreen",
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      const hasNoHeroes = !(data?.heroes ?? []).length;
      if (hasNoHeroes) return;
      await loadProfiles();
      const message = "Your heroes are ready! Pick one to start tonight's quests. Your own profile opens with your PIN.";
      const toast = await toastController.create(rpgToastOptions(message, 4000));
      await toast.present();
    };

    // Lifecycle hooks
    onIonViewWillEnter(async () => {
      // Load profiles when entering the view
      await loadProfiles();
    });

    onIonViewDidLeave(() => {
      // Reset loading states when leaving the view
      isLoading.value = false;
    });

    onUnmounted(() => {
      // Additional cleanup if needed
    });

    // Retro view computed: transform users into RPG menu actions
    const retroMenuActions = computed(() => {
      const actions = users.value.map((user, index) => ({
        id: user.id,
        label: `${index + 1}: ${user.name.nick || user.name.full}${user.isAdult ? " [GM]" : ""} - LVL ${user?.stats?.level || 1
          }`,
        click: () => selectProfile(user),
      }));
      // Add "Start New Game" option
      actions.push({
        id: "new-game",
        label: "Start New Game",
        click: () => openNewProfileModal(),
      });
      return actions;
    });

    const handleRetroAction = () => {
      // action.click() is now handled internally by XpRpgMenu
    };

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
      openQuickStart,
      handleRefresh,
      fingerPrintOutline,
      fingerPrintSharp,
      restoreMessage,
      restoreSuccess,
      showRestoreToast,
      isRetroView,
      gridOutline,
      listOutline,
      retroMenuActions,
      handleRetroAction,
      isMultiplayerEnabled,
      openLinkPhone,
    };
  },
});
</script>
<style scoped lang="scss" src="./_SwitchProfile.scss" />
