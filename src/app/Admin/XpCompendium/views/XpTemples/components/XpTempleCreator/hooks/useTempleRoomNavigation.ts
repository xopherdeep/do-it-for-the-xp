/**
 * useTempleRoomNavigation Composable
 * 
 * Handles room navigation, adjacent room detection, and door state management.
 */
import { ref, computed, ComputedRef, Ref } from 'vue';
import { useIonRouter, createAnimation, toastController } from '@ionic/vue';
import { useTempleCreatorStore } from '@/lib/store/stores/temple-creator';
import { ROOM_ICONS, ____ } from '@/lib/engine/dungeons/roomTypes';
import { Room } from '@/lib/engine/core/dungeons/types';
import { isWallToken } from '@/lib/engine/dungeons/SpatialPalette';
import { facingSide, leadsToBoss, type Side } from '@/lib/services/temples/authoredDoors';

// No-op animation for instant navigation
const noAnimation = () => createAnimation();

const resolveSideIcon = (icon: string, wallType?: string): string => {
  const isDynamicWall = icon === 'DYNAMIC_WALL';
  if (!isDynamicWall) {
    return icon;
  }
  const isWallType = wallType === 'wall';
  return isWallType ? 'fa-wind' : 'fa-dungeon';
};

export type Direction = 'north' | 'east' | 'south' | 'west';

export interface AdjacentRooms {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
}

export interface UseTempleRoomNavigationProps {
  templeId: string;
  rowIdx: ComputedRef<number>;
  colIdx: ComputedRef<number>;
  roomData: Ref<Room | null>;
  saveToStore: () => void;
}

export interface UseTempleRoomNavigationReturn {
  // State
  adjacentRooms: Ref<AdjacentRooms>;
  
  // Computed
  unvisitedRooms: ComputedRef<{ row: number; col: number }[]>;
  
  // Methods
  calculateAdjacency: () => void;
  canNavigate: (direction: 'prev' | 'next') => boolean;
  navigateRoom: (direction: 'prev' | 'next') => void;
  handleDoorClick: (dir: string) => void;
  toggleLock: (dir: string) => void;
  getDoorIcon: (dir: string) => string;
  getDoorClass: (dir: string) => string;
  getRelativeRoom: (dir: string) => { row: number; col: number } | null;
  getAdjacentRoomIcon: (dir: string) => string;
  getAdjacentRoomLabel: (dir: string) => string;
  getAdjacentRoomType: (dir: string) => string;
  goBack: () => void;
  goToCell: (row: number, col: number) => void;
  apply: () => void;
}

