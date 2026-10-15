import { ref, watch, type Ref } from 'vue';
import { useTimers } from '@/hooks/useTimers';

/** How long the dust is on screen; then it is taken down so nothing idles on the compositor. */
export const ROOM_DUST_MS = 1000;

export interface RoomArrival {
  /** Grows by one per move, so the dust replays even on a second move the same way */
  key: number;
  /** The way the hero walked: -1, 0 or 1 across (dx) and down (dy) */
  dx: number;
  dy: number;
}

const stepOf = (to: number, from: number): number => Math.sign(to - from);

/**
 * Each step to a neighbouring room: which way the hero walked, so the dust streams past the other way while the floor
 * slides. A jump (a teleport, a new floor, a battle return) is not a step.
 */
export const useRoomArrival = (currentPosition: Ref<[number, number]>) => {
  const arrival = ref<RoomArrival | null>(null);
  const timers = useTimers();
  let steps = 0;

  watch(currentPosition, (to, from) => {
    const hasBothRooms = Boolean(to && from);
    if (!hasBothRooms) return;
    const dy = stepOf(to[0], from[0]);
    const dx = stepOf(to[1], from[1]);
    const distance = Math.abs(to[0] - from[0]) + Math.abs(to[1] - from[1]);
    const isOneStep = distance === 1;
    if (!isOneStep) return;
    steps += 1;
    arrival.value = { key: steps, dx, dy };
    timers.cancelAll();
    timers.startTimeout(ROOM_DUST_MS, () => (arrival.value = null));
  });

  return { arrival };
};
