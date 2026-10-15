import { onMounted, watch } from 'vue';
import type { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import type { useDoorReveal, useWallReveal } from './templeReveals';
import type { useRoomOutcomes } from './useRoomOutcomes';
import type { useTempleLayout } from './useTempleLayout';
import type { TempleGroundsProps, TempleState } from './useTempleMeta';

export const resolveSwipeDirection = (dx: number, dy: number): 'north' | 'south' | 'east' | 'west' => {
  const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
  if (isHorizontalSwipe) {
    const isSwipingRight = dx > 0;
    return isSwipingRight ? 'west' : 'east';
  }
  const isSwipingDown = dy > 0;
  return isSwipingDown ? 'north' : 'south';
};

export interface TempleMovementDeps
  extends Pick<
    TempleState,
    'currentPosition' | 'canMoveUp' | 'canMoveDown' | 'canMoveLeft' | 'canMoveRight' | 'isDoorLocked' | 'stepTo'
  > {
  props: TempleGroundsProps;
  templeSystem: TempleSystem;
  fx: (key: string) => void;
  updateBg: ReturnType<typeof useTempleLayout>['updateBg'];
  showLockedDoor: ReturnType<typeof useDoorReveal>['showLockedDoor'];
  showCrackedWall: ReturnType<typeof useWallReveal>['showCrackedWall'];
  arrive: ReturnType<typeof useRoomOutcomes>['handleArrival'];
}

/** The hero walks: a swipe or an arrow toward an open door, a shut door or a cracked wall comes up close, and the floor follows. */
export const useTempleMovement = (deps: TempleMovementDeps) => {
  const {
    props,
    templeSystem,
    currentPosition,
    canMoveUp,
    canMoveDown,
    canMoveLeft,
    canMoveRight,
    isDoorLocked,
    stepTo,
    fx,
    updateBg,
    showLockedDoor,
    showCrackedWall,
    arrive
  } = deps;

  // Swipe to walk: a swipe toward an open door moves the hero, a swipe into a wall does nothing.
  // Swipes shorter than the threshold, or more sideways than forwards, are ignored.
  const SWIPE_MIN_PX = 40;
  let swipeStart: { x: number; y: number } | null = null;
  const onTouchStart = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    swipeStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const onTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    if (!swipeStart || !touch) return;
    const dx = touch.clientX - swipeStart.x;
    const dy = touch.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return;
    // Dragging the world: a swipe to the right pulls the room on the left into view (west), and so on
    const direction = resolveSwipeDirection(dx, dy);
    const allowed = { north: canMoveUp, south: canMoveDown, west: canMoveLeft, east: canMoveRight }[direction];
    if (!allowed.value) return;
    moveWithUpdate(direction);
  };

  // Handle movement with UI updates
  const moveWithUpdate = (direction: 'north' | 'south' | 'east' | 'west') => {
    const [row, col] = currentPosition.value;
    let newRow = row;
    let newCol = col;

    switch (direction) {
      case 'north':
        newRow = row - 1;
        break;
      case 'south':
        newRow = row + 1;
        break;
      case 'west':
        newCol = col - 1;
        break;
      case 'east':
        newCol = col + 1;
        break;
    }

    // A cracked wall is no door to walk into: the wall comes up close, and a Bomb (if the hero holds one) blows it open
    const isCrackedWall = templeSystem.doorKind(props.temple, [row, col], direction) === 'bombable';
    if (isCrackedWall) {
      showCrackedWall(direction);
      return;
    }

    // Check if door is locked (the boss door counts, bar or no bar in front of it)
    const isDoorShut = isDoorLocked(newRow, newCol) || templeSystem.doorKind(props.temple, [row, col], direction) === 'master';
    if (isDoorShut) {
      showLockedDoor(direction);
      return;
    }

    // Update the background FIRST to create the immediate visual feedback
    // This makes the transition feel responsive right away
    updateBg(newCol, newRow);

    // THEN attempt to move in the game state
    const result = stepTo(direction);

    // If movement failed for some reason, revert the background position
    if (!result) {
      updateBg(col, row);
      return;
    }

    fx('step');

    // Traps and pits act the moment the hero walks in
    void arrive();
  };

  // Set up initial background position
  onMounted(() => {
    const [row, col] = currentPosition.value;
    updateBg(col, row);
  });

  // A saved run puts the hero back where it stopped once it has been read, which can be after the mount
  watch(currentPosition, ([row, col]) => updateBg(col, row));

  return { handleTouchStart: onTouchStart, handleTouchEnd: onTouchEnd, handleMove: moveWithUpdate };
};
