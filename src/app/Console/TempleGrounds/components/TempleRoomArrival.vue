<template>
  <div
    v-if="arrival"
    :key="arrival.key"
    class="room-arrival"
    :class="`room-arrival--${heading}`"
    :style="{ '--glow': glow }"
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

/** The way the dust streams: against the way the hero walked */
const heading = computed(() => {
  const { dx = 0, dy = 0 } = props.arrival ?? {};
  const isAcross = dx !== 0;
  if (isAcross) return dx > 0 ? "west" : "east";
  return dy > 0 ? "north" : "south";
});

/**
 * Fixed spots, sizes and delays, so every step looks alike and nothing is random in a test. Kept few and cheap: each
 * mote only moves and fades (both run on the compositor), with a hard rim instead of a blurred glow.
 */
const MOTES = [
  [12, 22, 0, 8], [30, 64, 50, 10], [46, 34, 25, 8], [62, 78, 80, 10], [78, 42, 10, 8],
  [90, 70, 65, 10], [20, 86, 40, 8], [54, 14, 95, 10], [38, 50, 15, 8], [70, 24, 45, 10],
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
    will-change: opacity;
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
    /* A dark rim so the dust reads on a pale floor as well as a dark one (a border: no blur to repaint) */
    border: 2px solid rgba(0, 0, 0, 0.45);
    opacity: 0;
    will-change: transform, opacity;
    animation: 850ms steps(10, end) var(--delay) both;
  }

  /* One set of keyframes per heading: keyframes built from CSS variables cannot run on the compositor */
  &--west &__mote {
    animation-name: room-arrival-west;
  }

  &--east &__mote {
    animation-name: room-arrival-east;
  }

  &--north &__mote {
    animation-name: room-arrival-north;
  }

  &--south &__mote {
    animation-name: room-arrival-south;
  }
}

@keyframes room-arrival-flash {
  0% { opacity: 0; }
  40% { opacity: 0.35; }
  100% { opacity: 0; }
}

@keyframes room-arrival-west {
  0% { opacity: 0; transform: translate3d(0, 0, 0); }
  15% { opacity: 1; }
  70% { opacity: 0.8; }
  100% { opacity: 0; transform: translate3d(-220px, 0, 0); }
}

@keyframes room-arrival-east {
  0% { opacity: 0; transform: translate3d(0, 0, 0); }
  15% { opacity: 1; }
  70% { opacity: 0.8; }
  100% { opacity: 0; transform: translate3d(220px, 0, 0); }
}

@keyframes room-arrival-north {
  0% { opacity: 0; transform: translate3d(0, 0, 0); }
  15% { opacity: 1; }
  70% { opacity: 0.8; }
  100% { opacity: 0; transform: translate3d(0, -220px, 0); }
}

@keyframes room-arrival-south {
  0% { opacity: 0; transform: translate3d(0, 0, 0); }
  15% { opacity: 1; }
  70% { opacity: 0.8; }
  100% { opacity: 0; transform: translate3d(0, 220px, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .room-arrival {
    display: none;
  }
}
</style>
