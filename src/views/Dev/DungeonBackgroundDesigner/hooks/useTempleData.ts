import { ref } from 'vue';
import { Temple, RoomDefinition } from '../types';

// Sample temple data - in a real app, this would come from a database or API
const sampleTemples: Record<string, Temple> = {
  'wind-temple': {
    name: 'Wind Temple',
    maze: [
      ['w1', 'w2', 'w3', 'w4', 'w5'],
      ['w6', 'r1', 'r2', 'r3', 'w7'],
      ['w8', 'r4', 'r5', 'r6', 'w9'],
      ['w10', 'r7', 'r8', 'r9', 'w11'],
      ['w12', 'w13', 'w14', 'w15', 'w16']
    ],
    rooms: {
      'w1': { type: 'wall' }, 'w2': { type: 'wall' }, 'w3': { type: 'wall' }, 'w4': { type: 'wall' }, 'w5': { type: 'wall' },
      'w6': { type: 'wall' }, 'r1': { type: 'entrance' }, 'r2': { type: 'hall' }, 'r3': { type: 'loot' }, 'w7': { type: 'wall' },
      'w8': { type: 'wall' }, 'r4': { type: 'monster' }, 'r5': { type: 'teleport' }, 'r6': { type: 'shop' }, 'w9': { type: 'wall' },
      'w10': { type: 'wall' }, 'r7': { type: 'puzzle' }, 'r8': { type: 'miniboss' }, 'r9': { type: 'boss' }, 'w11': { type: 'wall' },
      'w12': { type: 'wall' }, 'w13': { type: 'wall' }, 'w14': { type: 'wall' }, 'w15': { type: 'wall' }, 'w16': { type: 'wall' }
    },
    entrance: [1, 1]
  },
  'fire-temple': {
    name: 'Fire Temple',
    maze: [
      ['w1', 'w2', 'w3', 'w4', 'w5'],
      ['w6', 'r1', 'r2', 'r3', 'w7'],
      ['w8', 'r4', 'r5', 'r6', 'w9'],
      ['w10', 'r7', 'r8', 'r9', 'w11'],
      ['w12', 'w13', 'w14', 'w15', 'w16']
    ],
    rooms: {
      'w1': { type: 'wall' }, 'w2': { type: 'wall' }, 'w3': { type: 'wall' }, 'w4': { type: 'wall' }, 'w5': { type: 'wall' },
      'w6': { type: 'wall' }, 'r1': { type: 'entrance' }, 'r2': { type: 'trap' }, 'r3': { type: 'monster' }, 'w7': { type: 'wall' },
      'w8': { type: 'wall' }, 'r4': { type: 'loot' }, 'r5': { type: 'hall' }, 'r6': { type: 'teleport' }, 'w9': { type: 'wall' },
      'w10': { type: 'wall' }, 'r7': { type: 'shop' }, 'r8': { type: 'miniboss' }, 'r9': { type: 'boss' }, 'w11': { type: 'wall' },
      'w12': { type: 'wall' }, 'w13': { type: 'wall' }, 'w14': { type: 'wall' }, 'w15': { type: 'wall' }, 'w16': { type: 'wall' }
    },
    entrance: [1, 1]
  }
};

export function useTempleData() {
  // Reactive temple data store
  const templeData = ref<Record<string, Temple>>(sampleTemples);
  const selectedTemple = ref<string>('wind-temple');
  const currentPosition = ref<[number, number]>([0, 0]);
  const currentRoomType = ref<string>('');

  // Get the current room based on position
  const getCurrentRoom = (): RoomDefinition | null => {
    const temple = templeData.value[selectedTemple.value];
    if (!temple) return null;

    const [row, col] = currentPosition.value;
    if (row < 0 || row >= temple.maze.length || col < 0 || col >= temple.maze[0].length) {
      return null;
    }

    const roomKey = temple.maze[row][col];
    return temple.rooms[roomKey] || null;
  };

  // Check if a position is a valid room (not a wall or out of bounds)
  const isValidRoom = (position: [number, number]): boolean => {
    const temple = templeData.value[selectedTemple.value];
    if (!temple) return false;

    const [row, col] = position;
    if (row < 0 || row >= temple.maze.length || col < 0 || col >= temple.maze[0].length) {
      return false;
    }

    const roomKey = temple.maze[row][col];
    const room = temple.rooms[roomKey];
    return room && room.type !== 'wall';
  };

  // Update room info based on current position
  const updateRoomInfo = (): RoomDefinition | null => {
    const room = getCurrentRoom();
    if (room) {
      currentRoomType.value = room.type;
    } else {
      currentRoomType.value = 'unknown';
    }
    return room;
  };

  // Load selected temple data and set initial position
  const loadSelectedTemple = async (): Promise<void> => {
    // In a real app, this might fetch data from an API
    const temple = templeData.value[selectedTemple.value];
    if (temple) {
      currentPosition.value = [...temple.entrance];
      updateRoomInfo();
    }
  };

  // Reset to entrance position
  const resetToEntrance = (): void => {
    const temple = templeData.value[selectedTemple.value];
    if (temple) {
      currentPosition.value = [...temple.entrance];
      updateRoomInfo();
    }
  };

  // Initialize with the first temple
  if (Object.keys(templeData.value).length > 0) {
    resetToEntrance();
  }

  return {
    templeData,
    selectedTemple,
    currentPosition,
    currentRoomType,
    loadSelectedTemple,
    resetToEntrance,
    updateRoomInfo,
    getCurrentRoom,
    isValidRoom
  };
}