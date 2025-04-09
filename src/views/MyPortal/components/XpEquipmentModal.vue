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
      <ion-grid>
        <ion-row>
          <ion-col size="7">
            <equipment-grid 
              :items="specialItems" 
              @display-info="displayInfo" 
              @equip-item="equipItem"
            />
            <status-card />
          </ion-col>
          <ion-col size="5">
            <item-info-card 
              :item="info" 
              @equip="equipItem"
            />
            <equipped-items-card 
              :equipment="equipment"
              :left-hand-items="equipmentOnLeft"
              :right-hand-items="equipmentOnRight"
              @equip="handleEquip"
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
import ItemInfoCard from "./equipment/ItemInfoCard.vue";
import EquippedItemsCard from "./equipment/EquippedItemsCard.vue";
import AchievementsCard from "./equipment/AchievementsCard.vue";

export default defineComponent({
  name: "xp-equipment-modal",
  components: {
    EquipmentGrid,
    StatusCard,
    ItemInfoCard,
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
      
      // Equip the new item
      if (hand === 'left') {
        this.leftHandSlots[index] = item;
      } else if (hand === 'right') {
        this.rightHandSlots[index] = item;
      }
      
      // Add to tracked items
      this.equippedItems.add(item.faIcon);
      
      // Use the parent's clickItem method to update equipment
      this.$emit("equip-item", item, hand, index);
    },

    changeBG() {
      // Placeholder for future implementation
    },

    close() {
      this.$emit("close");
    },

    equipItem(item: EquipmentItem) {
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
      this.handleEquip(item, 'left', 0);
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
