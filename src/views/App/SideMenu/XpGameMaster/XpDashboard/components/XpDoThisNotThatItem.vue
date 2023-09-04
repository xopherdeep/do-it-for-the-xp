<template>
  <ion-item-sliding>
    <ion-item-options side="start">
      <ion-item-option
        color="success"
        expand="block"
        @click="openBonus"
      >
        <i
          class="fad fa-sack-dollar fa-lg my-2"
          slot="bottom"
        ></i>
        Bonus
      </ion-item-option>
      <ion-item-option
        color="danger"
        expand="block"
        @click="openPenalty"
      >
        <i
          class="fad fa-minus-circle fa-lg my-2"
          slot="bottom"
        ></i>
        Penalty
      </ion-item-option>
    </ion-item-options>
    <ion-item
      @click="clickDoThisNotThat"
      button
      detail
    >
      <i
        slot="start"
        class="fad fa-grip-vertical fa-lg mr-4"
      ></i>
      <i
        slot="start"
        class="fad fa-rainbow fa-2x mr-2"
      ></i>
      <ion-label>
        Do this, Not that
        <p>
          Reward or penalize player's GP
        </p>
      </ion-label>
      <ion-buttons slot="end">
        <ion-button>

          35
          <i class="fad fa-thumbs-up fa-lg mx-1"></i>
        </ion-button>
        <ion-button>

          29
          <i class="fad fa-thumbs-down fa-lg mx-1"></i>
        </ion-button>
      </ion-buttons>
    </ion-item>
  </ion-item-sliding>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import ionic from '@/mixins/ionic'
  import { modalController } from '@ionic/vue';
  import XpBonus from './XpBonus.vue';
  export default defineComponent({
    name: 'XpDoThisNotThatItem',
    mixins: [ionic],
    methods: {
      clickDoThisNotThat() {
        this.$router.push('/game-master/do-this-not-that')
      },
      async openBonus() {
        const modal = await modalController.create({
          component: XpBonus,
        })
        modal.present()
      },

      async openPenalty() {
        const modal = await modalController.create({
          component: XpBonus,
          componentProps: {
            isPenalty: true
          }
        })
        modal.present()
      },
    },

  })
</script>

<style></style>
