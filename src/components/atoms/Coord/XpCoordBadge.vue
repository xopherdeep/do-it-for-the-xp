<template>
  <div
    class="xp-coord-badge"
    :class="[size, { plain }]"
  >
    <i
      v-if="!plain"
      class="fas fa-map-marker-alt"
    ></i>
    <span class="coords">{{ displayX }}x {{ displayY }}y</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'XpCoordBadge',
  props: {
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value: string) => ['small', 'medium', 'large'].includes(value)
    },
    plain: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const displayX = computed(() => props.x + 1);
    const displayY = computed(() => props.y + 1);

    return {
      displayX,
      displayY
    };
  }
});
</script>

<style lang="scss" scoped>
  .xp-coord-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(var(--ion-color-tertiary-rgb), 0.2);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(var(--ion-color-tertiary-rgb), 0.4);
    border-radius: 20px;
    color: white;
    white-space: nowrap;
    font-family: "StatusPlz";
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transition: all 0.2s ease;

    i {
      color: var(--ion-color-tertiary);
    }

    &.small {
      padding: 4px 8px;
      font-size: 0.7rem;

      i {
        font-size: 0.6rem;
      }
    }

    &.medium {
      padding: 6px 12px;
      font-size: 0.8rem;

      i {
        font-size: 0.75rem;
      }
    }

    &.large {
      padding: 8px 16px;
      font-size: 1rem;

      i {
        font-size: 0.9rem;
      }
    }

    &:hover {
      background: rgba(var(--ion-color-tertiary-rgb), 0.4);
      transform: translateY(-2px);
      border-color: var(--ion-color-tertiary);
    }

    &.plain {
      background: transparent;
      backdrop-filter: none;
      border: none;
      box-shadow: none;
      padding: 0;
      color: rgba(255, 255, 255, 0.4);
      font-family: inherit;
      font-size: inherit;

      &:hover {
        transform: none;
      }

      .coords {
        font-family: "StatusPlz";
      }
    }
  }
</style>
