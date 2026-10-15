<template>
  <div class="battle-sheet" :class="{ 'is-busy': busy }" :data-cy="cy" role="dialog" aria-modal="true" :aria-label="title">
    <!-- Dims the arena behind the sheet; a tap out here closes it -->
    <div class="sheet-backdrop" aria-hidden="true" @click="back"></div>

    <div class="menu-container">
      <header class="sheet-header">
        <h2 class="sheet-title"><i class="fad" :class="`fa-${faIcon}`" aria-hidden="true"></i>{{ title }}</h2>
        <p class="sheet-subtitle">{{ subtitle }}</p>
      </header>

      <div class="menu-content">
        <slot />
      </div>

      <footer class="menu-footer">
        <button type="button" class="rpg-button" :data-cy="`${cy}-back`" @click="back">
          <i class="fad fa-undo" aria-hidden="true"></i>Back
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { play$fx } from "@/assets/fx";

interface BattleSheetProps {
  title: string;
  /** Font Awesome icon name without the prefix, e.g. "flask-potion" */
  faIcon: string;
  subtitle: string;
  /** Latched by the sheet after its one use: nothing may fire from the shell before the page closes it */
  busy: boolean;
  /** The sheet's `data-cy`; the Back button is `${cy}-back` */
  cy: string;
}

/**
 * The shell of a battle sheet (the potion and Powers sheets): the dimmed backdrop, the boxed container with a
 * title and one line of what the sheet does, the list in the default slot, and a Back button. The sheet that
 * holds it owns the list and the busy latch; this shell only plays the close sound and says "back".
 */
const props = defineProps<BattleSheetProps>();

const emit = defineEmits<{ (e: "back"): void }>();

/** The Back button and the dimmed backdrop both leave the sheet without using anything. */
const back = () => {
  const isBusy = props.busy;
  if (isBusy) return;
  play$fx("closeTask");
  emit("back");
};
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

$button-fill: #4a2a4a;
$button-edge: #1a0a1a;

// The same sheet as the checklist: absolute at the bottom of the contained page, never fixed or vh.
.battle-sheet {
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
  font-family: "Apple Kid", "StatusPlz", sans-serif;
  font-size: 1.4rem;
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
  font-family: "StatusPlz", monospace;
  font-size: 0.95rem;
  line-height: 1.25;
  opacity: 0.85;
}

.menu-content {
  @include eb-scrollbar();
  flex: 1 1 auto;
  min-height: 0;
  max-height: 50vh;
  padding: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

// The list the sheet slots in: a plain <ul> of rows, with the line a sheet shows when it has none
:slotted(.sheet-list) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

:slotted(.empty-state) {
  padding: 18px 8px;
  text-align: center;
  font-family: "Apple Kid", "StatusPlz", sans-serif;
  font-size: 1.15rem;
  letter-spacing: 1px;
  opacity: 0.8;
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
  font-family: "Apple Kid", "StatusPlz", sans-serif;
  font-size: 1.25rem;
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
  .rpg-button {
    transition: none;
  }
}
</style>
