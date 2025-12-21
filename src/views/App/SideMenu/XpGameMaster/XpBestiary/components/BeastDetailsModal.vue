<template>

  <ion-header>
    <ion-toolbar class="rpg-box">
      <i
        slot="start"
        class="fad fa-paw-claws fa-lg ml-2"
      ></i>

      <ion-title>Beast Details</ion-title>
      <ion-buttons slot="end">
        <ion-button
          @click="dismissModal"
          color="rpg"
        >
          <ion-icon :icon="close"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding bg-slide">
    <ion-card>
      <div class="flex mb-4">
        <div class="text-center w-full">
          <h2 class="text-xl mb-2">Beasts are themed checklists that make tasks more fun!</h2>
          <p class="text-sm text-gray-600">Give your beast a creative name like "Kitchen Dragon" or "Laundry
            Kraken", then add specific tasks to complete.</p>
        </div>
      </div>

      <ion-list
        lines="full"
        class="ion-no-margin"
      >
        <!-- Beast Name Section -->
        <ion-item class="mb-3">
          <ion-label
            position="stacked"
            class="font-bold"
          >
            Beast Name <span class="text-danger">*</span>
          </ion-label>
          <ion-input
            v-model="localBeast.name"
            placeholder="Enter a memorable name"
            :class="{'ion-invalid': localShowErrors && !isNameValid, 'ion-valid': isNameValid}"
            required
          />
          <ion-note
            slot="error"
            v-if="localShowErrors && !isNameValid"
          >Please enter a name for your beast</ion-note>
        </ion-item>

        <!-- Checklist Section -->
        <div class="checklist-header ion-padding-top">
          <ion-label class="font-bold mb-2 block">
            Checklist Items <span class="text-danger">*</span>
            <p class="text-sm text-gray-600 font-normal">Add a checklist of tasks to complete (e.g. "Clean 10
              plates", "Fold laundry").</p>
          </ion-label>
          <ion-button
            size="small"
            shape="round"
            class="add-item-btn"
            @click="clickAddItem"
          >
            <i class="fad fa-plus-circle mr-1"></i>
            Add Item
          </ion-button>
        </div>

        <div
          class="checklist-container my-2"
          :class="{'ion-invalid': localShowErrors && !isChecklistValid}"
        >
          <ion-reorder-group
            @ionItemReorder="handleReorder($event)"
            disabled="false"
          >
            <ion-item-sliding
              v-for="(item, index) in localBeast.checklist"
              :key="index"
            >
              <ion-item class="checklist-item">
                <i
                  class="fad fa-paw-claws"
                  slot="start"
                ></i>

                <ion-input
                  v-model="localBeast.checklist[index]"
                  @keyup.enter="clickAddItem"
                  placeholder="Describe task to complete"
                  :ref="el => { if (el) inputRefs[index] = el }"
                  class="checklist-input"
                />
                <ion-buttons slot="end">
                  <ion-button
                    @click="clickTrash(index)"
                    color="danger"
                  >
                    <i class="fad fa-trash fa-lg"></i>
                  </ion-button>
                </ion-buttons>

                <ion-reorder
                  slot="end"
                  color="rpg"
                >
                  <i class="fad fa-bars"></i>
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
          <i class="fad fa-paw-claws fa-lg mr-2" />
          Apply
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, reactive, computed } from 'vue';
import { modalController } from '@ionic/vue';
import { close } from 'ionicons/icons';
import { Beast } from '@/lib/databases/BestiaryDb';
import Ionic from '@/mixins/ionic';

// Type for ion input refs
type IonInputElement = HTMLElement & { setFocus: () => Promise<void> };

export default defineComponent({
  name: 'BeastDetailsModal',
  mixins: [Ionic],
  props: {
    beast: {
      type: Object as PropType<Beast>,
      required: true,
    },
    showErrors: {
      type: Boolean,
      default: false,
    }
  },
  setup(props) {
    const inputRefs = ref<Record<number, IonInputElement>>({});
    
    // Create a local copy of the beast to work with
    const localBeast = reactive<Beast>({
      ...props.beast,
      checklist: [...props.beast.checklist],
    });
    
    // Track errors locally
    const localShowErrors = ref(props.showErrors);
    
    // Computed properties for validation - names need to be unique to avoid conflicts
    const isNameValid = computed(() => {
      return localBeast.name?.trim().length > 0;
    });
    
    const isChecklistValid = computed(() => {
      return localBeast.checklist.some(item => item.trim().length > 0);
    });
    
    const clickAddItem = () => {
      const index = localBeast.checklist.length;
      localBeast.checklist.push("");
      
      // Focus the new input after it's rendered
      setTimeout(() => {
        const inputEl = inputRefs.value[index];
        if (inputEl && typeof inputEl.setFocus === 'function') {
          inputEl.setFocus();
        }
      }, 100);
    };
    
    const clickTrash = (index: number) => {
      localBeast.checklist.splice(index, 1);
    };
    
    const handleReorder = (event: CustomEvent) => {
      // Complete the reorder and position the item at its new location
      const items = [...localBeast.checklist];
      const movedItem = items[event.detail.from];
      items.splice(event.detail.from, 1);
      items.splice(event.detail.to, 0, movedItem);
      
      // Update the checklist with the reordered items
      localBeast.checklist = items;
      
      // Finish the reorder animation
      event.detail.complete();
    };
    
    const dismissModal = () => {
      return modalController.dismiss();
    };
    
    const saveChanges = () => {
      // Validate form first
      localShowErrors.value = true;
      
      if (!isNameValid.value || !isChecklistValid.value) {
        // You could show a toast here if needed
        return;
      }
      
      // Clean up empty checklist items
      localBeast.checklist = localBeast.checklist.filter(item => item.trim().length > 0);
      
      // Return the updated beast and state via the dismiss method
      return modalController.dismiss({
        beast: localBeast,
        showErrors: localShowErrors.value
      });
    };
    
    return {
      inputRefs,
      localBeast,
      localShowErrors,
      // Use our computed properties instead of props
      isNameValid, 
      isChecklistValid,
      clickAddItem,
      clickTrash,
      handleReorder,
      dismissModal,
      saveChanges,
      close, // Icon for close button
    };
  }
});
</script>

<style lang="scss" scoped>
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

ion-card {
  --background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  margin: 0;
}
</style>