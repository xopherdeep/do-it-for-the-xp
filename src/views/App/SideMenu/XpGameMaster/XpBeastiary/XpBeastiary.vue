<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title>
          Bestiary
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item-sliding
          v-for="beast in beasts"
          :key="beast.id"
        >
          <ion-item>

          </ion-item>
          <ion-item-options>

          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
    </ion-content>
    <ion-fab
      vertical="bottom"
      horizontal="end"
    >
      <ion-fab-button @click="clickAddBeast">
        <ion-icon :icon="add" />
      </ion-fab-button>
    </ion-fab>

  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import { add } from 'ionicons/icons'
  import ionic from "@/mixins/ionic";
  import { modalController } from '@ionic/vue';

  import AddBeast from './components/XpAddBeast.vue'

  export default defineComponent({
    name: 'xp-beastiary',
    mixins: [ionic],
    methods: {
      async clickAddBeast() {
        const modal = await modalController.create({
          component: AddBeast,
        });
        modal.onDidDismiss()
        modal.present()
      },

    },
    setup() {
      return {
        add
      };
    }
  })
</script>

<style></style>
