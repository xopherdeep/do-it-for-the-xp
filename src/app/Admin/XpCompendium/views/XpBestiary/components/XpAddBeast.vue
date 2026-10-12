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
          <ion-button @click="openDetailsModal" color="rpg" title="AI name and tasks" aria-label="AI name and tasks">
            <i class="fad fa-paw-claws fa-2x" aria-hidden="true"></i>
          </ion-button>
          <XpBackgroundSelector :target-ref="beastPageRef" :initial-bg1="bg1" :initial-bg2="bg2"
            :aspect-ratio="aspectRatio" @background-changed="onBackgroundChanged" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <canvas ref="battleCanvas" class="battle-bg fade-in"></canvas>
      <div class="beast-editor">
        <!-- Beast Avatar Display - Position above the card to simulate battle view -->
        <div class="beast-avatar-battle-preview">
          <ion-thumbnail class="cursor-pointer beast-avatar-selector beast-large-avatar rounded"
            @click="openAvatarSelector">
            <ion-img v-if="updateBeast.avatar" :src="getAvatar(updateBeast.avatar)" class="w-full p-0 m-0" />
            <div v-else class="default-avatar flex items-center justify-center">
              <i class="fad fa-camera fa-2x"></i>
            </div>
            <div class="avatar-overlay">
              <i class="fad fa-eye fa-2x"></i>
            </div>
          </ion-thumbnail>
        </div>

        <section class="beast-form" aria-label="Beast details">
          <label class="beast-field-label" for="beast-name-input">
            Name <span class="beast-required" aria-hidden="true">*</span>
          </label>
          <ion-input id="beast-name-input" v-model="updateBeast.name" class="beast-input"
            :class="{ 'is-invalid': showErrors && !isNameValid }" placeholder="e.g. Kitchen Dragon"
            aria-label="Beast name" enterkeyhint="next" @keydown.enter.prevent="focusTask(0)" />
          <p class="beast-error" role="alert" v-if="showErrors && !isNameValid">Please enter a name</p>

          <div class="beast-field-head">
            <span class="beast-field-label">
              Tasks <span class="beast-required" aria-hidden="true">*</span>
            </span>
            <span class="beast-task-count">{{ filledTaskCount }} defined</span>
          </div>
          <p class="beast-hint">Each task is a chore to finish to defeat this beast.</p>

          <ol class="beast-tasks" :class="{ 'is-invalid': showErrors && !isChecklistValid }">
            <li class="beast-task" v-for="(item, index) in updateBeast.checklist" :key="index">
              <span class="beast-task-num" aria-hidden="true">{{ index + 1 }}</span>
              <ion-textarea v-model="updateBeast.checklist[index]" class="beast-input beast-task-input"
                :ref="(el) => setInputRef(el, index)" placeholder="Describe the task" :aria-label="`Task ${index + 1}`"
                :auto-grow="true" :rows="1" enterkeyhint="next" @keydown.enter.exact.prevent="onTaskEnter(index)" />
              <div class="beast-task-actions">
                <button type="button" class="beast-icon-btn beast-move-btn" :disabled="index === 0"
                  :aria-label="`Move task ${index + 1} up`" @click="moveItem(index, -1)">
                  <i class="fad fa-chevron-up" aria-hidden="true"></i>
                </button>
                <button type="button" class="beast-icon-btn beast-move-btn"
                  :disabled="index === updateBeast.checklist.length - 1" :aria-label="`Move task ${index + 1} down`"
                  @click="moveItem(index, 1)">
                  <i class="fad fa-chevron-down" aria-hidden="true"></i>
                </button>
              </div>
              <button type="button" class="beast-icon-btn beast-remove-btn" :aria-label="`Remove task ${index + 1}`"
                @click="clickTrash(index)">
                <i class="fad fa-trash-alt" aria-hidden="true"></i>
              </button>
            </li>
          </ol>
          <p class="beast-empty" v-if="updateBeast.checklist.length === 0">No tasks yet.</p>
          <p class="beast-error" role="alert" v-if="showErrors && !isChecklistValid">Please add at least one task</p>

          <div class="beast-form-actions">
            <ion-button size="small" color="rpg" @click="clickAddItem">
              <i class="fad fa-plus-circle mr-1" aria-hidden="true"></i>
              Add task
            </ion-button>
            <ion-button size="small" fill="outline" color="rpg" @click="openDetailsModal">
              <i class="fad fa-sparkles mr-1" aria-hidden="true"></i>
              AI name &amp; tasks
            </ion-button>
          </div>
        </section>
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
          <ion-button @click="validateAndSave" :disabled="isSaving" :strong="true" color="rpg">
            <ion-spinner v-if="isSaving" name="dots" class="mr-1"></ion-spinner>
            <span v-else>Save</span>
            <i class="fad fa-save fa-lg ml-2" v-if="!isSaving" />
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

