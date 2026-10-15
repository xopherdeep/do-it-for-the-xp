<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { play$fx } from "@/assets/fx";
import { hospitalBillOf } from "@/lib/services/gp/wallet";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The GROUNDED chip (docs/Quest-Rooms-Spec.md 5.8): shown on the HUD and on the temple vitals bar while the hero owes
 * the Hospital. It names the bill and takes a tap to the Gold Bank, where paying it off lifts the grounding. It draws
 * nothing for a hero who owes nothing, so a screen can always mount it.
 * `compact` drops the word "Bill" for the thin temple bar.
 */
const props = withDefaults(defineProps<{ stats?: { gp?: { hospitalBill?: number } | null } | null; compact?: boolean }>(), {
  stats: null,
  compact: false,
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const bill = computed(() => hospitalBillOf(props.stats?.gp));

/** The hero on this screen: the route's hero, else whoever is playing */
const heroId = computed(() => String(route.params.userId || userStore.currentUser?.id || ""));

const openBank = () => {
  play$fx("select");
  void router.push({ name: "bank", params: { userId: heroId.value } });
};
</script>

<template>
  <button
    v-if="bill > 0"
    type="button"
    class="grounded-chip"
    :class="{ compact }"
    data-cy="grounded-chip"
    :aria-label="`Grounded. You owe the Hospital ${bill} gold. Open the Gold Bank to pay it.`"
    @click.stop="openBank"
  >
    <i class="fad fa-hospital" aria-hidden="true" />
    <span class="grounded-word">GROUNDED</span>
    <span class="grounded-bill"><template v-if="!compact">Bill </template>₲{{ bill }}</span>
  </button>
</template>

<style lang="scss" scoped>
.grounded-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 20px;
  padding: 1px 8px;
  border: 2px solid #ffd9d9;
  border-radius: 3px;
  background: linear-gradient(180deg, #b32020, #6d0f0f);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.55), 0 0 10px rgba(255, 68, 68, 0.35);
  color: #fff;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 1px;
  line-height: 1;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  // The HUD and the vitals bar let touches through; the chip is the one part that listens
  pointer-events: auto;
  cursor: pointer;

  i {
    font-size: 0.75rem;
    color: #ffd9d9;
  }

  .grounded-bill {
    color: #ffe9a8;
  }

  &.compact {
    min-height: 16px;
    padding: 0 6px;
    font-size: 0.6rem;
  }
}
</style>
