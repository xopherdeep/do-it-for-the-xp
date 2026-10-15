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

/** Fixed spots and delays, so every step looks alike and nothing is random in a test */
const MOTES = [
  [12, 18, 0], [28, 64, 60], [44, 30, 30], [60, 78, 90], [76, 42, 15],
  [88, 70, 75], [20, 88, 45], [52, 12, 105], [36, 50, 20], [70, 24, 50],
].map(([x, y, delay], id) => ({
  id,
  style: { "--x": `${x}%`, "--y": `${y}%`, "--delay": `${delay}ms` },
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
    width: 4px;
    height: 4px;
    background: var(--glow);
    box-shadow: 0 0 4px var(--glow);
    opacity: 0;
    animation: room-arrival-mote 600ms steps(8, end) var(--delay) both;
  }
}

@keyframes room-arrival-flash {
  0% { opacity: 0; }
  40% { opacity: 0.35; }
  100% { opacity: 0; }
}

@keyframes room-arrival-mote {
  0% { opacity: 0; transform: translate(0, 0); }
  20% { opacity: 0.9; }
  100% { opacity: 0; transform: translate(calc(var(--dx) * -120px), calc(var(--dy) * -120px)); }
}

@media (prefers-reduced-motion: reduce) {
  .room-arrival {
    display: none;
  }
}
</style>
