<template>
  <ion-modal
    @willDismiss="close"
    class="fullscreen"
    :class="$options.name"
    :is-open="isOpen"
    :breakpoints="[1]"
    :initialBreakpoint="1"
    :fullscreen="true"
  >
    <ion-header>
      <ion-buttons class="ion-no-padding toolbar">
        <ion-button class="ion-float-right" size="large" @click="close">
          <i class="fad fa-times fa-2x"></i>
        </ion-button>
      </ion-buttons>
    </ion-header>
    <ion-content class="icon-colors">
      <!-- Removed inline style -->
      <ion-grid>
        <ion-row class="ion-align-items-stretch"> <!-- Ensure row stretches vertically -->
          <ion-col size="7" class="ion-flex ion-flex-column"> <!-- Make column flex container -->
            <equipment-grid
              :items="specialItems" 
              @display-info="displayInfo" 
              @equip-item="equipItem"
              class="ion-flex-grow-1" 
            />
            <status-card /> <!-- Status card remains below -->
          </ion-col>
          <ion-col size="5" class="ion-flex ion-flex-column"> <!-- Make column flex container -->
            <!-- Removed ItemInfoCard -->
            <equipped-items-card 
              :equipment="equipment" 
              :info-item="info"  
              :left-hand-items="equipmentOnLeft"
              :right-hand-items="equipmentOnRight"
              @equip="handleEquip"      
              @select-item="displayInfo"
              class="ion-flex-grow-1"  
            />
            <achievements-card @change-bg="changeBG" />
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
    <ion-toolbar class="rpg-box"></ion-toolbar>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { useEquipmentItems, EquipmentItem } from "./equipment/EquipmentItems";
import EquipmentGrid from "./equipment/EquipmentGrid.vue";
import StatusCard from "./equipment/StatusCard.vue";
// import ItemInfoCard from "./equipment/ItemInfoCard.vue"; // Removed ItemInfoCard import
import EquippedItemsCard from "./equipment/EquippedItemsCard.vue";
import AchievementsCard from "./equipment/AchievementsCard.vue";
import { toastController } from "@ionic/vue";

