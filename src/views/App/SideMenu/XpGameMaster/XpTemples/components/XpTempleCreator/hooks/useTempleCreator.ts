/**
 * useTempleCreator Hook
 * 
 * Extracts temple creation logic from XpTempleCreator.vue for better
 * separation of concerns and potential reuse.
 */
import { ref, computed, watch, ComputedRef, Ref } from 'vue';
import { useRoute } from 'vue-router';
import { toastController, createAnimation, useIonRouter, alertController } from '@ionic/vue';
import { ROOM_ICONS, _00_, ____, TELE, SHOP } from '@/lib/engine/dungeons/roomTypes';
import { TempleDb, templeStorage } from '@/lib/databases/TempleDb';
import { useTempleCreatorStore } from '@/lib/store/stores/temple-creator';
import { useBestiarySelectionStore } from '@/lib/store/stores/bestiary-selection';
import { getTempleIcon } from '@/lib/engine/dungeons/templeIcons';
import { getTempleIconClass } from '../../../composables/useTempleIcon';
import debug from '@/lib/utils/debug';

import { getDungeonItems } from '@/lib/engine/core/items/itemRegistry';

// Side type information for UI
export const SIDE_TYPE_INFO: Record<string, { icon: string; label: string; color: string }> = {
  door: { icon: 'fal fa-tombstone-alt', label: 'Door', color: 'success' },
  wall: { icon: 'DYNAMIC_WALL', label: 'Wall', color: 'medium' },
  locked: { icon: 'fas fa-lock', label: 'Locked', color: 'warning' },
  masterlocked: { icon: 'fas fa-skull', label: 'Boss Lock', color: 'danger' },
  bombable: { icon: 'fal fa-bomb', label: 'Bombable', color: 'secondary' }
};

// Room symbols mapping
const roomSymbols: Record<string, string> = {
  wall: ____,
  entrance: _00_,
  empty: 'O__O',
  monster: 'q__q',
  loot: '$__$',
  boss: 'X__X',
  miniboss: 'x__x',
  teleport: TELE,
  shop: SHOP,
  health: 'H__P'
};

export interface UseTempleCreatorProps {
  templeId: string;
}

export interface UseTempleCreatorReturn {
  // State
  store: ReturnType<typeof useTempleCreatorStore>;
  showPreview: Ref<boolean>;
  showAddFloorModal: Ref<boolean>;
  isLoading: Ref<boolean>;
  nextFloorOptions: Ref<{ surface: string; basement: string }>;
  hasUnsavedChanges: ComputedRef<boolean>;
  
  // Computed proxies to store
  gridSize: ComputedRef<string> & { value: string };
  templeName: ComputedRef<string> & { value: string };
  entrancePosition: ComputedRef<string> & { value: string };
  templeMaze: ComputedRef<string[][] | Record<string, string[][]>>;
  roomsData: ComputedRef<Record<string, any>>;
  selectedCell: ComputedRef<{ row: number; col: number } | null>;
  currentLevelId: ComputedRef<string> & { value: string };
  floors: ComputedRef<string[]>;
  currentMazeSlice: ComputedRef<string[][]>;
  
  // Dynamic computeds
  templeIcon: ComputedRef<string>;
  dynamicRoomIcons: ComputedRef<Record<string, string>>;
  entranceDisplay: ComputedRef<string>;
  templeCodePreview: ComputedRef<string>;
  
  // Quick edit state
  quickEditState: Ref<QuickEditState>;
  
  // Constants
  ROOM_ICONS: typeof ROOM_ICONS;
  SIDE_TYPE_INFO: typeof SIDE_TYPE_INFO;
  
  // Methods - Floor Management
  promptAddFloor: () => void;
  confirmAddFloor: (name: string) => void;
  promptCustomFloorName: () => Promise<void>;
  addFloor: (levelId: string) => void;
  removeFloor: (levelId: string) => void;
  setLevel: (levelId: string) => void;
  
  // Methods - Grid Management
  initializeGrid: () => void;
  resizeGrid: () => void;
  generateUniqueSymbol: () => string;
  
