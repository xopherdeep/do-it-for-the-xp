<template>
  <Transition name="choice-reveal" :duration="{ enter: 260, leave: 420 }">
    <div
      v-if="open"
      ref="root"
      class="choice-reveal"
      tabindex="-1"
      :class="[`kind-${kind}`, { 'has-sprite': sprite, 'has-art': showArt }]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="choice-reveal-title"
      data-cy="choice-reveal"
      :data-kind="kind"
      @keydown.esc.prevent="leave"
    >
      <div class="choice-reveal__backdrop" aria-hidden="true"></div>

      <!-- The sprite (tablet, coins) or art (beast portrait) in its light above the sheet, like the chests and door -->
      <div v-if="hasStage" class="choice-reveal__stage" aria-hidden="true">
        <div class="choice-reveal__rays"></div>
        <div class="choice-reveal__flash"></div>
        <svg
          v-if="sprite"
          class="choice-sprite"
          :viewBox="`0 0 ${sprite.width} ${sprite.height}`"
          shape-rendering="crispEdges"
          role="presentation"
        >
          <pixel-runs :runs="sprite.runs" />
        </svg>
        <figure
          v-else-if="showArt && art"
          class="choice-reveal__art"
          :class="`frame-${art.frame ?? 'beast'}`"
          data-cy="choice-art"
        >
          <img class="choice-reveal__art-img" :src="art.src" :alt="art.alt" draggable="false" @error="artFailed = true" />
        </figure>
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
import { EXIT_H, EXIT_W, dungeonExitRuns } from "./exitSprite";
import type { PixelRun } from "./pixelGrid";
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

type RevealKind = "riddle" | "shop" | "sheet" | "exit";

/** A picture for the top of the panel: a beast's portrait in its checkered frame, or a view of the room. */
interface RevealArt {
  src: string;
  alt: string;
  frame?: "beast" | "room";
}

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
  /** A picture above the title, shown from the moment the reveal opens (an encounter's beast). No source, no picture. */
  art?: RevealArt;
  /** Temple element for theme-aware sprite palettes */
  element?: string;
  /** Custom pixel-run sprite to render in the stage */
  sprite?: { runs: PixelRun[]; width: number; height: number };
}>();

const emit = defineEmits<{
  (e: "choose", id: string): void;
  (e: "leave"): void;
  (e: "confirm"): void;
}>();

const root = ref<HTMLElement | null>(null);
const selectedId = ref<string | null>(null);
/** The reveal has answered; it is on its way out, and a second tap must not answer again (or buy twice). */
let spent = false;

const isSheet = computed(() => props.kind === "sheet" || props.kind === "exit");

// A picture that will not load is dropped, never left as a broken-image icon
const artFailed = ref(false);
const showArt = computed(() => Boolean(props.art?.src) && !artFailed.value);
watch(
  () => props.art?.src,
  () => {
    artFailed.value = false;
  },
);

const confirmText = computed(() => props.confirmLabel ?? (props.kind === "shop" ? "Buy" : "Answer"));
const cancelText = computed(() => props.cancelLabel ?? (props.kind === "riddle" ? "Step back" : props.kind === "exit" ? "Back" : "Leave"));

const sprite = computed(() => {
  if (props.sprite) return props.sprite;
  if (props.kind === "riddle") return { runs: tabletRuns(), width: TABLET_W, height: TABLET_H };
  if (props.kind === "shop") return { runs: coinStackRuns(), width: COINS_W, height: COINS_H };
  if (props.kind === "exit") return { runs: dungeonExitRuns(props.element), width: EXIT_W, height: EXIT_H };
  return null;
});

const hasStage = computed(() => Boolean(sprite.value) || showArt.value);

const rowLabel = (choice: RevealChoice): string =>
  props.kind === "shop" && choice.price !== undefined ? `${choice.label} · ${choice.price} GP` : choice.label;

const pick = (choice: RevealChoice) => {
  const isPickBlocked = spent || choice.disabled;
  if (isPickBlocked) return;
  if (isSheet.value) {
    spent = true;
    emit("choose", choice.id);
    return;
  }
  selectedId.value = choice.id;
  play$fx("cursor");
};

const confirm = () => {
  const hasNothingToConfirm = spent || selectedId.value === null;
  if (hasNothingToConfirm) return;
  const choice = props.choices.find((item) => item.id === selectedId.value);
  const isChoiceUnavailable = !choice || choice.disabled;
  if (isChoiceUnavailable) return;
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

<style lang="scss" scoped src="./_TempleChoiceReveal.scss" />
