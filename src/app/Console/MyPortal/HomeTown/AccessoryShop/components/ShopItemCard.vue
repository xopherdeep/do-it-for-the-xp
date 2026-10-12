<template>
  <div
    class="shop-item-card"
    :class="{ 'is-affordable': canAfford, 'is-unaffordable': !canAfford }"
    @click="$emit('inspect', item)"
  >
    <div class="shop-item-card__media">
      <img
        v-if="item.photo"
        :src="item.photo"
        :alt="item.name"
        class="shop-item-card__img"
      />
      <div v-else class="shop-item-card__icon-frame icon-colors">
        <i :class="[itemIconClass, 'shop-item-card__icon']" />
      </div>
    </div>

    <div class="shop-item-card__details">
      <h3 class="shop-item-card__name">{{ item.name }}</h3>

      <div class="shop-item-card__price-row">
        <span
          class="price-badge"
          :class="canAfford ? 'is-affordable' : 'is-short'"
        >
          <i class="fa fa-coins" />
          {{ item.price }} GP
        </span>
        <span v-if="!canAfford" class="shortage-badge">
          Need {{ item.price - wallet }}
        </span>
      </div>

      <div class="shop-item-card__action">
        <span class="inspect-btn">
          <i class="fad fa-eye" /> Look Closer
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue";
import type { ShelfItem } from "@/lib/services/shop/PurchaseService";

export default defineComponent({
  name: "ShopItemCard",
  props: {
    item: {
      type: Object as PropType<ShelfItem>,
      required: true,
    },
    canAfford: {
      type: Boolean,
      default: true,
    },
    wallet: {
      type: Number,
      default: 0,
    },
  },
  emits: ["inspect"],
  setup(props) {
    const itemIconClass = computed(() => {
      const icon = props.item.icon;
      if (!icon) return "fad fa-gift";
      return icon.includes("fa-") ? icon : `fad fa-${icon}`;
    });

    return {
      itemIconClass,
    };
  },
});
</script>

<style lang="scss" scoped>
.shop-item-card {
  position: relative;
  background: rgba(30, 18, 42, 0.8);
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 220px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);

  &:hover {
    border-color: rgba(247, 232, 168, 0.7);
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(247, 232, 168, 0.2);
  }

  &.is-unaffordable {
    opacity: 0.85;

    .shop-item-card__media {
      filter: grayscale(0.2);
    }
  }

  &__media {
    width: 100%;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }

  &__img {
    max-width: 90%;
    max-height: 84px;
    object-fit: contain;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
  }

  &__icon-frame {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(104, 208, 184, 0.18) 0%, rgba(0, 0, 0, 0.3) 70%);
  }

  &__icon {
    font-size: 2.2rem;
    color: #f7e8a8;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
  }

  &__details {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 6px;
  }

  &__name {
    margin: 0;
    font-family: "Twoson", "Apple Kid", sans-serif;
    font-size: 1.05rem;
    line-height: 1.15;
    color: #ffffff;
    letter-spacing: 0.3px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 2.3em;
  }

  &__price-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 100%;
  }

  .price-badge {
    font-family: "StatusPlz", "Apple Kid", sans-serif;
    font-size: 0.9rem;
    padding: 3px 10px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: bold;

    &.is-affordable {
      background: rgba(247, 232, 168, 0.2);
      border: 1px solid #f7e8a8;
      color: #f7e8a8;
    }

    &.is-short {
      background: rgba(255, 73, 97, 0.18);
      border: 1px solid rgba(255, 73, 97, 0.5);
      color: #ffa1ad;
    }
  }

  .shortage-badge {
    font-family: "Apple Kid", sans-serif;
    font-size: 0.85rem;
    color: var(--ion-color-danger, #ff4961);
  }

  &__action {
    margin-top: 4px;
    width: 100%;
  }

  .inspect-btn {
    font-family: "Apple Kid", sans-serif;
    font-size: 0.95rem;
    color: #68d0b8;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    transition: color 0.2s ease;

    &:hover {
      color: #f7e8a8;
    }
  }
}
</style>
