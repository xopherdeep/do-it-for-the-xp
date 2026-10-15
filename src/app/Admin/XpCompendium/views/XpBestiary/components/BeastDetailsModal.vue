<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-buttons slot="start">
        <ion-back-button @click.stop="dismissModal"></ion-back-button>
        <i
          slot="start"
          class="fad fa-paw-claws fa-lg ml-2"
        ></i>

        <ion-title>{{ localBeast.name || "New Beast" }}</ion-title>
      </ion-buttons>

      <ion-buttons slot="end">
        <XpCloseButton @click="dismissModal" />
      </ion-buttons>
    </ion-toolbar>
    <!-- Secondary toolbar with task actions -->
    <ion-toolbar class="secondary-toolbar">
      <ion-buttons slot="start">
        <ion-button
          size="small"
          color="tertiary"
          :disabled="isGeneratingChecklist || !isNameValid"
          @click="generateChecklist"
        >
          <i
            v-if="isGeneratingChecklist"
            class="fad fa-spinner-third fa-spin mr-1"
          ></i>
          <i
            v-else-if="!isPro"
            class="fad fa-lock mr-1"
          ></i>
          <i
            v-else
            class="fad fa-sparkles mr-1"
          ></i>
          AI Tasks
        </ion-button>
        <ion-button
          size="small"
          color="tertiary"
          :disabled="isGenerating || !hasChecklistItems"
          @click="generateMonsterName"
        >
          <i
            v-if="isGenerating"
            class="fad fa-spinner-third fa-spin mr-1"
          ></i>
          <i
            v-else-if="!isPro"
            class="fad fa-lock mr-1"
          ></i>
          <i
            v-else
            class="fad fa-sparkles mr-1"
          ></i>
          AI Name
        </ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button
          size="small"
          color="primary"
          @click="clickAddItem"
        >
          <i class="fad fa-plus-circle mr-1"></i>
          Add Task
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content
    class="ion-padding beast-modal-content text-center"
    :scroll-y="false"
  >
    <canvas
      ref="bgCanvas"
      class="modal-battle-bg"
    ></canvas>
    <div class="modal-centering-container text-left">
      <ion-card class="beast-card">
        <ion-list
          lines="full"
          class="ion-no-margin"
        >
          <!-- Beast Name Section -->
          <ion-item class="mb-3 beast-name-section">
            <ion-label
              position="stacked"
              class="font-bold"
            >
              Name <span class="text-danger">*</span>
            </ion-label>
            <div class="name-input-row">
              <ion-input
                v-model="localBeast.name"
                placeholder="e.g. Kitchen Dragon"
                class="beast-name-input"
                :class="{
                  'ion-invalid': localShowErrors && !isNameValid,
                  'ion-valid': isNameValid,
                }"
                required
              />
            </div>
            <ion-note
              slot="error"
              v-if="localShowErrors && !isNameValid"
            >Please enter a name</ion-note>
          </ion-item>

          <!-- Tip explaining tasks -->
          <div class="ion-padding-horizontal py-2">
            <p class="beast-hint">
              <i class="fad fa-lightbulb-on mr-1"></i>
              Add the tasks that must be completed to defeat this beast.
            </p>
          </div>

          <!-- Checklist Header -->
          <div class="checklist-header">
            <ion-label class="font-bold mb-2 block">
              Tasks <span class="text-danger">*</span>
            </ion-label>
          </div>

          <!-- Checklist Container -->
          <div
            class="checklist-container my-2"
            :class="{ 'ion-invalid': localShowErrors && !isChecklistValid }"
          >
            <ion-reorder-group
              @ionItemReorder="handleReorder($event)"
              :disabled="false"
            >
              <ion-item-sliding
                v-for="(item, index) in localBeast.checklist"
                :key="index"
              >
                <ion-item-options side="start">
                  <ion-item-option
                    color="danger"
                    @click="clickTrash(index)"
                  >
                    <i class="fad fa-trash-alt fa-lg mx-1"></i>
                    Remove
                  </ion-item-option>
                </ion-item-options>

                <ion-item class="checklist-item">
                  <i
                    class="fad fa-grip-lines-vertical slide-hint"
                    slot="start"
                  ></i>

                  <i
                    class="ml-2 fad fa-shield-check task-icon"
                    slot="start"
                  ></i>

                  <ion-textarea
                    v-model="localBeast.checklist[index]"
                    @keyup.enter="clickAddItem"
                    placeholder="Describe task to complete"
                    :ref="(el) => {
                        if (el) inputRefs[index] = el;
                      }
                        "
                    class="checklist-input"
                    :auto-grow="true"
                    :rows="1"
                  />

                  <ion-reorder
                    slot="end"
                    class="reorder-handle"
                  >
                    <i class="fad fa-grip-lines"></i>
                  </ion-reorder>
                </ion-item>
              </ion-item-sliding>
            </ion-reorder-group>

            <ion-note
              slot="error"
              class="ion-padding-start"
              v-if="localShowErrors && !isChecklistValid"
            >
              Please add at least one task
            </ion-note>
          </div>

          <!-- Empty State -->
          <div
            class="empty-checklist text-center py-4"
            v-if="localBeast.checklist.length === 0"
          >
            <i class="fad fa-clipboard-list fa-2x text-gray-400 mb-2"></i>
            <p class="text-gray-500">No tasks added yet</p>
            <ion-button
              size="small"
              class="mt-2"
              @click="clickAddItem"
            >
              <i class="fad fa-plus-circle mr-1"></i> Add First Task
            </ion-button>
          </div>
        </ion-list>
      </ion-card>
    </div>
  </ion-content>

  <ion-footer>
    <ion-toolbar class="rpg-box">
      <ion-buttons slot="start">
        <ion-button
          @click="dismissModal"
          color="danger"
        >
          <i class="fad fa-times fa-lg mr-2" />
          Cancel
        </ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button
          @click="saveChanges"
          color="success"
          strong
        >
          <i class="fad fa-save fa-lg mr-2" />
          Save
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, reactive, computed, nextTick, onMounted, onUnmounted } from "vue";
import { modalController, toastController, alertController } from "@ionic/vue";
import { close } from "ionicons/icons";
import { Beast } from "@/lib/databases/BestiaryDb";
import Ionic from "@/lib/mixins/ionic";
import { generateMonsterName, generateChecklistFromName, isGeminiConfigured } from "@/lib/services/ai/GeminiService";
import { useProStore } from "@/lib/store/stores/pro";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import { useTimers } from "@/hooks/useTimers";

