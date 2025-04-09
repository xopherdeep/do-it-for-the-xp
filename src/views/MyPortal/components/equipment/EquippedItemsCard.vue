<template>
  <ion-card class="equipped mb-4 ion-flex">
    <ion-card-title>Equipped</ion-card-title>
    <ion-row>
      <ion-col>
        <i
          v-for="item in equipment"
          :key="item.faIcon"
          :class="`fa-${item.faIcon}`"
          class="fad fa-4x ion-padding"
          draggable="true"
          @dragstart="drag($event, item)"
        ></i>
      </ion-col>
    </ion-row>

    <ion-row class="hands">
      <ion-col>
        <ion-row class="dropzone">
          <ion-col @drop="drop($event, 'left')" @dragover="allowDrop">
            <i
              v-for="item in leftHandItems"
              :key="item.faIcon"
              :class="`fa-${item.faIcon}`"
              class="fad fa-4x ion-padding"
              draggable="true"
              @dragstart="drag($event, item)"
            ></i>
          </ion-col>
          <ion-col @drop="drop($event, 'left')" @dragover="allowDrop"></ion-col>
          <ion-col @drop="drop($event, 'left')" @dragover="allowDrop"></ion-col>
        </ion-row>
      </ion-col>
      <ion-col>
        <ion-row class="dropzone">
          <ion-col @drop="drop($event, 'right')" @dragover="allowDrop">
            <i
              v-for="item in rightHandItems"
              :key="item.faIcon"
              :class="`fa-${item.faIcon}`"
              class="fad fa-4x ion-padding"
              draggable="true"
              @dragstart="drag($event, item)"
            ></i>
          </ion-col>
          <ion-col @drop="drop($event, 'right')" @dragover="allowDrop"></ion-col>
          <ion-col @drop="drop($event, 'right')" @dragover="allowDrop"></ion-col>
        </ion-row>
      </ion-col>
    </ion-row>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { EquipmentItem } from "./EquipmentItems";

export default defineComponent({
  name: "equipped-items-card",
  props: {
    equipment: {
      type: Array as PropType<EquipmentItem[]>,
      required: true
    },
    leftHandItems: {
      type: Array as PropType<EquipmentItem[]>,
      required: true
    },
    rightHandItems: {
      type: Array as PropType<EquipmentItem[]>,
      required: true
    }
  },
  emits: ["equip"],
  methods: {
    drag(event: DragEvent, item: EquipmentItem) {
      if (event.dataTransfer) {
        event.dataTransfer.setData("item", JSON.stringify(item));
      }
    },
    allowDrop(event: DragEvent) {
      event.preventDefault();
    },
    drop(event: DragEvent, hand: string) {
      event.preventDefault();
      
      if (event.dataTransfer) {
        const data = event.dataTransfer.getData("item");
        const item = JSON.parse(data);
        this.$emit("equip", item, hand);
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.equipped {
  height: 25vh;
  display: flex;

  .hands {
    height: 100%;
    max-height: 45%;

    ion-row {
      gap: 0.5em;
      height: 100%;

      &.dropzone {
        padding: 10px;
      }

      ion-col {
        border: 1px dashed #ccc;
        border-radius: 10px;
        height: 100%;
      }
    }
  }

  ion-button {
    width: 100%;
    height: 10vh;
    font-size: inherit;

    i {
      margin: 2px 1px 0 2px;
    }
  }
}
</style>
