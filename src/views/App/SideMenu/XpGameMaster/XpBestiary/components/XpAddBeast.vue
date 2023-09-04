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
        <ion-label position="floating">
          Enter name of Beast
          <p>
          </p>
        </ion-label>
        <ion-input v-model++="updateBeast.name" />
      </ion-item>
      <ion-item>
        <ion-label>
          Checklist Items
          <p>
            Add a checklist of items: Clean 10 Plates, Clean 1o Utentils.
          </p>
        </ion-label>
        <ion-button
          slot="end"
          @click="clickAddItem"
        >
          Add Item
        </ion-button>
      </ion-item>
      <ion-item-sliding
        v-for="(item, index) in updateBeast.checklist"
        :key="index"
      >
        <ion-item>
          <i class="fad fa-check fa-lg mr-2" />
          <ion-input
            v-model="updateBeast.checklist[index]"
            @onEnterKey="clickAddItem"
            @keyup="onEnterKey"
            :ref="`item-${index}`"
          />
          <ion-buttons slot="end">
            <ion-button @click="clickTrash(index)">
              <i class="fad fa-trash fa-lg ml-2" />
            </ion-button>
          </ion-buttons>
        </ion-item>
      </ion-item-sliding>
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
  import BestiaryDb, { beastStorage, Beast } from '@/databases/BestiaryDb';
  import ionic from "@/mixins/ionic";


  export default defineComponent({
    props: {
      beast: {
        type: Object as () => Beast
      }
    },
    name: "XpAddBeast",
    mixins: [ionic],
    methods: {
      async dismiss() {
        await modalController.dismiss();
      },
      clickAddItem() {
        this.updateBeast.checklist.push('')
        const index = this.updateBeast.checklist.length - 1
        const ref = this.$refs[`item-${index}`]
        // if (ref)
        //   ref.focus()
      },
      clickSave() {
        this.bestiary
          .setBeast(this.updateBeast)
          .then(this.dismiss)
          .then(this.showToast)
      },
      clickTrash(index: number) {
        this.updateBeast.checklist.splice(index, 1)
      },
      onEnterKey($event) {
        // if key is enter addItem
        if ($event.key === 'Enter') {
          this.clickAddItem()
        }
      },
      async showToast() {
        await this.bestiary.showSuccessToast("Beast Saved")
      },
    },
    setup(props) {
      const updateBeast = ref({
        id: props?.beast?.id,
        name: props?.beast?.name,
        checklist: props?.beast?.checklist || ['']
      } as Beast)
      const bestiary = new BestiaryDb(beastStorage)
      return {
        bestiary,
        updateBeast
      }
    }
  })
</script>
