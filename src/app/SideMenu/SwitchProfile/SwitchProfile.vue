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
      <!-- Empty State -->
      <div v-if="users.length === 0" class="empty-state">
        <i class="fad fa-users-slash fa-4x" />
        <h2 class="earthbound-title">No Adventurers Yet!</h2>
        <p>Tap the + button below to create your first profile.</p>
      </div>

      <!-- Card View (Default) -->
      <ion-row v-else-if="!isRetroView" class="md:hidden profile-grid"
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
    </ion-grid>

    <!-- Left FAB: Toggle Grid / List View -->
    <ion-fab vertical="bottom" horizontal="start" slot="fixed" class="ion-no-border md:hidden retro-fab">
      <ion-fab-button @click="isRetroView = !isRetroView">
        <ion-icon :icon="isRetroView ? gridOutline : listOutline"></ion-icon>
      </ion-fab-button>
    </ion-fab>

    <!-- Center FAB: Add Profile -->
    <ion-fab vertical="bottom" horizontal="center" slot="fixed" @click="openNewProfileModal"
      class="ion-no-border md:hidden fab-pulse">
      <ion-fab-button color="danger">
        <i class="fad fa-plus fa-2x"></i>
      </ion-fab-button>
    </ion-fab>

    <!-- Right FAB: Backup Options -->
    <ion-fab vertical="bottom" horizontal="end" slot="fixed" class="ion-no-border md:hidden retro-fab">
      <ion-fab-button @click="openBackupOptionsModal">
        <ion-icon :icon="cloudDownloadOutline"></ion-icon>
      </ion-fab-button>
    </ion-fab>

    <!-- Toast for restore success -->
    <ion-toast :is-open="showRestoreToast" :message="restoreMessage" :duration="3000"
      :color="restoreSuccess ? 'success' : 'warning'" position="top" @didDismiss="showRestoreToast = false"></ion-toast>
  </xp-rpg-page>
</template>

