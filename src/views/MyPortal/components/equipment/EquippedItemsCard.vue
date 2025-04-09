<template>
  <ion-card class="equipped mb-4 ion-flex">
    <ion-card-title>Equipped Items</ion-card-title>
    
    <div class="hands-container">
      <div class="hand-section">
        <div class="hand-label">
          <i class="fad fa-hand-paper fa-flip-horizontal"></i> Left Hand
        </div>
        <div class="slots-grid">
          <div 
            v-for="(_, index) in 6" 
            :key="`left-${index}`"
            @drop="drop($event, 'left', index)" 
            @dragover="allowDrop"
            class="hand-slot"
            :class="{ 
              'locked-slot': index > 0,
              'active-slot': leftSlots[index] && index === 0
            }"
            @click="index === 0 && leftSlots[index] ? selectItem(leftSlots[index]) : null"
          >
            <i
              v-if="leftSlots[index] && index === 0"
              :class="`fa-${leftSlots[index].faIcon}`"
              class="fad fa-2x"
            ></i>
            <div v-else-if="index === 0" class="empty-slot">
              <i class="fad fa-plus"></i>
            </div>
            <div v-else class="locked-icon">
              <i class="fad fa-lock"></i>
            </div>
          </div>
        </div>
      </div>
      
      <div class="hand-section">
        <div class="hand-label">
          <i class="fad fa-hand-paper"></i> Right Hand
        </div>
        <div class="slots-grid">
          <div 
            v-for="(_, index) in 6" 
            :key="`right-${index}`"
            @drop="drop($event, 'right', index)" 
            @dragover="allowDrop"
            class="hand-slot"
            :class="{ 
              'locked-slot': index > 0,
              'active-slot': rightSlots[index] && index === 0
            }"
            @click="index === 0 && rightSlots[index] ? selectItem(rightSlots[index]) : null"
          >
            <i
              v-if="rightSlots[index] && index === 0"
              :class="`fa-${rightSlots[index].faIcon}`"
              class="fad fa-2x"
            ></i>
            <div v-else-if="index === 0" class="empty-slot">
              <i class="fad fa-plus"></i>
            </div>
            <div v-else class="locked-icon">
              <i class="fad fa-lock"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="equipment-help">
      <i class="fad fa-info-circle"></i> 
      Drag items here or click to equip. Unlock more slots as you level up.
    </div>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { EquipmentItem } from "./EquipmentItems";
import { toastController } from "@ionic/vue";

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
  emits: ["equip", "select-item"],
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
    allowDrop(event: DragEvent) {
      event.preventDefault();
    },
    async drop(event: DragEvent, hand: string, index: number) {
      event.preventDefault();
      
      // Only allow drops in the first slot (index 0) for now
      if (index > 0) {
        const toast = await toastController.create({
          message: 'This slot is locked. Unlock more slots as you level up.',
          duration: 2000,
          position: 'bottom',
          color: 'warning',
          cssClass: 'rpg-toast'
        });
        await toast.present();
        return;
      }
      
      if (event.dataTransfer) {
        const data = event.dataTransfer.getData("item");
        const item = JSON.parse(data);
        this.$emit("equip", item, hand, index);
        
        // Show toast
        const toast = await toastController.create({
          message: `${item.name} equipped to ${hand} hand`,
          duration: 2000,
          position: 'bottom',
          color: 'success',
          cssClass: 'rpg-toast'
        });
        await toast.present();
      }
    },
    selectItem(item: EquipmentItem) {
      this.$emit("select-item", item);
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
    padding: 8px 16px;
    background-color: rgba(255, 255, 255, 0.05);
    font-size: 1.2rem;
  }

  .hands-container {
    display: flex;
    flex: 1;
    padding: 0 10px;
  }
  
  .hand-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 5px;
    
    .hand-label {
      text-align: center;
      font-size: 0.9rem;
      margin-bottom: 8px;
      color: #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      
      i {
        margin-right: 5px;
        color: #3880ff;
      }
    }
  }
  
  .slots-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 8px;
    flex: 1;
  }

  .hand-slot {
    border: 1px dashed #ccc;
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.05);
    transition: all 0.2s ease;
    cursor: pointer;
    
    &:hover:not(.locked-slot) {
      background-color: rgba(255, 255, 255, 0.1);
      transform: scale(1.05);
    }
    
    &.active-slot {
      background-color: rgba(56, 128, 255, 0.1);
      border: 1px solid rgba(56, 128, 255, 0.5);
      box-shadow: 0 0 5px rgba(56, 128, 255, 0.3);
    }
    
    &.locked-slot {
      background-color: rgba(0, 0, 0, 0.3);
      border: 1px solid #444;
      cursor: not-allowed;
    }
    
    .empty-slot {
      color: #ccc;
      opacity: 0.5;
      
      i {
        font-size: 1.2rem;
      }
    }
    
    .locked-icon {
      color: #666;
      opacity: 0.7;
      
      i {
        font-size: 1rem;
      }
    }
  }

  .equipment-help {
    font-size: 0.75rem;
    color: #999;
    text-align: center;
    padding: 5px 0;
    background-color: rgba(0, 0, 0, 0.2);
    
    i {
      color: #3880ff;
      margin-right: 5px;
    }
  }

  i {
    margin: 0;
    padding: 0;
  }
}
</style>
