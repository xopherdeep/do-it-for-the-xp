<template>
  <div class="xp-rpg-menu" :class="[
    { 'rpg-box': !borderless },
    theme
  ]">
    <!-- Header Section -->
    <div v-if="title || $slots.header" class="menu-header">
      <slot name="header">
        <div class="header-content">
          <span class="menu-title">{{ title }}</span>
          <div v-if="subtitle" class="menu-subtitle" v-html="sanitizeHtml(subtitle)"></div>
        </div>
      </slot>
    </div>

    <!-- Grid of Actions -->
    <div class="menu-grid" :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }">
      <div v-for="action in actions" :key="action.id || action.label" class="menu-item-col"
        :style="{ gridColumn: action.fullWidth ? '1 / -1' : 'auto' }">
        <button class="menu-item" @click="handleAction(action)" :id="action.id" :disabled="action.disabled"
          :aria-disabled="action.disabled ? 'true' : undefined" :class="{ 'is-current': currentId === rowKey(action) }">
          <div class="item-inner">
            <i v-if="action.faIcon || action.icon" class="fad"
              :class="[`fa-${((action.faIcon || action.icon) as string).replace('fa-', '')}`, action.iconClass]"></i>
            <span class="item-label">{{ action.label }}</span>
            <span v-if="action.note" class="item-note">{{ action.note }}</span>
            <span v-if="action.badge" class="item-badge">{{ action.badge }}</span>
          </div>
        </button>
      </div>
      <slot name="extra"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, PropType, ref } from 'vue';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';

export interface RpgMenuAction {
  id?: string;
  label: string;
  faIcon?: string;
  icon?: string;
  click?: () => void;
  fullWidth?: boolean;
  iconClass?: string;
  action?: string;
  /** A count shown on the entry (unread notifications); nothing when empty or 0 */
  badge?: string | number;
  /** A short second line of context beside the label ("3 chores", "no MP") */
  note?: string;
  /** Greyed, announced as disabled and never fires */
  disabled?: boolean;
}

/** How long a tapped row keeps its cursor and highlight (touch has no hover) */
const CURRENT_MS = 150;

export default defineComponent({
  name: 'XpRpgMenu',
  props: {
    title: {
      type: String,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    actions: {
      type: Array as PropType<RpgMenuAction[]>,
      required: true
    },
    columns: {
      type: Number,
      default: 2
    },
    borderless: {
      type: Boolean,
      default: false
    },
    theme: {
      type: String,
      default: 'earthbound'
    }
  },
  emits: ['action-click'],
  setup(props, { emit }) {
    // The same key the template uses, so a row without an id can still be current
    const rowKey = (action: RpgMenuAction) => action.id || action.label;
    const currentId = ref<string | null>(null);
    let currentTimer: number | undefined;

    const clearCurrentTimer = () => {
      if (currentTimer !== undefined) {
        window.clearTimeout(currentTimer);
        currentTimer = undefined;
      }
    };

    const handleAction = (action: RpgMenuAction) => {
      if (action.disabled) return;
      clearCurrentTimer();
      currentId.value = rowKey(action);
      currentTimer = window.setTimeout(() => {
        currentId.value = null;
        currentTimer = undefined;
      }, CURRENT_MS);
      action.click?.();
      emit('action-click', action);
    };

    onBeforeUnmount(clearCurrentTimer);

    return {
      currentId,
      rowKey,
      handleAction,
      sanitizeHtml,
    };
  }
});
</script>

<style lang="scss" scoped>
@use "@/styles/themes/gameStyle" as *;

.xp-rpg-menu {
  display: flex;
  flex-direction: column;
  width: 100%;
  background: transparent; // borderless: the box behind it shows through
  color: var(--gs-text);
  font-family: "Apple Kid", "StatusPlz", monospace;
  line-height: 1.1;

  &.rpg-box {
    background: var(--gs-window);
    box-shadow: var(--gs-frame);
    border-radius: var(--gs-radius);
    margin: 8px 16px;
    width: calc(100% - 32px);
  }

  .menu-header {
    padding: 6px 15px 0px;
    margin-bottom: 0px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .menu-title {
      font-family: "Apple Kid", "Twoson", sans-serif;
      font-size: 1.5rem;
      font-weight: normal;
      text-transform: uppercase;
      letter-spacing: 3px;
      // margin-top: -25px
    }

    .menu-subtitle {
      font-family: "StatusPlz", monospace;
      font-size: 1.25rem;
      opacity: 0.9;
      letter-spacing: 2px;
      margin-top: 4px;
    }
  }

  .menu-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    padding: 8px 12px 8px;
    gap: 0px 8px;
  }

  .menu-item {
    width: 100%;
    background: transparent;
    border: none;
    color: inherit;
    font-family: "Apple Kid", sans-serif;
    font-size: 1.5rem;
    // room on the left for the theme's cursor
    padding: 2px 8px 2px calc(8px + var(--gs-cursor-w, 20px));
    text-align: left;
    cursor: pointer;
    position: relative;
    overflow: visible;
    transition: background 0.15s ease;

    min-height: 48px; // a thumb-sized row on phones
    -webkit-tap-highlight-color: transparent;

    // The cursor and the selected row's wash show on hover only where a pointer can hover,
    // and on focus, press or a fresh tap everywhere (touch has no hover)
    @media (hover: hover) {
      &:hover:not([disabled]) {
        background: var(--gs-select);
        border-radius: 4px;

        &::before {
          @include gs-cursor;
        }
      }
    }

    &:active:not([disabled]),
    &:focus-visible:not([disabled]),
    &.is-current:not([disabled]) {
      background: var(--gs-select);
      border-radius: 4px;

      &::before {
        @include gs-cursor;
      }
    }

    &[disabled] {
      color: var(--gs-text-dim);
      cursor: default;
    }

    .item-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
    }

    .fad {
      font-size: 1.4rem;
      min-width: 25px;
      text-align: center;
      --fa-secondary-opacity: 0.4;
    }

    .item-label {
      font-family: "Apple Kid", sans-serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 4px; // Slight adjustment for Earthbound font baseline
      letter-spacing: 2px;
    }

    .item-note {
      margin-left: auto;
      font-family: "StatusPlz", monospace;
      font-size: 0.85em;
      color: var(--gs-text-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 40%;
    }

    .item-badge {
      margin-left: auto;
      min-width: 1.4rem;
      padding: 1px 6px;
      border-radius: 10px;
      background: var(--gs-danger);
      color: #fff;
      font-family: "StatusPlz", monospace;
      font-size: 0.75rem;
      line-height: 1.2rem;
      text-align: center;
      box-shadow: 0 0 0 2px var(--gs-window-color);
    }
  }

  // Handle different themes if needed
  &.earthbound {
    // Already set as defaults
  }
}
</style>