export function useTempleRoomNavigation(props: UseTempleRoomNavigationProps): UseTempleRoomNavigationReturn {
  const ionRouter = useIonRouter();
  const store = useTempleCreatorStore();
  
  const adjacentRooms = ref<AdjacentRooms>({ 
    north: false, 
    east: false, 
    south: false, 
    west: false 
  });

  // Get maze helper
  const getMaze = (): string[][] => {
    const allMaze = store.templeMaze;
    return Array.isArray(allMaze) 
      ? allMaze 
      : (allMaze as Record<string, string[][]>)[store.currentLevelId] || [];
  };

  // Calculate adjacency for current room
  const calculateAdjacency = () => {
    const maze = getMaze();
    const r = props.rowIdx.value;
    const c = props.colIdx.value;
    
    // Safety check - if maze isn't loaded or coords are invalid, set all to false
    const isMazeUnusable = !maze || !maze.length || !maze[0];
    const areCoordsInvalid = isNaN(r) || isNaN(c) || r < 0 || c < 0;
    const cannotLocateRoom = isMazeUnusable || areCoordsInvalid;
    if (cannotLocateRoom) {
      adjacentRooms.value = { north: false, east: false, south: false, west: false };
      return;
    }
    
    const rows = maze.length;
    const cols = maze[0]?.length || 0;
    
    // Additional bounds check
    const isOutsideMaze = r >= rows || c >= cols;
    if (isOutsideMaze) {
      adjacentRooms.value = { north: false, east: false, south: false, west: false };
      return;
    }
    
    adjacentRooms.value = {
      north: r > 0 && !!maze[r - 1],
      east: c < cols - 1 && !!maze[r][c + 1],
      south: r < rows - 1 && !!maze[r + 1],
      west: c > 0 && !!maze[r][c - 1]
    };

    // Edge-to-Wall normalization: If no neighbor exists, this side MUST be a wall in the data
    if (props.roomData.value) {
      if (!props.roomData.value.sides) {
        props.roomData.value.sides = { north: 'door', east: 'door', south: 'door', west: 'door' };
      }
      
      const sides = props.roomData.value.sides;
      Object.keys(adjacentRooms.value).forEach(dir => {
        if (!adjacentRooms.value[dir as keyof AdjacentRooms]) {
          sides[dir as Direction] = 'wall';
        }
      });
    }
  };

  // Get coordinates of adjacent room in given direction
  const getRelativeRoom = (dir: string): { row: number; col: number } | null => {
    const maze = getMaze();
    const rows = maze.length;
    const cols = maze[0]?.length || 0;

    switch (dir) {
      case 'north': return props.rowIdx.value > 0 ? { row: props.rowIdx.value - 1, col: props.colIdx.value } : null;
      case 'south': return props.rowIdx.value < rows - 1 ? { row: props.rowIdx.value + 1, col: props.colIdx.value } : null;
      case 'east': return props.colIdx.value < cols - 1 ? { row: props.rowIdx.value, col: props.colIdx.value + 1 } : null;
      case 'west': return props.colIdx.value > 0 ? { row: props.rowIdx.value, col: props.colIdx.value - 1 } : null;
      default: return null;
    }
  };

  // The room on the other side of a door, as the store holds it
  const neighbourRoom = (dir: string): Room | undefined => {
    const coords = getRelativeRoom(dir);
    const symbol = coords ? getMaze()[coords.row]?.[coords.col] : undefined;
    return symbol ? store.roomsData[symbol] : undefined;
  };

  // The side as the room page shows it: any door into or out of a boss room is the Boss Lock (the skull)
  const sideOf = (dir: string): string => facingSide(props.roomData.value, neighbourRoom(dir), dir as Side);

  // Get the adjacent room's icon
  const getAdjacentRoomIcon = (dir: string): string => {
    const coords = getRelativeRoom(dir);
    if (!coords) return 'DYNAMIC_WALL';
    
    const maze = getMaze();
    const symbol = maze[coords.row]?.[coords.col];
    if (!symbol) return ROOM_ICONS.empty;
    
    if (isWallToken(symbol)) return 'DYNAMIC_WALL';

    const roomType = store.roomsData[symbol]?.type || 'empty';
    if (roomType === 'wall') return 'DYNAMIC_WALL';
    return ROOM_ICONS[roomType as keyof typeof ROOM_ICONS] || ROOM_ICONS.empty;
  };

  // Get the adjacent room's type label
  const getAdjacentRoomLabel = (dir: string): string => {
    const hasAccess = adjacentRooms.value[dir as keyof typeof adjacentRooms.value];
    if (!hasAccess) return '';
    
    const coords = getRelativeRoom(dir);
    if (!coords) return '';
    
    const maze = getMaze();
    const symbol = maze[coords.row]?.[coords.col];
    if (!symbol) return 'Empty';

    if (isWallToken(symbol)) return 'Wall';
    
    const roomType = store.roomsData[symbol]?.type || 'empty';
    if (roomType === 'wall') return 'Wall';
    return roomType.charAt(0).toUpperCase() + roomType.slice(1);
  };

  // Get the adjacent room's type for CSS class
  const getAdjacentRoomType = (dir: string): string => {
    const coords = getRelativeRoom(dir);
    if (!coords) return 'empty';
    
    const maze = getMaze();
    const symbol = maze[coords.row]?.[coords.col];
    if (!symbol) return 'empty';
    
    if (isWallToken(symbol)) return 'wall';

    return store.roomsData[symbol]?.type || 'empty';
  };

  // Handle door click - navigate to adjacent room if accessible
  const handleDoorClick = (dir: string) => {
    const hasAccess = adjacentRooms.value[dir as keyof typeof adjacentRooms.value];
    if (!hasAccess) return;
    
    // Save current room data before navigating
    const maze = getMaze();
    const symbol = maze[props.rowIdx.value][props.colIdx.value];
    if (props.roomData.value) {
      store.roomsData[symbol] = { ...props.roomData.value };
    }
    
    // Navigate to adjacent room
    const coords = getRelativeRoom(dir);
    if (coords) {
      ionRouter.replace(
        {
          name: 'xp-temple-room-editor',
          params: {
            templeId: props.templeId,
            row: coords.row.toString(),
            col: coords.col.toString()
          }
        },
        noAnimation
      );
    }
  };

  // Toggle lock state for a door (local state only - sync happens on save)
  const toggleLock = async (dir: string) => {
    if (!adjacentRooms.value[dir as keyof typeof adjacentRooms.value]) return;
    if (!props.roomData.value) return;
    
    if (!props.roomData.value.sides) {
      props.roomData.value.sides = { north: 'door', east: 'door', south: 'door', west: 'door' };
    }

    // Every door into a boss room is the Boss door: it stays the skull, whatever is tapped
    const isBossDoor = sideOf(dir) === 'masterlocked' && leadsToBoss(props.roomData.value, neighbourRoom(dir));
    if (isBossDoor) {
      const toast = await toastController.create({
        message: 'Boss Lock: only the Boss Key opens it',
        duration: 1400,
        position: 'top',
        color: 'danger',
        cssClass: 'door-state-toast',
        icon: 'skull'
      });
      toast.present();
      return;
    }

    const currentState = props.roomData.value.sides[dir] || 'door';
    const states = ['door', 'locked', 'bombable', 'wall'];
    const nextIdx = (states.indexOf(currentState) + 1) % states.length;
    const newState = states[nextIdx];
    props.roomData.value.sides[dir] = newState;
    
    // Toast messages for each state
    const stateInfo: Record<string, { icon: string; label: string; color: string }> = {
      door: { icon: 'far fa-tombstone-alt', label: 'Open Passage', color: 'success' },
      locked: { icon: 'fas fa-lock', label: 'Locked Door', color: 'warning' },
      bombable: { icon: 'fal fa-bomb', label: 'Bombable Wall', color: 'secondary' },
      wall: { icon: 'DYNAMIC_WALL', label: 'Solid Wall', color: 'medium' }
    };
    
    const info = stateInfo[newState];
    const resolvedIcon = resolveSideIcon(info.icon, store.roomsData[____]?.type);
    
    // We try to get the real wall icon if available in store
    let finalIcon = resolvedIcon;
    if (info.icon === 'DYNAMIC_WALL') {
      // In useTempleRoomNavigation, we don't have direct access to the dynamicRoomIcons computation 
      // but we can look it up similarly.
      finalIcon = 'fa-wind'; // Default fallback, usually overridden by component
    }

    const toast = await toastController.create({
      message: info.label,
      duration: 1000,
      position: 'top',
      color: info.color,
      cssClass: 'door-state-toast',
      icon: finalIcon.replace('fad ', '').replace('fas ', '').replace('fal ', '')
    });
    toast.present();
    
    props.saveToStore();
  };

  // Get door icon based on state
  const getDoorIcon = (dir: string): string => {
    const hasAccess = adjacentRooms.value[dir as keyof typeof adjacentRooms.value];
    if (!hasAccess) return 'DYNAMIC_WALL';

    const state = sideOf(dir);
    
    // Check if the adjacent room is actually a wall
    const coords = getRelativeRoom(dir);
    const maze = getMaze();
    const neighborSymbol = coords ? maze[coords.row]?.[coords.col] : null;
    const isNeighborWall = neighborSymbol && store.roomsData[neighborSymbol]?.type === 'wall';
    
    // Boss/miniboss rooms are always trapped, regular monster rooms check lockOnEnter
    const roomType = props.roomData.value?.type;
    const isTrapped = (roomType === 'boss' || roomType === 'miniboss' || props.roomData.value?.content?.lockOnEnter);
    
    // If it's a solid wall config OR the neighbor is a wall, show the wall icon
    const isWalledOff = state === 'wall' || !!isNeighborWall;
    if (isWalledOff) {
      return 'DYNAMIC_WALL';
    }
    
    // The Boss Lock: any door into or out of a boss room, from either room's page
    if (state === 'masterlocked') {
      return 'fas fa-skull';
    }
    
    const isTrapDoor = isTrapped && state !== 'bombable';
    if (isTrapDoor) {
      const adjType = getAdjacentRoomType(dir);
      const isEntrance = adjType === 'entrance';
      return `fad fa-dungeon${isEntrance ? ' entrance-variant' : ''}`;
    }
    
    switch (state) {
      case 'locked': return 'fas fa-lock';
      case 'bombable': return 'fal fa-bomb';
      case 'wall': return 'DYNAMIC_WALL';
      default: return 'far fa-tombstone-alt';
    }
  };

  // Get door CSS class based on state
  const getDoorClass = (dir: string): string => {
    const hasAccess = adjacentRooms.value[dir as keyof typeof adjacentRooms.value];
    if (!hasAccess) return 'state-wall state-banned';
    
    const state = sideOf(dir);
    
    const coords = getRelativeRoom(dir);
    const maze = getMaze();
    const neighborSymbol = coords ? maze[coords.row]?.[coords.col] : null;
    const isNeighborWall = neighborSymbol && store.roomsData[neighborSymbol]?.type === 'wall';
    
    const isWalledOff = state === 'wall' || !!isNeighborWall;
    if (isWalledOff) {
      return 'state-wall';
    }

    if (state === 'masterlocked') {
      return 'state-masterlocked';
    }
    
    const roomType = props.roomData.value?.type;
    const isTrapped = (roomType === 'boss' || roomType === 'miniboss' || props.roomData.value?.content?.lockOnEnter);
    
    const isTrapDoor = isTrapped && state !== 'bombable';
    if (isTrapDoor) {
      return 'state-trapped';
    }
    
    return `state-${state}`;
  };

  // Navigation helpers - navigate through rooms in reading order
  const unvisitedRooms = computed(() => {
    const maze = getMaze();
    const coords: { row: number; col: number }[] = [];
    for (let r = 0; r < maze.length; r++) {
      for (let c = 0; c < (maze[r]?.length || 0); c++) {
        const symbol = maze[r][c];
        const isNavigableRoom = !!symbol && store.roomsData[symbol]?.type !== 'wall';
        if (isNavigableRoom) {
          coords.push({ row: r, col: c });
        }
      }
    }
    return coords;
  });

  const canNavigate = (direction: 'prev' | 'next'): boolean => {
    const coords = unvisitedRooms.value;
    const currentIdx = coords.findIndex(c => c.row === props.rowIdx.value && c.col === props.colIdx.value);
    if (direction === 'prev') return currentIdx > 0;
    return currentIdx < coords.length - 1;
  };

  const navigateRoom = (direction: 'prev' | 'next') => {
    if (!canNavigate(direction)) return;
    
    props.saveToStore();

    const coords = unvisitedRooms.value;
    const currentIdx = coords.findIndex(c => c.row === props.rowIdx.value && c.col === props.colIdx.value);
    const targetIdx = direction === 'prev' ? currentIdx - 1 : currentIdx + 1;
    const target = coords[targetIdx];
    
    if (target) {
      ionRouter.replace(
        {
          name: 'xp-temple-room-editor',
          params: {
            templeId: props.templeId,
            row: target.row.toString(),
            col: target.col.toString()
          }
        },
        noAnimation
      );
    }
  };

  const apply = () => {
    props.saveToStore();
    ionRouter.back();
  };

  const goBack = () => {
    ionRouter.back();
  };

  // Navigate to specific cell coordinates (for mini-map)
  const goToCell = (row: number, col: number) => {
    ionRouter.replace(
      {
        name: 'xp-room-editor',
        params: {
          templeId: props.templeId,
          row: row.toString(),
          col: col.toString()
        }
      },
      noAnimation
    );
  };

  return {
    // State
    adjacentRooms,
    
    // Computed
    unvisitedRooms,
    
    // Methods
    calculateAdjacency,
    canNavigate,
    navigateRoom,
    handleDoorClick,
    toggleLock,
    getDoorIcon,
    getDoorClass,
    getRelativeRoom,
    getAdjacentRoomIcon,
    getAdjacentRoomLabel,
    getAdjacentRoomType,
    goBack,
    goToCell,
    apply
  };
}
