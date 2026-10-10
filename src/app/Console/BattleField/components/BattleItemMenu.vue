<template>
  <div class="battle-item-menu" :class="{ 'is-busy': busy }" data-cy="item-sheet" role="dialog" aria-modal="true" aria-label="Item">
    <!-- Dims the arena behind the sheet; a tap out here closes it -->
    <div class="sheet-backdrop" aria-hidden="true" @click="back"></div>

    <div class="menu-container">
      <header class="sheet-header">
        <h2 class="sheet-title"><i class="fad fa-backpack" aria-hidden="true"></i>Item</h2>
        <p class="sheet-subtitle">What your hands hold. Using one keeps your move.</p>
      </header>

      <ul class="menu-content" role="list">
        <li v-if="!left && !right" class="empty-state">Nothing equipped. Visit the Area tab.</li>

        <!-- The two hands, left then right, as the bottom nav shows them -->
        <li v-for="hand in hands" :key="hand.side" class="item-row">
          <button
            type="button"
            class="battle-item"
            :class="{ 'is-unusable': !hand.card || !!hand.card.reason }"
            :disabled="!hand.card || !!hand.card.reason"
            :data-cy="`item-${hand.side}`"
            :aria-label="hand.card ? `${hand.side} hand: ${hand.card.name}` : `${hand.side} hand: empty`"
            @click="hand.card && use(hand.card)"
          >
            <i class="item-icon fad" :class="iconClass(hand.card)" aria-hidden="true"></i>
            <span class="item-body">
              <span class="item-title">
                <span class="item-name">{{ hand.card ? hand.card.name : "Empty hand" }}</span>
                <span v-if="hand.card && hand.card.mp > 0" class="item-mp">{{ hand.card.mp }} MP</span>
              </span>
              <span class="item-effect">{{ hand.card ? hand.card.effect : `Nothing in your ${hand.side} hand.` }}</span>
              <span v-if="hand.card && hand.card.reason && hand.card.reason !== hand.card.effect" class="item-reason">
                {{ hand.card.reason }}
              </span>
            </span>
          </button>
        </li>
      </ul>

      <footer class="menu-footer">
        <button type="button" class="rpg-button" data-cy="item-back" @click="back">
          <i class="fad fa-undo" aria-hidden="true"></i>Back
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { play$fx } from "@/assets/fx";
import type { BattleItemCard } from "@/lib/services/battle/BattleItems";

/**
 * The Item sheet: the hero's two hands, each with its name, MP cost and one line of what it does in a
 * fight, greyed with the reason when it cannot be used. The page decides what a tap does (BattleItems)
 * and plays the sounds; this sheet only plays its own cursor and close sounds.
 */
const props = defineProps<{
  left: BattleItemCard | null;
  right: BattleItemCard | null;
}>();

const emit = defineEmits<{
  (e: "cancel"): void;
  (e: "use", card: BattleItemCard): void;
}>();

/** Latched by a use: the page closes the sheet next, so nothing else may fire from it before it is gone. */
const busy = ref(false);

const hands = computed(() => [
  { side: "left", card: props.left },
  { side: "right", card: props.right },
]);

/** "wand-magic ice" -> "fa-wand-magic ice", the way the bottom nav draws the hands (the second word tints the icon). */
const iconClass = (card: BattleItemCard | null): string => (card?.faIcon ? `fa-${card.faIcon}` : "fa-hand-paper");

const use = (card: BattleItemCard) => {
  if (busy.value || card.reason) return;
  busy.value = true;
  emit("use", card);
};

/** The Back button and the dimmed backdrop both leave the sheet without using anything. */
const back = () => {
  if (busy.value) return;
  play$fx("closeTask");
  emit("cancel");
};
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

$button-fill: #4a2a4a;
$button-edge: #1a0a1a;

// The same sheet as the checklist: absolute at the bottom of the contained page, never fixed or vh.
.battle-item-menu {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 600px;
  max-height: 70%;
  z-index: 200;
  display: flex;
  flex-direction: column;
  color: $eb-color-cream;
  font-family: "StatusPlz", "Apple Kid", sans-serif;
  -webkit-user-select: none;
  user-select: none;

  &.is-busy {
    pointer-events: none;
  }
}

.sheet-backdrop {
  position: absolute;
  z-index: 0;
  top: -300vh;
  bottom: 0;
  left: -100vw;
  right: -100vw;
  background: rgba(0, 0, 0, 0.45);
}

.menu-container {
  @include eb-box();
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin: 20px;
  padding: 14px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
}

.sheet-header {
  flex: 0 0 auto;
  padding: 2px 4px 12px;
  text-align: center;
}

.sheet-title {
  margin: 0;
  font-family: "Apple Kid", sans-serif;
  font-size: 1.5rem;
  font-weight: normal;
  line-height: 1.1;
  letter-spacing: 2px;
  color: $eb-color-pale-yellow;

  i {
    margin-right: 10px;
    font-size: 1.25rem;
  }
}

.sheet-subtitle {
  margin: 6px 0 0;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.95rem;
  line-height: 1.25;
  opacity: 0.85;
}

.menu-content {
  @include eb-scrollbar();
  flex: 1 1 auto;
  min-height: 0;
  max-height: 50vh;
  margin: 0;
  padding: 4px;
  list-style: none;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.item-row + .item-row {
  margin-top: 8px;
}

.empty-state {
  padding: 18px 8px;
  text-align: center;
  font-family: "Apple Kid", sans-serif;
  font-size: 1.2rem;
  letter-spacing: 1px;
  opacity: 0.8;
}

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
  font-family: "Apple Kid", sans-serif;
  font-size: 1.35rem;
  letter-spacing: 1px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.item-mp {
  flex: 0 0 auto;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.95rem;
  color: var(--xp-color-mp, #{$eb-color-pale-yellow});
}

.item-effect,
.item-reason {
  font-family: "StatusPlz", sans-serif;
  font-size: 0.95rem;
  line-height: 1.25;
  opacity: 0.85;
  white-space: normal;
}

.item-reason {
  color: #ff6b6b;
  opacity: 1;
}

.menu-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 2px solid rgba($eb-color-cream, 0.15);
}

.rpg-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 140px;
  min-height: 48px;
  margin: 0;
  padding: 8px 14px;
  border: 3px solid rgba($eb-color-cream, 0.45);
  border-radius: 2px;
  background: $button-fill;
  color: $eb-color-cream;
  font-family: "Apple Kid", sans-serif;
  font-size: 1.3rem;
  letter-spacing: 1px;
  line-height: 1.1;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  box-shadow: 0 4px 0 $button-edge;
  transition: transform 0.08s ease, box-shadow 0.08s ease;

  &:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 $button-edge;
  }

  &:focus-visible {
    outline: 2px solid $eb-color-pale-yellow;
    outline-offset: 3px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .battle-item,
  .rpg-button {
    transition: none;
  }
}
</style>
