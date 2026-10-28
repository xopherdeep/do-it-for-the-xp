<template>
  <div class="floor-clock" :class="`is-${clock.state}`" role="status" data-cy="temple-floor-clock">
    <span class="floor-clock__line" data-cy="temple-floor-clock-line">{{ clock.line }}</span>
    <span v-if="clock.offer" class="floor-clock__offer" data-cy="temple-floor-offer">{{ clock.offer }}</span>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { FloorClockView } from '@/lib/services/projects/floorClock';

/**
 * A project tower's floor clock, in the temple's header under the room's name: how long the floor the hero stands on has
 * ("Deep Clean: due Sat, 3 days left") and, while clearing it today would earn more than x1, the offer to do so. The
 * words come from the copy catalogue in the hero's voice (floorClock.ts); this only sets them on the header.
 */
defineProps({ clock: { type: Object as PropType<FloorClockView>, required: true } });
</script>

<style lang="scss" scoped>
.floor-clock {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: 2px 12px;
  padding: 3px 8px;
  background: var(--gs-window, rgba(0, 0, 0, 0.7));
  color: var(--gs-text, inherit);
  font-family: 'StatusPlz', monospace;
  font-size: 0.8rem;
  line-height: 1.25;
  text-align: center;

  &.is-today &__line {
    color: var(--gs-accent, inherit);
  }

  &.is-late &__line {
    color: var(--gs-danger, inherit);
  }

  &.is-cleared &__line {
    color: var(--gs-good, inherit);
  }

  &__offer {
    color: var(--gs-accent, inherit);
  }
}
</style>
