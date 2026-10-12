<template>
  <div v-if="isHere" class="xp-traveling-merchant">
    <!-- Boobeedeedle's balloon wagon, only in the world the merchant is visiting today; tap it to shop -->
    <div class="xp-traveling-merchant__float">
      <xp-building-model
        building-id="traveling-merchant"
        label="Boobeedeedle"
        sublabel="Traveling Merchant"
        :size="size"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import XpBuildingModel from "@/components/organisms/BuildingModel/XpBuildingModel.vue";
import { isMerchantIn } from "@/lib/services/shops/travelingMerchant";

const props = withDefaults(
  defineProps<{
    /** The world this page shows: "forest" (or its area name, "world-forest") */
    world: string;
    size?: number;
  }>(),
  { size: 105 }
);

// The merchant moves on at midnight, even while the hero stands in the world.
const now = ref(new Date());
const clock = setInterval(() => {
  now.value = new Date();
}, 60_000);
onBeforeUnmount(() => clearInterval(clock));

const isHere = computed(() => isMerchantIn(props.world, now.value));
</script>

<style lang="scss" scoped>
.xp-traveling-merchant {
  pointer-events: auto;

  &__float {
    animation: merchant-drift 3.2s ease-in-out infinite alternate;
  }
}

// The balloon rides the breeze: a slow rise and fall with a little sway
@keyframes merchant-drift {
  from {
    transform: translate(-2px, 3px);
  }
  to {
    transform: translate(2px, -5px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .xp-traveling-merchant__float {
    animation: none;
  }
}
</style>
