<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button
            @click="dismiss"
            defaultHref="/game-master"
          />
        </ion-buttons>

        <ion-title> {{ beast?.id ? 'Edit Beast' : 'Add Beast' }} </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="bg-slide ion-padding">
      <ion-card class="max-w-2xl mx-auto">
        <ion-card-content>
          <div class="flex mb-4">
            <div class="text-center w-full">
              <h2 class="text-xl mb-2">Beasts are themed checklists that make tasks more fun!</h2>
              <p class="text-sm text-gray-600">Give your beast a creative name like "Kitchen Dragon" or "Laundry Kraken", then add specific tasks to complete.</p>
            </div>
          </div>

          <ion-list lines="full" class="ion-no-margin">
            <!-- Beast Avatar & Name Section -->
            <ion-item class="mb-3">
              <ion-thumbnail
                slot="start"
                class="cursor-pointer beast-avatar-selector"
                @click="openAvatarSelector"
              >
                <ion-img
                  v-if="updateBeast.avatar"
                  :src="getAvatar(updateBeast.avatar)"
                  class="w-full p-0 m-0"
                />
                <div v-else class="default-avatar flex items-center justify-center">
                  <i class="fad fa-camera fa-lg"></i>
                </div>
                <div class="avatar-overlay">
                  <i class="fad fa-edit fa-lg"></i>
                </div>
              </ion-thumbnail>
              <ion-label position="stacked" class="font-bold">
                Beast Name <span class="text-danger">*</span>
              </ion-label>
              <ion-input 
                v-model="updateBeast.name" 
                placeholder="Enter a memorable name"
                :class="{'ion-invalid': showErrors && !isNameValid, 'ion-valid': isNameValid}"
                required 
              />
              <ion-note slot="error" v-if="showErrors && !isNameValid">Please enter a name for your beast</ion-note>
            </ion-item>

            <!-- Checklist Section -->
            <div class="checklist-header ion-padding-top">
              <ion-label class="font-bold mb-2 block">
                Checklist Items <span class="text-danger">*</span>
                <p class="text-sm text-gray-600 font-normal">Add a checklist of tasks to complete (e.g. "Clean 10 plates", "Fold laundry").</p>
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

            <div class="checklist-container my-2" :class="{'ion-invalid': showErrors && !isChecklistValid}">
              <ion-reorder-group @ionItemReorder="handleReorder($event)" disabled="false">
                <ion-item-sliding
                  v-for="(item, index) in updateBeast.checklist"
                  :key="index"
                >
                  <ion-item class="checklist-item">
                    <ion-reorder slot="start">
                      <i class="fad fa-bars text-gray-500"></i>
                    </ion-reorder>
                    <ion-input
                      v-model="updateBeast.checklist[index]"
                      @keyup.enter="clickAddItem"
                      placeholder="Describe task to complete"
                      :ref="el => { if (el) inputRefs[index] = el }"
                      class="checklist-input"
                    />
                    <ion-buttons slot="end">
                      <ion-button @click="clickTrash(index)" color="danger">
                        <i class="fad fa-trash fa-lg"></i>
                      </ion-button>
                    </ion-buttons>
                  </ion-item>
                </ion-item-sliding>
              </ion-reorder-group>
              
              <ion-note slot="error" class="ion-padding-start" v-if="showErrors && !isChecklistValid">
                Please add at least one task
              </ion-note>
            </div>

            <div class="empty-checklist text-center py-4" v-if="updateBeast.checklist.length === 0">
              <i class="fad fa-clipboard-list fa-2x text-gray-400 mb-2"></i>
              <p class="text-gray-500">No tasks added yet</p>
              <ion-button size="small" class="mt-2" @click="clickAddItem">
                <i class="fad fa-plus-circle mr-1"></i> Add First Task
              </ion-button>
            </div>
          </ion-list>

        </ion-card-content>
      </ion-card>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="dismiss">
            <i class="fad fa-times fa-lg mr-2" />
            Cancel
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="validateAndSave" :disabled="isSaving" :strong="true">
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
import { defineComponent, reactive, onMounted } from "vue";
import { modalController, toastController } from "@ionic/vue";
import BestiaryDb, { beastStorage, Beast } from "@/databases/BestiaryDb";
import AvatarSelect from "@/components/AvatarSelect";
import ionic from "@/mixins/ionic";

// Define a type for ion input elements
type IonInputElement = HTMLElement & { setFocus: () => Promise<void> };

export default defineComponent({
  props: {
    beast: {
      type: Object as () => Beast,
    },
  },
  name: "XpAddBeast",
  mixins: [ionic],
  data() {
    return {
      nAvatars: 40,
      isSaving: false,
      showErrors: false,
      inputRefs: {} as Record<number, IonInputElement>,
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
    }
  },
  methods: {
    getAvatar(id: number) {
      return require(`@/assets/images/beasts/${id}.png`);
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
  },
  setup(props) {
    const bestiary = new BestiaryDb(beastStorage);
    
    // Use reactive to ensure it's deeply reactive
    const updateBeast = reactive({
      id: props?.beast?.id || undefined,
      name: props?.beast?.name || "",
      checklist: props?.beast?.checklist?.length ? [...props.beast.checklist] : [],
      avatar: props?.beast?.avatar || 0,
    } as Beast);

    onMounted(() => {
      // Add a default checklist item if empty
      if (updateBeast.checklist.length === 0) {
        updateBeast.checklist.push("");
      }
    });

    return {
      bestiary,
      updateBeast,
    };
  },
});
</script>

<style lang="scss" scoped>
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
    }
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
  
  .selected-avatar-container {
    background: #f8f8f8;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  }
  
  .selected-avatar {
    max-width: 100px;
    margin: 0 auto;
    border-radius: 8px;
    border: 2px solid var(--ion-color-primary);
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