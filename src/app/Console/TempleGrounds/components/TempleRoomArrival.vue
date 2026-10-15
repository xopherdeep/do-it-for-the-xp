<template>
  <div
    v-if="arrival"
    :key="arrival.key"
    class="room-arrival"
    :style="{ '--glow': glow, '--dx': arrival.dx, '--dy': arrival.dy }"
    aria-hidden="true"
  >
    <div class="room-arrival__flash" />
    <span v-for="mote in MOTES" :key="mote.id" class="room-arrival__mote" :style="mote.style" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { RoomArrival } from "../templeGrounds/useRoomArrival";
import { templeGlow } from "./templeGlow";

const props = defineProps<{ arrival: RoomArrival | null; element?: string }>();

const glow = computed(() => templeGlow(props.element));

/** Fixed spots, sizes and delays, so every step looks alike and nothing is random in a test */
const MOTES = [
  [10, 20, 0, 8], [24, 62, 50, 6], [40, 32, 25, 10], [58, 76, 80, 8],
  [74, 40, 10, 6], [88, 68, 65, 10], [18, 86, 40, 8], [50, 14, 95, 6],
  [34, 48, 15, 8], [68, 22, 45, 10], [82, 88, 30, 6], [6, 44, 70, 10],
  [46, 66, 55, 8], [92, 30, 20, 6], [62, 54, 85, 8], [28, 8, 35, 6],
].map(([x, y, delay, size], id) => ({
  id,
  style: { "--x": `${x}%`, "--y": `${y}%`, "--delay": `${delay}ms`, "--size": `${size}px` },
}));
</script>

<style lang="scss" scoped>
.room-arrival {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  overflow: hidden;

  /* A breath of the temple's light as the new room comes into view */
  &__flash {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, transparent 40%, var(--glow) 140%);
    opacity: 0;
    animation: room-arrival-flash 650ms steps(6, end) both;
  }

  /* Dust streaming past against the way the hero walks */
  &__mote {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: var(--size);
    height: var(--size);
    background: var(--glow);
    /* A dark rim so the dust reads on a pale floor as well as a dark one */
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.45), 0 0 8px var(--glow);
    opacity: 0;
    animation: room-arrival-mote 850ms steps(10, end) var(--delay) both;
  }
}

@keyframes room-arrival-flash {
  0% { opacity: 0; }
  40% { opacity: 0.35; }
  100% { opacity: 0; }
}

@keyframes room-arrival-mote {
  0% { opacity: 0; transform: translate(0, 0); }
  15% { opacity: 1; }
  70% { opacity: 0.8; }
  100% { opacity: 0; transform: translate(calc(var(--dx) * -220px), calc(var(--dy) * -220px)); }
}

@media (prefers-reduced-motion: reduce) {
  .room-arrival {
    display: none;
  }
}
</style>
