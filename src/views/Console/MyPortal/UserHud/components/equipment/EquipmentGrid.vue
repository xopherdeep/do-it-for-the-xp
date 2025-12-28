<template>
  <ion-card class="equipment mb-4">
    <ion-card-content class="ion-no-padding h-100">
      <div class="grid-container">
        <div 
          v-for="item in items"
          :key="item.faIcon"
          class="grid-item"
          :class="{ 'is-equipped': isItemEquipped(item.faIcon) }"
          @click="$emit('display-info', item)"
          draggable="true"
          @dragstart="drag($event, item)"
        >
          <div class="item-inner">
            <i
              class="fad fa-3x"
              :class="`fa-${item.faIcon}`"
            ></i>
          </div>
          <div class="equipped-tag" v-if="isItemEquipped(item.faIcon)">
            <i class="fad fa-check"></i>
          </div>
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
    },
    equippedItems: {
      type: Array as PropType<string[]>,
      default: () => []
    }
  },
  emits: ["display-info", "equip-item"],
  methods: {
    drag(event: DragEvent, item: EquipmentItem) {
      if (event.dataTransfer) {
        event.dataTransfer.setData("item", JSON.stringify(item));
      }
    },
    isItemEquipped(faIcon: string) {
      return this.equippedItems.includes(faIcon);
    }
  }
});
</script>

<style lang="scss" scoped>
.equipment {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: transparent !important;
  border: none;
  box-shadow: none;

  .grid-title {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.75rem 1rem;
    font-size: 1.2rem;
    font-family: 'Apple Kid', sans-serif;
    letter-spacing: 5px;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  ion-card-content {
    flex: 1;
    display: flex;
    // padding: 1rem;
    overflow: visible;
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-auto-rows: auto;
    gap: 12px;
    width: 100%;
    overflow-y: auto;
    padding: 12px;
    
    @media (min-width: 768px) {
      grid-template-columns: repeat(5, 1fr);
    }

    /* Custom Scrollbar */
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
  }

  .grid-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    
    .item-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      border-radius: 12px;
      transition: all 0.3s;

      i {
        font-size: 2.2rem;
        color: rgba(255, 255, 255, 0.6);
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
        transition: all 0.3s;
      }
    }

    .equipped-tag {
      position: absolute;
      top: -6px;
      right: -6px;
      background: var(--ion-color-success);
      color: #fff;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.3);
      z-index: 5;
    }

    &.is-equipped {
      border-color: var(--ion-color-success);
    }

    &:hover {
      background: rgba(40, 40, 60, 0.5);
      border-color: rgba(255, 255, 255, 0.25);
      // transform: scale(1.08);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);

      &.is-equipped {
        border-color: var(--ion-color-success-tint);
      }

      .item-inner i {
        color: #fff;
        transform: scale(1.25);
        filter: drop-shadow(0 0 10px rgba(var(--ion-color-primary-rgb), 0.5));
      }
    }

    &:active {
      transform: translateY(0) scale(0.96);
    }
  }
}
</style>
