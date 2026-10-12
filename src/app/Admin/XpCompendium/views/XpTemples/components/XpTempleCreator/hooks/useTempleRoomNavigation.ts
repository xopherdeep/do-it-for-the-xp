/**
 * useTempleRoomNavigation Composable
 * 
 * Handles room navigation, adjacent room detection, and door state management.
 */
import { ref, computed, ComputedRef, Ref } from 'vue';
import { useIonRouter, createAnimation, toastController } from '@ionic/vue';
import { useBack } from '@/hooks/useBack';
import { useTempleCreatorStore } from '@/lib/store/stores/temple-creator';
import { ROOM_ICONS, ____ } from '@/lib/engine/dungeons/roomTypes';
import { Room } from '@/lib/engine/core/dungeons/types';
import { isWallToken } from '@/lib/engine/dungeons/SpatialPalette';
import { facingSide, leadsToBoss, type Side } from '@/lib/services/temples/authoredDoors';
import {
  DOOR_STATE_INFO,
  defaultSides,
  doorClassFor,
  doorIconFor,
  doorToastIcon,
  nextDoorState,
  type AdjacentRooms,
  type Direction
} from './grid/doorSides';
import { floorSlice } from './grid/floorLayers';
import {
  canLocateRoom,
  computeAdjacency,
  getAdjacentCoords,
  isWallRoom,
  navigableCells,
  noAdjacentRooms,
  wallOffMissingSides
} from './grid/neighbourLinks';

// No-op animation for instant navigation
const noAnimation = () => createAnimation();

export type { Direction, AdjacentRooms };

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
  // Back from a room goes back, or up to the temple's rooms when the editor was opened with no history behind it
  const { back } = useBack();
  const store = useTempleCreatorStore();
  
  const adjacentRooms = ref<AdjacentRooms>({ 
    north: false, 
    east: false, 
    south: false, 
    west: false 
  });

  // Get maze helper
  const getMaze = (): string[][] => floorSlice(store.templeMaze, store.currentLevelId);

  // Calculate adjacency for current room
  const calculateAdjacency = () => {
    const maze = getMaze();
    const r = props.rowIdx.value;
    const c = props.colIdx.value;
    
    // Safety check - if maze isn't loaded or coords are invalid, set all to false
    if (!canLocateRoom(maze, r, c)) {
      adjacentRooms.value = noAdjacentRooms();
      return;
    }
    
    adjacentRooms.value = computeAdjacency(maze, r, c);

    // Edge-to-Wall normalization: If no neighbor exists, this side MUST be a wall in the data
    if (props.roomData.value) {
      if (!props.roomData.value.sides) {
        props.roomData.value.sides = defaultSides();
      }
      
      wallOffMissingSides(props.roomData.value.sides, adjacentRooms.value);
    }
  };

  // Get coordinates of adjacent room in given direction
  const getRelativeRoom = (dir: string): { row: number; col: number } | null => {
    const maze = getMaze();
    const rows = maze.length;
    const cols = maze[0]?.length || 0;

    return getAdjacentCoords(props.rowIdx.value, props.colIdx.value, dir, rows, cols);
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
      props.roomData.value.sides = defaultSides();
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
    const newState = nextDoorState(currentState);
    props.roomData.value.sides[dir] = newState;
    
    // Toast messages for each state
    const info = DOOR_STATE_INFO[newState];

    const toast = await toastController.create({
      message: info.label,
      duration: 1000,
      position: 'top',
      color: info.color,
      cssClass: 'door-state-toast',
      icon: doorToastIcon(info.icon, store.roomsData[____]?.type)
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

    return doorIconFor({
      state,
      neighborIsWall: isWallRoom(neighborSymbol, store.roomsData),
      roomType: props.roomData.value?.type,
      lockOnEnter: props.roomData.value?.content?.lockOnEnter,
      adjacentType: getAdjacentRoomType(dir)
    });
  };

  // Get door CSS class based on state
  const getDoorClass = (dir: string): string => {
    const hasAccess = adjacentRooms.value[dir as keyof typeof adjacentRooms.value];
    if (!hasAccess) return 'state-wall state-banned';
    
    const state = sideOf(dir);
    
    const coords = getRelativeRoom(dir);
    const maze = getMaze();
    const neighborSymbol = coords ? maze[coords.row]?.[coords.col] : null;

    return doorClassFor({
      state,
      neighborIsWall: isWallRoom(neighborSymbol, store.roomsData),
      roomType: props.roomData.value?.type,
      lockOnEnter: props.roomData.value?.content?.lockOnEnter
    });
  };

  // Navigation helpers - navigate through rooms in reading order
  const unvisitedRooms = computed(() => navigableCells(getMaze(), store.roomsData));

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
    back();
  };

  const goBack = () => {
    back();
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
