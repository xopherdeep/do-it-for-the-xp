<template>
  <nav class="xp-bottom-nav icon-colors" aria-label="Hero navigation">
    <!-- Left hand, at the far left: what the hero holds (tap to use it), or an empty hand -->
    <button
      v-if="leftHand"
      type="button"
      class="xp-bottom-nav__hand is-equipped"
      :aria-label="`Use ${leftHand.name}`"
      @click="$emit('use-hand', leftHand)"
    >
      <i :class="`fa-${leftHand.faIcon}`" class="fad"></i>
      <span>{{ handLabel(leftHand, 'Left') }}</span>
    </button>
    <button v-else type="button" class="xp-bottom-nav__hand is-empty" aria-label="Left hand, empty" @click="$emit('open-area')">
      <i class="fad fa-hand-paper fa-flip-horizontal"></i>
      <span>Left</span>
    </button>

    <!-- Profile -->
    <button type="button" class="xp-bottom-nav__button" :class="{ 'is-active': active === 'profile' }" @click="$emit('open-profile')">
      <i class="fad fa-seedling"></i>
      <span>{{ profileLabel }}</span>
    </button>

    <!-- Area: where the hero is; tapping opens the equipment -->
    <button type="button" class="xp-bottom-nav__button xp-bottom-nav__area" :class="{ 'is-active': active === 'area' }" @click="$emit('open-area')">
      <i class="fad" :class="`fa-${areaIcon}`"></i>
      <span>{{ areaLabel }}</span>
    </button>

    <!-- Party -->
    <button type="button" class="xp-bottom-nav__button" :class="{ 'is-active': active === 'party' }" @click="$emit('open-party')">
      <i class="fab fa-fort-awesome"></i>
      <span>Party</span>
    </button>

    <!-- Right hand, at the far right -->
    <button
      v-if="rightHand"
      type="button"
      class="xp-bottom-nav__hand is-equipped"
      :aria-label="`Use ${rightHand.name}`"
      @click="$emit('use-hand', rightHand)"
    >
      <i :class="`fa-${rightHand.faIcon}`" class="fad"></i>
      <span>{{ handLabel(rightHand, 'Right') }}</span>
    </button>
    <button v-else type="button" class="xp-bottom-nav__hand is-empty" aria-label="Right hand, empty" @click="$emit('open-area')">
      <i class="fad fa-hand-paper"></i>
      <span>Right</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { handLabel } from "@/lib/services/temples/ItemUse";

/** One item in a hand, as stored on the profile */
export interface NavHandItem {
  faIcon?: string;
  name?: string;
  [key: string]: unknown;
}

withDefaults(
  defineProps<{
    profileLabel?: string;
    areaLabel?: string;
    areaIcon?: string;
    leftHand?: NavHandItem | null;
    rightHand?: NavHandItem | null;
    /** Which tab reads as current */
    active?: "profile" | "area" | "party" | "";
  }>(),
  { profileLabel: "Hero", areaLabel: "Area", areaIcon: "house-user", leftHand: null, rightHand: null, active: "" }
);

defineEmits<{
  (e: "open-profile"): void;
  (e: "open-area"): void;
  (e: "open-party"): void;
  (e: "use-hand", item: NavHandItem): void;
}>();
</script>

<style lang="scss">
// Same bar everywhere: the portal, the temples, the home town
.xp-bottom-nav {
  // Above the router outlet, which Ionic positions absolutely over the tabs area
  position: relative;
  z-index: 1000;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 2px;
  width: 100%;
  padding: 4px 6px calc(2px + env(safe-area-inset-bottom, 0px));
  background: #000;
  border-top: 2px solid #383050;

  &__button,
  &__hand {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-height: 54px;
    padding: 4px 2px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #e7e6b3;
    font-family: "StatusPlz", monospace;
    font-size: 0.7rem;
    letter-spacing: 0.5px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    i {
      font-size: 1.5rem;
    }

    span {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &:active {
      background: rgba(255, 255, 255, 0.12);
    }

    &.is-active {
      color: #fff;
      --fa-primary-color: #fff;
    }
  }

  &__hand {
    flex: 0 0 68px;
    border: 1px dashed rgba(255, 255, 255, 0.18);
    font-size: 0.64rem;

    &.is-empty {
      color: #a8a8a8;

      i {
        opacity: 0.35;
      }
    }

    &.is-equipped {
      border-style: solid;
      border-color: rgba(247, 232, 168, 0.35);
    }
  }
}
</style>
