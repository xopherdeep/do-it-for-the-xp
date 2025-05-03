<template>
  <ion-card class="equipment mb-4">
    <ion-card-title>Equipment</ion-card-title>
    <ion-card-content class="ion-no-padding h-100">
      <div class="grid-container">
        <div 
          v-for="item in items"
          :key="item.faIcon"
          class="grid-item"
          @mouseover="$emit('display-info', item)"
          @click="$emit('equip-item', item)"
          draggable="true"
          @dragstart="drag($event, item)"
        >
          <i
            class="fad fa-3x"
            :class="`fa-${item.faIcon}`"
          ></i>
        </div>
      </div>
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
  // height: calc(100vh - 25vh - 5vh - 5em); // Removed fixed height
  display: flex;
  flex-direction: column;
  flex: 1; // Allow grid to take available space

  ion-card-content {
    flex: 1;
    display: flex;
    padding: 10px;
    // Removed h-100 class from template, flex: 1 handles growth
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-auto-rows: minmax(80px, auto);
    gap: 10px;
    width: 100%;
    // height: 100%; // Removed fixed height
    overflow-y: auto; // Keep scroll for many items
  }

  .grid-item {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      transform: scale(1.05);
    }
    
    i {
      font-size: 2.5rem;
    }
  }
}
</style>
