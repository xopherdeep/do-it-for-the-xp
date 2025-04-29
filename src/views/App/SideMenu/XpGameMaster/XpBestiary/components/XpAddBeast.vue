<template>
  <ion-page ref="beastPage">

    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button
            @click="dismiss"
            defaultHref="/game-master"
          />
        </ion-buttons>

        <ion-title> {{ beast?.id ? 'Edit Beast' : 'Add Beast' }} </ion-title>

        <ion-buttons slot="end">
          <ion-button @click="openDetailsModal" color="rpg">
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
      <canvas class="battle-bg"></canvas>
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
          <h2 class="text-2xl font-bold text-white text-shadow-lg">{{ updateBeast.name }}</h2>
          <div
            class="checklist-preview"
            v-if="updateBeast.checklist.length > 0"
          >
            <p class="text-white text-shadow-md">{{ updateBeast.checklist.length }} tasks defined</p>
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
          <ion-button @click="dismiss" color="rpg">
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
import { defineComponent, reactive, onMounted, ref } from "vue";
import { modalController, toastController } from "@ionic/vue";
import BestiaryDb, { beastStorage, Beast } from "@/lib/databases/BestiaryDb";
import AvatarSelect from "@/components/AvatarSelect";
import XpBackgroundSelector from "@/components/XpBackgroundSelector/XpBackgroundSelector.vue";
import BeastDetailsModal from "./BeastDetailsModal.vue";
import ionic from "@/mixins/ionic";
// Import the background manager instead of direct library imports
import { backgroundManager } from "@/engine/core/BackgroundManager";

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

