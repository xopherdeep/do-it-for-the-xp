<template>
  <nav class="xp-bottom-nav icon-colors" aria-label="Hero navigation">
    <div class="xp-bottom-nav__dock">
      <!-- Left hand, at the far left: what the hero holds (tap to use it), or an empty hand -->
      <button
        v-if="leftHand"
        type="button"
        class="xp-bottom-nav__slot xp-bottom-nav__hand is-equipped"
        data-tour="hands"
        :aria-label="`Use ${leftHand.name}`"
        @click="$emit('use-hand', leftHand)"
      >
        <div class="xp-bottom-nav__icon-wrap">
          <i :class="['fad', toFaClass(leftHand.faIcon)]"></i>
        </div>
        <span class="xp-bottom-nav__label">{{ handLabel(leftHand, 'Left') }}</span>
      </button>
      <button
        v-else
        type="button"
        class="xp-bottom-nav__slot xp-bottom-nav__hand is-empty"
        data-tour="hands"
        aria-label="Left hand, empty"
        @click="$emit('open-area')"
      >
        <div class="xp-bottom-nav__icon-wrap">
          <i class="fad fa-hand-paper fa-flip-horizontal"></i>
        </div>
        <span class="xp-bottom-nav__label">Left</span>
      </button>

      <!-- Profile -->
      <button
        type="button"
        class="xp-bottom-nav__slot xp-bottom-nav__button"
        :class="{ 'is-active': active === 'profile' }"
        data-tour="profile"
        aria-label="Hero Profile"
        @click="$emit('open-profile')"
      >
        <div class="xp-bottom-nav__icon-wrap">
          <i class="fad fa-seedling"></i>
        </div>
        <span class="xp-bottom-nav__label">{{ profileLabel }}</span>
      </button>

      <!-- Area: where the hero is; tapping opens the equipment -->
      <button
        type="button"
        class="xp-bottom-nav__slot xp-bottom-nav__button xp-bottom-nav__area"
        :class="{ 'is-active': active === 'area' }"
        data-tour="area"
        :aria-label="`Area: ${areaLabel}`"
        @click="$emit('open-area')"
      >
        <div class="xp-bottom-nav__icon-wrap">
          <i class="fad" :class="toFaClass(areaIcon)"></i>
        </div>
        <span class="xp-bottom-nav__label">{{ areaLabel }}</span>
      </button>

      <!-- Party -->
      <button
        type="button"
        class="xp-bottom-nav__slot xp-bottom-nav__button"
        :class="{ 'is-active': active === 'party' }"
        data-tour="party"
        aria-label="Party"
        @click="$emit('open-party')"
      >
        <div class="xp-bottom-nav__icon-wrap">
          <i class="fab fa-fort-awesome"></i>
        </div>
        <span class="xp-bottom-nav__label">Party</span>
      </button>

      <!-- Right hand, at the far right -->
      <button
        v-if="rightHand"
        type="button"
        class="xp-bottom-nav__slot xp-bottom-nav__hand is-equipped"
        :aria-label="`Use ${rightHand.name}`"
        @click="$emit('use-hand', rightHand)"
      >
        <div class="xp-bottom-nav__icon-wrap">
          <i :class="['fad', toFaClass(rightHand.faIcon)]"></i>
        </div>
        <span class="xp-bottom-nav__label">{{ handLabel(rightHand, 'Right') }}</span>
      </button>
      <button
        v-else
        type="button"
        class="xp-bottom-nav__slot xp-bottom-nav__hand is-empty"
        aria-label="Right hand, empty"
        @click="$emit('open-area')"
      >
        <div class="xp-bottom-nav__icon-wrap">
          <i class="fad fa-hand-paper"></i>
        </div>
        <span class="xp-bottom-nav__label">Right</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { handLabel } from "@/lib/services/temples/ItemUse";
import { toFaClass } from "@/lib/utils/faIcon";

/** One item in a hand, as stored on the profile */
export interface NavHandItem {
  faIcon?: string;
  name?: string;
  [key: string]: unknown;
}

interface BottomNavProps {
  profileLabel?: string;
  areaLabel?: string;
  areaIcon?: string;
  leftHand?: NavHandItem | null;
  rightHand?: NavHandItem | null;
  /** Which tab reads as current */
  active?: "profile" | "area" | "party" | "";
}

interface BottomNavEmits {
  (e: "open-profile"): void;
  (e: "open-area"): void;
  (e: "open-party"): void;
  (e: "use-hand", item: NavHandItem): void;
}

withDefaults(
  defineProps<BottomNavProps>(),
  { profileLabel: "Hero", areaLabel: "Area", areaIcon: "house-user", leftHand: null, rightHand: null, active: "" }
);

defineEmits<BottomNavEmits>();
</script>

<style lang="scss">
// iOS Minimalist bottom navigation
.xp-bottom-nav {
  position: relative;
  z-index: 1000;
  width: 100%;
  padding: 4px 8px calc(3px + env(safe-area-inset-bottom, 0px));
  background: rgba(16, 12, 28, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 0.5px solid rgba(255, 255, 255, 0.12);

  &__dock {
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 0;
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
  }

  &__slot,
  &__button,
  &__hand {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-height: 48px;
    padding: 3px 2px;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: rgba(235, 235, 245, 0.55);
    font-family: "StatusPlz", "Apple Kid", sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.3px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.95), 0 0 4px rgba(0, 0, 0, 0.8);
    cursor: pointer;
    transition: color 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
    -webkit-tap-highlight-color: transparent;

    .xp-bottom-nav__icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 24px;

      i {
        font-size: 1.35rem;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        transition: transform 0.15s ease, filter 0.15s ease;
      }
    }

    span,
    .xp-bottom-nav__label {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.1;
      opacity: 0.8;
      transition: opacity 0.15s ease;
    }

    &:hover {
      color: #f7e8a8;
      opacity: 0.95;
      background: transparent;
      border: none;
      transform: none;

      .xp-bottom-nav__label {
        opacity: 1;
      }
    }

    &:active {
      transform: scale(0.94);
      opacity: 0.6;
      background: transparent;
    }

    &.is-active {
      color: #ffd700;
      opacity: 1;
      background: transparent;
      border: none;
      box-shadow: none;
      transform: none;
      --fa-primary-color: #ffd700;

      .xp-bottom-nav__icon-wrap i {
        transform: scale(1.08);
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 6px rgba(255, 215, 0, 0.45));
      }

      span,
      .xp-bottom-nav__label {
        color: #fff275;
        font-weight: bold;
        opacity: 1;
      }
    }
  }

  &__area {
    background: transparent;
    border: none;
  }

  &__hand {
    &.is-empty {
      background: transparent;
      border: none;
      color: rgba(235, 235, 245, 0.3);
      opacity: 0.45;

      .xp-bottom-nav__icon-wrap i {
        font-size: 1.2rem;
      }

      &:hover {
        color: rgba(235, 235, 245, 0.6);
        opacity: 0.7;
      }
    }

    &.is-equipped {
      background: transparent;
      border: none;
      box-shadow: none;
      color: rgba(247, 232, 168, 0.85);
      opacity: 0.85;

      .xp-bottom-nav__icon-wrap i {
        font-size: 1.25rem;
      }

      &:hover {
        opacity: 1;
        color: #ffd700;
      }
    }
  }
}
</style>
