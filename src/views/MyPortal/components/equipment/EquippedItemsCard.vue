<template>
  <ion-card class="equipped mb-4 ion-flex ion-flex-column"> <!-- Ensure flex column -->
    <!-- Item Info Section (conditionally rendered) -->
    <div v-if="infoItem" class="item-info-section">
       <ion-card-header class="info-header">
         <ion-card-title class="item-title">{{ infoItem.name }}</ion-card-title>
       </ion-card-header>
       <ion-card-content class="info-content">
         <div class="item-details">
           <div class="icon-container" @click="handleEquipFromInfo" :class="{ 'equipped': isEquipped }">
             <i class="fad fa-3x" :class="`fa-${infoItem.faIcon}`"></i>
             <div v-if="infoItem.mpCost" class="mp-cost">{{ infoItem.mpCost }}MP</div>
             <div v-if="isEquipped" class="equipped-badge">
               <i class="fad fa-check"></i>
             </div>
           </div>
           <div class="description">
             <p>{{ infoItem.desc }}</p>
             <div class="item-stats">
               <div v-if="infoItem.rechargeTime" class="recharge-time">
                 <i class="fad fa-clock"></i> Recharge: {{ infoItem.rechargeTime }}
               </div>
               <!-- Removed equipped-in hand display from here, it's implicit in slots -->
             </div>
           </div>
         </div>
         <!-- Removed action buttons -->
       </ion-card-content>
    </div>
     <!-- Divider -->
    <hr v-if="infoItem" class="divider"/>

    <!-- Equipped Items Title -->
    <ion-card-title class="equipped-title">Equipped Items</ion-card-title>

    <!-- Hands Section -->
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
import { defineComponent, PropType, computed } from "vue"; // Added computed
import { EquipmentItem } from "./EquipmentItems";
import { toastController } from "@ionic/vue";

export default defineComponent({
  name: "equipped-items-card",
  components: { // Added IonButton for potential future use or consistency
    // IonButton 
  },
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
    },
    // New prop to receive the selected item's info
    infoItem: {
      type: Object as PropType<EquipmentItem | null>,
      default: null
    }
  },
  emits: ["equip", "select-item"], // Ensure emits are declared
  setup(props, { emit }) { // Using setup for computed property
    const isEquipped = computed(() => {
      if (!props.infoItem) return false;
      // Check if the infoItem exists in either hand's slots (only index 0 for now)
      return (props.leftSlots[0]?.faIcon === props.infoItem.faIcon) || 
             (props.rightSlots[0]?.faIcon === props.infoItem.faIcon);
    });

    // Method to handle equipping/unequipping by clicking the icon in the info section
    const handleEquipFromInfo = async () => {
      if (!props.infoItem) return;

      if (isEquipped.value) {
        // Unequip logic: Find which hand it's in and emit null for that slot
        if (props.leftSlots[0]?.faIcon === props.infoItem.faIcon) {
          emit("equip", null, 'left', 0); 
        } else if (props.rightSlots[0]?.faIcon === props.infoItem.faIcon) {
          emit("equip", null, 'right', 0);
        }
         // Toast is handled in the parent modal now for equipItem logic
      } else {
        // Equip logic: Emit the item, let the parent modal decide the hand/slot
        emit("equip", props.infoItem); 
         // Toast is handled in the parent modal now for equipItem logic
      }
    };
    
    // Expose necessary things to the template
    return { 
      isEquipped,
      handleEquipFromInfo
    };
  },
  data() { // Keep data for slots
    return {
      leftSlots: [null, null, null, null, null, null] as (EquipmentItem | null)[],
      rightSlots: [null, null, null, null, null, null] as (EquipmentItem | null)[]
    };
  },
  // Keep watch and created, but move emits declaration earlier
  // emits: ["equip", "select-item"], // Moved to top
  watch: {
    // Watch the incoming props to update internal slots
    leftHandItems() {
      this.updateSlots();
    },
    rightHandItems() {
      this.updateSlots();
    }
  },
  // emits: ["equip", "select-item"], // Removed duplicate emits
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
// Import styles from ItemInfoCard or redefine them here
.item-info-section {
  // Styles adapted from ItemInfoCard.vue
  .info-header {
    padding: 5px 10px; // Reduced padding
    background-color: rgba(255, 255, 255, 0.05);
  }

  .item-title {
    font-size: 1.1rem; // Slightly smaller
    font-weight: bold;
    text-align: center;
  }

  .info-content {
    display: flex;
    flex-direction: column;
    padding: 8px;
  }

  .item-details {
    display: flex;
    margin-bottom: 5px; // Reduced margin
  }

  .icon-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 60px; // Smaller icon container
    height: 60px;
    margin-right: 10px;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      transform: scale(1.05);
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    &.equipped {
      background-color: rgba(45, 211, 111, 0.2);
      border: 1px solid rgba(45, 211, 111, 0.5);
    }

    i.fad { // Target the icon specifically
      font-size: 2.2rem; // Slightly smaller icon
    }

    .mp-cost {
      position: absolute;
      bottom: -4px; // Adjusted position
      right: -4px;
      background-color: #3880ff;
      color: white;
      border-radius: 8px; // Adjusted radius
      padding: 1px 5px; // Adjusted padding
      font-size: 0.65rem; // Adjusted size
      font-weight: bold;
    }
    
    .equipped-badge {
      position: absolute;
      top: -4px; // Adjusted position
      right: -4px;
      background-color: #2dd36f;
      color: white;
      border-radius: 50%;
      width: 18px; // Adjusted size
      height: 18px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 0.6rem; // Adjusted size
    }
  }

  .description {
    flex: 1;
    display: flex;
    flex-direction: column;
    font-size: 0.8rem; // Slightly smaller
    overflow: hidden;

    p {
      flex: 1;
      margin: 0 0 5px 0;
      overflow-y: auto; 
      max-height: 40px; // Limit description height in this context
      line-height: 1.2;
    }
    .item-stats {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .recharge-time {
      font-size: 0.7rem; // Adjusted size
      color: #ffb74d;
      display: flex;
      align-items: center;
      
      i {
        margin-right: 4px; // Adjusted margin
      }
    }
  }
}

.divider {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 5px 10px; // Reduced margin
}

.equipped {
  // display: flex; // Already set in ion-flex-column
  // flex-direction: column; // Already set in ion-flex-column

  .equipped-title { // Renamed from ion-card-title to avoid conflict if needed
    margin-bottom: 5px;
    padding: 5px 16px; // Reduced padding
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
