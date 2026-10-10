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
          <div v-if="subtitle" class="menu-subtitle" v-html="subtitle"></div>
        </div>
      </slot>
    </div>

    <!-- Grid of Actions -->
    <div class="menu-grid" :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }">
      <div v-for="action in actions" :key="action.id || action.label" class="menu-item-col"
        :style="{ gridColumn: action.fullWidth ? '1 / -1' : 'auto' }">
        <button class="menu-item" @click="handleAction(action)" :id="action.id">
          <div class="item-inner">
            <i v-if="action.faIcon || action.icon" class="fad"
              :class="[`fa-${((action.faIcon || action.icon) as string).replace('fa-', '')}`, action.iconClass]"></i>
            <span class="item-label">{{ action.label }}</span>
            <span v-if="action.badge" class="item-badge">{{ action.badge }}</span>
          </div>
        </button>
      </div>
      <slot name="extra"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

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
}

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
    const handleAction = (action: RpgMenuAction) => {
      if (action.click) {
        action.click();
      }
      emit('action-click', action);
    };

    return {
      handleAction
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-rpg-menu {
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: #280828; // default dark purple
  color: var(--ion-color-rpg);
  font-family: "Apple Kid", "StatusPlz", monospace;
  line-height: 1.1;

  &.rpg-box {
    border-radius: 1px;
    box-shadow:
      0 0 0 5px #383050, // medium purple
      0 0 0 10px #68d0b8, // minty blue
      0 0 0 12px #f7e8a8, // pale yellow
      0 0 0 16px #3d3c55; // slate
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
    padding: 2px 8px;
    text-align: left;
    cursor: pointer;
    position: relative;
    overflow: visible;
    transition: background 0.15s ease;

    min-height: 48px; // a thumb-sized row on phones
    -webkit-tap-highlight-color: transparent;

    @media (hover: hover) {
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
    }

    &:active,
    &:focus-visible {
      background: rgba(255, 255, 255, 0.14);
      border-radius: 4px;
    }

    // The pointing cursor only where a pointer can hover; touch highlights the row instead
    @media (hover: hover) {
      &:hover::before,
      &:active::before {
        content: "";
        position: absolute;
        left: -2px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
        border-left: 8px solid var(--ion-color-rpg);
      }
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

    .item-badge {
      margin-left: auto;
      min-width: 1.4rem;
      padding: 1px 6px;
      border-radius: 10px;
      background: var(--ion-color-danger, #e8402a);
      color: #fff;
      font-family: "StatusPlz", monospace;
      font-size: 0.75rem;
      line-height: 1.2rem;
      text-align: center;
      box-shadow: 0 0 0 2px #280828;
    }
  }

  // Handle different themes if needed
  &.earthbound {
    // Already set as defaults
  }
}
</style>
