import { computed, Ref } from 'vue';
import { Direction, Temple } from '../types';

export function useNavigation(
  templeData: Ref<Record<string, Temple>>,
  selectedTemple: Ref<string>,
  currentPosition: Ref<[number, number]>,
  isValidRoom: (position: [number, number]) => boolean
) {
  // Compute movement possibilities in each direction
  const canMoveUp = computed(() => {
    const [row, col] = currentPosition.value;
    return isValidRoom([row - 1, col]);
  });
  
  const canMoveDown = computed(() => {
    const [row, col] = currentPosition.value;
    return isValidRoom([row + 1, col]);
  });
  
  const canMoveLeft = computed(() => {
    const [row, col] = currentPosition.value;
    return isValidRoom([row, col - 1]);
  });
  
  const canMoveRight = computed(() => {
    const [row, col] = currentPosition.value;
    return isValidRoom([row, col + 1]);
  });
  
  // Convert direction to position delta
  const directionToDelta = (direction: Direction): [number, number] => {
    switch (direction) {
      case 'north': return [-1, 0];
      case 'south': return [1, 0];
      case 'west': return [0, -1];
      case 'east': return [0, 1];
      default: return [0, 0];
    }
  };
  
  // Move in a specified direction
  const moveDirection = (direction: Direction, isDoorLocked?: (direction: Direction) => boolean): boolean => {
    // Check if door is locked first if the function is provided
    if (isDoorLocked && isDoorLocked(direction)) {
      return false;
    }
    
    // Calculate new position
    const delta = directionToDelta(direction);
    const [dRow, dCol] = delta;
    const [currentRow, currentCol] = currentPosition.value;
    const newPosition: [number, number] = [currentRow + dRow, currentCol + dCol];
    
    // Check if the new position is a valid room
    if (isValidRoom(newPosition)) {
      // Update position and return success
      currentPosition.value = newPosition;
      return true;
    }
    
    return false;
  };
  
  return {
    canMoveUp,
    canMoveDown,
    canMoveLeft,
    canMoveRight,
    moveDirection
  };
}