<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title>
          Accessories
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item v-for="accessory in accessories" :key="accessory.id" button @click="clickAccessory(accessory)">
          <ion-label>
            {{ accessory.name }}
            <p>

            </p>
          </ion-label>
          <xp-gp :gp="accessory.basePrice" slot="end" />
        </ion-item>
      </ion-list>
      <ion-fab vertical="bottom" horizontal="end">
        <ion-fab-button>
          <ion-icon :icon="add" />
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button @click="clickAdd">
            <ion-icon :icon="addSharp" />
          </ion-fab-button>
          <ion-fab-button @click="clickDiscover">
            <ion-icon :ios="searchOutline" :md="searchSharp" />
          </ion-fab-button>
          <ion-fab-button>
            <ion-icon :ios="thumbsUpOutline" :md="thumbsUpSharp" />
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>
<script lang="ts">
  import { defineComponent, ref } from 'vue'
  import ionic from '@/mixins/ionic'

  import {
    addSharp,
    thumbsUpOutline,
    thumbsUpSharp,
    searchSharp,
    searchOutline
  } from 'ionicons/icons'

  import { add } from 'ionicons/icons'
  import { useRouter } from 'vue-router'

  import AccessoriesDb, { Accessory, accessoriesStorage, Rarity } from '@/databases/AccessoriesDb';

  export default defineComponent({
    name: 'xp-accessories',
    mixins: [ionic],
    data() {
      return {
        // data properties go here
      }
    },
    methods: {

      clickDiscover() {
        ///
      },
      async loadAccessories() {
        const accessories = await this.accessoryDb.getAccessories();
        this.accessories = accessories
      },
      clickAccessory(accessory: Accessory) {
        this.$router.push({
          name: 'xp-create-update-accessory',
          params: {
            id: accessory.id
          }
        })
      }
    },
    mounted() {
      this.loadAccessories()
    },
    setup() {
      const accessories = ref([] as Accessory[]);
      const router = useRouter();
      const accessoryDb = new AccessoriesDb(accessoriesStorage);

      const clickAdd = () => {
        router.push({
          name: 'xp-create-update-accessory'
        })
      }

      return {
        clickAdd,
        accessories,
        accessoryDb,
        add,
        searchSharp,
        searchOutline,
        thumbsUpOutline,
        thumbsUpSharp,
        addSharp
      }
    }
  })
</script>
<style lang="scss" scoped>
.xp-accessories {
  ion-fab-list {
    ion-fab-button {
      &::before {
        position: absolute;
        right: 53px;
        top: 12px;
        cursor: pointer;
      }

      &:nth-child(1)::before {
        content: "Create your Own ";
      }

      &:nth-child(2)::before {
        content: "Add from Discover";
      }

      &:nth-child(3)::before {
        content: "Add from Recommended";
      }
    }
  }
}
</style>