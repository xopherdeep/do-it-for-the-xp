<template>
  <ion-card>
    <ion-card-title>
      Do this ... Not that
    </ion-card-title>
    <ion-grid>
      <ion-row>
        <ion-col class="ion-justify-content-center">
          <ion-card-title class="ion-text-center">
            <i class="fad fa-thumbs-up fa-lg"></i>
            35 Dos
          </ion-card-title>
        </ion-col>
        <ion-col>
          <ion-card-title class="ion-text-center">
            <i class="fad fa-thumbs-down fa-lg"></i>
            29 Don'ts
          </ion-card-title>
        </ion-col>
      </ion-row>
      <ion-row>
        <ion-col>
          <ion-button
            color="success"
            expand="block"
            @click="openBonus"
          >
            Bonus
          </ion-button>
        </ion-col>
        <ion-col>
          <ion-button
            color="secondary"
            expand="block"
          >
            Badges
          </ion-button>
        </ion-col>
        <ion-col>
          <ion-button
            color="danger"
            expand="block"
          >
            Penalty
          </ion-button>
        </ion-col>

      </ion-row>
    </ion-grid>
  </ion-card>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import ionic from '@/mixins/ionic'
  import { modalController } from '@ionic/vue';
  import XpBonus from './XpBonus.vue';
  export default defineComponent({
    name: 'xp-do-this-not-that',
    mixins: [ionic],
    methods: {
      async openBonus() {
        const modal = await modalController.create({
          component: XpBonus,
        })
        modal.present()
      }
    }

  })
</script>

<style></style>
