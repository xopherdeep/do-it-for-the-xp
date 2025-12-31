<template>
  <ion-page ref="beastPage">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master/compendium/bestiary"></ion-back-button>
        </ion-buttons>

        <ion-title>
          {{ updateBeast.id ? "Edit Beast" : "Add Beast" }}
        </ion-title>

        <ion-buttons slot="end">
          <ion-button
            @click="openDetailsModal"
            color="rpg"
          >
            <i class="fad fa-paw-claws fa-2x"></i>
          </ion-button>
          <XpBackgroundSelector
            :target-ref="beastPageRef"
            :initial-bg1="bg1"
            :initial-bg2="bg2"
            :aspect-ratio="aspectRatio"
            @background-changed="onBackgroundChanged"
          />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <canvas class="battle-bg fade-in"></canvas>
      <!-- Main content container with flex centering -->
      <div class="flex flex-col items-center justify-center h-full w-full p-4">
        <!-- Beast Avatar Display - Position above the card to simulate battle view -->
        <div class="beast-avatar-battle-preview">
          <ion-thumbnail
            class="cursor-pointer beast-avatar-selector beast-large-avatar rounded"
            @click="openAvatarSelector"
          >
            <ion-img
              v-if="updateBeast.avatar"
              :src="getAvatar(updateBeast.avatar)"
              class="w-full p-0 m-0"
            />
            <div
              v-else
              class="default-avatar flex items-center justify-center"
            >
              <i class="fad fa-camera fa-2x"></i>
            </div>
            <div class="avatar-overlay">
              <i class="fad fa-eye fa-2x"></i>
            </div>
          </ion-thumbnail>
        </div>

        <!-- Beast name display (simplified view when modal is closed) -->
        <div
          class="beast-name-display text-center"
          v-if="updateBeast.name"
        >
          <h2 class="text-2xl font-bold text-white text-shadow-lg">
            {{ updateBeast.name }}
          </h2>
          <div
            class="checklist-preview"
            v-if="updateBeast.checklist.length > 0"
          >
            <p class="text-white text-shadow-md">
              {{ updateBeast.checklist.length }} tasks defined
            </p>
          </div>
        </div>
        <div
          class="text-center mt-4"
          v-else
        >
          <ion-button @click="openDetailsModal">
            <i class="fad fa-plus-circle mr-1"></i>
            Define Your Beast
          </ion-button>
        </div>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-button
            @click="dismiss"
            color="rpg"
          >
            <i class="fad fa-times fa-lg mr-2" />
            Cancel
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button
            @click="validateAndSave"
            :disabled="isSaving"
            :strong="true"
            color="rpg"
          >
            <ion-spinner
              v-if="isSaving"
              name="dots"
              class="mr-1"
            ></ion-spinner>
            <span v-else>Save</span>
            <i
              class="fad fa-save fa-lg ml-2"
              v-if="!isSaving"
            />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted, ref, watch } from "vue";
import { modalController, toastController } from "@ionic/vue";
import { useRouter, useRoute } from "vue-router";
import BestiaryDb, { beastStorage, Beast } from "@/lib/databases/BestiaryDb";
import AvatarSelect from "@/components/molecules/AvatarSelect";
import XpBackgroundSelector from "@/components/molecules/BackgroundSelector/XpBackgroundSelector.vue";
import BeastDetailsModal from "./BeastDetailsModal.vue";
import ionic from "@/lib/mixins/ionic";
// Import the background manager instead of direct library imports
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
// Import debug utility
import debug from "@/lib/utils/debug";

// Define a type for ion input elements
type IonInputElement = HTMLElement & { setFocus: () => Promise<void> };

// Define a type for Ionic modal elements
type IonModalElement = HTMLElement & {
  present: () => Promise<void>;
  dismiss: () => Promise<boolean>;
  onDidDismiss: () => Promise<any>;
  onWillDismiss: () => Promise<any>;
};

// Define interface for the battle background
interface BeastPageInstance {
  bg1: number;
  bg2: number;
  aspectRatio?: number;
  enterBattle?: () => void;
}

// Interface definition for our beast to ensure type safety
interface BeastData {
  id?: string;
  name: string;
  checklist: string[];
  avatar: number;
  bg1?: number;
  bg2?: number;
  aspectRatio: number;
}

// Define a unique page identifier for this component
const PAGE_ID = "beast-editor";

