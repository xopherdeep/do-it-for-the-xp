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
  setup() {
    // Helper to check if a cell is a room (not a wall)
    const isRoom = (symbol: string) => {
      if (!symbol) return false;
      return symbol !== ____ && symbol !== 'wall';
    };

    return {
      isRoom
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
    pointer-events: none; // Let clicks pass through if needed, though it's visual reference
    opacity: 0.8;

    // Mobile adjustment: move down a bit if header is tall, or keep it top-left
    // Ion-content handles scrolling, so absolute here is relative to content scroll
    // We might want fixed position so it stays on screen
  }

  .mini-map-grid {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: rgba(0, 0, 0, 0.5);
    padding: 4px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .map-row {
    display: flex;
    gap: 2px;
  }

  .map-cell {
    width: 8px;
    height: 8px;
    border-radius: 1px;
    background: rgba(255, 255, 255, 0.05); // Wall color

    &.is-room {
      background: var(--ion-color-primary); // Room color
    }

    &.current-room {
      background: #fff;
      box-shadow: 0 0 4px #fff;
      animation: blink-animation 1s infinite;
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
