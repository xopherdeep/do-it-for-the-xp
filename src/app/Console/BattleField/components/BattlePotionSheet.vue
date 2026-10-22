<template>
  <BattleSheet
    title="Bottles"
    fa-icon="flask-potion"
    subtitle="Drinking one keeps your move."
    :busy="isBusy"
    cy="potion-sheet"
    @back="emit('cancel')"
  >
    <ul v-if="potions.length" class="sheet-list" role="list">
      <li v-for="potion in potions" :key="potion.id">
        <button
          type="button"
          class="battle-item"
          :class="{ 'is-unusable': !!potion.reason }"
          :disabled="!!potion.reason"
          :data-cy="`potion-${potion.id}`"
          @click="drink(potion)"
        >
          <i class="item-icon fad" :class="`fa-${potion.faIcon}`" :style="tintStyle(potion)" aria-hidden="true"></i>
          <span class="item-body">
            <span class="item-title">
              <span class="item-name">{{ potion.name }}</span>
              <span class="item-qty">x{{ potion.qty }}</span>
            </span>
            <span class="item-effect">{{ potion.effect }}</span>
            <span v-if="potion.reason" class="item-reason">{{ potion.reason }}</span>
          </span>
        </button>
      </li>
    </ul>
    <p v-else class="empty-state">Your bottles are empty. Temple shops brew potions.</p>
  </BattleSheet>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { PotionCard } from "@/lib/services/battle/BattlePotions";
import BattleSheet from "./BattleSheet.vue";

/**
 * The potion sheet: the bottles in the hero's pack, each with its icon, name, count and one line of what it
 * restores, greyed with the reason when it cannot be drunk. The page decides what a drink does (BattlePotions)
 * and plays the use sounds; this sheet only plays its own close sound (in the shell).
 */
defineProps<{ potions: PotionCard[] }>();

const emit = defineEmits<{
  (e: "cancel"): void;
  (e: "drink", id: string): void;
}>();

/** The flask's colours as the duotone variables, when the card carries a tint. */
const tintStyle = (potion: PotionCard): Record<string, string> => {
  const tint = potion.tint;
  if (!tint) return {};
  return {
    "--fa-primary-color": `var(--xp-color-${tint.primary})`,
    "--fa-secondary-color": `var(--xp-color-${tint.secondary})`,
    "--fa-secondary-opacity": "1",
  };
};

/** Latched by a drink: the page closes the sheet next, so nothing else may fire from it before it is gone. */
const isBusy = ref(false);

const drink = (potion: PotionCard) => {
  const cannotDrink = isBusy.value || !!potion.reason;
  if (cannotDrink) return;
  isBusy.value = true;
  emit("drink", potion.id);
};
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

.battle-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  margin: 0;
  padding: 10px 14px 10px 18px;
  border: 2px solid rgba($eb-color-cream, 0.22);
  border-radius: 2px;
  background: rgba($eb-color-cream, 0.04);
  color: $eb-color-cream;
  text-align: left;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;

  &:active:not(:disabled) {
    transform: scale(0.985);
  }

  &:focus-visible {
    outline: 2px solid $eb-color-pale-yellow;
    outline-offset: 2px;
  }

  // Greyed: the reason under the name says why
  &.is-unusable {
    opacity: 0.5;
    cursor: default;
  }
}

.item-icon {
  flex: 0 0 auto;
  width: 1.6rem;
  font-size: 1.3rem;
  text-align: center;
  color: $eb-color-pale-yellow;
}

.item-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.item-name {
  font-family: "Apple Kid", "StatusPlz", sans-serif;
  font-size: 1.25rem;
  letter-spacing: 1px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.item-qty {
  flex: 0 0 auto;
  font-family: "StatusPlz", monospace;
  font-size: 0.95rem;
  color: $eb-color-pale-yellow;
}

.item-effect,
.item-reason {
  font-family: "StatusPlz", monospace;
  font-size: 0.85rem;
  line-height: 1.25;
  opacity: 0.85;
  white-space: normal;
}

.item-reason {
  color: #ff6b6b;
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .battle-item {
    transition: none;
  }
}
</style>
