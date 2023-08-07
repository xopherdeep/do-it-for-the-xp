<template>
  <ion-modal :is-open="isOpen" @didDismiss="didDismiss">
    <ion-header>
      <ion-toolbar>
        <ion-title>Add New Category</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-item>
        <ion-label>Name</ion-label>
        <ion-input v-model="newCategoryName" placeholder="Enter Category Name"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label>Picture</ion-label>
        <ion-thumbnail @click="openActionSheet">
          <ion-img :src="newCategoryPicture"></ion-img>
        </ion-thumbnail>
      </ion-item>
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
  setup() {
    const actionSheetOpen = ref(false);

    const openActionSheet = () => {
      actionSheetOpen.value = true;
    };

    return {
      actionSheetOpen,
      openActionSheet,
    };
  },
  methods: {
    didDismiss(){
      this.$emit('dismiss');
    }
  }
})
</script>

<style>

</style>