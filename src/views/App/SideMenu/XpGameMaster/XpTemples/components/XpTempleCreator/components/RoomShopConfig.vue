<template>
  <div class="shop-settings config-box">
    <div class="config-label">Shop Selection</div>
    
    <!-- Shop List -->
    <div v-if="shops.length" class="shop-list mt-10">
      <div 
        v-for="shop in shops" 
        :key="shop.id"
        class="shop-option"
        :class="{ active: selectedShopId === shop.id }"
        @click="$emit('select-shop', shop.id)"
      >
        <div class="shop-icon-box">
          <i :class="['fad', shop.icon || 'fa-store']"></i>
        </div>
        <div class="shop-info">
          <span class="shop-name">{{ shop.name || 'Unnamed Shop' }}</span>
          <span class="shop-items">{{ shop.items?.length || 0 }} items</span>
        </div>
        <i v-if="selectedShopId === shop.id" class="fas fa-check-circle check-icon"></i>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state mt-10">
      <i class="fad fa-store-slash fa-2x"></i>
      <span>No shops created yet</span>
      <p class="hint">Create shops in the Game Master Compendium</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

interface Shop {
  id: string;
  name: string;
  icon?: string;
  items?: unknown[];
}

export default defineComponent({
  name: 'RoomShopConfig',
  props: {
    shops: {
      type: Array as PropType<Shop[]>,
      default: () => []
    },
    selectedShopId: {
      type: String,
      default: ''
    }
  },
  emits: ['select-shop']
});
</script>

<style lang="scss" scoped>
.config-box {
  .config-label {
    font-family: "Press Start 2P";
    font-size: 0.65rem;
    color: #fff;
    opacity: 0.7;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
  }
}

.shop-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.shop-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;

  .shop-icon-box {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(105, 240, 174, 0.1);
    border-radius: 10px;
    i { font-size: 1.3rem; color: #69f0ae; }
  }

  .shop-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;

    .shop-name {
      font-family: "StatusPlz";
      font-size: 1rem;
      color: #fff;
    }

    .shop-items {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.4);
    }
  }

  .check-icon {
    color: #69f0ae;
    font-size: 1.2rem;
  }

  &:hover {
    background: rgba(105, 240, 174, 0.05);
    border-color: rgba(105, 240, 174, 0.3);
  }

  &.active {
    background: rgba(105, 240, 174, 0.1);
    border-color: rgba(105, 240, 174, 0.5);
    box-shadow: 0 0 20px rgba(105, 240, 174, 0.15);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  text-align: center;

  i { color: rgba(255, 255, 255, 0.2); }
  span { font-family: "StatusPlz"; font-size: 1rem; color: rgba(255, 255, 255, 0.4); }
  .hint { font-size: 0.7rem; color: rgba(255, 255, 255, 0.25); margin: 0; }
}

.mt-10 { margin-top: 10px; }
</style>

