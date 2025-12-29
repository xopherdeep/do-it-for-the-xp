<template>
  <button
    class="xp-close-button"
    :class="[`size-${size}`, colorClass]"
    @click="handleClick"
  >
    <i :class="['fad', icon]"></i>
  </button>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue';
import { play$fx } from '@/assets/fx';

export default defineComponent({
  name: 'XpCloseButton',
  props: {
    size: {
      type: String as PropType<'sm' | 'md' | 'lg'>,
      default: 'md'
    },
    color: {
      type: String,
      default: 'danger'
    },
    icon: {
      type: String,
      default: 'fa-times-square'
    },
    playSound: {
      type: Boolean,
      default: true
    }
  },
  emits: ['click'],
  setup(props, { emit }) {
    const colorClass = computed(() => `color-${props.color}`);

    const handleClick = (event: Event) => {
      event.stopPropagation();
      if (props.playSound) {
        play$fx('no');
      }
      emit('click', event);
    };

    return {
      colorClass,
      handleClick
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-close-button {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));

  i {
    transition: inherit;
  }

  &:hover {
    transform: rotate(90deg) scale(1.1);
    
    i {
      filter: brightness(1.2);
    }
  }

  &:active {
    transform: rotate(90deg) scale(0.95);
  }

  // Sizes
  &.size-sm {
    font-size: 1.5rem;
    width: 32px;
    height: 32px;
  }

  &.size-md {
    font-size: 2rem;
    width: 40px;
    height: 40px;
  }

  &.size-lg {
    font-size: 2.5rem;
    width: 48px;
    height: 48px;
  }

  // Colors
  &.color-danger {
    color: var(--ion-color-danger);
  }

  &.color-light {
    color: rgba(255, 255, 255, 0.5);
    
    &:hover {
      color: #fff;
    }
  }

  &.color-primary {
    color: var(--ion-color-primary);
  }

  &.color-secondary {
    color: var(--ion-color-secondary);
  }

  &.color-medium {
    color: var(--ion-color-medium);
    
    &:hover {
      color: var(--ion-color-medium-shade);
    }
  }
}
</style>
