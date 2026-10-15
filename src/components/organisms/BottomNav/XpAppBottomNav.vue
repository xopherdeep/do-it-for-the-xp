<template>
  <nav class="xp-bottom-nav xp-app-bottom-nav icon-colors" :aria-label="ariaLabel">
    <div class="xp-bottom-nav__dock">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="xp-bottom-nav__slot xp-bottom-nav__button"
        :class="{ 'is-active': activeTab === tab.id, 'is-disabled': tab.disabled }"
        :aria-label="tab.label"
        :disabled="tab.disabled"
        @click="selectTab(tab.id)"
      >
        <div class="xp-bottom-nav__icon-wrap">
          <ion-icon v-if="tab.ionIcon" :icon="tab.ionIcon" />
          <i v-else-if="tab.faIcon" :class="['fad', toFaClass(tab.faIcon)]"></i>
          <xp-icon v-else-if="tab.icon" :icon="tab.icon" size="md" />
          <span
            v-if="hasPositiveBadge(tab.badge)"
            class="xp-app-bottom-nav__badge"
            :class="tab.badgeColor ? `badge-${tab.badgeColor}` : ''"
          >
            {{ tab.badge }}
          </span>
        </div>
        <span class="xp-bottom-nav__label">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonIcon } from "@ionic/vue";
import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
import { play$fx } from "@/assets/fx";
import { toFaClass } from "@/lib/utils/faIcon";
import type { AppNavTab } from "./appBottomNav";
export type { AppNavTab };

interface XpAppBottomNavProps {
  tabs: AppNavTab[];
  modelValue?: string;
  active?: string;
  ariaLabel?: string;
}

const props = withDefaults(
  defineProps<XpAppBottomNavProps>(),
  {
    modelValue: "",
    active: "",
    ariaLabel: "App Navigation",
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", id: string): void;
  (e: "change", id: string): void;
}>();

const activeTab = computed(() => props.modelValue || props.active || "");

const hasPositiveBadge = (badge?: number | string | null): boolean => {
  if (badge === null || badge === undefined) return false;
  if (typeof badge === "number") return badge > 0;
  return Boolean(String(badge).trim());
};

const selectTab = (id: string) => {
  if (id === activeTab.value) return;
  play$fx("select");
  emit("update:modelValue", id);
  emit("change", id);
};
</script>

<style lang="scss">
.xp-app-bottom-nav {
  position: relative;
  z-index: 1000;
  width: 100%;
  padding: 4px 8px calc(3px + env(safe-area-inset-bottom, 0px));
  background: rgba(16, 12, 28, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 0.5px solid rgba(255, 255, 255, 0.12);

  .xp-bottom-nav__dock {
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 0;
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
  }

  .xp-bottom-nav__slot {
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
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 24px;

      i,
      ion-icon,
      .xp-icon {
        font-size: 1.35rem;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        transition: transform 0.15s ease, filter 0.15s ease, color 0.15s ease;
      }
    }

    .xp-bottom-nav__label {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.1;
      opacity: 0.8;
      transition: opacity 0.15s ease, color 0.15s ease;
    }

    &:hover:not(:disabled) {
      color: #f7e8a8;
      opacity: 0.95;
      background: transparent;

      .xp-bottom-nav__label {
        opacity: 1;
      }
    }

    &:active:not(:disabled) {
      transform: scale(0.94);
      opacity: 0.6;
    }

    &.is-active {
      color: #ffd700;
      opacity: 1;
      --fa-primary-color: #ffd700;

      .xp-bottom-nav__icon-wrap i,
      .xp-bottom-nav__icon-wrap ion-icon,
      .xp-bottom-nav__icon-wrap .xp-icon {
        transform: scale(1.08);
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 6px rgba(255, 215, 0, 0.45));
        color: #ffd700;
      }

      .xp-bottom-nav__label {
        color: #fff275;
        font-weight: bold;
        opacity: 1;
      }
    }

    &.is-disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }

  &__badge {
    position: absolute;
    top: -4px;
    right: -10px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #ff4757;
    color: #ffffff;
    font-size: 0.62rem;
    font-family: "StatusPlz", monospace;
    font-weight: bold;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
    pointer-events: none;
    line-height: 1;
    z-index: 2;

    &.badge-warning {
      background: #ffa502;
    }
    &.badge-success {
      background: #2ed573;
    }
    &.badge-primary {
      background: #1e90ff;
    }
  }
}
</style>
