<template>
  <ion-modal
    :is-open="isOpen"
    class="room-type-modal"
    @didPresent="centerRail()"
    @didDismiss="emit('close')"
  >
    <!-- The RPG box lives on the app bar only; the page below stays light -->
    <ion-header class="ion-no-border">
      <ion-toolbar class="rpg-box guide-toolbar">
        <ion-title>
          <span class="guide-title"><i class="fad fa-dungeon mr-2"></i>{{ title }}</span>
        </ion-title>
        <ion-buttons slot="end">
          <xp-close-button
            size="lg"
            color="light"
            @click="emit('close')"
          />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- The page only reads: what the picked category or room is, and where it belongs. Everything you tap is in the footer. -->
    <ion-content
      ref="content"
      class="bg-slide bg-slide-equipment guide-content"
    >
      <!-- STEP 1: the picked category and the rooms in it -->
      <div
        v-if="step === 1 && shownCategory"
        :key="shownCategory.name"
        class="guide-page"
        :style="tintStyle(shownCategory.name)"
      >
        <section class="guide-hero">
          <div class="guide-crest">
            <i :class="['fad', shownCategory.icon, 'fa-4x']"></i>
          </div>
          <h2 class="guide-name">{{ shownCategory.name }}</h2>
          <p class="guide-lead">{{ categoryBlurb(shownCategory.name) }}</p>
          <div class="guide-chips">
            <span class="guide-chip">{{ shownCategory.types.length }} room types</span>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-heading"><i class="fad fa-list-ul"></i> Rooms in {{ shownCategory.name }}</h3>
          <ul class="guide-body guide-types">
            <li
              v-for="entry in typeEntries(shownCategory)"
              :key="entry.type"
              class="guide-type"
            >
              <i :class="['fad', entry.icon, 'fa-2x', 'type-icon']"></i>
              <span class="type-text">
                <span class="type-name">{{ entry.label }}</span>
                <span class="type-blurb">{{ entry.blurb }}</span>
              </span>
            </li>
          </ul>
        </section>

        <p class="guide-hint">Pick a category below, then choose the room.</p>
      </div>

      <!-- STEP 2: the critical path, then the card of the picked room type -->
      <div
        v-else-if="step === 2 && selectedCategory"
        :key="shownType"
        class="guide-page"
        :style="tintStyle(selectedCategory.name)"
      >
        <section class="guide-section">
          <h3 class="guide-heading"><i class="fad fa-route"></i> Critical path</h3>
          <ol
            class="guide-path"
            :aria-label="`Critical path: ${pathStops.map((stop) => stop.label).join(', ')}`"
          >
            <li
              v-for="(stop, index) in pathStops"
              :key="index"
              class="path-stop"
              :class="{ 'is-here': stop.active }"
              :aria-current="stop.active ? 'step' : undefined"
            >{{ stop.label }}</li>
          </ol>
          <p class="guide-path-note">{{ pathNote }}</p>
        </section>

        <section class="guide-hero">
          <div
            class="guide-crest"
            :class="{ 'is-egg': isEggIcon(shownGuide.icon) }"
          >
            <i :class="['fad', shownGuide.icon, 'fa-4x']"></i>
          </div>
          <h2 class="guide-name">{{ shownGuide.label }}</h2>
          <p class="guide-lead">{{ shownGuide.blurb }}</p>
          <div
            v-if="isCurrent"
            class="guide-chips"
          >
            <span class="guide-chip is-yours"><i class="fad fa-check-circle"></i> This room now</span>
          </div>
        </section>

        <section class="guide-section">
          <h3 class="guide-heading"><i class="fad fa-info-circle"></i> About this room</h3>
          <div class="guide-body guide-lines">
            <p class="guide-line"><strong>In play:</strong> {{ shownGuide.inPlay }}</p>
            <p class="guide-line"><strong>Goes:</strong> {{ shownGuide.place }}</p>
            <p
              v-if="shownGuide.needs"
              class="guide-line"
            ><strong>Needs:</strong> {{ shownGuide.needs }}</p>
          </div>
        </section>
      </div>

      <!-- STEP 2.5: Monster Config Selector, delegated via slot -->
      <div
        v-else-if="step === 2.5"
        class="guide-page guide-config"
      >
        <slot name="config-selector"></slot>
      </div>

      <!-- STEP 3: Configuration, delegated via slot -->
      <div
        v-else-if="step === 3"
        class="guide-page guide-config"
      >
        <slot name="config"></slot>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border guide-footer">
      <div class="guide-dock">
        <!-- STEP 1 rail: the five categories -->
        <div
          v-if="step === 1"
          ref="rail"
          class="guide-rail"
          role="group"
          aria-label="Categories"
        >
          <button
            v-for="category in categories"
            :key="category.name"
            type="button"
            class="rail-button"
            :class="{ 'is-selected': shownCategory && category.name === shownCategory.name }"
            :style="tintStyle(category.name)"
            :data-pick="category.name"
            :aria-pressed="!!shownCategory && category.name === shownCategory.name"
            @click="pickCategory(category)"
          >
            <span class="rail-badge">
              <i :class="['fad', category.icon, 'fa-2x']"></i>
            </span>
            <span class="rail-name">{{ category.name }}</span>
          </button>
        </div>

        <!-- STEP 2 rail: the room types of the category -->
        <div
          v-else-if="step === 2 && selectedCategory"
          ref="rail"
          class="guide-rail"
          role="group"
          :aria-label="`${selectedCategory.name} rooms`"
          :style="tintStyle(selectedCategory.name)"
        >
          <button
            v-for="entry in typeEntries(selectedCategory)"
            :key="entry.type"
            type="button"
            class="rail-button"
            :class="{ 'is-selected': entry.type === shownType, 'is-current': entry.type === currentCanonical }"
            :data-pick="entry.type"
            :aria-pressed="entry.type === shownType"
            :aria-label="entry.name"
            @click="pickType(entry.type)"
          >
            <span class="rail-badge">
              <i :class="['fad', entry.icon, 'fa-2x']"></i>
              <i
                v-if="entry.type === currentCanonical"
                class="fad fa-check-circle rail-check"
              ></i>
            </span>
            <span class="rail-name">{{ entry.name }}</span>
          </button>
        </div>

        <div class="guide-actions">
          <button
            v-if="step > 1"
            type="button"
            class="guide-back"
            aria-label="Back"
            @click="goBack"
          >
            <i class="fad fa-chevron-left"></i>
            <span>Back</span>
          </button>
          <button
            v-if="confirmLabel"
            type="button"
            class="guide-confirm"
            @click="confirm"
          >
            <i :class="['fad', confirmIcon]"></i>
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
  import { computed, nextTick, ref, watch } from "vue";
  import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonFooter } from "@ionic/vue";
  import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
  import { play$fx } from "@/assets/fx";
  import { MASTER_EGG_ICON } from "@/lib/engine/dungeons/roomTypes";
  import { ROOM_CATEGORIES } from "../hooks";
  import { canonicalRoomType, categoryBlurb, criticalPathStops, isOnCriticalPath, roomTypeGuide, roomTypeShortLabel } from "../roomTypeGuide";

  /**
   * The room type picker as a full-screen guide (the Class Codex look): the page above explains the pick, the rail of
   * categories or room types and the one Confirm button sit in the footer, under the thumb. Copy and the critical path
   * come from the pure module ../roomTypeGuide.ts. Steps: 1 category, 2 type, 2.5 monster config, 3 config.
   */
  interface RoomCategory {
    name: string;
    icon: string;
    types: string[];
  }

  const props = withDefaults(
    defineProps<{
      isOpen?: boolean;
      step?: number;
      selectedCategory?: RoomCategory | null;
      currentType?: string;
    }>(),
    { isOpen: false, step: 1, selectedCategory: null, currentType: "" }
  );

  const emit = defineEmits<{
    (e: "close"): void;
    (e: "back"): void;
    (e: "select-category", category: RoomCategory): void;
    (e: "select-type", type: string): void;
    (e: "confirm"): void;
    (e: "update:step", step: number): void;
  }>();

  const categories: RoomCategory[] = ROOM_CATEGORIES;

  // Each category keeps the colour the old picker gave it
  const TINTS: Record<string, [number, number, number]> = {
    Combat: [255, 82, 82],
    Resources: [255, 215, 64],
    Recovery: [255, 128, 171],
    Navigation: [64, 196, 255],
    Structure: [179, 136, 255],
  };
  const tintStyle = (categoryName: string) => {
    const [r, g, b] = TINTS[categoryName] ?? [247, 232, 168];
    return { "--tint": `rgb(${r}, ${g}, ${b})`, "--tint-rgb": `${r}, ${g}, ${b}` };
  };

  /** A category's room types with their guide copy, for the preview list and the rail (`name` is the short rail label) */
  const typeEntries = (category: RoomCategory) =>
    category.types.map((type) => ({ type, ...roomTypeGuide(type), name: roomTypeShortLabel(type) }));

  const isEggIcon = (icon: string) => icon === MASTER_EGG_ICON;

  // ---- What is on show (the pick, before it is confirmed) ----
  const pickedCategory = ref("");
  const pickedType = ref("");

  const shownCategory = computed<RoomCategory | null>(
    () => categories.find((category) => category.name === pickedCategory.value) ?? categories[0] ?? null
  );
  const currentCanonical = computed(() => canonicalRoomType(props.currentType));
  const shownType = computed(() => {
    const types = props.selectedCategory?.types ?? [];
    return types.includes(pickedType.value) ? pickedType.value : (types[0] ?? "");
  });
  const shownGuide = computed(() => roomTypeGuide(shownType.value));
  const isCurrent = computed(() => !!shownType.value && shownType.value === currentCanonical.value);

  const pathStops = computed(() => criticalPathStops(shownType.value));
  const pathNote = computed(() =>
    isOnCriticalPath(shownType.value)
      ? `${roomTypeShortLabel(shownType.value)} sits at the lit stop.`
      : `${roomTypeShortLabel(shownType.value)} is not a fixed stop: it can go anywhere on the way.`
  );

  // The picker opens on the room's own category and type; a category or type already on show is kept
  watch(
    () => [props.isOpen, props.step, props.selectedCategory?.name, props.currentType] as const,
    ([open]) => {
      if (!open) return;
      if (props.selectedCategory) pickedCategory.value = props.selectedCategory.name;
      else if (!pickedCategory.value) {
        pickedCategory.value = categories.find((category) => category.types.includes(currentCanonical.value))?.name ?? categories[0]?.name ?? "";
      }
      if (props.selectedCategory?.types.includes(currentCanonical.value)) pickedType.value = currentCanonical.value;
      else if (!props.selectedCategory?.types.includes(pickedType.value)) pickedType.value = props.selectedCategory?.types[0] ?? "";
      void centerRail();
    },
    { immediate: true }
  );

  const title = computed(() => {
    if (props.step === 1) return "Select Category";
    if (props.step === 2) return props.selectedCategory?.name || "Select Type";
    if (props.step === 2.5) return "Pick a Config";
    if (props.step === 3) return `${roomTypeShortLabel(props.currentType)} Config`;
    return "Room Editor";
  });

  // ---- The rail ----
  const rail = ref<HTMLElement | null>(null);
  const content = ref<{ $el?: { scrollToTop?: (duration?: number) => void } } | null>(null);

  /** Scroll the rail so the picked button sits in the middle. Done by hand: scrollIntoView would also move the page. */
  const centerRail = async (smooth = false) => {
    await nextTick();
    const strip = rail.value;
    const key = props.step === 1 ? shownCategory.value?.name : shownType.value;
    const button = strip?.querySelector<HTMLElement>(`[data-pick="${key}"]`);
    if (!strip || !button) return;
    strip.scrollTo({ left: button.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2, behavior: smooth ? "smooth" : "auto" });
  };

  const pickCategory = (category: RoomCategory) => {
    if (category.name === pickedCategory.value) return;
    play$fx("cursor");
    pickedCategory.value = category.name;
    content.value?.$el?.scrollToTop?.(0);
    void centerRail(true);
  };

  const pickType = (type: string) => {
    if (type === shownType.value) return;
    play$fx("cursor");
    pickedType.value = type;
    content.value?.$el?.scrollToTop?.(0);
    void centerRail(true);
  };

  // ---- The one Confirm button ----
  const confirmLabel = computed(() => {
    if (props.step === 1) return shownCategory.value ? `Choose ${shownCategory.value.name}` : "";
    if (props.step === 2) return shownType.value ? `Confirm ${roomTypeShortLabel(shownType.value)}` : "";
    if (props.step === 3) return "Confirm Configuration";
    return "";
  });
  const confirmIcon = computed(() => (props.step === 3 ? "fa-check-circle" : props.step === 2 ? "fa-sparkles" : "fa-arrow-right"));

  const confirm = () => {
    play$fx("select");
    if (props.step === 1 && shownCategory.value) emit("select-category", shownCategory.value);
    else if (props.step === 2 && shownType.value) emit("select-type", shownType.value);
    else if (props.step === 3) emit("confirm");
  };

  const goBack = () => {
    emit("back");
  };
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  $rail-badge: 48px;
  // One translucent backing behind each section's body, the only box the page has
  $body-backing: rgba(20, 6, 28, 0.55);
  $divider: rgba(231, 230, 179, 0.25);
  // The Master Room's golden egg gets a soft glow wherever the picker draws it
  $egg-glow: drop-shadow(0 0 6px rgba(247, 232, 168, 0.6));

  .room-type-modal {
    --width: 100%;
    --height: 100%;
    --max-width: 100%;
    --max-height: 100%;
    --border-radius: 0;
    --background: #{$eb-color-dark-purple};
    --box-shadow: none;
  }

  // The app bar carries the RPG box (the global `ion-toolbar.rpg-box`); the title sits at the start, Material style
  .guide-toolbar {
    --color: #{$eb-color-cream};

    ion-title {
      text-align: left;
      padding-inline-start: 8px;
    }
  }

  .guide-title {
    font-family: $eb-font-title;
    color: $eb-color-pale-yellow;
    font-size: 1.25rem;
    letter-spacing: 1px;
  }

  // The animated sliding background comes from `bg-slide bg-slide-equipment`; nothing solid here
  .guide-content {
    --padding-top: 8px;
    --padding-bottom: 28px;
    color: $eb-color-cream;
  }

  .guide-page {
    margin: 0 16px;
    display: flex;
    flex-direction: column;
    gap: 22px;
    animation: guide-in 160ms steps(4) both;
  }

  // The picked room (or the config of one) as the page above: configs bring their own boxes
  .guide-config {
    gap: 16px;
  }

  /* ---- Hero: no box, just the crest, name, one line and chips ---- */
  .guide-hero {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-shadow: 0 2px 0 rgba(0, 0, 0, 0.6);
  }

  .guide-crest {
    width: 104px;
    height: 104px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(var(--tint-rgb), 0.18);
    border: 2px solid rgba(var(--tint-rgb), 0.7);

    // The Master Room's egg keeps its own two golds (the global `.icon-master-egg`); every other icon takes the tint
    i:not(.icon-master-egg) {
      --fa-primary-color: var(--tint);
      --fa-secondary-color: var(--tint);
      --fa-secondary-opacity: 0.55;
      color: var(--tint);
    }

    &.is-egg {
      border-color: #f7e8a8;
      box-shadow: 0 0 18px 2px rgba(247, 232, 168, 0.35);
    }
  }

  .icon-master-egg {
    filter: $egg-glow;
  }

  .guide-name {
    margin: 4px 0 0;
    font-family: $eb-font-status;
    font-size: 1.9rem;
    font-weight: normal;
    color: var(--tint);
  }

  .guide-lead {
    margin: 0;
    font-family: $eb-font-status;
    font-size: 1.15rem;
    color: $eb-color-pale-yellow;
  }

  .guide-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }

  .guide-chip {
    font-family: $eb-font-status;
    font-size: 0.8rem;
    padding: 2px 9px;
    border-radius: 8px;
    background: $body-backing;
    color: $eb-color-cream;
    text-shadow: none;

    &.is-yours {
      color: $eb-color-mint-green;
    }
  }

  .guide-hint {
    margin: 0;
    text-align: center;
    font-size: 1rem;
    opacity: 0.8;
  }

  /* ---- Sections: small heading, a 1px rule, then the body on one translucent backing ---- */
  .guide-section {
    display: flex;
    flex-direction: column;
  }

  .guide-heading {
    margin: 0 0 8px;
    padding: 0 2px 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid $divider;
    font-family: $eb-font-status;
    font-weight: normal;
    font-size: 0.9rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: $eb-color-pale-yellow;
    text-shadow: 0 2px 0 rgba(0, 0, 0, 0.6);
  }

  .guide-body {
    margin: 0;
    padding: 12px 14px;
    border-radius: 8px;
    background: $body-backing;
  }

  .guide-types {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  // Plain row: only the icon carries the tint
  .guide-type {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .type-icon {
    flex: 0 0 40px;
    text-align: center;

    &:not(.icon-master-egg) {
      --fa-primary-color: var(--tint);
      --fa-secondary-color: var(--tint);
      --fa-secondary-opacity: 0.55;
      color: var(--tint);
    }
  }

  .type-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .type-name {
    font-family: $eb-font-status;
    font-size: 1.2rem;
    color: #fff;
  }

  .type-blurb {
    font-size: 0.95rem;
    line-height: 1.3;
    opacity: 0.85;
  }

  .guide-lines {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .guide-line {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.45;

    strong {
      font-family: $eb-font-status;
      font-weight: normal;
      color: $eb-color-pale-yellow;
    }
  }

  /* ---- The critical path: every temple is played in this order; the picked room's stop is lit ---- */
  .guide-path {
    list-style: none;
    margin: 0;
    padding: 10px 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 0;
    border-radius: 8px;
    background: $body-backing;
  }

  .path-stop {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 6px;
    font-family: $eb-font-status;
    font-size: 0.85rem;
    line-height: 1.3;
    color: $eb-color-cream;
    opacity: 0.7;

    // The arrow to the next stop, outside the chip
    &:not(:last-child)::after {
      content: "\2192";
      margin-left: 8px;
      margin-right: -2px;
      color: $eb-color-pale-yellow;
      opacity: 0.8;
    }

    &.is-here {
      opacity: 1;
      color: $eb-color-dark-purple;
      background: $eb-color-pale-yellow;
      box-shadow: 0 0 10px 1px rgba(247, 232, 168, 0.55);
    }
  }

  .guide-path-note {
    margin: 8px 2px 0;
    font-size: 0.95rem;
    opacity: 0.8;
  }

  /* ---- Footer: the rail and the one Confirm button, under the thumb ---- */
  .guide-footer {
    background: $eb-color-dark-purple;
    border-top: 3px solid $eb-color-pale-yellow;
  }

  .guide-dock {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 6px 0 calc(12px + var(--ion-safe-area-bottom, 0px));
    background: $eb-color-dark-purple;
  }

  // The buttons sit in one row with the free space between them. A rail that cannot fit (the seven navigation rooms,
  // or the five categories on a very narrow phone) scrolls sideways with snap instead of shrinking or wrapping the labels.
  .guide-rail {
    position: relative;
    display: flex;
    flex-wrap: nowrap;
    justify-content: space-between;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 14px 8px 6px;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
    // The theme's `ion-app#earthbound *` scrollbar outranks a class: say it twice, loudly
    scrollbar-width: none !important;

    &::-webkit-scrollbar {
      display: none !important;
    }
  }

  .rail-button {
    flex: 0 0 auto;
    min-width: $rail-badge;
    min-height: 56px;
    scroll-snap-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 0;
    background: none;
    border: none;
    color: $eb-color-cream;
    font-family: $eb-font-status;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform 120ms steps(3);

    &:focus-visible .rail-badge {
      outline: 2px solid $eb-color-pale-yellow;
      outline-offset: 2px;
    }
  }

  .rail-badge {
    position: relative;
    width: $rail-badge;
    height: $rail-badge;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(var(--tint-rgb), 0.2);
    border: 3px solid rgba(var(--tint-rgb), 0.55);

    > i:first-child:not(.icon-master-egg) {
      --fa-primary-color: var(--tint);
      --fa-secondary-color: var(--tint);
      --fa-secondary-opacity: 0.55;
      color: var(--tint);
    }
  }

  // One line, never cut: StatusPlz at 12px is 71px for "Navigation"; the five categories fit a 360 px phone (8 px apart)
  .rail-name {
    font-size: 0.75rem;
    line-height: 1.15;
    white-space: nowrap;
    text-align: center;
    opacity: 0.85;
  }

  .rail-check {
    position: absolute;
    right: -4px;
    bottom: -4px;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    font-size: 0.7rem;
    background: $eb-color-dark-purple;
    border: 2px solid currentColor;
    color: $eb-color-mint-green;
    --fa-primary-color: currentColor;
    --fa-secondary-color: currentColor;
  }

  .rail-button.is-selected {
    transform: translateY(-6px);

    .rail-badge {
      border-color: $eb-color-pale-yellow;
      background: rgba(var(--tint-rgb), 0.35);
      box-shadow: 0 0 0 2px $eb-color-dark-purple, 0 0 16px 3px rgba(var(--tint-rgb), 0.7);
    }

    .rail-name {
      opacity: 1;
      color: $eb-color-pale-yellow;
    }
  }

  .guide-actions {
    display: flex;
    gap: 12px;
    margin: 0 16px;
  }

  .guide-back,
  .guide-confirm {
    min-height: 56px;
    padding: 8px 14px;
    font-family: $eb-font-status;
    font-size: 1.2rem;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    i {
      --fa-primary-color: currentColor;
      --fa-secondary-color: currentColor;
    }

    &:active {
      transform: translateY(2px);
    }
  }

  .guide-back {
    flex: 0 0 auto;
    color: $eb-color-cream;
    background: $eb-color-medium-purple;
    border: none;
    border-radius: 1px;
    box-shadow: 0 0 0 3px $eb-color-slate, 0 0 0 5px rgba(104, 208, 184, 0.35);
  }

  .guide-confirm {
    flex: 1;
    color: $eb-color-dark-purple;
    background: $eb-color-pale-yellow;
    border: none;
    border-radius: 1px;
    box-shadow: 0 0 0 3px $eb-color-medium-purple, 0 0 0 5px $eb-color-minty-blue, 0 4px 0 5px rgba(0, 0, 0, 0.5);
  }

  @keyframes guide-in {
    from {
      transform: translateY(6px);
    }

    to {
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .guide-page {
      animation: none;
    }

    .rail-button {
      transition: none;
    }
  }
</style>
