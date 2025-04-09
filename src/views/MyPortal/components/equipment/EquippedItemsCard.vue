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
        <div class="hand-label">Left Hand</div>
        <ion-row class="dropzone">
          <ion-col 
            v-for="(_, index) in 6" 
            :key="`left-${index}`"
            @drop="drop($event, 'left', index)" 
            @dragover="allowDrop"
            class="hand-slot"
            :class="{ 'locked-slot': index > 0 }"
          >
            <i
              v-if="leftSlots[index] && index === 0"
              :class="`fa-${leftSlots[index].faIcon}`"
              class="fad fa-3x"
              draggable="true"
              @dragstart="drag($event, leftSlots[index])"
            ></i>
            <div v-else-if="index === 0" class="empty-slot">+</div>
            <div v-else class="locked-icon">
              <i class="fad fa-lock fa-2x"></i>
            </div>
          </ion-col>
        </ion-row>
      </ion-col>
      <ion-col>
        <div class="hand-label">Right Hand</div>
        <ion-row class="dropzone">
          <ion-col 
            v-for="(_, index) in 6" 
            :key="`right-${index}`"
            @drop="drop($event, 'right', index)" 
            @dragover="allowDrop"
            class="hand-slot"
            :class="{ 'locked-slot': index > 0 }"
          >
            <i
              v-if="rightSlots[index] && index === 0"
              :class="`fa-${rightSlots[index].faIcon}`"
              class="fad fa-3x"
              draggable="true"
              @dragstart="drag($event, rightSlots[index])"
            ></i>
            <div v-else-if="index === 0" class="empty-slot">+</div>
            <div v-else class="locked-icon">
              <i class="fad fa-lock fa-2x"></i>
            </div>
          </ion-col>
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
      required: true,
      default: () => []
    },
    rightHandItems: {
      type: Array as PropType<EquipmentItem[]>,
      required: true,
      default: () => []
    }
  },
  data() {
    return {
      leftSlots: [null, null, null, null, null, null] as (EquipmentItem | null)[],
      rightSlots: [null, null, null, null, null, null] as (EquipmentItem | null)[]
    };
  },
  created() {
    this.updateSlots();
  },
  watch: {
    leftHandItems() {
      this.updateSlots();
    },
    rightHandItems() {
      this.updateSlots();
    }
  },
  emits: ["equip"],
  methods: {
    updateSlots() {
      // Reset slots
      this.leftSlots = [null, null, null, null, null, null];
      this.rightSlots = [null, null, null, null, null, null];
      
      // Fill slots with items
      this.leftHandItems.forEach((item, index) => {
        if (index < 6) this.leftSlots[index] = item;
      });
      
      this.rightHandItems.forEach((item, index) => {
        if (index < 6) this.rightSlots[index] = item;
      });
    },
    drag(event: DragEvent, item: EquipmentItem) {
      if (event.dataTransfer) {
        event.dataTransfer.setData("item", JSON.stringify(item));
      }
    },
    allowDrop(event: DragEvent) {
      event.preventDefault();
    },
    drop(event: DragEvent, hand: string, index: number) {
      event.preventDefault();
      
      // Only allow drops in the first slot (index 0) for now
      if (index > 0) {
        return;
      }
      
      if (event.dataTransfer) {
        const data = event.dataTransfer.getData("item");
        const item = JSON.parse(data);
        this.$emit("equip", item, hand, index);
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.equipped {
  height: 25vh;
  display: flex;
  flex-direction: column;

  ion-card-title {
    margin-bottom: 5px;
  }

  .hands {
    flex: 1;
    display: flex;
    
    ion-col {
      display: flex;
      flex-direction: column;
      
      .hand-label {
        text-align: center;
        font-size: 0.8rem;
        margin-bottom: 5px;
        color: #ccc;
      }
    }

    ion-row {
      flex: 1;
      gap: 0.3em;

      &.dropzone {
        padding: 5px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(2, 1fr);
      }
    }
  }

  .hand-slot {
    border: 1px dashed #ccc;
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 40px;
    background-color: rgba(255, 255, 255, 0.05);
    transition: all 0.2s ease;
    margin: 2px;
    
    &:hover:not(.locked-slot) {
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    &.locked-slot {
      background-color: rgba(0, 0, 0, 0.3);
      border: 1px solid #444;
    }
    
    .empty-slot {
      color: #ccc;
      font-size: 1.5rem;
      opacity: 0.5;
    }
    
    .locked-icon {
      color: #666;
      opacity: 0.7;
      font-size: 0.8em;
    }
  }

  i {
    margin: 0;
    padding: 0;
  }
}
</style>
