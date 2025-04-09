<template>
  <ion-card class="equipment mb-4">
    <ion-card-title>Equipment</ion-card-title>
    <ion-card-content class="ion-no-padding h-100">
      <ion-buttons class="grid-container">
        <ion-button
          v-for="item in items"
          :key="item.faIcon"
          @mouseover="$emit('display-info', item)"
          @click="$emit('equip-item', item)"
          expand="block"
          size="lg"
          class="grid-item h-100"
          draggable="true"
          @dragstart="drag($event, item)"
        >
          <i
            class="ion-float-left fad fa-4x"
            :class="`fa-${item.faIcon} fad fa-4x`"
          ></i>
        </ion-button>
      </ion-buttons>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { EquipmentItem } from "./EquipmentItems";

export default defineComponent({
  name: "equipment-grid",
  props: {
    items: {
      type: Array as PropType<EquipmentItem[]>,
      required: true
    }
  },
  emits: ["display-info", "equip-item"],
  methods: {
    drag(event: DragEvent, item: EquipmentItem) {
      if (event.dataTransfer) {
        event.dataTransfer.setData("item", JSON.stringify(item));
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.equipment {
  height: calc(100vh - 25vh - 5vh - 5em);

  .grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10vw, 1fr));
    grid-gap: 0.5em;
    margin: 0.5em;
    height: calc(100% - 1em);
  }

  .grid-item {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    border-radius: 100px !important;

    i {
      font-size: calc(6vh) !important;
    }
  }
}
</style>
