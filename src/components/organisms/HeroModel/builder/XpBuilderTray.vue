<template>
  <div class="builder-tray">
    <!-- The options for the chosen tab. It scrolls inside itself, never the page; a new tab or side starts at the top. -->
    <div
      :key="`${tab.id}-${showStyles ? 'style' : 'colour'}`"
      class="tray-body"
      role="region"
      :aria-label="`${tab.label} options`"
    >
      <!-- Style side: one picture of the player's own hero per option; a titled section starts at a heading -->
      <div
        v-if="showStyles"
        class="tile-grid"
      >
        <template
          v-for="tile in tiles"
          :key="tile.option"
        >
          <h4
            v-if="tile.heading"
            class="tile-heading"
            data-cy="tray-heading"
          >
            {{ tile.heading }}
          </h4>
          <button
            type="button"
            class="tile"
            :class="{ active: tile.chosen, painted: !!tile.swatch, 'light-swatch': tile.lightSwatch }"
            :style="tile.swatch ? { backgroundColor: tile.swatch } : undefined"
            data-cy="look-tile"
            :data-option="tile.option"
            :aria-label="tile.label"
            :aria-pressed="tile.chosen"
            @click="pickStyle(tile.option)"
          >
            <img
              v-if="tile.src"
              class="tile-picture"
              :src="tile.src"
              alt=""
              :width="TILE_SIZE"
              :height="TILE_SIZE"
              draggable="false"
            />
            <span
              v-else
              class="tile-label"
              >{{ tile.label }}</span
            >
          </button>
        </template>
      </div>

      <!-- Colour side (or the only side on a tab with colours and no styles): one labelled group of swatches per colour the tab sets -->
      <template v-else>
        <section
          v-for="group in tab.colors"
          :key="group.key"
          class="picker"
          role="group"
          :aria-label="group.label"
        >
          <h4 class="picker-title">{{ group.label }}</h4>
          <div class="color-grid">
            <button
              v-for="swatch in group.swatches"
              :key="swatch.value"
              type="button"
              class="swatch"
              :class="{ active: modelValue[group.key] === swatch.value }"
              :style="{ backgroundColor: swatch.color }"
              :aria-label="swatch.name"
              :aria-pressed="modelValue[group.key] === swatch.value"
              @click="pickColour(group.key, swatch.value)"
            ></button>
          </div>
        </section>
      </template>
    </div>

    <!-- Style | Colour, under the thumb; a tab with only one side has no switch -->
    <div
      v-if="showSwitch"
      class="mode-switch"
      role="group"
      aria-label="Style or colour"
    >
      <button
        v-for="side in SIDES"
        :key="side.id"
        type="button"
        class="mode"
        :class="{ active: mode === side.id }"
        data-cy="tray-mode"
        :data-mode="side.id"
        :aria-pressed="mode === side.id"
        @click="pickMode(side.id)"
      >
        {{ side.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from "vue";
  import type { HeroLook } from "@/lib/hero-look/types";
  import { optionLabel, optionSwatch, tileLook, type LookTab } from "../lookEditor";
  import type { LookThumbnailer } from "../useLookThumbnails";

  /**
   * The hero builder's tray: the options for the chosen tab, as picture tiles (the player's own hero wearing each
   * option) on the Style side and as colour swatches on the Colour side. It only emits: `update:modelValue` with the
   * draft and exactly one key changed, `update:mode` when the other side is tapped. No Ionic, no sounds.
   */
  type Mode = "style" | "colour";

  interface BuilderTrayProps {
    /** The draft look, without the hands */
    modelValue: HeroLook;
    tab: LookTab;
    mode: Mode;
    thumbnails: LookThumbnailer;
  }

  interface BuilderTrayEmits {
    (e: "update:modelValue", look: HeroLook): void;
    (e: "update:mode", mode: Mode): void;
  }

  const props = defineProps<BuilderTrayProps>();

  const emit = defineEmits<BuilderTrayEmits>();

  interface BuilderTile {
    option: string;
    label: string;
    heading: string | undefined;
    swatch: string | undefined;
    lightSwatch: boolean;
    src: string;
    chosen: boolean;
  }

  /** The tile pictures are drawn at this size (pixels) */
  const TILE_SIZE = 96;

  const SIDES: { id: Mode; label: string }[] = [
    { id: "style", label: "Style" },
    { id: "colour", label: "Colour" },
  ];

  /** Both sides exist only when the tab has styles and at least one colour group */
  const showSwitch = computed(() => !!props.tab.styles && props.tab.colors.length > 0);

  /** A tab with one side shows it, whatever side the parent asks for; with both, the parent's choice wins */
  const showStyles = computed(() => !!props.tab.styles && (props.tab.colors.length === 0 || props.mode === "style"));

  /** A painted tile this bright takes dark lettering; the darker ones keep the cream */
  const isLight = (hex: string): boolean => {
    const value = parseInt(hex.replace("#", ""), 16);
    const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
  };

  /**
   * The picture is "" until it is drawn (or without WebGL): the tile then shows the option's name, on its colour if it has one.
   * The thumbnailer draws the newest request first, so the pictures are asked for from the last tile to the first:
   * the tiles at the top of the grid, which are on screen, draw first. The tiles themselves stay in reading order.
   */
  const tiles = computed(() => {
    const styles = props.tab.styles;
    if (!styles) return [];
    const made: BuilderTile[] = [];
    for (let index = styles.options.length - 1; index >= 0; index--) {
      const option = styles.options[index];
      const swatch = optionSwatch(props.tab, option);
      made[index] = {
        option,
        label: optionLabel(props.tab, option),
        heading: styles.headings?.[option],
        swatch,
        lightSwatch: !!swatch && isLight(swatch),
        src: props.thumbnails.get(
          tileLook(props.modelValue, props.tab, option),
          props.tab.tileFocus ?? props.tab.focus,
          TILE_SIZE,
        ),
        chosen: props.modelValue[styles.key] === option,
      };
    }
    return made;
  });

  const change = (key: keyof HeroLook, value: string) => {
    emit("update:modelValue", { ...props.modelValue, [key]: value });
  };

  const pickStyle = (option: string) => {
    const styles = props.tab.styles;
    if (styles) change(styles.key, option);
  };

  const pickColour = (key: keyof HeroLook, value: string) => change(key, value);

  const pickMode = (mode: Mode) => {
    const isNewMode = mode !== props.mode;
    if (isNewMode) emit("update:mode", mode);
  };
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  .builder-tray {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: $eb-color-dark-purple;
    color: $eb-color-cream;
  }

  // The only thing that scrolls: the page behind it stays put
  .tray-body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 10px 12px;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    @include eb-scrollbar();
  }

  .tile-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .tile {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    min-width: 0;
    padding: 0;
    overflow: hidden;
    font-family: $eb-font-primary, sans-serif;
    font-size: 0.9rem;
    color: $eb-color-cream;
    background: $eb-color-medium-purple;
    border: 3px solid $eb-color-slate;
    border-radius: 1px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &.active {
      border-color: $eb-color-pale-yellow;
      box-shadow: 0 0 0 2px $eb-color-pale-yellow;
    }
  }

  // A painted tile (a skin tone) is a block of its colour that frames the face; the name needs ink it can be read in
  .tile.light-swatch {
    color: $eb-color-dark-purple;
  }

  .tile-heading {
    grid-column: 1 / -1;
    margin: 6px 0 0;
    font-family: $eb-font-status, $eb-font-primary, sans-serif;
    font-size: 0.95rem;
    font-weight: normal;
    color: $eb-color-pale-yellow;
  }

  .tile-picture {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
  }

  .tile-label {
    padding: 0 2px;
    line-height: 1.1;
    text-align: center;
    overflow-wrap: anywhere;
  }

  .picker + .picker {
    margin-top: 14px;
  }

  .picker-title {
    margin: 0 0 8px;
    font-family: $eb-font-status, $eb-font-primary, sans-serif;
    font-size: 0.95rem;
    font-weight: normal;
    color: $eb-color-pale-yellow;
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    gap: 8px;
  }

  .swatch {
    width: 100%;
    aspect-ratio: 1;
    min-height: 40px;
    padding: 0;
    border: 3px solid $eb-color-dark-purple;
    border-radius: 1px;
    box-shadow: 0 0 0 2px $eb-color-slate;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &.active {
      border-color: $eb-color-white;
      box-shadow: 0 0 0 3px $eb-color-pale-yellow;
    }
  }

  .mode-switch {
    display: flex;
    flex: 0 0 auto;
    margin: 6px 12px 8px;
    border: 3px solid $eb-color-medium-purple;
  }

  .mode {
    flex: 1;
    min-height: 48px;
    padding: 0 4px;
    font-family: $eb-font-status, $eb-font-primary, sans-serif;
    font-size: 1rem;
    color: $eb-color-cream;
    background: transparent;
    border: 0;
    border-right: 3px solid $eb-color-medium-purple;
    border-radius: 1px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:last-child {
      border-right: 0;
    }

    &.active {
      color: $eb-color-dark-purple;
      background: $eb-color-pale-yellow;
    }
  }

  .tile,
  .swatch,
  .mode {
    &:focus-visible {
      outline: 2px solid $eb-color-pale-yellow;
      outline-offset: 2px;
    }
  }
</style>