export default defineComponent({
  props: {
    id: {
      type: String,
      default: undefined,
    },
  },
  name: "XpAddBeast",
  components: {
    XpBackgroundSelector,
  },
  mixins: [ionic],
  data() {
    return {
      nAvatars: 40,
      isSaving: false,
      showErrors: false,
      inputRefs: {} as Record<number, IonInputElement>,
      aspectRatio: 64,
      detailsModal: null as IonModalElement | null, // Reference to the details modal
      resizeTimeout: null as ReturnType<typeof setTimeout> | null, // For debouncing resize events
      backgroundInitialized: false, // Track if background has been initialized
    };
  },
  computed: {
    bg1() {
      return (
        this.updateBeast.bg1 ??
        (this.beastId ? 0 : Math.floor(Math.random() * 328))
      );
    },
    bg2() {
      return (
        this.updateBeast.bg2 ??
        (this.beastId ? 0 : Math.floor(Math.random() * 328))
      );
    },
    isNameValid() {
      return Boolean(
        this.updateBeast.name && this.updateBeast.name.trim().length > 0
      );
    },
    isChecklistValid() {
      return (
        Array.isArray(this.updateBeast.checklist) &&
        this.updateBeast.checklist.some(
          (item) => item && item.trim().length > 0
        )
      );
    },
    isFormValid() {
      return (
        this.isNameValid &&
        this.isChecklistValid &&
        this.updateBeast.avatar > 0
      );
    },
    beastPageRef(): BeastPageInstance {
      return {
        bg1: this.bg1,
        bg2: this.bg2,
        aspectRatio: this.aspectRatio,
        enterBattle: this.initBackground,
      };
    },
  },
  mounted() {
    // Initialize the battle background when component mounts
    this.$nextTick(() => {
      // Using nextTick ensures the DOM is ready
      this.initBackground();
      this.backgroundInitialized = true;
    });
  },
  unmounted() {
    // Only clean up if this component was the last one to initialize the background
    if (backgroundManager.isActiveFor(PAGE_ID)) {
      backgroundManager.cleanupBackground();
    }
  },
  deactivated() {
    // No need to cleanup on deactivate if we're using keep-alive
    // Just mark our background as not initialized so we can check on activation
    this.backgroundInitialized = false;
  },
  activated() {
    // Only initialize if our background isn't active anymore
    if (!backgroundManager.isActiveFor(PAGE_ID)) {
      this.$nextTick(() => {
        this.initBackground();
        this.backgroundInitialized = true;
      });
    }
  },
  methods: {
    getAvatar(id: number) {
      const pad = id.toString().padStart(3, "0");
      return require(`@/assets/images/beasts/${pad}.png`);
    },
    async dismiss() {
      // Navigate back using named route
      this.router.push({ name: 'xp-bestiary' });
    },
    clickAddItem() {
      const index = this.updateBeast.checklist.length;
      this.updateBeast.checklist.push("");

      // Focus the new input after it's rendered
      this.$nextTick(() => {
        const inputEl = this.inputRefs[index];
        if (inputEl && typeof inputEl.focus === "function") {
          inputEl.focus();
        }
      });
    },
    async validateAndSave() {
      this.showErrors = true;

      if (!this.isFormValid) {
        // Show validation error toast
        await this.presentToast({
          message: "Please fix the errors in your form",
          color: "danger",
          duration: 2000,
          position: "top",
        });

        // If avatar is missing, show prompt
        if (!this.updateBeast.avatar || this.updateBeast.avatar <= 0) {
          await this.presentToast({
            message: "Please select an avatar for your beast",
            color: "warning",
            duration: 2000,
            position: "top",
          });
        }

        return;
      }

      // Clean up empty checklist items
      this.updateBeast.checklist = this.updateBeast.checklist.filter(
        (item) => item && item.trim().length > 0
      );

      // Always update the beast with current background settings before saving
      this.updateBeast.bg1 = this.bg1;
      this.updateBeast.bg2 = this.bg2;
      this.updateBeast.aspectRatio = this.aspectRatio;

      this.isSaving = true;
      try {
        // Create a clean beast object that satisfies the Beast type
        const beastToSave: Beast = {
          id: this.updateBeast.id || "",
          name: this.updateBeast.name,
          checklist: this.updateBeast.checklist,
          avatar: this.updateBeast.avatar,
          bg1: this.updateBeast.bg1,
          bg2: this.updateBeast.bg2,
          aspectRatio: this.updateBeast.aspectRatio,
        };

        // Save the properly typed beast
        await this.bestiary.setBeast(beastToSave);
        await this.showToast();
        // Navigate back to bestiary after saving using named route
        this.router.push({ name: 'xp-bestiary' });
      } catch (error) {
        // Replace the eslint-disable comment and console.error with debug.error
        debug.error("Error saving beast:", error);
        await this.presentToast({
          message: "There was a problem saving your beast",
          color: "danger",
          duration: 3000,
          position: "top",
        });
      } finally {
        this.isSaving = false;
      }
    },
    clickTrash(index: number) {
      if (Array.isArray(this.updateBeast.checklist)) {
        this.updateBeast.checklist.splice(index, 1);
      }
    },
    async showToast() {
      await this.bestiary.showSuccessToast(
        `Beast ${this.updateBeast.id ? "Updated" : "Created"} Successfully`
      );
    },
    handleReorder(event: CustomEvent) {
      if (!Array.isArray(this.updateBeast.checklist)) return;

      // Create a safe copy of the checklist
      const items = [...this.updateBeast.checklist];
      const movedItem = items[event.detail.from];
      items.splice(event.detail.from, 1);
      items.splice(event.detail.to, 0, movedItem);

      // Update the checklist with the reordered items
      this.updateBeast.checklist = items;

      // Finish the reorder animation
      event.detail.complete();
    },
    presentToast(options: any) {
      return toastController.create(options).then((toast) => toast.present());
    },
    openAvatarSelector() {
      this.presentAvatarSelect();
    },
    async presentAvatarSelect() {
      const modal = await modalController.create({
        component: AvatarSelect,
        componentProps: {
          avatar: this.updateBeast.avatar,
          bg1: this.bg1,
          bg2: this.bg2,
        },

        cssClass: "avatar-select-modal",
        // Remove the presentingElement to ensure it takes up the full screen
      });

      modal.onDidDismiss().then(({ data }) => {
        if (data) {
          this.updateBeast.avatar = data;
          this.initBackground();
        }
      });

      return modal.present();
    },
    // Open modal with beast details
    async openDetailsModal() {
      const modal = await modalController.create({
        component: BeastDetailsModal,
        componentProps: {
          beast: this.updateBeast,
          isChecklistValid: this.isChecklistValid,
          isNameValid: this.isNameValid,
          showErrors: this.showErrors,
        },
        cssClass: "beast-details-modal",
        backdropDismiss: true,
        showBackdrop: true,
      });

      // Listen for events from the modal
      modal.onWillDismiss().then((result) => {
        if (result.data) {
          // Handle any data updates from the modal
          if (result.data.beast) {
            // Update the beast with changes from the modal
            Object.assign(this.updateBeast, result.data.beast);
          }

          if (result.data.showErrors !== undefined) {
            this.showErrors = result.data.showErrors;
          }
        }
      });

      this.detailsModal = modal;
      return modal.present();
    },

    // Initialize the battle background using our centralized background manager
    initBackground() {
      // Use the current component values which are already set correctly based on
      // whether we're editing an existing beast or creating a new one
      backgroundManager.initBackground({
        canvasSelector: "canvas.battle-bg",
        bg1: this.bg1,
        bg2: this.bg2,
        aspectRatio: this.aspectRatio,
        handleResize: true,
        page: PAGE_ID,
      });
    },

    onBackgroundChanged(bgData: {
      bg1: number;
      bg2: number;
      aspectRatio?: number;
    }) {
      backgroundManager.updateBackground({
        bg1: bgData.bg1,
        bg2: bgData.bg2,
        aspectRatio: bgData.aspectRatio ?? this.aspectRatio,
        page: PAGE_ID,
      });

      // Update the beast object with the new background settings
      this.updateBeast.bg1 = bgData.bg1;
      this.updateBeast.bg2 = bgData.bg2;
      if (bgData.aspectRatio !== undefined) {
        this.updateBeast.aspectRatio = bgData.aspectRatio;
        this.aspectRatio = bgData.aspectRatio;
      }
    },
  },
  setup(props) {
    const bestiary = new BestiaryDb(beastStorage);
    const router = useRouter();
    const route = useRoute();
    const beastId = props.id || route.params.id;
    const beastPage = ref<HTMLElement | null>(null);

    // Create a properly typed reactive beast object with all required fields initialized
    const updateBeast = reactive<BeastData>({
      id: "",
      name: "",
      checklist: [],
      avatar: 0,
      bg1: undefined,
      bg2: undefined,
      aspectRatio: 64,
    });

    onMounted(async () => {
      if (beastId) {
        try {
          const existingBeast = await bestiary.getBeastById(
            beastId as string
          );
          if (existingBeast) {
            // Copy all properties from existingBeast to updateBeast
            if (existingBeast.name) updateBeast.name = existingBeast.name;
            if (existingBeast.avatar)
              updateBeast.avatar = existingBeast.avatar;
            if (existingBeast.id) updateBeast.id = existingBeast.id;

            // Ensure checklist is always an array
            updateBeast.checklist = Array.isArray(existingBeast.checklist)
              ? [...existingBeast.checklist]
              : [];

            // Set background properties
            updateBeast.bg1 = existingBeast.bg1;
            updateBeast.bg2 = existingBeast.bg2;
            updateBeast.aspectRatio = existingBeast.aspectRatio ?? 64;
          }
        } catch (error) {
          debug.error("Error loading beast data:", error);
        }
      } else {
        // For new beasts, use query params if passed from bestiary or generate random
        const bg1Param = route.query.bg1;
        const bg2Param = route.query.bg2;

        updateBeast.bg1 = bg1Param !== undefined
          ? parseInt(bg1Param as string, 10)
          : Math.floor(Math.random() * 328);
        updateBeast.bg2 = bg2Param !== undefined
          ? parseInt(bg2Param as string, 10)
          : Math.floor(Math.random() * 328);
      }

      // Add a default checklist item if empty
      if (!updateBeast.checklist || updateBeast.checklist.length === 0) {
        updateBeast.checklist = [""];
      }
    });

    watch(
      () => updateBeast.bg1,
      () => {
        if (backgroundManager.isActiveFor(PAGE_ID)) {
          backgroundManager.updateBackground({
            bg1: updateBeast.bg1,
            bg2: updateBeast.bg2,
            aspectRatio: updateBeast.aspectRatio,
            page: PAGE_ID,
          });
        }
      }
    );

    watch(
      () => updateBeast.bg2,
      () => {
        if (backgroundManager.isActiveFor(PAGE_ID)) {
          backgroundManager.updateBackground({
            bg1: updateBeast.bg1,
            bg2: updateBeast.bg2,
            aspectRatio: updateBeast.aspectRatio,
            page: PAGE_ID,
          });
        }
      }
    );

    return {
      bestiary,
      updateBeast,
      beastPage,
      router,
      beastId,
    };
  },
});
</script>

