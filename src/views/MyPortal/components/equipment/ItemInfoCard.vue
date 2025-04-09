<template>
  <ion-card class="info mb-4 ion-flex">
    <ion-card-title v-if="item">{{ item.name }}</ion-card-title>
    <i class="fad fa-7x" :class="`fa-${item.faIcon}`"></i>
    {{ item.desc }}
    <ion-grid>
      <ion-row>
        <ion-col size="6">
          <ion-button expand="block" color="dark">Use</ion-button>
        </ion-col>
        <ion-col size="6">
          <ion-button expand="block" color="dark" @click="handleAction">
            Equip
          </ion-button>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { EquipmentItem } from "./EquipmentItems";

export default defineComponent({
  name: "item-info-card",
  props: {
    item: {
      type: Object as PropType<EquipmentItem>,
      required: true
    }
  },
  methods: {
    handleAction() {
      if (this.item.click) {
        this.item.click();
      } else {
        this.$emit("equip", this.item);
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.info {
  height: 15vh;

  i {
    margin: 0 0.15em 0.15em;
  }
}
</style>
