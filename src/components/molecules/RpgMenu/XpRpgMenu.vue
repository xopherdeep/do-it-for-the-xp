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
    <div class="menu-grid" :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }">
      <div v-for="action in actions" :key="action.id || action.label" class="menu-item-col"
        :style="{ gridColumn: action.fullWidth ? '1 / -1' : 'auto' }">
        <button class="menu-item" @click="handleAction(action)" :id="action.id" :disabled="action.disabled"
          :aria-disabled="action.disabled ? 'true' : undefined" :class="{ 'is-current': currentId === rowKey(action) }">
          <div class="item-inner">
            <i v-if="action.faIcon || action.icon" class="fad"
              :class="[`fa-${((action.faIcon || action.icon) as string).replace('fa-', '')}`, action.iconClass]"></i>
            <span class="item-text">
              <span class="item-label">{{ action.label }}</span>
              <span v-if="action.note" class="item-note">{{ action.note }}</span>
            </span>
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

    // clearTimeout(undefined) is a no-op: the handle is cleared by name
    const clearCurrentTimer = () => {
      window.clearTimeout(currentTimer);
      currentTimer = undefined;
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
  font-family: var(--gs-font);
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
      font-family: var(--gs-font-title);
      font-size-adjust: var(--gs-font-adjust, none);
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 8px 12px 8px;
    gap: 0px 8px;
  }

  // Inside a message box (borderless) the box already pads the sides: the columns take that room back for the labels
  &:not(.rpg-box) .menu-grid {
    padding-left: 0;
    padding-right: 0;
  }

  // ... and the icon sits a little closer to its label
  &:not(.rpg-box) .menu-item .item-inner {
    gap: 8px;
  }

  // A phone-width box never grows to its widest row: the cells shrink and a label wraps inside its cell
  .menu-item-col {
    min-width: 0;
  }

  .menu-item {
    width: 100%;
    min-width: 0;
    background: transparent;
    border: none;
    color: inherit;
    font-family: var(--gs-font);
    font-size-adjust: var(--gs-font-adjust, none);
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

      .fad {
        opacity: 0.45;
      }
    }

    .item-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-width: 0;
    }

    .fad {
      font-size: 1.4rem;
      min-width: 25px;
      text-align: center;
      font-size-adjust: none; // an icon font keeps its own size
      --fa-secondary-opacity: 0.4;
    }

    // The label with its note under it
    .item-text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      flex: 1 1 auto;
      min-width: 0;
    }

    .item-label {
      min-width: 0;
      max-width: 100%;
      font-family: var(--gs-font);
      font-size-adjust: var(--gs-font-adjust, none);
      // A label never loses a word: under a wide Game Style font it wraps to a second line (the row grows)
      white-space: normal;
      overflow-wrap: anywhere;
      line-height: 1.1;
      margin-top: 4px; // Slight adjustment for Earthbound font baseline
      letter-spacing: 1px;
    }

    .item-note {
      max-width: 100%;
      line-height: 1.1;
      font-family: "StatusPlz", monospace;
      font-size-adjust: none; // the status font is not the theme's
      font-size: 0.95rem;
      color: var(--gs-text-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-badge {
      margin-left: auto;
      min-width: 1.4rem;
      padding: 1px 6px;
      border-radius: 10px;
      background: var(--gs-danger);
      color: var(--gs-window-color);
      font-family: "StatusPlz", monospace;
      font-size-adjust: none;
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
