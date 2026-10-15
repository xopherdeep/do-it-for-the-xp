import { ref, watch, type Ref } from 'vue';
import { useTimers } from '@/hooks/useTimers';

/** As long as the floor takes to slide to the next room (the background's transform transition). */
export const ROOM_SLIDE_MS = 650;

export interface RoomArrival {
  /** Grows by one per move, so the dust replays even on a second move the same way */
  key: number;
  /** The way the hero walked: -1, 0 or 1 across (dx) and down (dy) */
  dx: number;
  dy: number;
}

const stepOf = (to: number, from: number): number => Math.sign(to - from);

/**
 * Each step to a neighbouring room: which way the hero walked, so the dust streams past the other way and the camera
 * gives a small lurch while the floor slides. A jump (a teleport, a new floor, a battle return) is not a step.
 */
export const useRoomArrival = (currentPosition: Ref<[number, number]>) => {
  const arrival = ref<RoomArrival | null>(null);
  const isLurching = ref(false);
  const timers = useTimers();

  watch(currentPosition, (to, from) => {
    const hasBothRooms = Boolean(to && from);
    if (!hasBothRooms) return;
    const dy = stepOf(to[0], from[0]);
    const dx = stepOf(to[1], from[1]);
    const distance = Math.abs(to[0] - from[0]) + Math.abs(to[1] - from[1]);
    const isOneStep = distance === 1;
    if (!isOneStep) return;
    arrival.value = { key: (arrival.value?.key ?? 0) + 1, dx, dy };
    isLurching.value = true;
    timers.cancelAll();
    timers.startTimeout(ROOM_SLIDE_MS, () => (isLurching.value = false));
  });

  return { arrival, isLurching };
};
