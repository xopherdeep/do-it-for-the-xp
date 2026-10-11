<template>
  <Transition name="choice-reveal" :duration="{ enter: 260, leave: 420 }">
    <div
      v-if="open"
      ref="root"
      class="choice-reveal"
      tabindex="-1"
      :class="[`kind-${kind}`, { 'has-sprite': sprite }]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="choice-reveal-title"
      data-cy="choice-reveal"
      :data-kind="kind"
      @keydown.esc.prevent="leave"
    >
      <div class="choice-reveal__backdrop" aria-hidden="true"></div>

      <!-- The tablet on the wall, or the shopkeeper's coins, in the light of the reveal. A room's actions have none. -->
      <div v-if="sprite" class="choice-reveal__stage" aria-hidden="true">
        <div class="choice-reveal__rays"></div>
        <div class="choice-reveal__flash"></div>
        <svg
          class="choice-sprite"
          :viewBox="`0 0 ${sprite.width} ${sprite.height}`"
          shape-rendering="crispEdges"
          role="presentation"
        >
          <pixel-runs :runs="sprite.runs" />
        </svg>
      </div>

      <section class="choice-reveal__panel">
        <h2 id="choice-reveal-title" class="choice-reveal__title">
          <span>{{ title }}</span>
        </h2>
        <p v-if="subtitle" class="choice-reveal__subtitle" data-cy="choice-subtitle">{{ subtitle }}</p>
        <p v-if="body" class="choice-reveal__body" data-cy="choice-body">{{ body }}</p>

        <ul class="choice-list" :role="isSheet ? 'menu' : 'radiogroup'" aria-labelledby="choice-reveal-title">
          <li v-for="choice in choices" :key="choice.id" role="none">
            <button
              type="button"
              class="choice-row"
              :class="{ 'is-selected': selectedId === choice.id, 'is-sold-out': choice.disabled }"
              :role="isSheet ? 'menuitem' : 'radio'"
              :aria-checked="isSheet ? undefined : selectedId === choice.id"
              :disabled="choice.disabled"
              :data-cy="`choice-${choice.id}`"
              @click.stop="pick(choice)"
            >
              <span class="choice-row__text">
                <span class="choice-row__label">{{ rowLabel(choice) }}</span>
                <span v-if="choice.hint" class="choice-row__hint">{{ choice.hint }}</span>
              </span>
              <span v-if="choice.disabled && kind === 'shop'" class="choice-row__tag">sold out</span>
              <span v-else-if="isSheet" class="choice-row__caret" aria-hidden="true">
                <i class="fas fa-caret-right"></i>
              </span>
              <span v-else class="choice-row__check" aria-hidden="true">
                <i class="fas fa-check"></i>
              </span>
            </button>
          </li>
        </ul>

        <div class="choice-reveal__actions">
          <button
            v-if="!isSheet"
            type="button"
            class="choice-button choice-button--confirm"
            data-cy="choice-confirm"
            :disabled="selectedId === null"
            @click.stop="confirm"
          >
            {{ confirmText }}
            <i class="fas fa-caret-right" aria-hidden="true"></i>
          </button>
          <button type="button" class="choice-button choice-button--ghost" data-cy="choice-leave" @click.stop="leave">
            {{ cancelText }}
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { play$fx } from "@/assets/fx";
import { COINS_H, COINS_W, TABLET_H, TABLET_W, coinStackRuns, tabletRuns } from "./tabletSprite";
import PixelRuns from "./PixelRuns.vue";

interface RevealChoice {
  id: string;
  label: string;
  /** A second, smaller line under the label */
  hint?: string;
  /** Shown but out of reach (a shop's sold-out ware) */
  disabled?: boolean;
  /** A shop's price in GP, shown after the label */
  price?: number;
}

type RevealKind = "riddle" | "shop" | "sheet";

/**
 * The temple's third reveal, in the style of the chest and the doors: the riddle on the wall, the shopkeeper's wares
 * and a room's actions come up in a pixel-art panel at the bottom of the screen, with the sprite in its light above.
 * The riddle and the shop pick one row and then press the confirm button (nothing is picked at first, so a stray tap
 * never answers or buys); a room's actions are taps that act at once. The cancel button is always last. The page owns
 * `open`, and closes the reveal on `choose` or `leave`.
 */
const props = defineProps<{
  open: boolean;
  kind: RevealKind;
  title: string;
  subtitle?: string;
  /** The riddle's question */
  body?: string;
  choices: RevealChoice[];
  /** The confirm button's text: "Answer" for the riddle, "Buy" for the shop */
  confirmLabel?: string;
  /** The cancel button's text: "Step back" for the riddle, "Leave" for the others */
  cancelLabel?: string;
}>();