<script lang="ts">
import {
  toastController,
  useIonRouter,
  onIonViewWillEnter,
  onIonViewDidLeave,
  alertController,
  actionSheetController,
} from "@ionic/vue";
import { useUserStore } from "@/lib/store/stores/user";
import { useAudioStore } from "@/lib/store/stores/audio";
import { computed, defineComponent, ref, onUnmounted } from "vue";
import {
  peopleCircleSharp,
  peopleCircleOutline,
  fingerPrintOutline,
  fingerPrintSharp,
  cloudDownloadOutline,
  cloudUploadOutline,
  saveOutline,
  gridOutline,
  listOutline,
} from "ionicons/icons";
import User from "@/lib/utils/User";
import { profileStorage } from "@/lib/databases/profileStorage";
import { modalController } from "@ionic/vue";
import { ProfileDb } from "@/lib/databases";
import AddProfile from "./AddProfile/AddProfile.vue";
import ProfileLoadingModal from "../../../components/templates/modals/ProfileLoadingModal.vue";
import XpGp from "@/components/atoms/Currency/XpGp.vue";
import XpProfileCard from "@/components/molecules/XpProfileCard/XpProfileCard.vue";
import XpRpgMenu from "@/components/molecules/RpgMenu/XpRpgMenu.vue";
import DialPad from "./DialPad.vue";
import ionic from "@/lib/mixins/ionic";
import { FOOD_OPTIONS, JOB_CLASS_OPTIONS } from "@/constants";
import debug from "@/lib/utils/debug";
import { needsGameMasterPasscode } from "@/router/_Guards/gm.guard";
import { heroAvatarSrc } from "@/lib/hero-look/look";
import XpRpgPage from "@/components/templates/pages/XpRpgPage.vue";

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
    XpRpgMenu,
    XpRpgPage
  },
  mixins: [ionic],
  setup() {
    // State management
    // State management
    const isLoading = ref(false); // For initial list loading
    const userStore = useUserStore();
    const audioStore = useAudioStore();
    const ionRouter = useIonRouter();
    const storage = new ProfileDb(profileStorage);

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

    // Backup and restore functions
    const exportProfiles = async () => {
      try {
        const fileName = await storage.exportProfiles();
        const toast = await toastController.create({
          message: `Profiles exported to ${fileName}`,
          duration: 3000,
          color: "success",
          position: "top",
        });
        await toast.present();
      } catch (error) {
        const toast = await toastController.create({
          message: `Failed to export profiles: ${errorText(error)}`,
          duration: 3000,
          color: "danger",
          position: "top",
        });
        await toast.present();
      }
    };

    const importProfiles = async () => {
      // Create a file input element
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "application/json";

      fileInput.addEventListener("change", async (event: any) => {
        const file = event.target.files[0];
        if (file) {
          try {
            const reader = new FileReader();
            reader.onload = async (e) => {
              try {
                const content = e.target?.result as string;
                const success = await storage.importProfiles(content);

                if (success) {
                  await userStore.loadUsers();
                  const toast = await toastController.create({
                    message: "Profiles imported successfully",
                    duration: 3000,
                    color: "success",
                    position: "top",
                  });
                  await toast.present();
                }
              } catch (err) {
                const toast = await toastController.create({
                  message: `Failed to import profiles: ${errorText(err)}`,
                  duration: 3000,
                  color: "danger",
                  position: "top",
                });
                await toast.present();
              }
            };
            reader.readAsText(file);
          } catch (error) {
            const toast = await toastController.create({
              message: `Failed to read file: ${errorText(error)}`,
              duration: 3000,
              color: "danger",
              position: "top",
            });
            await toast.present();
          }
        }
      });

      fileInput.click();
    };

    // Options modal
    const openBackupOptionsModal = async () => {
      const actionSheet = await actionSheetController.create({
        header: "Profile Backup Options",
        mode: "ios",
        buttons: [
          {
            text: "Export Profiles",
            icon: saveOutline,
            handler: () => {
              exportProfiles();
            },
          },
          {
            text: "Import Profiles",
            icon: cloudUploadOutline,
            handler: () => {
              importProfiles();
            },
          },
          {
            text: "Restore From Backup",
            icon: cloudDownloadOutline,
            handler: async () => {
              const alert = await alertController.create({
                header: "Restore Profiles",
                message:
                  "This will replace all current profiles with those from your last backup. Continue?",
                buttons: [
                  {
                    text: "Cancel",
                    role: "cancel",
                  },
                  {
                    text: "Restore",
                    handler: async () => {
                      try {
                        isRestoringProfiles.value = true;
                        const restored = await storage.restoreProfiles();

                        if (restored) {
                          await userStore.loadUsers();
                          restoreSuccess.value = true;
                          restoreMessage.value =
                            "Successfully restored your profiles!";
                        } else {
                          restoreSuccess.value = false;
                          restoreMessage.value =
                            "No backup found to restore.";
                        }

                        showRestoreToast.value = true;
                      } catch (error) {
                        restoreSuccess.value = false;
                        restoreMessage.value = `Restore failed: ${errorText(error)}`;
                        showRestoreToast.value = true;
                      } finally {
                        isRestoringProfiles.value = false;
                      }
                    },
                  },
                ],
              });

              await alert.present();
            },
          },
          {
            text: "Cancel",
            role: "cancel",
          },
        ],
      });

      await actionSheet.present();
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

        // Then navigate to their home page
        await ionRouter.navigate(
          `/my-portal/${profile.id}/my-home`,
          "root"
        );
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
        // If profile created successfully
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
      handleRefresh,
      fingerPrintOutline,
      fingerPrintSharp,
      cloudDownloadOutline,
      restoreMessage,
      restoreSuccess,
      showRestoreToast,
      openBackupOptionsModal,
      isRetroView,
      gridOutline,
      listOutline,
      retroMenuActions,
      handleRetroAction,
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
  }

  #container strong {
    font-size: 20px;
    line-height: 26px;
  }

  #container p {
    font-size: 16px;
    line-height: 22px;
    color: #8c8c8c;
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

// Empty state styles
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1.5rem;
  gap: 1rem;

  i {
    color: rgba(255, 255, 255, 0.4);
  }

  h2 {
    margin: 0;
    color: #f7e8a8;
    font-size: 1.5rem;
  }

  p {
    margin: 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 1rem;
  }
}

// Retro view - Earthbound save slots
.retro-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-bottom: 96px; // Space for bottom FABs
}

