<template>
  <ion-modal :is-open="isOpen" @didDismiss="didDismiss">
    <ion-header>
      <ion-toolbar>
        <ion-title>Add New Category</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="rpg-box">
      <ion-grid>
        <ion-row>
          <ion-col size="4">
            <ion-item>
                  <ion-avatar @click="openActionSheet">
                    <ion-skeleton-text ></ion-skeleton-text>
                  </ion-avatar>
            </ion-item>
          </ion-col>
          <ion-col size="8">
            <ion-item>
                  <ion-input v-model="newCategoryName" placeholder="Enter Category Name"></ion-input>
            </ion-item>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col>
            <ion-list>
            <ion-list-header>
              <ion-label>Predefined Categories</ion-label>
            </ion-list-header>
            <ion-item>
                <ion-row
                  class="ion-justify-content-center ion-align-items-center"
                >
                  <ion-col 
                    size="4" 
                    v-for="cat in predefinedCategories" 
                    :key="cat"
                  >
                  <ion-item>

                    <ion-avatar>
                      <ion-skeleton-text />
                    </ion-avatar>
                    {{ cat }}
                  </ion-item>
                  </ion-col>
                </ion-row>
            </ion-item>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-button expand="full" @click="addNewCategory">Add</ion-button>
    </ion-content>
    <ion-action-sheet
      :is-open="actionSheetOpen"
      :header="'Choose an option'"
      :buttons="[
        { text: 'Take Picture', icon: cameraOutline, handler: () => {} },
        { text: 'Choose from Gallery', icon: imagesOutline, handler: () => {} },
        { text: 'Cancel', role: 'cancel' }
      ]"
      @didDismiss="actionSheetOpen = false"
    />
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import ionic from '@/mixins/ionic';
import { IonActionSheet } from '@ionic/vue';
import { cameraOutline, imagesOutline } from 'ionicons/icons';

export default defineComponent({
  name: 'xp-add-category',
  props: ['isOpen'],
  mixins: [ionic],
  data(){
    return {
        newCategoryName: '',
    }
  },
  methods: {
    didDismiss(){
      this.$emit('dismiss');
    }
  },
  setup() {
    const actionSheetOpen = ref(false);

    const openActionSheet = () => {
      actionSheetOpen.value = true;
    };

    const predefinedCategories = ref([
      'After School', 'Bathroom', 'Before School', 'Cleaning', 'Evening', 
      'Garden', 'Healthy Habit', 'Home', 'Kitchen', 'Maintenance', 
      'Meals', 'Morning', 'Personal'
    ]);

    return {
      
      actionSheetOpen,
      openActionSheet,
      cameraOutline,
      imagesOutline,
      predefinedCategories

    };
  },
})
</script>

<style>

</style>