const emit = defineEmits<{
  (e: "choose", id: string): void;
  (e: "leave"): void;
}>();

const root = ref<HTMLElement | null>(null);
const selectedId = ref<string | null>(null);
/** The reveal has answered; it is on its way out, and a second tap must not answer again (or buy twice). */
let spent = false;

const isSheet = computed(() => props.kind === "sheet");

const confirmText = computed(() => props.confirmLabel ?? (props.kind === "shop" ? "Buy" : "Answer"));
const cancelText = computed(() => props.cancelLabel ?? (props.kind === "riddle" ? "Step back" : "Leave"));

const sprite = computed(() => {
  if (props.kind === "riddle") return { runs: tabletRuns(), width: TABLET_W, height: TABLET_H };
  if (props.kind === "shop") return { runs: coinStackRuns(), width: COINS_W, height: COINS_H };
  return null;
});

const rowLabel = (choice: RevealChoice): string =>
  props.kind === "shop" && choice.price !== undefined ? `${choice.label} · ${choice.price} GP` : choice.label;

const pick = (choice: RevealChoice) => {
  if (spent || choice.disabled) return;
  if (isSheet.value) {
    spent = true;
    emit("choose", choice.id);
    return;
  }
  selectedId.value = choice.id;
  play$fx("cursor");
};

const confirm = () => {
  if (spent || selectedId.value === null) return;
  const choice = props.choices.find((item) => item.id === selectedId.value);
  if (!choice || choice.disabled) return;
  spent = true;
  emit("choose", choice.id);
};

const leave = () => {
  if (spent) return;
  spent = true;
  play$fx("closeMenu");
  emit("leave");
};

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    spent = false;
    selectedId.value = null;
    play$fx("openMenu");
    // The dialog holds the focus from the start, so Escape leaves
    nextTick(() => root.value?.focus({ preventScroll: true }));
  },
  { immediate: true },
);

// A fresh set of choices starts with nothing picked
watch(
  () => props.choices.map((choice) => choice.id).join("|"),
  () => {
    selectedId.value = null;
  },
);
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;
@use "./templeReveal" as *;

$cv-ink: $reveal-ink;
// The sprites are 48 x 40 drawn at 3x
$cv-sprite-scale: 3;

// ---------------------------------------------------------------------------------------------------------------
// The overlay. It covers the temple page, with the panel docked to the bottom and the sprite in the room above it.
// ---------------------------------------------------------------------------------------------------------------
.choice-reveal {
  --reveal-glow: #{$eb-color-sky-blue};
  --reveal-glow-soft: rgba(104, 168, 216, 0.4);
  @include reveal-overlay-docked;

  // The shop's coins glow gold; the room's actions have no sprite, just the pale yellow of the box
  &.kind-shop {
    --reveal-glow: #{$reveal-gold};
    --reveal-glow-soft: rgba(255, 216, 74, 0.45);
  }
  &.kind-sheet {
    --reveal-glow: #{$eb-color-pale-yellow};
    --reveal-glow-soft: rgba(247, 232, 168, 0.25);
  }
}

.choice-reveal__backdrop {
  @include reveal-backdrop(30%);
}

// A room's actions come up over the room, which stays faintly there behind the dark
.kind-sheet .choice-reveal__backdrop {
  background: rgba(10, 2, 10, 0.78);
}

// ---------------------------------------------------------------------------------------------------------------
// The stage: the sprite in a wheel of light, centred in the room the panel leaves above it
// ---------------------------------------------------------------------------------------------------------------
.choice-reveal__stage {
  position: relative;
  z-index: 2;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.choice-reveal__rays {
  @include reveal-rays(440px);
  left: 50%;
  top: 50%;
  animation: reveal-rays-in 0.5s 0.1s ease-out forwards, reveal-rays-turn 24s linear infinite;
}

.choice-reveal__flash {
  @include reveal-flash(80px);
  z-index: 3;
  left: 50%;
  top: 50%;
  animation: reveal-flash 0.55s 0.1s ease-out forwards;
}

.choice-sprite {
  position: relative;
  z-index: 2;
  display: block;
  width: 48px * $cv-sprite-scale;
  height: 40px * $cv-sprite-scale;
  overflow: visible;
  filter: drop-shadow(0 6px 0 rgba(0, 0, 0, 0.45)) drop-shadow(0 0 10px var(--reveal-glow-soft));
  animation: choice-land 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.25) both;
}