export default defineComponent({
  props: {
    beast: {
      type: Object as () => Beast,
    },
  },
  name: "XpAddBeast",
  components: {
    XpBackgroundSelector
  },
  mixins: [ionic],
  data() {
    return {
      nAvatars: 40,
      isSaving: false,
      showErrors: false,
      inputRefs: {} as Record<number, IonInputElement>,
      // Use nullish coalescing to properly handle zero values
      bg1: this.beast?.bg1 ?? 219, 
      bg2: this.beast?.bg2 ?? 218,
      aspectRatio: this.beast?.aspectRatio ?? 64,
      detailsModal: null as IonModalElement | null, // Reference to the details modal
      resizeTimeout: null as ReturnType<typeof setTimeout> | null, // For debouncing resize events
    };
  },
  computed: {
    isNameValid() {
      return this.updateBeast.name?.trim().length > 0;
    },
    isChecklistValid() {
      return this.updateBeast.checklist.some(item => item.trim().length > 0);
    },
    isFormValid() {
      return this.isNameValid && this.isChecklistValid && (this.updateBeast.avatar || 0) > 0;
    },
    beastPageRef(): BeastPageInstance {
      return {
        bg1: this.bg1,
        bg2: this.bg2,
        aspectRatio: this.aspectRatio,
        enterBattle: this.initBackground
      }
    }
  },
  mounted() {
    // Initialize the battle background when component mounts - do it only once here
    this.initBackground();
  },
  unmounted() {
    // Clean up when component is destroyed
    backgroundManager.cleanupBackground();
  },
  deactivated() {
    // No need to cleanup on deactivate if we're using keep-alive
    // The engine should persist and continue to animate
  },
  activated() {
    // Only initialize if the background manager isn't active on this canvas
    if (!backgroundManager.getBackgroundSettings().isActive) {
      this.initBackground();
    }
  },
  methods: {
    getAvatar(id: number) {
      const pad = id.toString().padStart(3, '0')
      return require(`@/assets/images/beasts/${pad}.png`);
    },
    async dismiss() {
      await modalController.dismiss();
    },
    clickAddItem() {
      const index = this.updateBeast.checklist.length;
      this.updateBeast.checklist.push("");
      
      // Focus the new input after it's rendered
      this.$nextTick(() => {
        const inputEl = this.inputRefs[index];
        if (inputEl && typeof inputEl.focus === 'function') {
          inputEl.focus();
        }
      });
    },
    async validateAndSave() {
      this.showErrors = true;
      
      if (!this.isFormValid) {
        // Show validation error toast
        await this.presentToast({
          message: 'Please fix the errors in your form',
          color: 'danger',
          duration: 2000,
          position: 'top'
        });
        
        // If avatar is missing, show prompt
        if (!this.updateBeast.avatar) {
          await this.presentToast({
            message: 'Please select an avatar for your beast',
            color: 'warning',
            duration: 2000,
            position: 'top'
          });
        }
        
        return;
      }
      
      // Clean up empty checklist items
      this.updateBeast.checklist = this.updateBeast.checklist.filter(item => item.trim().length > 0);
      
      // Make sure bg settings are updated from component state
      // Using typeof check to handle zero values properly
      this.updateBeast.bg1 = typeof this.bg1 === 'number' ? this.bg1 : 219;
      this.updateBeast.bg2 = typeof this.bg2 === 'number' ? this.bg2 : 218;
      this.updateBeast.aspectRatio = typeof this.aspectRatio === 'number' ? this.aspectRatio : 64;
      
      this.isSaving = true;
      try {
        await this.bestiary.setBeast(this.updateBeast);
        await this.dismiss();
        await this.showToast();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error saving beast:', error);
        await this.presentToast({
          message: 'There was a problem saving your beast',
          color: 'danger',
          duration: 3000,
          position: 'top'
        });
      } finally {
        this.isSaving = false;
      }
    },
    clickTrash(index: number) {
      this.updateBeast.checklist.splice(index, 1);
    },
    async showToast() {
      await this.bestiary.showSuccessToast(`Beast ${this.beast?.id ? 'Updated' : 'Created'} Successfully`);
    },
    handleReorder(event: CustomEvent) {
      // Complete the reorder and position the item at its new location
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
      return toastController.create(options).then(toast => toast.present());
    },
    openAvatarSelector() {
      this.presentAvatarSelect();
    },
    async presentAvatarSelect() {
      const modal = await modalController.create({
        component: AvatarSelect,
        componentProps: {
          avatar: this.updateBeast.avatar,
        },
        cssClass: 'avatar-select-modal',
        // Remove the presentingElement to ensure it takes up the full screen
      });

      modal.onDidDismiss().then(({ data }) => {
        if (data) {
          this.updateBeast.avatar = data;
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
        cssClass: 'beast-details-modal',
        breakpoints: [0, 0.5, 1], // Makes it act like a bottom sheet
        initialBreakpoint: 1, // Start at 80% of the screen height
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
      // Use the beast's background settings if available, otherwise use random background
      // Check for undefined or null specifically, since 0 is a valid value
      let bg1 = typeof this.bg1 === 'number' ? this.bg1 : undefined;
      let bg2 = typeof this.bg2 === 'number' ? this.bg2 : undefined;
      
      // Only use random backgrounds if bg1 or bg2 are undefined or null
      if (bg1 === undefined || bg2 === undefined) {
        const randomBg = backgroundManager.getRandomBackground();
        bg1 = bg1 !== undefined ? bg1 : randomBg.bg1;
        bg2 = bg2 !== undefined ? bg2 : randomBg.bg2;
      }

      backgroundManager.initBackground({
        canvasSelector: "canvas.battle-bg",
        bg1,
        bg2,
        aspectRatio: this.aspectRatio,
        handleResize: true
      });
    },
    
    // Handle background changes from the selector
    onBackgroundChanged(bgData: { bg1: number, bg2: number, aspectRatio?: number }) {
      // eslint-disable-next-line no-console
      console.log('Background changed in XpAddBeast:', bgData);
      this.bg1 = bgData.bg1;
      this.bg2 = bgData.bg2;
      if (bgData.aspectRatio !== undefined) {
        this.aspectRatio = bgData.aspectRatio;
      }
      
      // Update the background with new settings
      backgroundManager.updateBackground({
        bg1: this.bg1,
        bg2: this.bg2,
        aspectRatio: this.aspectRatio
      });
      
      // Also save these values with the beast if needed
      this.updateBeast.bg1 = this.bg1;
      this.updateBeast.bg2 = this.bg2;
      this.updateBeast.aspectRatio = this.aspectRatio;
    }
  },
  setup(props) {
    const bestiary = new BestiaryDb(beastStorage);
    // Properly type the ref as an HTMLElement
    const beastPage = ref<HTMLElement | null>(null);
    
    // Use reactive to ensure it's deeply reactive
    const updateBeast = reactive({
      id: props?.beast?.id || undefined,
      name: props?.beast?.name || "",
      checklist: props?.beast?.checklist?.length ? [...props.beast.checklist] : [],
      avatar: props?.beast?.avatar || 0,
      bg1: props?.beast?.bg1 ?? 219,
      bg2: props?.beast?.bg2 ?? 218,
      aspectRatio: props?.beast?.aspectRatio ?? 48
    } as Beast & { bg1: number, bg2: number, aspectRatio: number });

    onMounted(() => {
      // Add a default checklist item if empty
      if (updateBeast.checklist.length === 0) {
        updateBeast.checklist.push("");
      }
      
      // Sync the component data bg settings with the reactive beast object
      if (props.beast) {
        // If we're editing a beast, make sure we use its background settings
        if (typeof props.beast.bg1 === 'number') updateBeast.bg1 = props.beast.bg1;
        if (typeof props.beast.bg2 === 'number') updateBeast.bg2 = props.beast.bg2;
        if (typeof props.beast.aspectRatio === 'number') updateBeast.aspectRatio = props.beast.aspectRatio;
      }
    });

    return {
      bestiary,
      updateBeast,
      beastPage
    };
  },
});
</script>

<style lang="scss" scoped>
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

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
    font-family: 'Press Start 2P', cursive;
    
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