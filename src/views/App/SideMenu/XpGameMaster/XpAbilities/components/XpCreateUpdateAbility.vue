<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-back-button
          @click="dismiss"
          defaultHref="/game-master"
        />
      </ion-buttons>

      <ion-title>
        Add Ability
      </ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide">
    <ion-card>
      <ion-card-content>
        This is where you can add your abilities.
      </ion-card-content>
    </ion-card>
    <ion-list>
      <ion-item>
        <ion-label position="floating">
          Enter name of Ability
          <p>
          </p>
        </ion-label>
        <ion-input v-model++="updateAbility.name" />
      </ion-item>
    </ion-list>
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
        <ion-button @click="clickSave">
          Save
          <i class="fad fa-save fa-lg ml-2" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>
<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import { modalController } from '@ionic/vue';
  import ionic from "@/mixins/ionic";

  export default defineComponent({
    name: "XpCreateUpdateAbility",
    mixins: [ionic],
    methods: {
      async dismiss() {
        await modalController.dismiss();
      },
      clickSave() {
        // Save the ability here
      },
    },
    setup() {
      const updateAbility = ref({
        name: '',
      })
      return {
        updateAbility
      }
    }
  })
</script>