  // Methods - Cell/Room Management
  selectCell: (row: number, col: number) => void;
  applyRoomChanges: (roomType: string, contentData: any, sideData: any) => void;
  getCellType: (cellSymbol: string) => string;
  getSideConfiguration: (cellSymbol: string, direction: 'north' | 'south' | 'east' | 'west') => string;
  isEntrancePosition: (row: number, col: number) => boolean;
  
  // Methods - Quick Edit
  showQuickEditPopover: (event: Event, row: number, col: number) => void;
  applyQuickEdit: () => void;
  applyQuickType: (type: string) => void;
  clearCellFromQuickEdit: () => void;
  openBeastSelectorForQuickEdit: () => void;
  
  // Methods - Navigation
  navigateToRoomEditor: (row: number, col: number) => void;
  onCellClick: (payload: { row: number; col: number; event: Event }) => void;
  
  // Methods - Save/Load
  saveTemple: () => Promise<void>;
  resetFloor: () => Promise<void>;
  loadTempleLayout: () => Promise<void>;
  copyToClipboard: () => Promise<void>;
  showToast: (message: string) => Promise<void>;
  
  // Dungeon Items
  dungeonItems: ComputedRef<ReturnType<typeof getDungeonItems>>;
}

interface QuickEditState {
  isOpen: boolean;
  event: Event | null;
  row: number;
  col: number;
  cellSymbol: string;
  roomType: string;
  content: any;
  sides: Record<string, string>;
}

// No-op animation for instant navigation
const noAnimation = () => createAnimation();

