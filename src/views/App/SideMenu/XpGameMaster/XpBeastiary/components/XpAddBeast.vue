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
        Add Beast
      </ion-title>
    </ion-toolbar>

  </ion-header>
  <ion-content class="bg-slide">
    <ion-card>
      <ion-card-content>
        This is where you can tame your checklists,
        aka beasts. Name your beasts something like:
        Grease Dragon, Counter Goblins, Dust Bunnies, etc.
        Then add a checklist of todo items for that beast.
        Clean 10 dishes
        Clean 10 Utensils
        etc.

      </ion-card-content>
    </ion-card>
    <ion-list>
      <ion-item>
        <ion-label>
          Enter name of Beast
          <p>
          </p>
        </ion-label>
        <ion-input>

        </ion-input>
      </ion-item>
      <ion-item>
        <ion-label>
          Checklist Items
          <p>
            Add a checklist of items: Clean 10 Plates, Clean 1o Utentils.
          </p>
        </ion-label>
        <ion-button slot="end">
          Add Item
        </ion-button>
      </ion-item>
      <ion-item-slider
        v-for="{ item, index } in checklist"
        :key="index"
      >
        <ion-item>
          <ion-input v-model="checklist[index]" />
        </ion-item>
      </ion-item-slider>
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
        <ion-button>
          Save Beast
          <i class="fad fa-save fa-lg ml-2" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>
<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import { modalController } from '@ionic/vue';


  export default defineComponent({
    name: "XpAddBeast",
    methods: {
      dismiss() {
        modalController.dismiss();
      }
    },
    setup() {
      const checklist = ref(['']);
      return {
        checklist
      }
    }
  })
</script>