export default defineComponent({
  name: "xp-equipment-modal",
  components: {
    EquipmentGrid,
    StatusCard,
    // ItemInfoCard, // Removed ItemInfoCard component
    EquippedItemsCard,
    AchievementsCard
  },
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    equipment: {
      type: Array,
      required: true
    }
  },
  emits: ["close", "equip-item"],
  mixins: [ionic],
  data() {
    return {
      info: null as EquipmentItem | null, // Initialize info as null
      leftHandSlots: [null, null, null, null, null, null] as (EquipmentItem | null)[],
      rightHandSlots: [null, null, null, null, null, null] as (EquipmentItem | null)[],
      equippedItems: new Set<string>() // Track equipped items by faIcon
    };
  },
  computed: {
    equipmentOnLeft() {
      return this.leftHandSlots.filter(item => item !== null) as EquipmentItem[];
    },
    equipmentOnRight() {
      return this.rightHandSlots.filter(item => item !== null) as EquipmentItem[];
    },
    specialItems() {
      return this.equipmentItems.specialItems;
    }
  },
  methods: {
    displayInfo(item: EquipmentItem) {
      this.info = item;
    },
    
    // Renamed handleEquip to handleEquipRequest to avoid naming conflict
    // This now handles requests from EquippedItemsCard (drag/drop or icon click)
    async handleEquipRequest(item: EquipmentItem | null, hand?: string, index?: number) {
      // If item is null, it's an unequip request from the info section click
      if (item === null && !hand) { 
         const itemToUnequip = this.info; // Get the item from the info display
         if (!itemToUnequip) return;

         const leftIndex = this.leftHandSlots.findIndex(slot => slot?.faIcon === itemToUnequip.faIcon);
         const rightIndex = this.rightHandSlots.findIndex(slot => slot?.faIcon === itemToUnequip.faIcon);

         if (leftIndex !== -1) {
           this.performUnequip('left', leftIndex);
         } else if (rightIndex !== -1) {
           this.performUnequip('right', rightIndex);
         }
         this.info = null; // Clear info after unequipping
         return;
      }
      
      // If item is provided, it's an equip request (from grid click, drag/drop, or info click)
      if (item) {
         // Check if already equipped (handles clicking equipped item in info section)
         if (this.equippedItems.has(item.faIcon)) {
           // Find where it's equipped and unequip it
           const leftIndex = this.leftHandSlots.findIndex(slot => slot?.faIcon === item.faIcon);
           const rightIndex = this.rightHandSlots.findIndex(slot => slot?.faIcon === item.faIcon);
           if (leftIndex !== -1) this.performUnequip('left', leftIndex);
           if (rightIndex !== -1) this.performUnequip('right', rightIndex);
           // Don't clear info here, as we just unequipped the selected item
           return; 
         }

         // --- Equip Logic ---
         // Prioritize hand/index if provided (drag/drop)
         if (hand !== undefined && index !== undefined) {
            if (index === 0) { // Only allow equipping to index 0 for now
               this.performEquip(item, hand, index);
            } else {
               // Show locked slot toast (or handle differently)
               const toast = await toastController.create({ /* ... locked slot message ... */ });
               await toast.present();
            }
         } else {
            // No hand/index provided (grid click or info click) - find first available slot
            if (this.leftHandSlots[0] === null) {
               this.performEquip(item, 'left', 0);
            } else if (this.rightHandSlots[0] === null) {
               this.performEquip(item, 'right', 0);
            } else {
               // Both slots full, replace left hand
               this.performEquip(item, 'left', 0); // performEquip handles replacement
            }
         }
      } 
      // If item is null AND hand/index are provided, it's an unequip from slot interaction (future use?)
      // else if (item === null && hand && index !== undefined) {
      //    this.performUnequip(hand, index);
      // }
    },

    // Extracted equip logic
    async performEquip(item: EquipmentItem, hand: string, index: number) {
        const targetSlots = hand === 'left' ? this.leftHandSlots : this.rightHandSlots;
        let replacedItemName: string | null = null;

        // Check if already equipped elsewhere (and remove if necessary)
        const isAlreadyEquipped = this.equippedItems.has(item.faIcon);
        if (isAlreadyEquipped) {
            const otherHand = hand === 'left' ? 'right' : 'left';
            const otherSlots = hand === 'left' ? this.rightHandSlots : this.leftHandSlots;
            const otherIndex = otherSlots.findIndex(slot => slot?.faIcon === item.faIcon);
            if (otherIndex !== -1) {
                this.performUnequip(otherHand, otherIndex, false); // Unequip without toast
            }
        }

        // Check if replacing an item in the target slot
        const currentItemInSlot = targetSlots[index];
        if (currentItemInSlot) {
            replacedItemName = currentItemInSlot.name;
            this.equippedItems.delete(currentItemInSlot.faIcon);
        }

        // Equip the new item
        targetSlots[index] = { ...item }; // Use spread to avoid reactivity issues if needed
        this.equippedItems.add(item.faIcon);
        this.$emit("equip-item", targetSlots[index], hand, index); // Notify parent if necessary

        // Show toast
        const message = replacedItemName 
            ? `${replacedItemName} replaced with ${item.name}` 
            : `${item.name} equipped to ${hand} hand`;
        const color = replacedItemName ? 'warning' : 'success';
        const toast = await toastController.create({ message, duration: 2000, position: 'bottom', color, cssClass: 'rpg-toast' });
        await toast.present();
    },

    // Extracted unequip logic
    async performUnequip(hand: string, index: number, showToast = true) {
        const targetSlots = hand === 'left' ? this.leftHandSlots : this.rightHandSlots;
        const itemToUnequip = targetSlots[index];

        if (itemToUnequip) {
            targetSlots[index] = null;
            this.equippedItems.delete(itemToUnequip.faIcon);
            this.$emit("equip-item", null, hand, index); // Notify parent

            if (showToast) {
              const toast = await toastController.create({
                message: `${itemToUnequip.name} unequipped`,
                duration: 2000,
                position: 'bottom',
                color: 'medium',
                cssClass: 'rpg-toast'
              });
              await toast.present();
            }
            
            // If the unequipped item was the one displayed in info, clear info
            if (this.info?.faIcon === itemToUnequip.faIcon) {
                this.info = null;
            }
        }
    },

    changeBG() {
      // Placeholder for future implementation
    },

    close() {
      this.$emit("close");
    },

    // Keep original equipItem method name for the grid's @equip-item event
    equipItem(item: EquipmentItem) {
      this.handleEquipRequest(item); // Delegate to the new handler
    }
  },
  setup() {
    const equipmentItems = useEquipmentItems();
    return { equipmentItems };
  }
});
</script>

