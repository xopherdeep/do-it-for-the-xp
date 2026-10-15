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
    const canUpdateRoomDefinition = temple && position;
    if (canUpdateRoomDefinition) {
      const [row, col] = position;
      const isOutsideMaze = row < 0 || row >= temple.maze.length || col < 0 || col >= temple.maze[0].length;
      if (isOutsideMaze) {
        return;
      }
      
      const roomKey = temple.maze[row][col];
      const room = temple.rooms[roomKey];
      
      if (room) {
        let doors = room.doors;
        if (!doors) {
          doors = {};
          room.doors = doors;
        }
        doors[direction] = lockedDoors.value[direction];
      }
    }
  };
  
  // Update locked doors based on room definition
  const updateLockedDoorsFromRoom = (room: RoomDefinition | null): void => {
    const doors = room?.doors;
    if (!doors) {
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
    lockedDoors.value.north = !!doors.north;
    lockedDoors.value.south = !!doors.south;
    lockedDoors.value.east = !!doors.east;
    lockedDoors.value.west = !!doors.west;
  };
  
  return {
    lockedDoors,
    showLockedDoorAlert,
    isDoorLocked,
    toggleDoorLock,
    updateLockedDoorsFromRoom
  };
}