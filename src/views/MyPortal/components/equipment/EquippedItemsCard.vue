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
            v-for="(_, index) in 3" 
            :key="`left-${index}`"
            @drop="drop($event, 'left', index)" 
            @dragover="allowDrop"
            class="hand-slot"
          >
            <i
              v-if="leftSlots[index]"
              :class="`fa-${leftSlots[index].faIcon}`"
              class="fad fa-3x"
              draggable="true"
              @dragstart="drag($event, leftSlots[index])"
            ></i>
            <div v-else class="empty-slot">+</div>
          </ion-col>
        </ion-row>
      </ion-col>
      <ion-col>
        <div class="hand-label">Right Hand</div>
        <ion-row class="dropzone">
          <ion-col 
            v-for="(_, index) in 3" 
            :key="`right-${index}`"
            @drop="drop($event, 'right', index)" 
            @dragover="allowDrop"
            class="hand-slot"
          >
            <i
              v-if="rightSlots[index]"
              :class="`fa-${rightSlots[index].faIcon}`"
              class="fad fa-3x"
              draggable="true"
              @dragstart="drag($event, rightSlots[index])"
            ></i>
            <div v-else class="empty-slot">+</div>
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
      leftSlots: [null, null, null] as (EquipmentItem | null)[],
      rightSlots: [null, null, null] as (EquipmentItem | null)[]
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
      this.leftSlots = [null, null, null];
      this.rightSlots = [null, null, null];
      
      // Fill slots with items
      this.leftHandItems.forEach((item, index) => {
        if (index < 3) this.leftSlots[index] = item;
      });
      
      this.rightHandItems.forEach((item, index) => {
        if (index < 3) this.rightSlots[index] = item;
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
      gap: 0.5em;

      &.dropzone {
        padding: 5px;
      }
    }
  }

  .hand-slot {
    border: 1px dashed #ccc;
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60px;
    background-color: rgba(255, 255, 255, 0.05);
    transition: all 0.2s ease;
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    .empty-slot {
      color: #ccc;
      font-size: 1.5rem;
      opacity: 0.5;
    }
  }

  i {
    margin: 0;
    padding: 0;
  }
}
</style>