// A short phone has no room for the sprite: the choices come first
@media (max-height: 660px) {
  .choice-reveal__stage {
    display: none;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The panel: the RPG box with the title, the question and the choices, and the buttons under them
// ---------------------------------------------------------------------------------------------------------------
.choice-reveal__panel {
  @include reveal-panel;
  display: flex;
  flex-direction: column;
  flex: 0 1 auto;
  min-height: 0;
  // The ring around the box reaches 16 px outside it: the overlay's own padding keeps it on screen
  max-height: calc(100% - 16px);
  animation: reveal-panel-in 0.32s 0.06s cubic-bezier(0.2, 0.9, 0.3, 1.15) forwards;
}

.choice-reveal__title {
  @include reveal-title;
  flex: none;
}

// A room's header is a sentence ("The way out is behind you."), not a name: it reads smaller than a riddle's title
.kind-sheet .choice-reveal__title {
  font-size: 1.2rem;
  line-height: 1.3;
}

.choice-reveal__subtitle {
  @include reveal-text;
  flex: none;
  font-size: 1.15rem;
}

.kind-shop .choice-reveal__subtitle {
  color: var(--xp-color-gp, #{$reveal-gold});
  text-shadow: 1px 1px 0 $cv-ink;
}

.choice-reveal__body {
  @include reveal-text;
  flex: none;
  margin-top: 8px;
  font-size: 1.2rem;
  color: $eb-color-cream;
}

.choice-list {
  @include reveal-choice-list;
}

.choice-row {
  @include reveal-choice-row;
  font-family: $eb-font-primary;
}

.choice-row__text {
  display: grid;
  min-width: 0;
  line-height: 1.15;
}

.choice-row__label {
  font-family: $eb-font-status;
  font-size: 1.05rem;
  color: $eb-color-cream;
  text-shadow: 1px 1px 0 $cv-ink;
  overflow-wrap: anywhere;
}

.choice-row__hint {
  margin-top: 2px;
  font-family: $eb-font-primary;
  font-size: 0.95rem;
  color: rgba(231, 230, 179, 0.82);
}

.choice-row__check {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border: 2px solid rgba(231, 230, 179, 0.4);
  border-radius: 2px;
  background: transparent;
  color: transparent;
  font-size: 0.8rem;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.choice-row__caret {
  color: $eb-color-pale-yellow;
  font-size: 1.1rem;
}

.choice-row__tag {
  padding: 2px 6px;
  border: 2px solid rgba(231, 230, 179, 0.4);
  border-radius: 2px;
  font-family: $eb-font-status;
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(231, 230, 179, 0.8);
}

.choice-row.is-selected {
  @include reveal-choice-row-selected;

  .choice-row__label {
    color: $eb-color-pale-yellow;
  }
  .choice-row__check {
    border-color: $eb-color-pale-yellow;
    background: $eb-color-pale-yellow;
    color: $cv-ink;
  }
}

.choice-reveal__actions {
  @include reveal-actions-stacked;
}

.choice-button {
  @include reveal-button;
  @include reveal-button-tall;
  width: 100%;
}

.choice-button--ghost {
  @include reveal-button-ghost;
}

.choice-button--confirm {
  @include reveal-button-primary;
}

// ---------------------------------------------------------------------------------------------------------------
// Coming and going: the same as the chest, with the panel sinking back as the dark fades
// ---------------------------------------------------------------------------------------------------------------
.choice-reveal-enter-active {
  transition: opacity 0.26s ease;
}
.choice-reveal-enter-from {
  opacity: 0;
}
.choice-reveal-leave-active {
  transition: opacity 0.3s 0.12s ease;
  // Whatever was picked has been answered: nothing under the fading panel takes a tap
  pointer-events: none;

  .choice-reveal__panel {
    animation: reveal-panel-out 0.26s ease-in forwards;
  }
  .choice-reveal__stage {
    transition: transform 0.3s ease-in;
    transform: translateY(14px) scale(0.96);
  }
}
.choice-reveal-leave-to {
  opacity: 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Keyframes
// ---------------------------------------------------------------------------------------------------------------
@include reveal-keyframes;

@keyframes choice-land {
  0% { transform: translateY(-40px) scale(0.85); opacity: 0; }
  60% { transform: translateY(4px) scale(1.04, 0.94); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .choice-sprite,
  .choice-reveal__rays,
  .choice-reveal__flash,
  .choice-reveal__panel,
  .choice-button--confirm i {
    animation: none !important;
  }
  .choice-reveal__rays {
    opacity: 0.4;
    transform: none;
  }
  .choice-reveal__panel {
    opacity: 1;
    transform: none;
  }
}
</style>
