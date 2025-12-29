<template>
  <div class="mini-map-container icon-colors">
    <div class="mini-map-grid">
      <div
        v-for="(row, rIndex) in maze"
        :key="rIndex"
        class="map-row"
      >
        <div
          v-for="(cell, cIndex) in row"
          :key="cIndex"
          class="map-cell"
          :class="{
            'is-room': isRoom(cell),
            'current-room': rIndex === currentRow && cIndex === currentCol
          }"
          @click="handleCellClick(rIndex, cIndex, cell)"
        ></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { ____ } from '@/lib/engine/dungeons/roomTypes';

export default defineComponent({
  name: 'RoomEditorMiniMap',
  props: {
    maze: {
      type: Array as PropType<string[][]>,
      required: true
    },
    currentRow: {
      type: Number,
      required: true
    },
    currentCol: {
      type: Number,
      required: true
    }
  },
  emits: ['cell-click'],
  setup(props, { emit }) {
    // Helper to check if a cell is a room (not a wall)
    const isRoom = (symbol: string) => {
      if (!symbol) return false;
      return symbol !== ____ && symbol !== 'wall';
    };

    // Handle cell click - navigate to clicked cell
    const handleCellClick = (row: number, col: number, cell: string) => {
      // Only navigate if it's a room (not a wall)
      if (isRoom(cell)) {
        emit('cell-click', { row, col });
      }
    };

    return {
      isRoom,
      handleCellClick
    };
  }
});
</script>

<style lang="scss" scoped>
  .mini-map-container {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 100;
    opacity: 0.8;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }

  .mini-map-grid {
    display: flex;
    flex-direction: column;
    gap: 3px;
    background: rgba(0, 0, 0, 0.5);
    padding: 4px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .map-row {
    display: flex;
    gap: 3px;
  }

  .map-cell {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.05);
    transition: transform 0.15s, background 0.15s;

    &.is-room {
      background: var(--ion-color-primary);
      cursor: pointer;

      &:hover {
        transform: scale(1.3);
        background: var(--ion-color-primary-tint);
      }
    }

    &.current-room {
      background: #fff;
      box-shadow: 0 0 4px #fff;
      animation: blink-animation 1s infinite;

      &:hover {
        transform: none;
      }
    }
  }

  @keyframes blink-animation {
    0% {
      opacity: 1;
    }

    50% {
      opacity: 0.3;
    }

    100% {
      opacity: 1;
    }
  }
</style>