// What a task field offers for focus: the ion-textarea component has setFocus, a bare element only focus
type TaskField = { setFocus?: () => Promise<void>; focus?: () => void };

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
      inputRefs: {} as Record<number, TaskField>,
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
    filledTaskCount(): number {
      return this.updateBeast.checklist.filter((item) => item && item.trim().length > 0).length;
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
      return require(`@/assets/images/beasts/${pad}.webp`);
    },
    async dismiss() {
      // Navigate back using named route
      this.router.push({ name: 'xp-bestiary' });
    },
    clickAddItem() {
      const index = this.updateBeast.checklist.length;
      this.updateBeast.checklist.push("");
      this.focusTask(index);
    },
    // A ref on an Ionic component hands back the Vue wrapper; setFocus lives on the element it renders ($el)
    setInputRef(el: unknown, index: number) {
      const field = (el as { $el?: unknown } | null)?.$el ?? el;
      if (field) this.inputRefs[index] = field as TaskField;
      else delete this.inputRefs[index];
    },
    // Ionic hydrates a field a moment after Vue renders it, so wait a beat before focusing
    focusTask(index: number) {
      this.$nextTick(() => {
        setTimeout(() => {
          const field = this.inputRefs[index];
          if (typeof field?.setFocus === "function") field.setFocus();
          else if (typeof field?.focus === "function") field.focus();
        }, 50);
      });
    },
    // Enter on a task moves on to the next one, or starts a new one after the last; a blank task starts nothing
    onTaskEnter(index: number) {
      const tasks = this.updateBeast.checklist;
      if (!tasks[index]?.trim()) return;
      if (index < tasks.length - 1) this.focusTask(index + 1);
      else this.clickAddItem();
    },
    moveItem(index: number, step: -1 | 1) {
      const tasks = this.updateBeast.checklist;
      const target = index + step;
      if (target < 0 || target >= tasks.length) return;
      [tasks[index], tasks[target]] = [tasks[target], tasks[index]];
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
      return toastController
        .create({ position: "top", cssClass: "rpg-toast", ...options })
        .then((toast) => toast.present());
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
        // Always restore the background after modal closes (even on cancel)
        // The AvatarSelect modal takes over the background manager, so we need to reclaim it
        this.$nextTick(() => {
          this.initBackground();
        });

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
      // Use ref-based canvas element to avoid incorrect querySelector results
      // when multiple canvas elements exist in the DOM (e.g., from Ionic page stacking)
      const canvasEl = this.$refs.battleCanvas as HTMLCanvasElement | undefined;

      backgroundManager.initBackground({
        canvasElement: canvasEl,
        canvasSelector: canvasEl ? undefined : "canvas.battle-bg", // Fallback only if ref unavailable
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

.beast-editor {
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  padding: 16px 16px 24px;
}

// The name and tasks sit in an Earthbound window: dark purple, cream text, a doubled border
.beast-form {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: calc(100% - 12px);
  max-width: 560px;
  margin: 0 6px;
  padding: 14px 12px 16px;
  background: #280828;
  color: #e7e6b3;
  border: 3px solid #f7e8a8;
  border-radius: 2px;
  box-shadow: 0 0 0 3px #383050, 0 0 0 5px #68d0b8;
  font-family: "Apple Kid", sans-serif;
  font-size: 16px;
}

.beast-field-label {
  display: block;
  margin-bottom: 6px;
  font-family: "StatusPlz", sans-serif;
  font-size: 14px;
  color: #f7e8a8;
}

.beast-required {
  color: #ff9f8f;
}

.beast-field-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 18px;

  .beast-field-label {
    margin-bottom: 0;
  }
}

.beast-task-count {
  font-family: "StatusPlz", sans-serif;
  font-size: 12px;
  color: #68d0b8;
}

.beast-hint {
  margin: 4px 0 10px;
  font-size: 15px;
  opacity: 0.85;
}

.beast-input {
  --background: #1a0a1a;
  --color: #e7e6b3;
  --placeholder-color: #b9b88c;
  --placeholder-opacity: 1;
  --padding-start: 10px;
  --padding-end: 10px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  box-sizing: border-box;
  min-height: 44px;
  border: 2px solid #3d3c55;
  border-radius: 2px;
  font-family: "Apple Kid", sans-serif;
  font-size: 18px;

  &:focus-within {
    border-color: #68d0b8;
  }

  &.is-invalid {
    border-color: #ff9f8f;
  }
}

.beast-tasks {
  margin: 0;
  padding: 0;
  list-style: none;

  &.is-invalid {
    outline: 2px solid #ff9f8f;
    outline-offset: 4px;
  }
}

.beast-task {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 8px;
}

.beast-task-num {
  flex: 0 0 22px;
  height: 50px;
  line-height: 50px;
  text-align: center;
  font-family: "StatusPlz", sans-serif;
  font-size: 14px;
  color: #68d0b8;
}

.beast-task-input {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 50px;
}

.beast-task-actions {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 2px;
}

.beast-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 24px;
  padding: 0;
  background: #383050;
  color: #f7e8a8;
  border: 2px solid #3d3c55;
  border-radius: 2px;
  font-size: 12px;
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid #68d0b8;
    outline-offset: 1px;
  }
}

.beast-remove-btn {
  flex: 0 0 auto;
  min-width: 40px;
  height: 50px;
  color: #ff9f8f;
  font-size: 16px;
}

.beast-error {
  margin: 6px 0 0;
  color: #ff9f8f;
}

.beast-empty {
  margin: 4px 0 8px;
  opacity: 0.8;
}

.beast-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;

  ion-button {
    margin: 0;
  }
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
