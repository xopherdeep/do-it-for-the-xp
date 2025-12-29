import { ref } from 'vue';
import { Direction, RoomDefinition, Temple } from '../types';

export function useDoorLocks() {
  const lockedDoors = ref<Record<Direction, boolean>>({
    north: false,
    south: false,
    east: false,
    west: false
  });
  
  const showLockedDoorAlert = ref<boolean>(false);
  
  // Check if a door is locked in a specific direction
  const isDoorLocked = (direction: Direction): boolean => {
    return lockedDoors.value[direction] || false;
  };
  
  // Toggle a door's locked state
  const toggleDoorLock = (direction: Direction, temple?: Temple, position?: [number, number]): void => {
    lockedDoors.value[direction] = !lockedDoors.value[direction];
    
    // If temple and position are provided, update the room definition in temple data
    if (temple && position) {
      const [row, col] = position;
      if (row < 0 || row >= temple.maze.length || col < 0 || col >= temple.maze[0].length) {
        return;
      }
      
      const roomKey = temple.maze[row][col];
      const room = temple.rooms[roomKey];
      
      if (room) {
        if (!room.doors) {
          room.doors = {};
        }
        room.doors[direction] = lockedDoors.value[direction];
      }
    }
  };
  
  // Update locked doors based on room definition
  const updateLockedDoorsFromRoom = (room: RoomDefinition | null): void => {
    if (!room || !room.doors) {
      // Reset all doors to unlocked if no room or doors defined
      lockedDoors.value = {
        north: false,
        south: false,
        east: false,
        west: false
      };
      return;
    }
    
    // Update each direction based on room definition
    lockedDoors.value.north = !!room.doors.north;
    lockedDoors.value.south = !!room.doors.south;
    lockedDoors.value.east = !!room.doors.east;
    lockedDoors.value.west = !!room.doors.west;
  };
  
  return {
    lockedDoors,
    showLockedDoorAlert,
    isDoorLocked,
    toggleDoorLock,
    updateLockedDoorsFromRoom
  };
}