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
      } as EquipmentItem
    };
  },
  computed: {
    equipmentOnLeft() {
      return this.equipment.filter((item) => item.hand === "left");
    },
    equipmentOnRight() {
      return this.equipment.filter((item) => item.hand === "right");
    },
    specialItems() {
      return this.equipmentItems.specialItems;
    }
  },
  methods: {
    displayInfo(item: EquipmentItem) {
      this.info = item;
    },
    
    handleEquip(item: EquipmentItem, hand: string) {
      this.$emit("equip", item, hand);
    },

    changeBG() {
      // Placeholder for future implementation
    },

    close() {
      this.$emit("close");
    },

    equipItem(item: EquipmentItem) {
      this.$emit("equip", item);
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
