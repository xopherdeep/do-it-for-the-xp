<template>
  <div class="compact-map">
    <div v-for="(row, y) in grid" :key="y" class="map-row">
      <div 
        v-for="(cell, x) in row" 
        :key="x" 
        class="map-cell"
        :class="{ 
          'is-room': cell.isRoom,
          'has-item': !!cell.item,
          'lock-n': cell.lockedEdges?.north,
          'lock-e': cell.lockedEdges?.east,
          'lock-s': cell.lockedEdges?.south,
          'lock-w': cell.lockedEdges?.west
        }"
      >
        <i v-if="cell.isEntrance" class="fas fa-door-open entrance-icon"></i>
        <i v-else-if="cell.isBoss" class="fad fa-crown boss-icon"></i>
        <i v-else-if="cell.item" :class="['fad', getItemIcon(cell.item === 'master-key' ? 'master' : cell.item)]"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getItemIcon } from "../../hooks/templeData/templeLookups";

/** One cell of the Item Navigator's floor map: a room or not, what it holds, and which of its sides are locked. */
interface ItemMapCell {
  isRoom: boolean;
  item?: string | null;
  isBoss?: boolean;
  isEntrance?: boolean;
  lockedEdges?: Record<"north" | "east" | "south" | "west", boolean>;
}

/**
 * One floor of the Item Navigator: a compact map with the entrance, the boss room, each key item where it lies and a
 * red bar on every locked side.
 */
defineProps<{
  grid: ItemMapCell[][];
}>();
</script>

<style lang="scss" scoped>
.compact-map {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  .map-row { display: flex; gap: 2px; }

  .map-cell {
    width: 32px;
    height: 32px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    position: relative;
    box-sizing: border-box;

    &.is-room {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.03);
    }

    &.has-item {
      color: var(--ion-color-primary);
    }

    /* Locked Door Edges */
    &[class*="lock-"]::before {
      content: '';
      position: absolute;
      background: var(--ion-color-danger);
      box-shadow: 0 0 8px var(--ion-color-danger);
      z-index: 5;
    }

    &.lock-n::before { top: -2px; left: 20%; right: 20%; height: 3px; }
    &.lock-e::before { right: -2px; top: 20%; bottom: 20%; width: 3px; }
    &.lock-s::before { bottom: -2px; left: 20%; right: 20%; height: 3px; }
    &.lock-w::before { left: -2px; top: 20%; bottom: 20%; width: 3px; }

    .entrance-icon { font-size: 0.7rem; color: #fff; }
    .boss-icon { color: var(--ion-color-warning); font-size: 1.1rem; }
  }
}
</style>