.eb-window {
  border-radius: 1px;
  background-color: #280828;
  color: #f7e8a8;
  font-family: "Apple Kid", "StatusPlz", monospace;
  box-shadow:
    0 0 0 5px #383050,
    0 0 0 10px #68d0b8,
    0 0 0 12px #f7e8a8,
    0 0 0 16px #3d3c55;
  margin: 16px 16px 24px 16px;
  width: calc(100% - 32px);
  overflow: hidden;

  .eb-window-header {
    background: #383050;
    padding: 8px 14px;
    border-bottom: 3px solid #68d0b8;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .eb-window-title {
      font-family: "Twoson", "Apple Kid", sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: 2px;
      color: #f7e8a8;
      text-transform: uppercase;
    }

    .eb-window-sub {
      font-family: "StatusPlz", monospace;
      font-size: 0.8rem;
      letter-spacing: 1.5px;
      color: #68d0b8;
      text-transform: uppercase;
    }
  }

  .eb-slots-list {
    display: flex;
    flex-direction: column;
  }

  .eb-file-slot {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-bottom: 2px dashed rgba(104, 208, 184, 0.25);
    cursor: pointer;
    position: relative;
    background: transparent;
    transition: background-color 0.15s ease;
    -webkit-tap-highlight-color: transparent;

    &:last-child {
      border-bottom: none;
    }

    &:hover,
    &:focus-visible,
    &:active {
      background-color: rgba(255, 255, 255, 0.08);
      outline: none;

      .eb-cursor {
        opacity: 1;
        transform: translateX(2px);
      }
    }

    .eb-cursor {
      font-family: "Apple Kid", monospace;
      font-size: 1.2rem;
      color: #f7e8a8;
      opacity: 0.3;
      transition: opacity 0.15s ease, transform 0.15s ease;
      width: 12px;
      flex-shrink: 0;
    }

    .eb-slot-tag {
      font-family: "StatusPlz", monospace;
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 1px;
      color: #68d0b8;
      flex-shrink: 0;
      min-width: 24px;
      text-align: center;
    }

    .eb-slot-avatar-frame {
      width: 44px;
      height: 44px;
      border-radius: 4px;
      border: 2px solid #68d0b8;
      background: #383050;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 0 0 1px #280828;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        image-rendering: pixelated;
      }

      i {
        font-size: 1.3rem;
        color: #f7e8a8;
      }

      &.eb-new-avatar {
        border-color: #f7e8a8;
        background: #280828;

        i {
          color: #68d0b8;
        }
      }
    }

    .eb-slot-details {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;

      .eb-slot-name-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .eb-slot-hero-name {
        font-family: "Apple Kid", sans-serif;
        font-size: 1.35rem;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .eb-slot-meta-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: "StatusPlz", monospace;
        font-size: 0.85rem;
        color: #f7e8a8;
        opacity: 0.9;
      }

      .eb-slot-desc {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.8rem;
      }
    }

    .eb-slot-badge-column {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;

      .eb-lvl-pill {
        font-family: "Apple Kid", sans-serif;
        font-size: 1.15rem;
        font-weight: 700;
        color: #68d0b8;
        display: flex;
        align-items: baseline;
        gap: 2px;

        small {
          font-size: 0.75rem;
          opacity: 0.8;
          letter-spacing: 1px;
        }
      }

      .eb-gp-pill {
        font-family: "Twoson", "Apple Kid", monospace;
        font-size: 0.95rem;
        font-weight: 700;
        color: #f7e8a8;
        display: flex;
        align-items: center;
        gap: 4px;

        i {
          font-size: 0.8rem;
          color: #f59e0b;
        }
      }

      .eb-new-arrow {
        font-size: 1.2rem;
        color: #68d0b8;
      }
    }
  }
}

// Retro FAB controls (SNES / Earthbound arcade style)
.retro-fab {
  ion-fab-button {
    --background: #280828;
    --color: #f7e8a8;
    --border-radius: 50%;
    border: 3px solid #68d0b8;
    box-shadow:
      0 0 0 2px #383050,
      0 4px 10px rgba(0, 0, 0, 0.6);
    transition: transform 0.15s ease;

    ion-icon {
      font-size: 1.4rem;
      color: #f7e8a8;
    }

    &:active {
      transform: scale(0.92);
    }
  }
}

// Profile grid spacing
.profile-grid {
  padding-bottom: 80px; // Space for FAB
}

// Profile card column - adds spacing between cards
.profile-card-col {
  padding: 8px !important;
  display: flex;
  flex-direction: column;
}

// FAB pulse animation
.fab-pulse {
  ion-fab-button {
    animation: fab-pulse 2s infinite;
    border-radius: 50%;
  }
}

@keyframes fab-pulse {

  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(var(--ion-color-danger-rgb), 0.6);
  }

  50% {
    box-shadow: 0 0 0 12px rgba(var(--ion-color-danger-rgb), 0);
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

// Game Master (parent) badge next to the name in the list view; colors match XpProfileCard's
// (earthbound pale-yellow, medium-purple and slate)
.gm-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-left: 0.5rem;
  padding: 0.1rem 0.5rem;
  border: 2px solid #383050;
  border-radius: 999px;
  background: #f7e8a8;
  color: #3d3c55;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1.2;
  vertical-align: middle;

  i {
    font-size: 0.8em;
    --fa-primary-color: #3d3c55;
    --fa-secondary-color: #383050;
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
