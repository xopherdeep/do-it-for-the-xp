/**
 * Temple Hook - Provides access to the Temple System from Vue components
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { TempleSystem, MapVisibility } from '@/lib/engine/core/dungeons/TempleSystem';
import { DungeonManager } from '@/lib/engine/core/dungeons/DungeonManager';
import { registerCustomTemples } from '@/lib/engine/core/dungeons/TempleAdapter';
import { ensureTempleFresh } from '@/lib/engine/core/dungeons/templeFreshness';
import { canEnter } from '@/lib/engine/core/dungeons/templeSystem/floors';
import { isBarrierKind } from '@/lib/engine/core/dungeons/templeSystem/doors';
import { ChestSystem } from '@/lib/engine/core/dungeons/ChestSystem';
import { ROOM_ICONS } from '@/lib/engine/dungeons/roomTypes';
import debug from '@/lib/utils/debug';
import { useUserStore } from '@/lib/store/stores/user';
import { useTimers } from '@/hooks/useTimers';
import { chestItemUnlocks, freeTemplePegasus, pegasusEgg } from '@/lib/services/temples/TemplePegasus';
import { chestLoot, lootFace } from '@/lib/services/temples/ChestLoot';
import { earnGold } from '@/lib/services/temples/RoomInteractions';

// Define a message display function type that can be provided by the component using this hook
export type MessageDisplayFn = (message: string, duration?: number) => void;

/**
 * @param startPosition [row, col] to start in, e.g. the room a battle returns to
 * @param startLevel floor that position is on ("2F"); without it the hero starts on the temple's default floor
 * @param userId the hero playing: their saved run in this temple is resumed (it wins over the start position)
 *               and kept up to date. Without one the run lives in memory only.
 */
