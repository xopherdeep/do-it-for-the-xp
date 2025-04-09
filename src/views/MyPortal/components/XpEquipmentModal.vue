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
  mixins: [ionic],
  data() {
    return {
      info: {
        name: "Choose item...",
        faIcon: "question",
        desc: "Hover/Touch an item to learn more."
      } as EquipmentItem,
      leftHandSlots: [null, null, null] as (EquipmentItem | null)[],
      rightHandSlots: [null, null, null] as (EquipmentItem | null)[]
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
      if (hand === 'left') {
        this.leftHandSlots[index] = item;
      } else if (hand === 'right') {
        this.rightHandSlots[index] = item;
      }
      
      // Update the parent component
      const updatedEquipment = [
        ...this.equipment.filter(i => i.hand !== 'left' && i.hand !== 'right'),
        ...this.leftHandSlots.filter(i => i !== null).map(i => ({...i, hand: 'left'})),
        ...this.rightHandSlots.filter(i => i !== null).map(i => ({...i, hand: 'right'}))
      ];
      
      this.$emit("equip", updatedEquipment);
    },

    changeBG() {
      // Placeholder for future implementation
    },

    close() {
      this.$emit("close");
    },

    equipItem(item: EquipmentItem) {
      // Find the first empty slot in left hand
      const leftEmptyIndex = this.leftHandSlots.findIndex(slot => slot === null);
      if (leftEmptyIndex !== -1) {
        this.handleEquip(item, 'left', leftEmptyIndex);
        return;
      }
      
      // If left hand is full, try right hand
      const rightEmptyIndex = this.rightHandSlots.findIndex(slot => slot === null);
      if (rightEmptyIndex !== -1) {
        this.handleEquip(item, 'right', rightEmptyIndex);
        return;
      }
      
      // If both hands are full, replace the first left hand item
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
