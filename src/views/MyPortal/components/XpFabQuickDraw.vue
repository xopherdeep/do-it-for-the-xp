<template>
  <!-- EQUIPPED MENU -->
  <ion-fab vertical="bottom" horizontal="center" v-if="user.stats">
    <ion-fab-button color="tertiary">
      <i class="fad fa-hand-sparkles fa-2x"></i>
    </ion-fab-button>
    <ion-fab-list side="top">
      <ion-fab-button color="dark" @click="$emit('openHud')">
        <i class="fad fa-compass fa-lg"></i>
      </ion-fab-button>
      <ion-fab-button color="dark" id="world-map">
        <i class="fad fa-map fa-lg"></i>
      </ion-fab-button>
    </ion-fab-list>
    <ion-fab-list side="start">
      <ion-fab-button>
        <ion-menu-button color="primary"></ion-menu-button>
      </ion-fab-button>
    </ion-fab-list>
    <ion-fab-list side="start" class="items">
      <ion-fab-button
        v-for="item in leftItems"
        :key="item.faIcon"
        color="dark"
        @click="handleItemClick(item)"
      >
        <i class="fad fa-2x" :class="`fa-${item.faIcon}`"></i>
      </ion-fab-button>
    </ion-fab-list>
    <ion-fab-list side="end" class="items">
      <ion-fab-button
        v-for="item in rightItems"
        :key="item.faIcon"
        color="dark"
        @click="handleItemClick(item)"
        class="icon-colors"
      >
        <i class="fad fa-2x" :class="`fa-${item.faIcon}`" />
      </ion-fab-button>
    </ion-fab-list>
  </ion-fab>
</template>

<style lang="scss" scoped></style>

<script>
  import { defineComponent } from "vue";
  import ionic from "@/mixins/ionic";

  export default defineComponent({
    props: ["user", "equipment"],
    mixins: [ionic],
    computed: {
      leftItems() {
        return this.equipment.filter((item) => item.hand === "left");
      },

      rightItems() {
        return this.equipment.filter((item) => item.hand === "right");
      },
    },
    methods: {
      handleItemClick(item) {
        if (item.click) {
          item.click();
        } else if (item.mpCost) {
          // Handle items with MP cost (spells, abilities)
          console.log(`Using ${item.name} (${item.mpCost}MP)`);
          // Here you would implement the actual effect
          this.play$fx('spell');
        }
      }
    },
    setup() {
      //
    },
  });
</script>