export function useTemple(templeId: string, startPosition?: [number, number], startLevel?: string, userId?: string) {
  const templeSystem = TempleSystem.getInstance();
  const dungeonManager = DungeonManager.getInstance();
  const timers = useTimers();

  // Local refs to track state
  const currentPosition = ref<[number, number]>([0, 0]);
  const hasMap = ref(false);
  const hasCompass = ref(false);
  // The small keys in hand, read straight from the temple's state (reactive), so a key spent or picked up shows at
  // once whichever door, chest or reload changed it; nothing copies the count and can fall behind
  const playerKeys = computed(() => templeSystem.getTempleState(templeId)?.playerKeys ?? 0);
  // Which way the count moved last, and a tick that moves on every change (and on `playKeyPulse`): the header's number
  // rolls on it
  const keyChange = ref<'up' | 'down' | null>(null);
  const keyPulse = ref(0);
  watch(
    playerKeys,
    (now, before) => {
      keyChange.value = now > before ? 'up' : 'down';
      keyPulse.value++;
    },
    { flush: 'sync' }
  );
  /** Roll the number again (the door reveal covered the header while the key went in) */
  const playKeyPulse = () => {
    keyPulse.value++;
  };
  const currentLevel = ref("1F");
  const isMapOpen = ref(false);
  const currentMessage = ref('');
  const showMessage = ref(false);
  
  // Optional function reference for external message display
  let externalDisplayMessage: MessageDisplayFn | null = null;

  // Sync local state with temple state
  const syncLocalState = () => {
    const state = templeSystem.getTempleState(templeId);
    if (state) {
      currentPosition.value = state.currentPosition;
      hasMap.value = state.hasMap;
      hasCompass.value = state.hasCompass;
      currentLevel.value = state.currentLevel;
    }
  };

  // Initialize the temple if it has a defined entrance position
  const initTemple = (): boolean => {
    const temple = dungeonManager.getDungeon(templeId);
    if (!temple) return false;
    const entrance = startPosition || (temple as any).entrance || [0, 0];
    templeSystem.initTemple(templeId, entrance, startLevel, userId);
    syncLocalState();
    return true;
  };

  // Start the run once the engine plays the layout the Game Master last saved: the temple's record in TempleDb is read
  // first, so a copy from an earlier visit (or the one shipped in code) never wins over an edit. A temple that only
  // lives in TempleDb (the creator's or a generated "gen-<seed>" one) is registered by that read; one the read did
  // not find is looked for among all the custom temples. Resolves to whether the temple was opened.
  let isUnmounted = false;
  onBeforeUnmount(() => {
    isUnmounted = true;
  });

  const openTemple = async (): Promise<boolean> => {
    await ensureTempleFresh(templeId);
    if (isUnmounted) return false;
    const isTempleReady = initTemple();
    if (isTempleReady) return true;

    try {
      await registerCustomTemples();
    } catch (err) {
      debug.error('Failed to register custom temples:', err);
    }
    if (isUnmounted) return false;
    const isOpened = initTemple();
    if (!isOpened) debug.warn(`Temple ${templeId} is not registered and not in TempleDb`);
    return isOpened;
  };

  // Settles when the run has started (or the temple could not be opened): the screen waits on it for anything that
  // needs the hero's run, such as the blood moon that rose since the last visit
  let markOpened: (isOpened: boolean) => void = () => undefined;
  const whenOpened = new Promise<boolean>((resolve) => {
    markOpened = resolve;
  });

  // The page is parked, not unmounted, when the hero pushes to another screen (Portal Home) and shown again on Back
  let isOpening = false;
  const open = (): Promise<boolean> => {
    isOpening = true;
    return openTemple().finally(() => {
      isOpening = false;
    });
  };

  onMounted(() => {
    // A run already going shows at once; the layout is checked behind it
    syncLocalState();
    void open().then(markOpened);
  });

  /**
   * For the page's "view will enter": a run put away while the page was parked (Portal Home, a blood moon raised at once,
   * another hero taking the temple) is opened again, the way mounting does. A run still in memory is left alone, as is
   * the first enter, which comes while the mount is still opening the temple.
   */
  const restoreIfGone = (): Promise<boolean> => {
    const isRunGone = !templeSystem.getTempleState(templeId);
    return isRunGone && !isOpening ? open() : Promise.resolve(false);
  };
  
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
        currentLevel.value = newState.currentLevel;
      }
    },
    { deep: true }
  );

  // Computed property for the current room
  const currentRoom = computed(() => {
    return templeSystem.getCurrentRoom(templeId);
  });

  // True once the beasts in the room the hero stands in have been beaten (the battle screen records the win)
  const isCurrentRoomCleared = computed(() =>
    templeSystem.isRoomCleared(templeId, currentLevel.value, currentPosition.value)
  );
  
  // Get the maze for the current temple (normalized for current level)
  const maze = computed(() => {
    return dungeonManager.getMazeGrid(templeId, currentLevel.value);
  });
  
  // Get all rooms in the temple
  const rooms = computed(() => {
    const temple = dungeonManager.getDungeon(templeId);
    return temple?.rooms || {};
  });
  
  // What the current room's chest holds, as the chest reveal shows it
  const chestContents = computed(() =>
    currentRoom.value?.type === 'loot'
      ? chestLoot(currentRoom.value.content, currentRoom.value.content?.pegasus === true ? pegasusEgg(templeId, currentRoom.value.content.dungeon) : undefined)
      : []
  );
  
  // Get the color for the current room action
  const actionColor = computed(() => {
    if (!currentRoom.value) return 'none';
    
    switch (currentRoom.value.type) {
      case 'boss':
      case 'monster':
        return isCurrentRoomCleared.value ? 'medium' : 'danger';
      case 'miniboss':
        return isCurrentRoomCleared.value ? 'medium' : 'primary';
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
  
  // Whether the side of the room the hero stands in is a wall the Game Master drew: no control, as over a wall room. A cracked
  // wall keeps its control (a bomb: the tap asks about a Bomb), as a locked door does (a lock)
  const isWallSide = (direction: 'north' | 'south' | 'east' | 'west'): boolean =>
    templeSystem.doorKind(templeId, currentPosition.value, direction, currentLevel.value) === 'wall';

  // Whether that side is a cracked wall a Bomb has not opened yet
  const isCrackedSide = (direction: 'north' | 'south' | 'east' | 'west'): boolean =>
    templeSystem.doorKind(templeId, currentPosition.value, direction, currentLevel.value) === 'bombable';

  // Movement capability checks: an arrow lights over any room the engine lets the hero step into (not a wall, a void or a
  // token with no room record) unless that side is a wall
  const canMoveUp = computed(() => {
    const isAtTopEdge = !currentPosition.value || currentPosition.value[0] <= 0;
    if (isAtTopEdge) return false;
    const [row, col] = currentPosition.value;
    const roomKey = maze.value[row - 1]?.[col];
    if (!roomKey) return false;
    return canEnter(rooms.value[roomKey]) && !isWallSide('north');
  });
  
  const canMoveDown = computed(() => {
    const mazeData = maze.value;
    const isAtBottomEdge = !currentPosition.value || currentPosition.value[0] >= mazeData.length - 1;
    if (isAtBottomEdge) return false;
    const [row, col] = currentPosition.value;
    const roomKey = maze.value[row + 1]?.[col];
    if (!roomKey) return false;
    return canEnter(rooms.value[roomKey]) && !isWallSide('south');
  });
  
  const canMoveLeft = computed(() => {
    const isAtLeftEdge = !currentPosition.value || currentPosition.value[1] <= 0;
    if (isAtLeftEdge) return false;
    const [row, col] = currentPosition.value;
    const roomKey = maze.value[row]?.[col - 1];
    if (!roomKey) return false;
    return canEnter(rooms.value[roomKey]) && !isWallSide('west');
  });
  
  const canMoveRight = computed(() => {
    const isAtRightEdge = !currentPosition.value || currentPosition.value[1] >= (maze.value[0]?.length || 0) - 1;
    if (isAtRightEdge) return false;
    const [row, col] = currentPosition.value;
    const roomKey = maze.value[row]?.[col + 1];
    if (!roomKey) return false;
    return canEnter(rooms.value[roomKey]) && !isWallSide('east');
  });
  
  // Helper to display messages - now uses the external display function if available
  const showTempleMessage = (message: string, duration = 2000) => {
    // If an external display function is registered, use it
    if (externalDisplayMessage) {
      externalDisplayMessage(message, duration);
      return;
    }
    
    // Otherwise fall back to the default toast behavior
    currentMessage.value = message;
    showMessage.value = true;
    
    timers.startTimeout(duration, () => {
      showMessage.value = false;
    });
  };
  
  const stepTo = (direction: 'north' | 'south' | 'east' | 'west') => {
    if (!currentPosition.value) return false;
    
    const [row, col] = currentPosition.value;
    let newRow = row;
    let newCol = col;
    
    switch (direction) {
      case 'north': {
        const canGoNorth = row > 0;
        if (canGoNorth) newRow = row - 1;
        break;
      }
      case 'south': {
        const mazeData = maze.value;
        const canGoSouth = row < mazeData.length - 1;
        if (canGoSouth) newRow = row + 1;
        break;
      }
      case 'west': {
        const canGoWest = col > 0;
        if (canGoWest) newCol = col - 1;
        break;
      }
      case 'east': {
        const canGoEast = col < (maze.value[0]?.length || 0) - 1;
        if (canGoEast) newCol = col + 1;
        break;
      }
    }
    
    // Try to move to the new position
    const result = templeSystem.moveToPosition(templeId, [newRow, newCol], direction);

    // A cracked wall is no door to open: say what stands there (a wall has no arrow, and a locked door has its sheet)
    const wasStoppedByBarrier = !result && isBarrierKind(templeSystem.doorKind(templeId, [row, col], direction, currentLevel.value));
    if (wasStoppedByBarrier) {
      const line = templeSystem.explainDoor(templeId, [row, col], direction);
      if (line) showTempleMessage(line);
      return false;
    }
    
    // If movement wasn't successful, check if it was due to a locked door
    const wasStoppedByLockedDoor = !result && isDoorLocked(newRow, newCol);
    if (wasStoppedByLockedDoor) {
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
  
  // What each movement control wears: a bomb over a cracked wall (it comes first: a crack hides any lock behind it), a lock
  // over a locked door, else the arrow. The sides the hero cannot step through have no control at all (canMove*).
  const MOVE_ARROWS = { north: 'fa-arrow-alt-up', south: 'fa-arrow-alt-down', west: 'fa-arrow-alt-left', east: 'fa-arrow-alt-right' } as const;
  const moveIcons = computed(() => {
    const [row, col] = currentPosition.value ?? [0, 0];
    const iconFor = (direction: keyof typeof MOVE_ARROWS, newRow: number, newCol: number): string => {
      if (isCrackedSide(direction)) return 'fa-bomb';
      return isDoorLocked(newRow, newCol) ? 'fa-lock' : MOVE_ARROWS[direction];
    };
    return {
      north: iconFor('north', row - 1, col),
      south: iconFor('south', row + 1, col),
      west: iconFor('west', row, col - 1),
      east: iconFor('east', row, col + 1),
    };
  });

  // Unlock a door in a specific direction
  const unlockDoor = (direction: 'north' | 'south' | 'east' | 'west') => {
    if (!currentPosition.value) return false;
    
    const result = templeSystem.unlockDoor(
      templeId,
      currentPosition.value,
      direction
    );
    
    if (result) {
      showTempleMessage('Door Unlocked', 2000);
    }
    
    return result;
  };
  
  // Whether the room's chest was already emptied: the room says so, or its chest in the ChestSystem
  const isChestLooted = (room: { isEmpty?: boolean; content?: { chestId?: string } }) =>
    Boolean(room.isEmpty || (room.content?.chestId && ChestSystem.getInstance().getChest(room.content.chestId)?.isEmpty));

  // Process selected chest items
  const claimChestItems = (selectedItems: string[]) => {
    const isNotInARoom = !currentRoom.value || !currentPosition.value;
    if (isNotInARoom) return;
    
    // Get the room key for the current position
    const [row, col] = currentPosition.value;
    debug.log(`Processing chest items at position [${row}, ${col}] in temple ${templeId}`);
    const content = currentRoom.value.content;
    let freed: string | undefined;

    // A chest emptied before (even in an earlier visit) hands out nothing a second time
    if (isChestLooted(currentRoom.value)) {
      showTempleMessage('The chest is empty.', 2000);
      return;
    }

    // Only what the hero chose is taken: a take that names nothing takes nothing and leaves the chest as it was
    const hasSelection = selectedItems.length > 0;
    if (!hasSelection) {
      showTempleMessage('You took nothing.', 2000);
      return;
    }
    
    // What the message lists: each item by its proper name, the gold as it was paid
    const collected: string[] = [];
    // What the hero had no room for: it stays in the chest, so they can come back for it
    const leftBehind: string[] = [];

    // Process each selected item
    selectedItems.forEach(item => {
      // Handle special gold item format
      const isGold = item.startsWith('gold:');
      if (isGold) {
        const goldAmount = parseInt(item.split(':')[1], 10);
        // Paid with the hero's class and awareness bonus, like any other temple gold
        const canPayGold = !isNaN(goldAmount) && userId;
        if (canPayGold) collected.push(`${earnGold(userId, goldAmount)} GP`);
        return;
      }
      
      // Restoratives go in the bag as consumables (My Goods files them under Consumables), or in storage when the bag
      // is full; with neither having room, the chest keeps them
      const canBagRestorative = userId && /^(potion|ether)$|elixir/i.test(item);
      if (canBagRestorative) {
        const isInBag = useUserStore().addInventoryItem(userId, { name: item, type: 'consumable', faIcon: 'flask-potion', qty: 1 });
        if (isInBag) collected.push(lootFace(item).name);
        else leftBehind.push(item);
        return;
      }

      collected.push(lootFace(item).name);

      // Handle special items by updating both local refs AND the temple system state
      if (item === 'key') {
        // The temple holds the count (and saves it with the hero's progress); the header reads it from there
        templeSystem.addKey(templeId);
      } else if (item === 'master-key') {
        // Holding the master key opens the temple's gate without the beast that guards it
        templeSystem.grantMasterKey(templeId);
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
      } else {
        // The Pegasus chest behind the boss: the egg frees the world's Pegasus and clears the temple. The egg is the
        // chest's whole prize token: it unlocks no item (the Wind Temple's whistle is a row of its own).
        const isEgg = content?.pegasus === true && item === content.dungeon;
        if (isEgg) freed = freeTemplePegasus(templeId, userId, item).message;
        // A named item (Frost Wand, the Wind Whistle...): the hero may now equip it, and what it stands for
        const shouldUnlockItem = userId && !isEgg;
        if (shouldUnlockItem) {
          const store = useUserStore();
          chestItemUnlocks(templeId, item).forEach((name) => store.unlockItem(userId, name));
        }
      }
    });

    // The state above was changed directly, so it has to be asked to save
    templeSystem.saveProgress(templeId);
    
    // Out of the chest: it is empty (and stays so) only once nothing is left in it; the rest waits for the next visit
    const taken = selectedItems.filter((item) => !leftBehind.includes(item));
    const hasTaken = taken.length > 0;
    if (hasTaken) templeSystem.takeFromChest(templeId, currentLevel.value, currentPosition.value, taken);
    
    // Generate a message about what was collected; a freed Pegasus is the news
    const hasLeftBehind = leftBehind.length > 0;
    if (hasLeftBehind) {
      const left = leftBehind.map((item) => lootFace(item).name).join(', ');
      const gathered = collected.length ? `Collected: ${collected.join(', ')}. ` : '';
      const stays = leftBehind.length > 1 ? 'stay' : 'stays';
      showTempleMessage(freed ?? `${gathered}Your bag is full. ${left} ${stays} in the chest. Store something at home first.`, 3500);
      return;
    }
    showTempleMessage(freed ?? `Collected: ${collected.join(', ')}`, 3000);
  };
  
  // Check if the chest in the current room is empty
  const isChestEmpty = computed(() => {
    const isNotLootRoom = !currentRoom.value || currentRoom.value.type !== 'loot';
    if (isNotLootRoom) {
      return true;
    }
    
    // First check the room's isEmpty flag
    if (currentRoom.value.isEmpty) {
      return true;
    }
    
    // Then check if the chest actually exists and has contents
    const content = currentRoom.value.content;
    if (!content) {
      return true;
    }
    
    // If the room has a chestId, check the actual chest state in the ChestSystem
    const chestId = content.chestId;
    if (chestId) {
      const chest = ChestSystem.getInstance().getChest(chestId);
      const isEmptiedInChestSystem = chest && chest.isEmpty;
      if (isEmptiedInChestSystem) {
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
      showTempleMessage('Teleported!', 2000);
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
    const isHidden = visibility === MapVisibility.NONE;
    if (isHidden) {
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
    const isWall = room.type === 'wall';
    if (isWall) {
      classes.push('wall-cell');
      return classes;
    }
    
    // Handle based on visibility level
    const isDetailed = visibility === MapVisibility.FULL_DETAILS;
    if (isDetailed) {
      classes.push('detailed-cell');
      
      // Add room-specific classes
      if (templeSystem.hasVisited(templeId, [row, col])) classes.push('visited-cell');
      const hasRoomType = Boolean(room.type);
      if (hasRoomType) classes.push(`room-type-${room.type}`);
      if (templeSystem.isRoomCleared(templeId, currentLevel.value, [row, col])) classes.push('cleared-cell');
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
    whenOpened,
    restoreIfGone,
    currentPosition,
    hasMap,
    hasCompass,
    playerKeys,
    keyChange,
    keyPulse,
    playKeyPulse,
    currentLevel,
    isMapOpen,
    currentRoom,
    maze,
    rooms,
    actionColor,
    currentMessage,
    showMessage,
    chestContents,
    isChestEmpty,
    isCurrentRoomCleared,
    
    // Movement capabilities
    canMoveUp,
    canMoveDown,
    canMoveLeft,
    canMoveRight,
    moveIcons,
    
    // Actions
    stepTo,
    isDoorLocked,
    unlockDoor,
    claimChestItems,
    handleTeleport,
    toggleMap,
    openMap,
    closeMap,
    showTempleMessage,
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