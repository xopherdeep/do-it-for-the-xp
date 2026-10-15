<template>
  <swiper
    class="shop-shelf-slider"
    :slides-per-view="1.75"
    :centered-slides="true"
    :space-between="0"
    :grab-cursor="true"
    @swiper="onSwiper"
    @slide-change="onSlideChange"
  >
    <swiper-slide v-if="walletWare" key="wallet-ware">
      <shop-item-slide
        :name="walletWare.name"
        :price="walletWare.price"
        icon="wallet"
        :affordable="walletWareAffordable"
        :short-by="walletWareShortBy"
        :note="walletNote"
        :active="activeIndex === 0"
        @pick="pick(0)"
      />
    </swiper-slide>
    <swiper-slide v-for="(item, index) in items" :key="item.id">
      <shop-item-slide
        :name="item.name"
        :price="item.price"
        :icon="item.icon"
        :photo="item.photo"
        :affordable="canAffordPrice(wallet, item.price)"
        :short-by="Math.max(0, item.price - wallet)"
        :active="activeIndex === index + offset"
        @pick="pick(index + offset)"
      />
    </swiper-slide>
  </swiper>
</template>

<script setup lang="ts">
// The shelf: a see-through slider over the shop's own picture. The middle item turns on the spot;
// tap it for a closer look, tap a neighbour (or swipe, or the footer's < >) to bring it to the middle.
import { computed, ref, watch } from "vue";
import { Swiper, SwiperSlide } from "swiper/vue";
import type { Swiper as SwiperClass } from "swiper";
import "swiper/css";
import { play$fx } from "@/assets/fx";
import type { ShelfItem } from "@/lib/services/shop/PurchaseService";
import { canAffordPrice } from "@/lib/services/shop/shelfFilter";
import ShopItemSlide from "./ShopItemSlide.vue";

/** The bigger wallet this shop sells (walletOfferAt), when it sells one. */
export interface WalletWareData {
  name: string;
  blurb: string;
  price: number;
  status: "for-sale" | "locked" | "owned" | "ahead";
  note: string;
  offer?: unknown;
  hint?: string;
}

const props = withDefaults(
  defineProps<{
    items: ShelfItem[];
    wallet: number;
    walletWare?: WalletWareData | null;
    /** On sale to this hero and covered by savings plus wallet (canAffordWalletWare) */
    walletWareAffordable?: boolean;
    /** How much more GP the wallet needs (walletWareShortBy) */
    walletWareShortBy?: number;
  }>(),
  { walletWare: null, walletWareAffordable: false, walletWareShortBy: 0 }
);

const emit = defineEmits<{
  (event: "inspect", item: ShelfItem): void;
  (event: "buy-wallet"): void;
  /** Where the shelf stands, for the footer's < > buttons */
  (event: "position", position: { index: number; count: number }): void;
}>();

const swiperRef = ref<SwiperClass | null>(null);
const activeIndex = ref(0);
// The wallet, when sold here, is always the first thing on the shelf.
const offset = computed(() => (props.walletWare ? 1 : 0));
const walletNote = computed(() => {
  const ware = props.walletWare;
  const hasNoNoteToShow = !ware || ware.status === "for-sale";
  if (hasNoNoteToShow) return "";
  return ware.status === "owned" ? "Owned" : ware.note;
});

const onSwiper = (swiper: SwiperClass) => {
  swiperRef.value = swiper;
};

const count = computed(() => props.items.length + offset.value);
const report = () => emit("position", { index: activeIndex.value, count: count.value });

const onSlideChange = (swiper: SwiperClass) => {
  activeIndex.value = swiper.activeIndex;
  play$fx("cursor");
  report();
};

/** The footer's < and > buttons */
const prev = () => swiperRef.value?.slidePrev();
const next = () => swiperRef.value?.slideNext();
defineExpose({ prev, next });

const pick = (index: number) => {
  if (index !== activeIndex.value) {
    swiperRef.value?.slideTo(index);
    return;
  }
  const isWalletSlot = Boolean(props.walletWare) && index === 0;
  if (isWalletSlot) {
    emit("buy-wallet");
    return;
  }
  const item = props.items[index - offset.value];
  if (item) emit("inspect", item);
};

// A new search or filter puts the shelf back at its first item.
watch(
  () => props.items.map((item) => item.id).join("|"),
  () => {
    activeIndex.value = 0;
    swiperRef.value?.slideTo(0, 0, false);
    report();
  },
  { immediate: true }
);
watch(offset, report);
</script>

<style lang="scss" scoped>
.shop-shelf-slider {
  width: 100%;
  padding: 8px 0;
  overflow: hidden;

  :deep(.swiper-slide) {
    display: flex;
    justify-content: center;
    background: transparent;
  }
}
</style>