export function useTempleCreator(props: UseTempleCreatorProps): UseTempleCreatorReturn {
  const templeDb = new TempleDb(templeStorage);
  const store = useTempleCreatorStore();
  const selectionStore = useBestiarySelectionStore();
  const ionRouter = useIonRouter();
  const route = useRoute();

  // Local UI state
  const showPreview = ref(false);
  const showAddFloorModal = ref(false);
  const isLoading = ref(false);
  const nextFloorOptions = ref({ surface: '2F', basement: 'B1' });

  // State for change detection
  const lastSavedState = ref<string>('');
  const hasUnsavedChanges = computed(() => {
    const currentState = {
      maze: store.templeMaze,
      rooms: store.roomsData,
      gridSize: store.gridSize,
      entrance: store.entrancePosition
    };
    return JSON.stringify(currentState) !== lastSavedState.value;
  });

  // Quick Edit State
  const quickEditState = ref<QuickEditState & { tab: string }>({
    isOpen: false,
    event: null,
    row: 0,
    col: 0,
    cellSymbol: '',
    roomType: 'wall',
    tab: 'type',
    content: {},
    sides: { north: 'door', east: 'door', south: 'door', west: 'door' }
  });

  // Watch for route param changes
  watch(() => route.params.floorId, (newFloorId) => {
    if (newFloorId && typeof newFloorId === 'string' && store.currentLevelId !== newFloorId) {
      store.currentLevelId = newFloorId;
    }
  });

  watch(() => props.templeId, (newId) => {
    if (newId && store.templeId !== newId) {
      store.templeId = newId;
    }
    if (route.params.floorId && typeof route.params.floorId === 'string') {
      const fId = route.params.floorId;
      if (store.currentLevelId !== fId) {
        store.currentLevelId = fId;
      }
    }
  }, { immediate: true });

  // Proxy store refs for easier template access
  const gridSize = computed({
    get: () => store.gridSize,
    set: (val) => store.gridSize = val
  });
  const templeName = computed({
    get: () => store.templeName,
    set: (val) => store.templeName = val
  });
  const entrancePosition = computed({
    get: () => store.entrancePosition,
    set: (val) => store.entrancePosition = val
  });
  const templeMaze = computed({
    get: () => store.templeMaze,
    set: (val) => store.templeMaze = val
  });
  const roomsData = computed({
    get: () => store.roomsData,
    set: (val) => store.roomsData = val
  });
  const selectedCell = computed({
    get: () => store.selectedCell,
    set: (val) => store.selectedCell = val
  });
  const symbolCounter = computed({
    get: () => store.symbolCounter,
    set: (val) => store.symbolCounter = val
  });
  const usedSymbols = computed({
    get: () => store.usedSymbols,
    set: (val) => store.usedSymbols = val
  });
  const currentLevelId = computed({
    get: () => store.currentLevelId,
    set: (val) => store.currentLevelId = val
  });

  // Helper functions
  const getFloorValue = (f: string): number => {
    if (f.endsWith('F')) return parseInt(f);
    if (f.startsWith('B')) return -parseInt(f.replace('B', ''));
    return 0;
  };

  const floors = computed(() => {
    let keys: string[] = [];
    if (Array.isArray(templeMaze.value)) {
      keys = ['1F'];
    } else {
      keys = Object.keys(templeMaze.value);
    }
    return keys.sort((a, b) => getFloorValue(a) - getFloorValue(b));
  });

  const getEntranceFloor = (floorList: string[]): string => {
    const fFloors = floorList.filter(f => f.endsWith('F')).sort((a, b) => getFloorValue(a) - getFloorValue(b));
    if (fFloors.length > 0) return fFloors[0];
    const bFloors = floorList.filter(f => f.startsWith('B')).sort((a, b) => getFloorValue(b) - getFloorValue(a));
    if (bFloors.length > 0) return bFloors[0];
    return floorList[0] || '1F';
  };

  // Dynamic temple icon - uses store (from DB), falls back to static map
  const templeIcon = computed({
    get: () => store.templeIcon || getTempleIcon(props.templeId),
    set: (val) => store.templeIcon = val
  });

  const dynamicRoomIcons = computed(() => {
    const icons = { ...ROOM_ICONS };
    // Use getTempleIconClass which returns icon from TEMPLE_METADATA (e.g., "fa-wind")
    icons.wall = getTempleIconClass(props.templeId);
    return icons;
  });

  const entranceDisplay = computed(() => {
    const parts = entrancePosition.value.split(',');
    if (parts.length === 3) {
      const [z, y, x] = parts.map(Number);
      const mazeObj = templeMaze.value;
      let floorName = '';
      if (Array.isArray(mazeObj)) {
        floorName = '1F';
      } else {
        const keys = Object.keys(mazeObj);
        floorName = keys[z] || `Floor ${z}`;
      }
      return `${floorName} ${x + 1}x ${y + 1}y`;
    }
    const [row, col] = parts.map(Number);
    return `${(col || 0) + 1}x ${(row || 0) + 1}y`;
  });

  const currentMazeSlice = computed({
    get: () => {
      if (Array.isArray(templeMaze.value)) {
        return templeMaze.value;
      }
      return (templeMaze.value as Record<string, string[][]>)[currentLevelId.value] || [];
    },
    set: (newSlice: string[][]) => {
      if (Array.isArray(templeMaze.value)) {
        templeMaze.value = newSlice;
      } else {
        (templeMaze.value as Record<string, string[][]>)[currentLevelId.value] = newSlice;
      }
    }
  });

  // --- Floor Management ---
  const calculateNextFloors = () => {
    const existingFloors = floors.value;
    let nextSurface = 2;
    let nextBasement = 1;
    
    existingFloors.forEach(f => {
      if (f.endsWith('F')) {
        const n = parseInt(f);
        if (n >= nextSurface) nextSurface = n + 1;
      } else if (f.startsWith('B')) {
        const n = parseInt(f.replace('B', ''));
        if (n >= nextBasement) nextBasement = n + 1;
      }
    });
    
    nextFloorOptions.value = {
      surface: `${nextSurface}F`,
      basement: `B${nextBasement}`
    };
  };

  const promptAddFloor = () => {
    calculateNextFloors();
    showAddFloorModal.value = true;
  };

  const confirmAddFloor = (name: string) => {
    addFloor(name);
    showAddFloorModal.value = false;
  };

  const promptCustomFloorName = async () => {
    showAddFloorModal.value = false;
    const customAlert = await alertController.create({
      header: 'Custom Floor Name',
      inputs: [{ name: 'floorName', type: 'text', placeholder: 'e.g. Attic, Roof' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Create', handler: (d) => d.floorName && addFloor(d.floorName) }
      ]
    });
    await customAlert.present();
  };

  const addFloor = (levelId: string) => {
    if (Array.isArray(templeMaze.value)) {
      const firstFloor = JSON.parse(JSON.stringify(templeMaze.value));
      templeMaze.value = { '1F': firstFloor };
    }
    
    if (!(templeMaze.value as Record<string, string[][]>)[levelId]) {
      const [rows, cols] = gridSize.value.split('x').map(Number);
      const newLayer: string[][] = [];
      for (let i = 0; i < rows; i++) {
        newLayer.push(new Array(cols).fill(____));
      }
      (templeMaze.value as Record<string, string[][]>)[levelId] = newLayer;
      currentLevelId.value = levelId;
    }
  };

  const removeFloor = (levelId: string) => {
    if (levelId === '1F') return; // Absolute protection
    if (Array.isArray(templeMaze.value)) return;
    
    const mazeMap = templeMaze.value as Record<string, string[][]>;
    if (Object.keys(mazeMap).length <= 1) return;
    
    delete mazeMap[levelId];
    
    // Fallback to the first available floor
    const nextFloor = Object.keys(mazeMap)[0] || '1F';
    setLevel(nextFloor);
  };

  const setLevel = (levelId: string) => {
    ionRouter.replace(
      `/game-master/compendium/setup/temples/creator/${props.templeId}/floor/${levelId}`,
      noAnimation
    );
    currentLevelId.value = levelId;
    if (!Array.isArray(templeMaze.value) && !(templeMaze.value as Record<string, string[][]>)[levelId]) {
      const [rows, cols] = gridSize.value.split('x').map(Number);
      const newLayer: string[][] = [];
      for (let i = 0; i < rows; i++) {
        newLayer.push(new Array(cols).fill(____));
      }
      (templeMaze.value as Record<string, string[][]>)[levelId] = newLayer;
    }
  };

  // --- Grid Management ---
  const initializeGrid = () => {
    const [rows, cols] = gridSize.value.split('x').map(Number);
    const newGrid: string[][] = [];
    
    for (let i = 0; i < rows; i++) {
      newGrid.push(new Array(cols).fill(____));
    }

    const parts = entrancePosition.value.split(',').map(Number);
    if (parts.length === 2) {
      const [eRow, eCol] = parts;
      if (eRow >= 0 && eRow < rows && eCol >= 0 && eCol < cols) {
        newGrid[eRow][eCol] = _00_;
      }
    } else if (parts.length === 3) {
      const mazeObj = templeMaze.value;
      const floorKeys = Array.isArray(mazeObj) ? ['1F'] : Object.keys(mazeObj);
      if (floorKeys[parts[0]] === currentLevelId.value) {
        if (parts[1] >= 0 && parts[1] < rows && parts[2] >= 0 && parts[2] < cols) {
          newGrid[parts[1]][parts[2]] = _00_;
        }
      }
    }

    templeMaze.value = newGrid;
  };

  const generateUniqueSymbol = (): string => {
    let newSymbol = '';
    do {
      symbolCounter.value++;
      newSymbol = `R${symbolCounter.value.toString().padStart(3, '0')}`;
    } while (usedSymbols.value.has(newSymbol));
    usedSymbols.value.add(newSymbol);
    return newSymbol;
  };

  const resizeGrid = () => {
    const mazeData = currentMazeSlice.value;
    const oldMaze = JSON.parse(JSON.stringify(mazeData));
    const oldRows = oldMaze.length;
    const oldCols = oldMaze[0]?.length || 0;
    
    const [newRows, newCols] = gridSize.value.split('x').map(Number);
    const newMaze: string[][] = [];

    for (let i = 0; i < newRows; i++) {
      const row: string[] = [];
      for (let j = 0; j < newCols; j++) {
        row.push(____);
      }
      newMaze.push(row);
    }

    for (let i = 0; i < newRows; i++) {
      for (let j = 0; j < newCols; j++) {
        if (i < oldRows && j < oldCols) {
          const oldSymbol = oldMaze[i][j];
          if (oldSymbol !== _00_) {
            newMaze[i][j] = oldSymbol;
          } else {
            const [entranceRow, entranceCol] = entrancePosition.value.split(',').map(Number);
            if (i !== entranceRow || j !== entranceCol) {
              newMaze[i][j] = roomSymbols['empty'];
            }
          }
        }
      }
    }
    
    const [entranceRow, entranceCol] = entrancePosition.value.split(',').map(Number);
    if (entranceRow >= 0 && entranceRow < newRows && entranceCol >= 0 && entranceCol < newCols) {
      newMaze[entranceRow][entranceCol] = _00_;
    } else {
      debug.warn('Entrance position is outside the new grid bounds! Resetting to 0,0');
      newMaze[0][0] = _00_;
      entrancePosition.value = `0,0`;
    }

    currentMazeSlice.value = newMaze;
  };

  // --- Cell/Room Management ---
  const getCellType = (cellSymbol: string): string => {
    const roomData = roomsData.value[cellSymbol];
    return roomData?.type || 'wall';
  };

  const getSideConfiguration = (cellSymbol: string, direction: 'north' | 'south' | 'east' | 'west'): string => {
    const roomData = roomsData.value[cellSymbol];
    return roomData?.sides?.[direction] || 'door';
  };

  const isEntrancePosition = (row: number, col: number) => {
    const parts = entrancePosition.value.split(',').map(Number);
    if (parts.length === 3) {
      const mazeObj = templeMaze.value;
      const floorKeys = Array.isArray(mazeObj) ? ['1F'] : Object.keys(mazeObj);
      const zIndex = floorKeys.indexOf(currentLevelId.value);
      return parts[0] === zIndex && parts[1] === row && parts[2] === col;
    }
    return row === parts[0] && col === parts[1];
  };

  const selectCell = (row: number, col: number) => {
    selectedCell.value = { row, col };
  };

  const applyRoomChanges = (roomType: string, contentData: any, sideData: any) => {
    if (!selectedCell.value) return;
    
    const { row, col } = selectedCell.value;
    
    if (roomType === 'entrance') {
      const validEntranceFloor = getEntranceFloor(floors.value);
      if (currentLevelId.value !== validEntranceFloor) {
        showToast(`Entrances can only be placed on the lowest surface floor (${validEntranceFloor}).`);
        return;
      }
    }

    const currentSlice = currentMazeSlice.value;
    const currentSymbol = currentSlice[row][col];
    const currentType = getCellType(currentSymbol);
    const newType = roomType;

    let symbolToUse = currentSymbol;

    if (newType !== currentType || currentSymbol === ____) {
      if (newType === 'wall') {
        symbolToUse = ____;
      } else if (newType === 'entrance') {
        symbolToUse = _00_;
      } else if (currentSymbol === ____ || currentSymbol === _00_ || !currentSymbol.startsWith('R')) {
        symbolToUse = generateUniqueSymbol();
      } else {
        symbolToUse = generateUniqueSymbol();
      }
    }
    
    if (symbolToUse !== currentSymbol && currentSymbol.startsWith('R')) {
      delete roomsData.value[currentSymbol];
      usedSymbols.value.delete(currentSymbol);
    }

    currentSlice[row][col] = symbolToUse;
    currentMazeSlice.value = currentSlice;
    
    const roomData: any = { type: newType };
    
    // Auto-lock boss room
    if (newType === 'boss') {
      const currentSides = sideData;
      const newSides = { ...currentSides };
      
      // Lock all non-wall sides with master key
      Object.keys(newSides).forEach(dir => {
        if (newSides[dir] === 'door' || newSides[dir] === 'locked') {
          newSides[dir] = 'masterlocked';
        }
      });
      
      // Update the sideData being passed down
      sideData = newSides;
      
      // Also update the roomData object we're about to write
       if (Object.values(newSides).some(type => type !== 'door')) {
          roomData.sides = newSides;
       }
    }
    
    if (Object.values(sideData).some(type => type !== 'door')) {
      roomData.sides = sideData;
    }
    
    if (Object.keys(contentData).length > 0) {
      roomData.content = contentData;
    }
    
    if (symbolToUse !== ____) {
      roomsData.value[symbolToUse] = roomData;
    }
    
    showToast('Room updated');
  };

  const dungeonItems = computed(() => getDungeonItems());

  // --- Quick Edit ---
  const showQuickEditPopover = (event: Event, row: number, col: number) => {
    selectCell(row, col);
    const currentSlice = currentMazeSlice.value;
    const cellSymbol = currentSlice[row]?.[col] || ____;
    const roomData = roomsData.value[cellSymbol] || { type: 'wall' };
    
    quickEditState.value = {
      isOpen: true,
      event,
      row,
      col,
      cellSymbol,
      roomType: roomData.type || 'wall',
      tab: 'type',
      content: roomData.content ? { ...roomData.content } : {},
      sides: roomData.sides 
        ? { ...roomData.sides } 
        : { north: 'door', east: 'door', south: 'door', west: 'door' }
    };
  };

  const applyQuickEdit = () => {
    const s = quickEditState.value;
    selectCell(s.row, s.col);
    applyRoomChanges(s.roomType, s.content, s.sides);
    quickEditState.value.isOpen = false;
  };

  const applyQuickType = (type: string) => {
    const s = quickEditState.value;
    selectCell(s.row, s.col);
    
    // Default content/sides for quick type switching
    const defaultSides = { north: 'door', east: 'door', south: 'door', west: 'door' };
    applyRoomChanges(type, {}, defaultSides);
    quickEditState.value.isOpen = false;
  };

  const clearCellFromQuickEdit = () => {
    const s = quickEditState.value;
    const { row, col, cellSymbol } = s;
    
    const currentSlice = currentMazeSlice.value;
    currentSlice[row][col] = ____;
    currentMazeSlice.value = currentSlice;
    
    if (cellSymbol.startsWith('R')) {
      delete roomsData.value[cellSymbol];
      usedSymbols.value.delete(cellSymbol);
    }
    
    quickEditState.value.isOpen = false;
    showToast('Cell cleared');
  };

  const openBeastSelectorForQuickEdit = () => {
    const beasts = quickEditState.value.content?.beasts || [];
    quickEditState.value.isOpen = false;
    
    selectionStore.startSelection(
      beasts,
      'temple-creator-quick-edit',
      (ids) => {
        quickEditState.value.content.beasts = ids;
        quickEditState.value.isOpen = true;
      }
    );
    ionRouter.push('/game-master/compendium/bestiary/select');
  };

  // --- Navigation ---
  const navigateToRoomEditor = (row: number, col: number) => {
    ionRouter.push(
      `/game-master/compendium/setup/temples/${props.templeId}/rooms/${row}/${col}`,
      noAnimation
    );
  };

  const onCellClick = (payload: { row: number; col: number; event: Event }) => {
    navigateToRoomEditor(payload.row, payload.col);
  };

  // --- Save/Load ---
  const showToast = async (message: string) => {
    const toast = await toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  };

  const templeCodePreview = computed(() => {
    const parts = entrancePosition.value.split(',').map(Number);
    
    let code = `const ${props.templeId.replace(/-/g, '')} = {\n`;
    code += `  entrance: [${parts.join(', ')}],\n`;
    
    const mazeData = templeMaze.value;
    if (Array.isArray(mazeData)) {
      code += `  maze: [\n`;
      mazeData.forEach((row, rowIndex) => {
        code += `    [${row.join(', ')}], // y: ${rowIndex}\n`;
      });
      code += `  ],\n`;
    } else {
      code += `  maze: {\n`;
      Object.entries(mazeData).forEach(([levelId, grid]) => {
        code += `    "${levelId}": [\n`;
        (grid as string[][]).forEach((row, rowIndex) => {
          code += `      [${row.join(', ')}], // y: ${rowIndex}\n`;
        });
        code += `    ],\n`;
      });
      code += `  },\n`;
    }
    
    code += `  rooms: {\n`;
    Object.entries(roomsData.value).forEach(([symbol, data], index, array) => {
      const isLast = index === array.length - 1;
      code += `    [${symbol}]: `;
      code += JSON.stringify(data);
      code += isLast ? '\n' : ',\n';
    });
    code += `  },\n`;
    code += `}\n\n`;
    code += `export default ${props.templeId.replace(/-/g, '')}`;
    
    return code;
  });

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(templeCodePreview.value);
      showToast('Code copied to clipboard');
    } catch (err) {
      showToast('Failed to copy: ' + err);
    }
  };

  const saveTemple = async () => {
    try {
      debug.log('Saving temple to database...', props.templeId);
      const parts = entrancePosition.value.split(',').map(Number);
      
      // Get current data from store (Layer 1)
      const layoutToSave = {
        entrance: parts.length === 2 ? parts : (parts.length === 3 ? [parts[1], parts[2]] : [0,0]),
        maze: JSON.parse(JSON.stringify(store.templeMaze)), // Deep clone to be safe
        rooms: JSON.parse(JSON.stringify(store.roomsData))
      };

      const existingTemple = await templeDb.getTempleById(props.templeId);
      
      const templeToSave: any = existingTemple ? {
        ...existingTemple,
        dungeonLayout: layoutToSave
      } : {
        id: props.templeId,
        name: store.templeName || 'New Temple',
        customName: store.templeName || 'New Temple',
        categoryIds: ['dungeon'],
        dungeonLayout: layoutToSave
      };
      
      await templeDb.setTemple(templeToSave);
      
      // Update the snapshot after successful save
      lastSavedState.value = JSON.stringify({
        maze: store.templeMaze,
        rooms: store.roomsData,
        gridSize: store.gridSize,
        entrance: store.entrancePosition
      });
      
      // Sync the loaded state
      store.markAsLoaded(props.templeId);
      
      showToast('Temple persists successfully!');
      debug.log('Temple saved to DB successfully');
    } catch (err: any) {
      debug.error('Error saving temple:', err);
      showToast('Error saving temple: ' + err.message);
    }
  };

  const resetFloor = async () => {
    const isPrimaryFloor = store.currentLevelId === '1F';
    const header = isPrimaryFloor ? 'Clear 1F?' : 'Trash Floor?';
    const message = isPrimaryFloor 
      ? 'This will clear all room entries for 1F. This cannot be undone.'
      : `This will PERMANENTLY DELETE the entire floor (${store.currentLevelId}). This cannot be undone.`;

    const alert = await alertController.create({
      header,
      message,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: isPrimaryFloor ? 'Clear' : 'Trash It', 
          role: 'destructive',
          handler: () => {
             if (isPrimaryFloor) {
                // Just clear the 1F grid
                const [rows, cols] = gridSize.value.split('x').map(Number);
                const newSlice = Array(rows).fill(null).map(() => Array(cols).fill(____));
                if (Array.isArray(store.templeMaze)) {
                  store.templeMaze = newSlice;
                } else {
                  store.templeMaze['1F'] = newSlice;
                }
                showToast('1F cleared');
             } else {
                // Delete the whole floor and switch back
                const floorToDelete = store.currentLevelId;
                removeFloor(floorToDelete);
                showToast(`Floor ${floorToDelete} trashed`);
             }
          }
        }
      ]
    });
    await alert.present();
  };

  /**
   * Loads temple layout from database or store
   */
  const loadTempleLayout = async () => {
    // If already loading, don't start again
    if (isLoading.value) return;

    debug.log('useTempleCreator: Starting loadTempleLayout for', props.templeId);
    isLoading.value = true;
    
    try {
      // TWO-LAYERED APPROACH:
      // If this temple is already loaded in the store, don't reload from DB.
      if (store.isLoaded(props.templeId)) {
        debug.log('useTempleCreator: Temple already loaded in store, preserving temp data');
        store.templeId = props.templeId;
        
        // Snapshot current state for change detection if not already set
        if (!lastSavedState.value) {
          lastSavedState.value = JSON.stringify({
            maze: store.templeMaze,
            rooms: store.roomsData,
            gridSize: store.gridSize,
            entrance: store.entrancePosition
          });
        }
        isLoading.value = false;
        return;
      }
      
      debug.log('useTempleCreator: Loading temple from DB:', props.templeId);
      const existingTemple = await templeDb.getTempleById(props.templeId);
      
      if (existingTemple?.dungeonLayout) {
        const layout = existingTemple.dungeonLayout;
        
        // Load temple name and icon from DB
        if (existingTemple.customName) {
          templeName.value = existingTemple.customName;
        } else if (existingTemple.name) {
          templeName.value = existingTemple.name;
        }
        if (existingTemple.customIcon) {
          templeIcon.value = existingTemple.customIcon;
        }
        
        // Load properties
        if (layout.entrance) {
          entrancePosition.value = layout.entrance.join(',');
        }
        
        store.templeId = props.templeId;
        store.markAsLoaded(props.templeId);
        
        // Load maze
        if (layout.maze) {
          templeMaze.value = JSON.parse(JSON.stringify(layout.maze));
          
          // Calculate grid size from maze
          const firstLevel = Array.isArray(templeMaze.value) 
            ? templeMaze.value 
            : Object.values(templeMaze.value)[0];
          if (firstLevel && firstLevel.length > 0) {
            gridSize.value = `${firstLevel.length}x${firstLevel[0].length}`;
          }
        }
        
        // Load rooms data
        if (layout.rooms) {
          roomsData.value = JSON.parse(JSON.stringify(layout.rooms));
        }
        
        // Correct level ID
        if (Array.isArray(templeMaze.value)) {
          currentLevelId.value = '1F';
        } else {
          const dungeonFloors = Object.keys(templeMaze.value);
          if (dungeonFloors.length > 0 && !dungeonFloors.includes(currentLevelId.value)) {
            currentLevelId.value = dungeonFloors.includes('1F') ? '1F' : dungeonFloors[0];
          }
        }
      } else {
        debug.log('useTempleCreator: New temple or no layout found, creating defaults');
        // New temple or no layout - force defaults
        gridSize.value = '10x10';
        entrancePosition.value = '5,5';
        store.reset();
        store.templeId = props.templeId;
        store.markAsLoaded(props.templeId);
      }

      // Snapshot for dirty checking
      lastSavedState.value = JSON.stringify({
        maze: store.templeMaze,
        rooms: store.roomsData,
        gridSize: store.gridSize,
        entrance: store.entrancePosition
      });
    } catch (err) {
      debug.error('useTempleCreator: Failed to load temple layout:', err);
    } finally {
      isLoading.value = false;
      debug.log('useTempleCreator: Load complete, isLoading set to false');
    }
  };

  return {
    // State
    store,
    showPreview,
    showAddFloorModal,
    isLoading,
    nextFloorOptions,
    hasUnsavedChanges,
    
    // Computed proxies
    gridSize: gridSize as ComputedRef<string> & { value: string },
    templeName: templeName as ComputedRef<string> & { value: string },
    entrancePosition: entrancePosition as ComputedRef<string> & { value: string },
    templeMaze,
    roomsData,
    selectedCell,
    currentLevelId: currentLevelId as ComputedRef<string> & { value: string },
    floors,
    currentMazeSlice,
    
    // Dynamic computeds
    templeIcon,
    dynamicRoomIcons,
    entranceDisplay,
    templeCodePreview,
    
    // Quick edit
    quickEditState,
    
    // Constants
    ROOM_ICONS,
    SIDE_TYPE_INFO,
    
    // Floor management
    promptAddFloor,
    confirmAddFloor,
    promptCustomFloorName,
    addFloor,
    removeFloor,
    setLevel,
    
    // Grid management
    initializeGrid,
    resizeGrid,
    generateUniqueSymbol,
    
    // Cell/Room management
    selectCell,
    applyRoomChanges,
    getCellType,
    getSideConfiguration,
    isEntrancePosition,
    
    // Quick edit
    showQuickEditPopover,
    applyQuickEdit,
    applyQuickType,
    clearCellFromQuickEdit,
    openBeastSelectorForQuickEdit,
    
    // Navigation
    navigateToRoomEditor,
    onCellClick,
    
    // Save/Reset
    saveTemple,
    resetFloor,
    loadTempleLayout,
    copyToClipboard,
    showToast,
    
    // Dungeon items
    dungeonItems
  };
}