const PAGE_ID = "beast-details-modal";

// Type for ion input refs
type IonInputElement = HTMLElement & { setFocus: () => Promise<void> };

export default defineComponent({
  name: "BeastDetailsModal",
  mixins: [Ionic],
  components: {
    XpCloseButton,
  },
  props: {
    beast: {
      type: Object as PropType<Beast>,
      required: true,
    },
    showErrors: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const timers = useTimers();
    const inputRefs = ref<Record<number, IonInputElement>>({});

    // Create a local copy of the beast to work with
    const localBeast = reactive<Beast>({
      ...props.beast,
      checklist: [...props.beast.checklist],
    });

    // Track errors locally
    const localShowErrors = ref(props.showErrors);

    // Canvas ref for direct DOM access
    const bgCanvas = ref<HTMLCanvasElement | null>(null);

    // Initialize the beast's background on mount
    onMounted(() => {
      // Wait for DOM to be ready with the canvas
      nextTick(() => {
        if (bgCanvas.value) {
          // Use beast's bg1/bg2 with full aspect ratio (0 = full screen)
          backgroundManager.initBackground({
            canvasElement: bgCanvas.value,
            bg1: localBeast.bg1 ?? 0,
            bg2: localBeast.bg2 ?? 0,
            aspectRatio: 0, // Full screen - no letterbox
            handleResize: true,
            page: PAGE_ID,
          });
        }
      });
    });

    // Cleanup background on unmount
    onUnmounted(() => {
      if (backgroundManager.isActiveFor(PAGE_ID)) {
        backgroundManager.cleanupBackground();
      }
    });

    // AI generation state
    const isGenerating = ref(false);
    const isGeneratingChecklist = ref(false);

    // Computed properties for validation - names need to be unique to avoid conflicts
    const isNameValid = computed(() => {
      return localBeast.name?.trim().length > 0;
    });

    const isChecklistValid = computed(() => {
      return localBeast.checklist.some((item) => item.trim().length > 0);
    });

    // Check if we have valid checklist items for AI generation
    const hasChecklistItems = computed(() => {
      return localBeast.checklist.some((item) => item.trim().length > 0);
    });

    const clickAddItem = () => {
      const index = localBeast.checklist.length;
      localBeast.checklist.push("");

      // Focus the new input after it's rendered
      // Use nextTick + setTimeout for Ionic component hydration
      nextTick(() => {
        timers.startTimeout(50, () => {
          const inputEl = inputRefs.value[index];
          const canFocusInput =
            inputEl && typeof inputEl.setFocus === "function";
          if (canFocusInput) {
            inputEl.setFocus();
          } else {
            // Retry once more after additional delay for slow renders
            timers.startTimeout(150, () => {
              const retryEl = inputRefs.value[index];
              const canFocusRetryInput =
                retryEl && typeof retryEl.setFocus === "function";
              if (canFocusRetryInput) {
                retryEl.setFocus();
              }
            });
          }
        });
      });
    };

    const clickTrash = (index: number) => {
      // Slide-to-delete is intentional, no confirmation needed
      localBeast.checklist.splice(index, 1);
    };

    const handleReorder = (event: CustomEvent) => {
      // Get the reorder indices
      const { from, to } = event.detail;
      
      // Tell Ionic NOT to move DOM elements - Vue's reactivity will handle it
      // Pass false to revert Ionic's visual movement since Vue will re-render
      event.detail.complete(false);
      
      // Now update the reactive array - Vue will update the DOM correctly
      const movedItem = localBeast.checklist.splice(from, 1)[0];
      localBeast.checklist.splice(to, 0, movedItem);
    };

    const dismissModal = () => {
      return modalController.dismiss();
    };

    const saveChanges = () => {
      // Validate form first
      localShowErrors.value = true;

      const isFormInvalid = !isNameValid.value || !isChecklistValid.value;
      if (isFormInvalid) {
        // You could show a toast here if needed
        return;
      }

      // Clean up empty checklist items
      localBeast.checklist = localBeast.checklist.filter(
        (item) => item.trim().length > 0
      );

      // Return the updated beast and state via the dismiss method
      return modalController.dismiss({
        beast: localBeast,
        showErrors: localShowErrors.value,
      });
    };

    // AI-powered monster name generation based on checklist
    const pro = useProStore();
    const isPro = computed(() => pro.isPro);

    const clickGenerateMonsterName = async () => {
      if (!(await pro.requirePro("aiHelpers"))) return;
      if (!hasChecklistItems.value) {
        const toast = await toastController.create({
          message: "Add some checklist items first!",
          duration: 2000,
          color: "warning",
          position: "top",
        });
        await toast.present();
        return;
      }

      // Confirmation prompt
      const alert = await alertController.create({
        header: "Generate Name?",
        message: "This will replace the current name with an AI-generated one.",
        buttons: [
          { text: "Cancel", role: "cancel" },
          {
            text: "Generate",
            handler: async () => {
              isGenerating.value = true;
              try {
                // Filter out empty checklist items
                const validItems = localBeast.checklist.filter((item) => item.trim().length > 0);

                const result = await generateMonsterName({ checklistItems: validItems });

                if (result.success && result.name) {
                  localBeast.name = result.name;

                  const toast = await toastController.create({
                    message: `✨ Generated: ${result.name}`,
                    duration: 2000,
                    color: "success",
                    position: "top",
                  });
                  await toast.present();
                } else {
                  const toast = await toastController.create({
                    message: result.error || "Failed to generate name",
                    duration: 3000,
                    color: "danger",
                    position: "top",
                  });
                  await toast.present();
                }
              } catch (error) {
                console.error("Error generating monster name:", error);
                const toast = await toastController.create({
                  message: "Something went wrong. Please try again.",
                  duration: 3000,
                  color: "danger",
                  position: "top",
                });
                await toast.present();
              } finally {
                isGenerating.value = false;
              }
            },
          },
        ],
      });

      await alert.present();
    };

    // AI-powered checklist generation from monster name
    const clickGenerateChecklist = async () => {
      if (!(await pro.requirePro("aiHelpers"))) return;
      if (!isNameValid.value) {
        const toast = await toastController.create({
          message: "Enter a monster name first!",
          duration: 2000,
          color: "warning",
          position: "top",
        });
        await toast.present();
        return;
      }

      // Confirmation prompt
      const alert = await alertController.create({
        header: "Generate Tasks?",
        message: "This will replace the current task list with AI-generated tasks.",
        buttons: [
          { text: "Cancel", role: "cancel" },
          {
            text: "Generate",
            handler: async () => {
              isGeneratingChecklist.value = true;
              try {
                const result = await generateChecklistFromName({ monsterName: localBeast.name });

                if (result.success && result.checklist) {
                  // Replace or append to existing checklist
                  localBeast.checklist = result.checklist;

                  const toast = await toastController.create({
                    message: `✨ Generated ${result.checklist.length} tasks!`,
                    duration: 2000,
                    color: "success",
                    position: "top",
                  });
                  await toast.present();
                } else {
                  const toast = await toastController.create({
                    message: result.error || "Failed to generate checklist",
                    duration: 3000,
                    color: "danger",
                    position: "top",
                  });
                  await toast.present();
                }
              } catch (error) {
                console.error("Error generating checklist:", error);
                const toast = await toastController.create({
                  message: "Something went wrong. Please try again.",
                  duration: 3000,
                  color: "danger",
                  position: "top",
                });
                await toast.present();
              } finally {
                isGeneratingChecklist.value = false;
              }
            },
          },
        ],
      });

      await alert.present();
    };

    return {
      inputRefs,
      localBeast,
      localShowErrors,
      bgCanvas,
      // Use our computed properties instead of props
      isNameValid,
      isChecklistValid,
      hasChecklistItems,
      isGenerating,
      isGeneratingChecklist,
      isGeminiConfigured: isGeminiConfigured(),
      isPro,
      clickAddItem,
      clickTrash,
      handleReorder,
      dismissModal,
      saveChanges,
      generateMonsterName: clickGenerateMonsterName,
      generateChecklist: clickGenerateChecklist,
      close, // Icon for close button
    };
  },
});
</script>

<style lang="scss" scoped src="./_BeastDetailsModal.scss" />