<style lang="scss" scoped>
.xp-equipment-modal {
              @equip="handleEquip"
              @select-item="displayInfo"
            />
            <achievements-card @change-bg="changeBG" />
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
    <ion-toolbar class="rpg-box"></ion-toolbar>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { useEquipmentItems, EquipmentItem } from "./equipment/EquipmentItems";
import EquipmentGrid from "./equipment/EquipmentGrid.vue";
import StatusCard from "./equipment/StatusCard.vue";
// import ItemInfoCard from "./equipment/ItemInfoCard.vue"; // Removed ItemInfoCard import
import EquippedItemsCard from "./equipment/EquippedItemsCard.vue";
import AchievementsCard from "./equipment/AchievementsCard.vue";
import { toastController } from "@ionic/vue";

export default defineComponent({
  name: "xp-equipment-modal",
  components: {
    EquipmentGrid,
    StatusCard,
    // ItemInfoCard, // Removed ItemInfoCard component
    EquippedItemsCard,
    AchievementsCard
  },
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    equipment: {
      type: Array,
      required: true
    }
  },
  emits: ["close", "equip-item"],
  mixins: [ionic],
  data() {
    return {
      info: {
        name: "Choose item...",
        faIcon: "question",
        desc: "Hover/Touch an item to learn more."
      } as EquipmentItem,
      leftHandSlots: [null, null, null, null, null, null] as (EquipmentItem | null)[],
      rightHandSlots: [null, null, null, null, null, null] as (EquipmentItem | null)[],
      equippedItems: new Set<string>() // Track equipped items by faIcon
    };
  },
  computed: {
    equipmentOnLeft() {
      return this.leftHandSlots.filter(item => item !== null) as EquipmentItem[];
    },
    equipmentOnRight() {
      return this.rightHandSlots.filter(item => item !== null) as EquipmentItem[];
    },
    specialItems() {
      return this.equipmentItems.specialItems;
    }
  },
  methods: {
    displayInfo(item: EquipmentItem) {
      this.info = item;
    },
    
    handleEquip(item: EquipmentItem, hand: string, index: number) {
      // Only allow equipping to the first slot for now
      if (index > 0) {
        return;
      }
      
      // Check if this item is already equipped somewhere
      const isEquipped = this.equippedItems.has(item.faIcon);
      
      // If it's already equipped, find and remove it first
      if (isEquipped) {
        // Check left hand
        const leftIndex = this.leftHandSlots.findIndex(
          slot => slot && slot.faIcon === item.faIcon
        );
        if (leftIndex !== -1) {
          // Unequip from left hand
          const oldItem = this.leftHandSlots[leftIndex];
          this.leftHandSlots[leftIndex] = null;
          this.$emit("equip-item", null, 'left', leftIndex);
        }
        
        // Check right hand
        const rightIndex = this.rightHandSlots.findIndex(
          slot => slot && slot.faIcon === item.faIcon
        );
        if (rightIndex !== -1) {
          // Unequip from right hand
          const oldItem = this.rightHandSlots[rightIndex];
          this.rightHandSlots[rightIndex] = null;
          this.$emit("equip-item", null, 'right', rightIndex);
        }
        
        // Remove from tracked items
        this.equippedItems.delete(item.faIcon);
      }
      
      // Check if there's an item already in the target slot
      if (hand === 'left' && this.leftHandSlots[index]) {
        // Remove the old item from tracking
        this.equippedItems.delete(this.leftHandSlots[index]!.faIcon);
      } else if (hand === 'right' && this.rightHandSlots[index]) {
        // Remove the old item from tracking
        this.equippedItems.delete(this.rightHandSlots[index]!.faIcon);
      }
      
      // Create a copy of the item to preserve the click handler
      const itemCopy = { ...item };
      if (item.click && typeof item.click === 'function') {
        itemCopy.click = item.click;
      }
      
      // Equip the new item
      if (hand === 'left') {
        this.leftHandSlots[index] = itemCopy;
      } else if (hand === 'right') {
        this.rightHandSlots[index] = itemCopy;
      }
      
      // Add to tracked items
      this.equippedItems.add(item.faIcon);
      
      // Use the parent's clickItem method to update equipment
      this.$emit("equip-item", itemCopy, hand, index);
    },

    changeBG() {
      // Placeholder for future implementation
    },

    close() {
      this.$emit("close");
    },

    async equipItem(item: EquipmentItem) {
      // If item is null, it means we're unequipping
      if (!item) {
        // Find the equipped item and unequip it
        const leftIndex = this.leftHandSlots.findIndex(slot => slot !== null);
        if (leftIndex !== -1) {
          const oldItem = this.leftHandSlots[leftIndex];
          this.handleEquip(null, 'left', leftIndex);
          
          // Show toast
          const toast = await toastController.create({
            message: `${oldItem?.name} unequipped`,
            duration: 2000,
            position: 'bottom',
            color: 'medium',
            cssClass: 'rpg-toast'
          });
          await toast.present();
        }
        return;
      }
      
      // Check if this item is already equipped
      if (this.equippedItems.has(item.faIcon)) {
        // If already equipped, unequip it
        this.handleEquip(item, 'left', 0); // This will handle the unequipping logic
        return;
      }
      
      // Only use the first slot for each hand
      // Check if left hand first slot is empty
      if (this.leftHandSlots[0] === null) {
        this.handleEquip(item, 'left', 0);
        return;
      }
      
      // If left hand is full, try right hand first slot
      if (this.rightHandSlots[0] === null) {
        this.handleEquip(item, 'right', 0);
        return;
      }
      
      // If both first slots are full, replace the left hand item
      const oldItem = this.leftHandSlots[0];
      this.handleEquip(item, 'left', 0);
      
      // Show toast about replacing
      const toast = await toastController.create({
        message: `${oldItem?.name} replaced with ${item.name}`,
        duration: 2000,
        position: 'bottom',
        color: 'warning',
        cssClass: 'rpg-toast'
      });
      await toast.present();
    }
  },
  setup() {
    const equipmentItems = useEquipmentItems();
    return { equipmentItems };
  }
});
</script>

<style lang="scss" scoped>
.xp-equipment-modal {
  background: transparent;

  .toolbar {
    height: 5vh;
  }

  ion-content {
    background: transparent;

    ion-grid, ion-row { // Ensure grid and row take full height
      height: 100%;
    }

    // .h-100 { // No longer needed if using flex correctly
    //   height: 100%;
    // }

    .mb-4 { // Adjust margin as needed, maybe use gap in flex column
      margin-bottom: 1rem !important; // Example using rem
    }

    &.bg-transparent {
      background: transparent !important;
    }
  }
}
</style>

<style lang="scss" scoped>
.xp-equipment-modal {
  background: transparent;

  .toolbar {
    height: 5vh;
  }

  ion-content {
    background: transparent;

    .h-100 {
      height: 100%;
    }

    .mb-4 {
      margin-bottom: 4vh !important;
    }

    &.bg-transparent {
      background: transparent !important;
    }
  }
}
</style>
