<template>
  <div class="starter-lineup">
    <!-- Nine heroes to start from; the page behind it supplies the heading -->
    <div class="lineup-body">
      <div
        class="lineup-grid"
        role="group"
        aria-label="Pick a starting hero"
      >
        <button
          v-for="card in cards"
          :key="card.label"
          type="button"
          class="card"
          data-cy="starter-hero"
          :aria-label="card.label"
          @click="emit('pick', card.look)"
        >
          <img
            v-if="card.src"
            class="card-picture"
            :src="card.src"
            alt=""
            :width="CARD_SIZE"
            :height="CARD_SIZE"
            draggable="false"
          />
          <span
            v-else
            class="card-label"
            >{{ card.label }}</span
          >
        </button>
      </div>
    </div>

    <!-- The buttons sit at the bottom, under the thumb -->
    <div class="lineup-footer">
      <button
        type="button"
        class="roll-button"
        data-cy="starter-roll"
        @click="roll"
      >
        <i class="fad fa-dice roll-icon"></i>
        <span>Roll 9 more</span>
      </button>
      <button
        v-if="allowPortrait"
        type="button"
        class="portrait-button"
        data-cy="look-use-portrait"
        @click="emit('portrait')"
      >
        Use a 2D portrait instead
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, shallowRef } from "vue";
  import type { HeroLook } from "@/lib/hero-look/types";
  import { starterLineup, type Rng } from "../lookEditor";
  import type { LookThumbnailer } from "../useLookThumbnails";

  /**
   * The starter lineup for a brand-new profile: nine random heroes in a 3 x 3 grid, a button that deals nine more
   * and, when the builder allows it, a way out to a 2D portrait. It only emits: `pick` with the chosen look,
   * `portrait`. No Ionic, no sounds; the builder screen decides what each tap does.
   */
  const props = defineProps<{
    thumbnails: LookThumbnailer;
    /** Offer "Use a 2D portrait instead" (when the hero cannot be drawn, say) */
    allowPortrait: boolean;
    /** The random source for the deals; `Math.random` when left out (a seeded one in specs) */
    rng?: Rng;
  }>();

  const emit = defineEmits<{
    (e: "pick", look: HeroLook): void;
    (e: "portrait"): void;
  }>();

  const COUNT = 9;
  /** The card pictures are drawn at this size (pixels) */
  const CARD_SIZE = 128;

  const looks = shallowRef<HeroLook[]>(starterLineup(COUNT, props.rng));

  const roll = () => {
    looks.value = starterLineup(COUNT, props.rng);
  };

  /** The picture is "" until it is drawn (or without WebGL): the card then shows "Hero 1" and so on */
  const cards = computed(() =>
    looks.value.map((look, index) => ({
      look,
      label: `Hero ${index + 1}`,
      src: props.thumbnails.get(look, "full", CARD_SIZE),
    })),
  );
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  $roll-gold: #f0c040;
  $roll-gold-edge: #a87c10;
  $roll-gold-pressed: #d8a830;

  .starter-lineup {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: $eb-color-dark-purple;
    color: $eb-color-cream;
  }

  // The grid is centred in the space above the footer; a short screen scrolls here, not the page
  .lineup-body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    padding: 12px;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    @include eb-scrollbar();
  }

  .lineup-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
    max-width: 480px;
    margin: auto;
  }

  .card {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    min-width: 0;
    padding: 0;
    overflow: hidden;
    font-family: $eb-font-status, $eb-font-primary, sans-serif;
    font-size: 1rem;
    color: $eb-color-cream;
    background: $eb-color-medium-purple;
    border: 3px solid $eb-color-slate;
    border-radius: 1px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:active {
      border-color: $eb-color-pale-yellow;
    }

    &:focus-visible {
      outline: 2px solid $eb-color-pale-yellow;
      outline-offset: 2px;
    }
  }

  .card-picture {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
  }

  .card-label {
    padding: 0 2px;
    text-align: center;
  }

  .lineup-footer {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 8px;
    padding: 8px 12px 12px;
    border-top: 3px solid $eb-color-medium-purple;
  }

  .roll-button,
  .portrait-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 52px;
    padding: 0 12px;
    font-family: $eb-font-status, $eb-font-primary, sans-serif;
    border-radius: 1px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:focus-visible {
      outline: 2px solid $eb-color-pale-yellow;
      outline-offset: 2px;
    }
  }

  .roll-button {
    font-size: 1.1rem;
    color: $eb-color-dark-purple;
    background: $roll-gold;
    border: 3px solid $roll-gold-edge;

    &:active {
      background: $roll-gold-pressed;
    }
  }

  .roll-icon {
    font-size: 1.3rem;
    --fa-primary-color: currentColor;
    --fa-secondary-color: currentColor;
    --fa-secondary-opacity: 0.55;
  }

  .portrait-button {
    min-height: 48px;
    font-size: 0.95rem;
    color: $eb-color-cream;
    background: transparent;
    border: 3px solid $eb-color-medium-purple;

    &:active {
      background: $eb-color-medium-purple;
    }
  }
</style>
