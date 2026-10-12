<template>
  <button
    type="button"
    class="shop-item-slide"
    :class="{ 'is-active': active, 'is-short': !affordable }"
    :aria-label="`${name}, ${price} GP`"
    @click="$emit('pick')"
  >
    <!-- One thing on the shelf, standing on the shop floor: no card, just the item, its name and its tag -->
    <xp-item-model :icon="icon" :photo="photo" :name="name" :size="168" :spinning="active" />
    <span class="shop-item-slide__name">{{ name }}</span>
    <span class="shop-item-slide__tag">
      <i class="fad fa-coins" />
      {{ price }} GP
    </span>
    <span v-if="note" class="shop-item-slide__note">{{ note }}</span>
    <span v-else-if="!affordable" class="shop-item-slide__note">Need {{ shortBy }} more</span>
  </button>
</template>

<script setup lang="ts">
import XpItemModel from "@/components/organisms/ItemModel/XpItemModel.vue";

withDefaults(
  defineProps<{
    name: string;
    price: number;
    icon?: string;
    photo?: string;
    affordable?: boolean;
    /** GP still missing when the wallet can't cover the price */
    shortBy?: number;
    /** A line of its own instead of the shortfall (a wallet that is owned, or locked to a level) */
    note?: string;
    /** The slide the shelf is showing */
    active?: boolean;
  }>(),
  { icon: "", photo: "", affordable: true, shortBy: 0, note: "", active: false }
);

defineEmits<{ (event: "pick"): void }>();
</script>

<style lang="scss" scoped>
.shop-item-slide {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  cursor: pointer;
  opacity: 0.7;
  transform: scale(0.78);
  transition: opacity 0.25s ease, transform 0.25s ease;
  -webkit-tap-highlight-color: transparent;

  &.is-active {
    opacity: 1;
    transform: scale(1);
  }

  &:focus-visible {
    outline: 2px dashed #f7e8a8;
    outline-offset: 2px;
  }

  &__name {
    max-width: 100%;
    font-family: "StatusPlz", "Apple Kid", sans-serif;
    font-size: 1rem;
    line-height: 1.15;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #ffffff;
    // Readable over any painted floor without putting a box behind it
    text-shadow: 2px 2px 0 #14091f, -1px -1px 0 #14091f, 1px -1px 0 #14091f, -1px 1px 0 #14091f;
    overflow-wrap: anywhere;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px;
    border-radius: 3px;
    background: rgba(20, 9, 31, 0.78);
    border: 2px solid #f7e8a8;
    font-family: "StatusPlz", "Apple Kid", sans-serif;
    font-size: 0.95rem;
    color: #f7e8a8;

    i {
      --fa-primary-color: #f7e8a8;
      --fa-secondary-color: #c9a227;
      --fa-secondary-opacity: 1;
    }
  }

  &.is-short &__tag {
    border-color: #ff7b7b;
    color: #ffb3b3;
  }

  &__note {
    max-width: 200px;
    text-align: center;
    line-height: 1.05;
    font-family: "Apple Kid", sans-serif;
    font-size: 1.1rem;
    color: #ffd6d6;
    text-shadow: 1px 1px 0 #14091f, -1px -1px 0 #14091f;
  }

  &:not(.is-short) &__note {
    color: #e7e6b3;
  }
}
</style>