<style lang="scss" scoped>
  @import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap");

  .fade-in {
    animation: fadeIn 1s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  .battle-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    pointer-events: none;
    background: black;
  }

  .beast-avatar-battle-preview {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
  }

  .beast-large-avatar {
    --size: 120px;
    width: var(--size);
    height: var(--size);
    margin: 0 auto;
    border-radius: 50%;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;

    &:hover {
      transform: scale(1.05);
    }
  }

  .beast-name-display {
    margin: 20px 0;
    font-family: "Press Start 2P", cursive;
  }

  .text-shadow-lg {
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
  }

  .text-shadow-md {
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  }

  .beast-avatar-selector {
    position: relative;
    border: 2px dashed #ccc;
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--ion-color-primary);

      .avatar-overlay {
        opacity: 1;
      }
    }

    .default-avatar {
      height: 100%;
      width: 100%;
      background-color: rgba(0, 0, 0, 0.1);
      color: #666;
    }

    .avatar-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      color: white;
      border-radius: 200px;
    }
  }

  ion-content {
    --background: transparent;
  }

  ion-card {
    --background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(5px);
  }

  .checklist-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }

  .checklist-item {
    --padding-start: 0;
    margin-bottom: 5px;
  }

  .avatar-item {
    --padding-start: 0;
    --padding-end: 0;
    --inner-padding-end: 0;

    &.selected-item {
      --background: rgba(var(--ion-color-primary-rgb), 0.1);
      border: 2px solid var(--ion-color-primary);
      border-radius: 8px;
    }

    .avatar-option {
      border-radius: 8px;
      overflow: hidden;
    }
  }

  .text-danger {
    color: var(--ion-color-danger);
  }

  .empty-checklist {
    border: 2px dashed #ddd;
    border-radius: 8px;
    margin: 10px 0;
  }

  .add-item-btn {
    margin-top: 0;
  }
</style>
