/**
 * Temple Hook - Provides access to the Temple System from Vue components
 */
import { ref, computed, watch, onMounted } from 'vue';
import { TempleSystem, MapVisibility } from '@/lib/engine/core/dungeons/TempleSystem';
import { DungeonManager } from '@/lib/engine/core/dungeons/DungeonManager';
import { AlertInput } from '@ionic/vue';
import { ChestSystem } from '@/lib/engine/core/dungeons/ChestSystem';
import { ROOM_ICONS } from '@/lib/engine/dungeons/roomTypes';
import debug from '@/lib/utils/debug';

// Define a message display function type that can be provided by the component using this hook
export type MessageDisplayFn = (message: string, duration?: number) => void;

export function useTemple(templeId: string, startPosition?: [number, number]) {
  const templeSystem = TempleSystem.getInstance();
  const dungeonManager = DungeonManager.getInstance();

  // Local refs to track state
  const currentPosition = ref<[number, number]>([0, 0]);
  const hasMap = ref(false);
  const hasCompass = ref(false);
  const playerKeys = ref(0);
  const isMapOpen = ref(false);
  const currentMessage = ref('');
  const showMessage = ref(false);
  
  // Optional function reference for external message display
  let externalDisplayMessage: MessageDisplayFn | null = null;

  // Initialize temple
  onMounted(() => {
    // Initialize the temple if it has a defined entrance position
    const temple = dungeonManager.getDungeon(templeId);
    if (temple) {
      const entrance = startPosition || (temple as any).entrance || [0, 0];
      templeSystem.initTemple(templeId, entrance);
      
      // Sync local state with temple state
      const state = templeSystem.getTempleState(templeId);
      if (state) {
        currentPosition.value = state.currentPosition;
        hasMap.value = state.hasMap;
        hasCompass.value = state.hasCompass;
        playerKeys.value = state.playerKeys;
      }
    }
  });
  
  // Allow components to register their own message display function
  const registerMessageDisplay = (displayFn: MessageDisplayFn) => {
    externalDisplayMessage = displayFn;
  };
  
  // Watch for changes in the temple state
  watch(
    () => templeSystem.getTempleState(templeId),
    (newState) => {
      if (newState) {
        currentPosition.value = newState.currentPosition;
        hasMap.value = newState.hasMap;
        hasCompass.value = newState.hasCompass;
        playerKeys.value = newState.playerKeys;
      }
    },
    { deep: true }
  );

  // Computed property for the current room
  const currentRoom = computed(() => {
    return templeSystem.getCurrentRoom(templeId);
  });
  
  // Get the maze for the current temple
  const maze = computed(() => {
    const temple = dungeonManager.getDungeon(templeId);
    return temple?.maze || [];
  });
  
  // Get all rooms in the temple
  const rooms = computed(() => {
    const temple = dungeonManager.getDungeon(templeId);
    return temple?.rooms || {};
  });
  
  // Get chest contents for the current room
  const chestContents = computed(() => {
    if (!currentRoom.value || currentRoom.value.type !== 'loot' || !currentRoom.value.content) {
      return [] as AlertInput[];
    }
    
    const contents: AlertInput[] = [];
    
    // Add standard items
    if (currentRoom.value.content.items) {
      currentRoom.value.content.items.forEach(item => {
        contents.push({
          name: item,
          type: 'checkbox',
          label: item,
          value: item,
          checked: false
        });
      });
    }
    
    // Add dungeon items like maps, compasses, keys
    if (currentRoom.value.content.chest === 'dungeon' && currentRoom.value.content.dungeon) {
      contents.push({
        name: currentRoom.value.content.dungeon,
        type: 'checkbox',
        label: currentRoom.value.content.dungeon,
        value: currentRoom.value.content.dungeon,
        checked: false
      });
    }
    
    // Add gold if present
    if (currentRoom.value.content.gold) {
      contents.push({
        name: `${currentRoom.value.content.gold} Gold`,
        type: 'checkbox',
        label: `${currentRoom.value.content.gold} Gold`,
        value: `gold:${currentRoom.value.content.gold}`,
        checked: false
      });
    }
    
    return contents;
  });
  
  // Get the color for the current room action
  const actionColor = computed(() => {
    if (!currentRoom.value) return 'none';
    
    switch (currentRoom.value.type) {
      case 'boss':
      case 'monster':
        return 'danger';
      case 'loot':
        // Always check the isChestEmpty computed property instead of just the room's isEmpty flag
        return isChestEmpty.value ? 'medium' : 'warning';
      case 'entrance':
      case 'shop':
      case 'teleport':
        return 'success';
      default:
        return 'primary';
    }
  });
  
  // Movement capability checks
  const canMoveUp = computed(() => {
    if (!currentPosition.value || currentPosition.value[0] <= 0) return false;
    const [row, col] = currentPosition.value;
    const roomKey = maze.value[row - 1]?.[col];
    if (!roomKey) return false;
    return rooms.value[roomKey]?.type !== 'wall';
  });
  
  const canMoveDown = computed(() => {
    if (!currentPosition.value || currentPosition.value[0] >= maze.value.length - 1) return false;
    const [row, col] = currentPosition.value;
    const roomKey = maze.value[row + 1]?.[col];
    if (!roomKey) return false;
    return rooms.value[roomKey]?.type !== 'wall';
  });
  
  const canMoveLeft = computed(() => {
    if (!currentPosition.value || currentPosition.value[1] <= 0) return false;
    const [row, col] = currentPosition.value;
    const roomKey = maze.value[row]?.[col - 1];
    if (!roomKey) return false;
    return rooms.value[roomKey]?.type !== 'wall';
  });
  
  const canMoveRight = computed(() => {
    if (!currentPosition.value || currentPosition.value[1] >= (maze.value[0]?.length || 0) - 1) return false;
    const [row, col] = currentPosition.value;
    const roomKey = maze.value[row]?.[col + 1];
    if (!roomKey) return false;
    return rooms.value[roomKey]?.type !== 'wall';
  });
  
  // Helper to display messages - now uses the external display function if available
  const displayMessage = (message: string, duration = 2000) => {
    // If an external display function is registered, use it
    if (externalDisplayMessage) {
      externalDisplayMessage(message, duration);
      return;
    }
    
    // Otherwise fall back to the default toast behavior
    currentMessage.value = message;
    showMessage.value = true;
    
    setTimeout(() => {
      showMessage.value = false;
    }, duration);
  };
  
  // Move in a direction
  const move = (direction: 'north' | 'south' | 'east' | 'west') => {
    if (!currentPosition.value) return false;
    
    const [row, col] = currentPosition.value;
    let newRow = row;
    let newCol = col;
    
    switch (direction) {
      case 'north':
        if (row > 0) newRow = row - 1;
        break;
      case 'south':
        if (row < maze.value.length - 1) newRow = row + 1;
        break;
      case 'west':
        if (col > 0) newCol = col - 1;
        break;
      case 'east':
        if (col < (maze.value[0]?.length || 0) - 1) newCol = col + 1;
        break;
    }
    
    // Try to move to the new position
    const result = templeSystem.moveToPosition(templeId, [newRow, newCol], direction);
    
    // If movement wasn't successful, check if it was due to a locked door
    if (!result && isDoorLocked(newRow, newCol)) {
      // Could show unlock dialog here
      return false;
    }
    
    return result;
  };
  
  // Check if a door is locked
  const isDoorLocked = (newRow: number, newCol: number) => {
    if (!currentPosition.value) return false;
    
    const [row, col] = currentPosition.value;
    const currentRoomKey = maze.value[row][col];
    const currentRoom = rooms.value[currentRoomKey];
    
    if (!currentRoom) return false;
    
    // Determine direction based on position difference
    let direction: 'north' | 'south' | 'east' | 'west' | null = null;
    
    if (newRow < row) direction = 'north';
    else if (newRow > row) direction = 'south';
    else if (newCol < col) direction = 'west';
    else if (newCol > col) direction = 'east';
    
    if (!direction) return false;
    
    // Check if the door in this direction is locked
    return currentRoom.locked && currentRoom.locked[direction];
  };
  
  // Unlock a door in a specific direction
  const unlockDoor = (direction: 'north' | 'south' | 'east' | 'west') => {
    if (!currentPosition.value) return false;
    
    const result = templeSystem.unlockDoor(
      templeId,
      currentPosition.value,
      direction
    );
    
    if (result) {
      displayMessage('Door Unlocked', 2000);
    }
    
    return result;
  };
  
  // Process selected chest items
  const processChestItems = (selectedItems: string[]) => {
    if (!currentRoom.value || !currentPosition.value) return;
    
    // Get the room key for the current position
    const [row, col] = currentPosition.value;
    debug.log(`Processing chest items at position [${row}, ${col}] in temple ${templeId}`);
    
    // Process each selected item
    selectedItems.forEach(item => {
      // Handle special gold item format
      if (item.startsWith('gold:')) {
        const goldAmount = parseInt(item.split(':')[1], 10);
        if (!isNaN(goldAmount)) {
          // TODO: Add gold to player inventory
          debug.log(`Added ${goldAmount} gold to player inventory`);
        }
        return;
      }
      
      // Handle special items by updating both local refs AND the temple system state
      if (item === 'key') {
        playerKeys.value++;
        // Update the temple system state directly to ensure persistence
        const state = templeSystem.getTempleState(templeId);
        if (state) state.playerKeys = playerKeys.value;
      } else if (item === 'map') {
        hasMap.value = true;
        // Update the temple system state directly
        const state = templeSystem.getTempleState(templeId);
        if (state) state.hasMap = true;
      } else if (item === 'compass') {
        hasCompass.value = true;
        // Update the temple system state directly
        const state = templeSystem.getTempleState(templeId);
        if (state) state.hasCompass = true;
      }
      // Other items would be added to inventory
    });
    
    // Get chest ID if available
    const chestId = currentRoom.value.content?.chestId;
    
    // Remove the items from the chest in both systems
    dungeonManager.removeItemsFromRoomChest(templeId, currentPosition.value, selectedItems);
    
    // If we have a chest ID, also update it in the ChestSystem
    if (chestId) {
      const chestSystem = ChestSystem.getInstance();
      chestSystem.removeItemsFromChest(chestId, selectedItems);
      
      // Check if the chest is now empty in the ChestSystem
      const chest = chestSystem.getChest(chestId);
      if (chest && chest.isEmpty) {
        // Mark the room as empty in the dungeonManager to ensure persistence
        dungeonManager.updateRoom(templeId, currentPosition.value, {
          ...currentRoom.value,
          isEmpty: true
        });
      }
    } else {
      // For chests without a chestId, check if all items have been collected
      const itemsLeft = (currentRoom.value.content?.items?.length || 0) === 0;
      const dungeonItemLeft = !currentRoom.value.content?.dungeon;
      
      if (itemsLeft && dungeonItemLeft) {
        // Mark the room as empty if all items have been collected
        dungeonManager.updateRoom(templeId, currentPosition.value, {
          ...currentRoom.value,
          isEmpty: true
        });
      }
    }
    
    // Generate a message about what was collected
    const message = `Collected: ${selectedItems.join(', ')}`;
    displayMessage(message, 3000);
  };
  
  // Check if the chest in the current room is empty
  const isChestEmpty = computed(() => {
    if (!currentRoom.value || currentRoom.value.type !== 'loot') {
      return true;
    }
    
    // First check the room's isEmpty flag
    if (currentRoom.value.isEmpty) {
      return true;
    }
    
    // Then check if the chest actually exists and has contents
    if (!currentRoom.value.content) {
      return true;
    }
    
    // If the room has a chestId, check the actual chest state in the ChestSystem
    if (currentRoom.value.content.chestId) {
      const chest = ChestSystem.getInstance().getChest(currentRoom.value.content.chestId);
      if (chest && chest.isEmpty) {
        // Synchronize the room state with chest state
        currentRoom.value.isEmpty = true;
        return true;
      }
    }
    
    return false;
  });
  
  // Handle teleporting between teleport rooms
  const handleTeleport = () => {
    const newPosition = templeSystem.handleTeleport(templeId);
    
    if (newPosition) {
      displayMessage('Teleported!', 2000);
      return true;
    }
    
    return false;
  };
  
  // Toggles for UI state
  const toggleMap = () => {
    isMapOpen.value = !isMapOpen.value;
  };
  
  // Explicitly open the map
  const openMap = () => {
    isMapOpen.value = true;
  };
  
  // Explicitly close the map
  const closeMap = () => {
    isMapOpen.value = false;
  };

  // Map and compass related utilities
  
  // Determine if room details should be shown (based on having compass or room being visited)
  const showRoomDetails = (row: number, col: number): boolean => {
    return templeSystem.shouldShowRoomDetails(templeId, [row, col]);
  };
  
  // Get visibility status for a specific room
  const getRoomVisibility = (row: number, col: number): MapVisibility => {
    return templeSystem.getRoomVisibility(templeId, [row, col]);
  };
  
  // Check if a position is the player's current position
  const isCurrentRoom = (row: number, col: number): boolean => {
    return templeSystem.isCurrentPosition(templeId, [row, col]);
  };
  
  // Get appropriate icon for a room based on its type and visibility state
  const getRoomIcon = (row: number, col: number): string => {
    return templeSystem.getRoomIcon(templeId, [row, col], ROOM_ICONS);
  };
  
  // Get CSS classes for a map tile based on its state
  const getMapTileClass = (row: number, col: number): string[] => {
    const classes: string[] = ['maze-cell'];
    const visibility = getRoomVisibility(row, col);
    const isCurrent = isCurrentRoom(row, col);
    
    // Base display - determine if the cell should be visible at all
    if (visibility === MapVisibility.NONE) {
      classes.push('hidden-cell');
      return classes;
    }
    
    // Get the room info
    const roomKey = maze.value?.[row]?.[col];
    if (!roomKey) return [...classes, 'invalid-cell'];
    
    const room = rooms.value[roomKey];
    if (!room) return [...classes, 'invalid-cell'];
    
    // Handle current position highlighting
    if (isCurrent) classes.push('current-position');
    
    // Handle wall, which is always visible if the map is unlocked
    if (room.type === 'wall') {
      classes.push('wall-cell');
      return classes;
    }
    
    // Handle based on visibility level
    if (visibility === MapVisibility.FULL_DETAILS) {
      classes.push('detailed-cell');
      
      // Add room-specific classes
      if (templeSystem.hasVisited(templeId, [row, col])) classes.push('visited-cell');
      if (room.type) classes.push(`room-type-${room.type}`);
    } else {
      // Just layout without details
      classes.push('layout-only-cell');
    }
    
    return classes;
  };

  // Check if a specific room has been visited (using engine's coordinate tracking)
  const isRoomVisited = (row: number, col: number): boolean => {
    return templeSystem.hasVisited(templeId, [row, col]);
  };

  return {
    // State
    currentPosition,
    hasMap,
    hasCompass,
    playerKeys,
    isMapOpen,
    currentRoom,
    maze,
    rooms,
    actionColor,
    currentMessage,
    showMessage,
    chestContents,
    isChestEmpty,
    
    // Movement capabilities
    canMoveUp,
    canMoveDown,
    canMoveLeft,
    canMoveRight,
    
    // Actions
    move,
    isDoorLocked,
    unlockDoor,
    processChestItems,
    handleTeleport,
    toggleMap,
    openMap,
    closeMap,
    displayMessage,
    registerMessageDisplay,
    
    // Map and compass utilities
    showRoomDetails,
    getRoomVisibility,
    isCurrentRoom,
    getRoomIcon,
    getMapTileClass,
    isRoomVisited
  };
}