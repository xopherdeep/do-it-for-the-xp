<template>
  <ion-modal :is-open="addCategoryModalOpen" onDidDismiss="addCategoryModalOpen = false">
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
        <ion-input v-model="newCategoryPicture" placeholder="Enter Picture URL"></ion-input>
      </ion-item>
      <ion-button expand="full" @click="addNewCategory">Add</ion-button>
    </ion-content>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ionic from '@/mixins/ionic';

export default defineComponent({
  name: 'xp-add-category',
  mixins: [ionic],
})
</script>

<style>

</style>