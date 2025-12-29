/**
 * useTempleRoomEditor Composable
 * 
 * Extracts room editing logic from XpRoomEditorPage.vue for reusability
 * and better separation of concerns.
 */
import { ref, computed, watch, Ref, ComputedRef } from 'vue';
import { useRoute } from 'vue-router';
import { useIonRouter, toastController } from '@ionic/vue';
import { useTempleCreatorStore } from '@/lib/store/stores/temple-creator';
import { useBestiarySelectionStore } from '@/lib/store/stores/bestiary-selection';
import BestiaryDb, { beastStorage, Beast } from '@/lib/databases/BestiaryDb';
import { TempleDb, templeStorage } from '@/lib/databases/TempleDb';
import { ShopsDb } from '@/lib/databases/ShopsDb';
import { Drivers, Storage } from '@ionic/storage';
import { Room, RoomContent } from '@/lib/engine/core/dungeons/types';

// Shop storage
const shopsStorage = new Storage({
  name: '__shops',
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});
import debug from '@/lib/utils/debug';
import { ____, _00_, ROOM_ICONS } from '@/lib/engine/dungeons/roomTypes';
import { getTempleIconClass } from '../../../hooks/useTempleIcon';
import { getNarrativeItems, getPegasusItems } from '@/lib/engine/core/items/itemRegistry';

// Room types organized by category
export const ROOM_CATEGORIES = [
  {
    name: 'Combat',
    icon: 'fa-swords',
    types: ['monster', 'miniboss', 'boss', 'trap']
  },
  {
    name: 'Resources',
    icon: 'fa-treasure-chest',
    types: ['loot', 'key', 'master', 'shop']
  },
  {
    name: 'Recovery',
    icon: 'fa-heart',
    types: ['health', 'mana', 'save', 'camp']
  },
  {
    name: 'Navigation',
    icon: 'fa-compass',
    types: ['entrance', 'gate', 'teleport', 'puzzle', 'secret', 'stairs-up', 'stairs-down']
  },
  {
    name: 'Structure',
    icon: 'fa-cubes',
    types: ['empty', 'wall', 'pit', 'void']
  }
];

// Chest types for loot rooms
export const CHEST_TYPES = [
  { id: 'dungeon', icon: 'fa-treasure-chest', label: 'Dungeon Item' },
  { id: 'key-item', icon: 'fa-star', label: 'Key Item' },
  { id: 'gold', icon: 'fa-coins', label: 'GP' },
  { id: 'consumable', icon: 'fa-flask-potion', label: 'Consumable' }
];

// Consumable items from the system
export const CONSUMABLE_ITEMS = [
  { id: 'potion', icon: 'fa-flask-round-potion', label: 'Potion' },
  { id: 'ether', icon: 'fa-flask-potion', label: 'Ether' },
  { id: 'elixir', icon: 'fa-flask-vial', label: 'Elixir' },
  { id: 'antidote', icon: 'fa-droplet', label: 'Antidote' },
  { id: 'remedy', icon: 'fa-star-of-life', label: 'Remedy' }
];


// Dungeon items for dungeon chest type (Strict 2x2 grid set)
export const DUNGEON_ITEMS = [
  { id: 'small-key', icon: 'fa-key', label: 'Small Key' },
  { id: 'master-key', icon: 'fa-key-skeleton', label: 'Master Key' },
  { id: 'dungeon-map', icon: 'fa-map', label: 'Map' },
  { id: 'compass', icon: 'fa-compass', label: 'Compass' }
];

// Key items (Narrative + Pegasus)
export const KEY_ITEMS = [
  ...getNarrativeItems(),
  ...getPegasusItems()
].map(item => ({
  id: item.id,
  icon: item.icon, 
  label: item.name,
  description: item.description
}));

// Monster config tokens (M001-M009) - shared configs that can be reused across rooms
export const MONSTER_CONFIG_TOKENS = [
  'M001', 'M002', 'M003', 'M004', 'M005', 'M006', 'M007', 'M008', 'M009'
];

// Miniboss config tokens (MINI, MIN1-MIN3) - for different miniboss configurations
export const MINIBOSS_CONFIG_TOKENS = [
  'MINI', 'MIN1', 'MIN2', 'MIN3'
];

// Interface for monster config options in the selector
export interface MonsterConfigOption {
  token: string;
  name: string;
  hasBeasts: boolean;
  count: number;
}

export interface UseTempleRoomEditorProps {
  templeId: string;
  row: string;
  col: string;
}

export interface UseTempleRoomEditorReturn {
  // State
  roomData: Ref<Room | null>;
  store: ReturnType<typeof useTempleCreatorStore>;
  showTypeModal: Ref<boolean>;
  modalStep: Ref<number>;
  selectedCategory: Ref<{ name: string; icon: string; types: string[] } | null>;
  isReturningFromSelection: Ref<boolean>;
  hasChanges: ComputedRef<boolean>;
  pendingMonsterType: Ref<string | null>;
  
  // Monster Config
  availableMonsterConfigs: ComputedRef<MonsterConfigOption[]>;
  monsterConfigTokens: typeof MONSTER_CONFIG_TOKENS;
  
  // Bestiary
  allBeasts: Ref<Beast[]>;
  selectedBeastsData: ComputedRef<Beast[]>;
  mimicBeastData: ComputedRef<Beast | null>;
  
  // Computed
  rowIdx: ComputedRef<number>;
  colIdx: ComputedRef<number>;
  capitalizedType: ComputedRef<string>;
  isMonsterRoom: ComputedRef<boolean>;
  isBossRoom: ComputedRef<boolean>;
  isLootRoom: ComputedRef<boolean>;
  isTravelRoom: ComputedRef<boolean>;
  isShopRoom: ComputedRef<boolean>;
  isEggRoom: ComputedRef<boolean>;
  floors: ComputedRef<string[]>;
  modalTitle: ComputedRef<string>;
  dynamicRoomIcons: ComputedRef<Record<string, string>>;
  
  // Constants
  roomCategories: typeof ROOM_CATEGORIES;
  chestTypes: typeof CHEST_TYPES;
  consumableItems: typeof CONSUMABLE_ITEMS;
  dungeonItems: typeof DUNGEON_ITEMS;
  keyItems: typeof KEY_ITEMS;
  
  // Shops
  allShops: Ref<{ id: string; name: string; icon?: string; items?: unknown[] }[]>;
  
  // Maze
  maze: ComputedRef<string[][]>;

  // Methods
  loadRoomData: () => Promise<void>;
  loadShops: () => Promise<void>;
  loadBestiary: () => Promise<void>;
  saveToStore: () => Promise<void>;
  openTypeModal: () => void;
  closeTypeModal: () => void;
  goToTypes: (category: { name: string; icon: string; types: string[] }) => void;
  selectType: (type: string) => Promise<void>;
  selectMonsterConfig: (token: string) => void;
  backModalStep: () => void;
  confirmConfig: () => void;
  getCategoryColorClass: (categoryName: string) => string;
  
  // Room Type Specific Methods
  toggleAutoLock: () => void;
  toggleMimic: (event: CustomEvent) => void;
  toggleMimicHeader: () => void;
  selectMimicType: (type: string) => void;
  selectChestType: (typeId: string) => void;
  selectDungeonItem: (itemId: string) => void;
  selectConsumableItem: (itemId: string) => void;
  updateAmount: (event: CustomEvent) => void;
  setTargetCoord: (axis: 'x' | 'y', val: unknown) => void;
  setTargetLevel: (val: string) => void;
  openBeastSelector: () => void;
  openMimicBeastSelector: () => void;
  removeBeast: (id: string) => void;
  resetRoom: () => Promise<void>;
  selectShop: (shopId: string) => void;
  selectEggPegasus: (pegasusId: string) => void;
}

export function useTempleRoomEditor(props: UseTempleRoomEditorProps): UseTempleRoomEditorReturn {
  const ionRouter = useIonRouter();
  const store = useTempleCreatorStore();
  const selectionStore = useBestiarySelectionStore();
  const route = useRoute();

  // Make indices computed to react to prop changes
  const rowIdx = computed(() => parseInt(props.row));
  const colIdx = computed(() => parseInt(props.col));

  const roomData = ref<Room | null>(null);
  const lastSavedData = ref<string>('');
  const hasChanges = computed(() => {
    if (!roomData.value) return false;
    return JSON.stringify(roomData.value) !== lastSavedData.value;
  });
  const showTypeModal = ref(false);
  const modalStep = ref(1); // 1: Category, 2: Type, 2.5: Monster Config, 3: Config
  const isReturningFromSelection = ref(false);
  const selectedCategory = ref<{ name: string; icon: string; types: string[] } | null>(null);
  const pendingMonsterType = ref<string | null>(null); // Tracks monster type awaiting config selection

  // Computed: Get available monster/miniboss configs in the current temple
  const availableMonsterConfigs = computed((): MonsterConfigOption[] => {
    const configs: MonsterConfigOption[] = [];
    const maze = store.templeMaze;
    const roomsData = store.roomsData;
    
    // Determine which tokens to show based on pending type
    const tokenSet = pendingMonsterType.value === 'miniboss' 
      ? MINIBOSS_CONFIG_TOKENS 
      : MONSTER_CONFIG_TOKENS;
    
    // Count how many times each token appears in the maze
    const tokenCounts: Record<string, number> = {};
    
    const countInMaze = (grid: string[][]) => {
      for (const row of grid) {
        for (const cell of row) {
          if (tokenSet.includes(cell)) {
            tokenCounts[cell] = (tokenCounts[cell] || 0) + 1;
          }
        }
      }
    };
    
    if (Array.isArray(maze)) {
      countInMaze(maze);
    } else {
      Object.values(maze).forEach(floor => countInMaze(floor as string[][]));
    }
    
    // Build config options for tokens that are in use or have room data
    for (const token of tokenSet) {
      const roomConfig = roomsData[token];
      const count = tokenCounts[token] || 0;
      const beasts = roomConfig?.content?.beasts || [];
      const hasBeasts = beasts.length > 0;
      
      // Only show if it's in use OR has been configured
      if (count > 0 || hasBeasts || roomConfig) {
        // Determine display name based on configuration state
        let displayName = 'Empty';
        if (hasBeasts) {
          displayName = `${beasts.length} beast${beasts.length > 1 ? 's' : ''}`;
        } else if (count > 0) {
          displayName = `${count} room${count > 1 ? 's' : ''}`;
        }
        
        configs.push({
          token,
          name: displayName,
          hasBeasts,
          count
        });
      }
    }
    
    // Also show unused tokens (up to 3 that aren't in use)
    const unusedTokens = tokenSet.filter(t => !configs.find(c => c.token === t));
    for (let i = 0; i < Math.min(3, unusedTokens.length); i++) {
      configs.push({
        token: unusedTokens[i],
        name: 'New shared config',
        hasBeasts: false,
        count: 0
      });
    }
    
    return configs;
  });

  const resetRoom = async () => {
    const alert = await import('@ionic/vue').then(m => m.alertController).then(ctrl => 
      ctrl.create({
        header: 'Reset Room?',
        message: 'Clear all room data?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Clear',
            role: 'destructive',
            handler: () => {
              if (roomData.value) {
                roomData.value.type = 'empty';
                roomData.value.content = {};
              }
            }
          }
        ]
      })
    );
    await alert.present();
  };

  // Bestiary integration
  const bestiary = new BestiaryDb(beastStorage);
  const allBeasts = ref<Beast[]>([]);
  
  const selectedBeastsData = computed(() => {
    const ids = roomData.value?.content?.beasts || [];
    return allBeasts.value.filter(b => ids.includes(b.id));
  });
  
  const mimicBeastData = computed(() => {
    const beastId = roomData.value?.content?.mimicBeastId;
    if (!beastId) return null;
    return allBeasts.value.find(b => b.id === beastId) || null;
  });

  const loadBestiary = async () => {
    if (store.cachedBestiary.length > 0) {
      allBeasts.value = store.cachedBestiary;
      return;
    }
    const beasts = await bestiary.getBeasts();
    store.cachedBestiary = beasts;
    allBeasts.value = beasts;
  };

  // Shop integration
  const shopsDb = new ShopsDb(shopsStorage);
  const allShops = ref<{ id: string; name: string; icon?: string; items?: unknown[] }[]>([]);

  const loadShops = async () => {
    if (store.cachedShops.length > 0) {
      allShops.value = store.cachedShops;
      return;
    }
    const shops = await shopsDb.getShops();
    store.cachedShops = shops;
    allShops.value = shops;
  };

  const selectShop = (shopId: string) => {
    if (!roomData.value) return;
    if (!roomData.value.content) roomData.value.content = {} as RoomContent;
    roomData.value.content.shopId = shopId;
  };

  const selectEggPegasus = (pegasusId: string) => {
    if (!roomData.value) return;
    if (!roomData.value.content) roomData.value.content = {} as RoomContent;
    roomData.value.content.dungeon = pegasusId;
  };

  // Helper for floor value sorting
  const getFloorValue = (f: string): number => {
    if (f.endsWith('F')) return parseInt(f);
    if (f.startsWith('B')) return -parseInt(f.replace('B', ''));
    return 0;
  };

  const floors = computed(() => {
    const maze = store.templeMaze;
    let keys: string[] = [];
    if (Array.isArray(maze)) {
      keys = ['1F'];
    } else {
      keys = Object.keys(maze);
    }
    return keys.sort((a, b) => getFloorValue(a) - getFloorValue(b));
  });

  const maze = computed(() => {
    const allMaze = store.templeMaze;
    return Array.isArray(allMaze) 
      ? allMaze 
      : (allMaze as Record<string, string[][]>)[store.currentLevelId] || [];
  });

  const getEntranceFloor = (floorList: string[]): string => {
    const fFloors = floorList.filter(f => f.endsWith('F')).sort((a, b) => getFloorValue(a) - getFloorValue(b));
    if (fFloors.length > 0) return fFloors[0];
    
    const bFloors = floorList.filter(f => f.startsWith('B')).sort((a, b) => getFloorValue(b) - getFloorValue(a));
    if (bFloors.length > 0) return bFloors[0];
    
    return floorList[0] || '1F';
  };

  // Ensure store is loaded (for page refresh scenarios)
  const ensureStoreLoaded = async () => {
    // If the store has no maze data, load from the database
    const maze = store.templeMaze;
    const isEmpty = Array.isArray(maze) ? maze.length === 0 : Object.keys(maze).length === 0;
    
    if (isEmpty && props.templeId) {
      debug.log('Store empty on room page, loading temple from DB...');
      const templeDb = new TempleDb(templeStorage);
      try {
        const existingTemple = await templeDb.getTempleById(props.templeId);
        if (existingTemple?.dungeonLayout) {
          const layout = existingTemple.dungeonLayout;
          
          // Load rooms data
          if (layout.rooms) {
            Object.entries(layout.rooms).forEach(([symbol, data]) => {
              store.roomsData[symbol] = data as Room;
            });
          } else {
            store.roomsData = {
              [____]: { type: 'wall' },
              [_00_]: { type: 'entrance', visited: true }
            };
          }
          
          // Load maze
          if (layout.maze) {
            store.templeMaze = layout.maze;
          }
          
          // Load entrance
          if (layout.entrance) {
            store.entrancePosition = layout.entrance.join(',');
          }
          
          store.templeId = props.templeId;
          debug.log('Loaded temple into store from DB');
        }
      } catch (err) {
        debug.error('Failed to load temple from DB:', err);
      }
    }
  };

  // Load room data from store
  const loadRoomData = async () => {
    await ensureStoreLoaded();
    
    const allMaze = store.templeMaze;
    const maze = Array.isArray(allMaze) 
      ? allMaze 
      : (allMaze as Record<string, string[][]>)[store.currentLevelId] || [];
    const r = rowIdx.value;
    const c = colIdx.value;
    const symbol = maze[r]?.[c];
    
    if (symbol) {
      let currentRoom = store.roomsData[symbol];
      
      // Fallback: If room exists in maze but not in data, create it
      if (!currentRoom) {
        debug.warn(`Room data missing for symbol ${symbol}, creating default empty room.`);
        currentRoom = { type: 'empty', content: {} };
        store.roomsData[symbol] = currentRoom;
      }

      if (!currentRoom.content) currentRoom.content = {} as RoomContent;
      
      // Migration: Move top-level properties to content (legacy support)
      const rd = currentRoom as Record<string, unknown>;
      if (rd.selectedBeastIds) {
        currentRoom.content.beasts = rd.selectedBeastIds as string[];
        delete rd.selectedBeastIds;
      }
      if (rd.isMimic !== undefined) {
        currentRoom.content.isMimic = rd.isMimic as boolean;
        delete rd.isMimic;
      }
      if (rd.mimicType) {
        currentRoom.content.mimicType = rd.mimicType as string;
        delete rd.mimicType;
      }
      if (rd.mimicBeastId) {
        currentRoom.content.mimicBeastId = rd.mimicBeastId as string;
        delete rd.mimicBeastId;
      }
      if (rd.lockOnEnter !== undefined) {
        currentRoom.content.lockOnEnter = rd.lockOnEnter as boolean;
        delete rd.lockOnEnter;
      }
      if (rd.chestType) {
        currentRoom.content.chest = rd.chestType as string;
        delete rd.chestType;
      }

      if (!currentRoom.content.beasts) currentRoom.content.beasts = [];
      
      // Migration: Move legacy locked to sides
      if (!currentRoom.sides && currentRoom.locked) {
        currentRoom.sides = {
          north: currentRoom.locked.north ? 'locked' : 'door',
          east: currentRoom.locked.east ? 'locked' : 'door',
          south: currentRoom.locked.south ? 'locked' : 'door',
          west: currentRoom.locked.west ? 'locked' : 'door'
        };
        delete currentRoom.locked;
      }
      
      if (!currentRoom.sides) {
        currentRoom.sides = { north: 'door', east: 'door', south: 'door', west: 'door' };
      }

      // Auto-select chest type from content if it exists
      if (currentRoom.type === 'loot') {
        if (currentRoom.content.dungeon) {
          currentRoom.content.chest = 'dungeon';
        } else if (currentRoom.content.gold !== undefined) {
          currentRoom.content.chest = 'gold';
        } else if (currentRoom.content.items?.length) {
          currentRoom.content.chest = 'consumable';
        }
      }

      // Clone the room data to work with local state
      roomData.value = JSON.parse(JSON.stringify(currentRoom));
      lastSavedData.value = JSON.stringify(roomData.value);
    }
  };

  // Helper: Get opposite direction for bidirectional edge sync
  const getOppositeDirection = (dir: string): string => {
    const opposites: Record<string, string> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east'
    };
    return opposites[dir] || dir;
  };

  // Helper: Get adjacent room coordinates
  const getAdjacentCoords = (r: number, c: number, dir: string, rows: number, cols: number): { row: number; col: number } | null => {
    switch (dir) {
      case 'north': return r > 0 ? { row: r - 1, col: c } : null;
      case 'south': return r < rows - 1 ? { row: r + 1, col: c } : null;
      case 'east': return c < cols - 1 ? { row: r, col: c + 1 } : null;
      case 'west': return c > 0 ? { row: r, col: c - 1 } : null;
      default: return null;
    }
  };

  const saveToStore = async () => {
    const allMaze = store.templeMaze;
    const isArrayMaze = Array.isArray(allMaze);
    const maze = isArrayMaze
      ? (allMaze as string[][])
      : ((allMaze as Record<string, string[][]>)[store.currentLevelId] || []);
      
    const r = rowIdx.value;
    const c = colIdx.value;
    let symbol = maze[r]?.[c];
    
    if (roomData.value && symbol) {
      // PROMOTION LOGIC:
      // If the current symbol is a shorthand/shared one (like '____' for wall, 'O__O' for empty, etc.)
      // and it's NOT the special entrance symbol '_00_', we MUST promote it to a unique 'Rxxx' ID
      // so this specific cell can have its own data without affecting others.
      // WE ESPECIALLY PROTECT '____' HERE.
      if (!symbol.startsWith('R') && symbol !== _00_ && symbol !== ____) {
        const newSymbol = store.generateUniqueSymbol();
        
        // Update the maze grid in the store so this cell uses the new unique ID
        if (isArrayMaze) {
          (allMaze as string[][])[r][c] = newSymbol;
        } else {
          (allMaze as Record<string, string[][]>)[store.currentLevelId][r][c] = newSymbol;
        }
        
        // Use the new symbol for the room data update
        symbol = newSymbol;
      }

      // Update the store's roomsData with our local roomData
      // Buffer Layer: We only update the store, NOT the database.
      // The user must click the "Save" button in the temple creator header to persist to DB.
      store.roomsData[symbol] = JSON.parse(JSON.stringify(roomData.value));
      lastSavedData.value = JSON.stringify(roomData.value);
      
      // BIDIRECTIONAL EDGE SYNC:
      // When saving, ensure adjacent rooms have their connecting edges set to match.
      // This keeps configs consistent: if Room A sets north=locked, Room B's south=locked.
      if (roomData.value.sides) {
        const rows = maze.length;
        const cols = maze[0]?.length || 0;
        const directions = ['north', 'south', 'east', 'west'] as const;
        
        for (const dir of directions) {
          const edgeType = roomData.value.sides[dir];
          if (!edgeType) continue;
          
          const adjCoords = getAdjacentCoords(r, c, dir, rows, cols);
          if (!adjCoords) continue;
          
          const neighborSymbol = maze[adjCoords.row]?.[adjCoords.col];
          // Skip if neighbor is the global wall symbol or doesn't exist
          if (!neighborSymbol || neighborSymbol === ____) continue;
          
          // Get or initialize neighbor room data
          if (!store.roomsData[neighborSymbol]) {
            store.roomsData[neighborSymbol] = { type: 'empty' };
          }
          
          const neighborRoom = store.roomsData[neighborSymbol];
          if (!neighborRoom.sides) {
            neighborRoom.sides = { north: 'door', east: 'door', south: 'door', west: 'door' };
          }
          
          // Sync the opposite edge to the same type
          const oppositeDir = getOppositeDirection(dir);
          neighborRoom.sides[oppositeDir] = edgeType;
        }
      }
      
      debug.log(`Room saved to store at ${r},${c}:`, store.roomsData[symbol]);
    }
  };

  // Computed properties
  const capitalizedType = computed(() => {
    const type = roomData.value?.type || 'empty';
    return type.charAt(0).toUpperCase() + type.slice(1);
  });

  const isMonsterRoom = computed(() => {
    const type = roomData.value?.type;
    return type ? ['monster', 'miniboss', 'boss'].includes(type) : false;
  });

  const isBossRoom = computed(() => {
    const type = roomData.value?.type;
    return type ? ['miniboss', 'boss'].includes(type) : false;
  });

  const isLootRoom = computed(() => roomData.value?.type === 'loot');

  const isTravelRoom = computed(() => {
    const type = roomData.value?.type;
    return type ? ['stairs-up', 'stairs-down', 'pit', 'void', 'teleport'].includes(type) : false;
  });

  const isShopRoom = computed(() => roomData.value?.type === 'shop');

  const isEggRoom = computed(() => roomData.value?.type === 'dragon-egg');

  const modalTitle = computed(() => {
    if (modalStep.value === 1) return 'Select Category';
    if (modalStep.value === 2) return selectedCategory.value?.name || 'Select Type';
    if (modalStep.value === 3) {
      const type = roomData.value?.type || '';
      return type.charAt(0).toUpperCase() + type.slice(1) + ' Config';
    }
    return 'Room Editor';
  });

  // Modal Methods
  const openTypeModal = () => {
    const currentType = roomData.value?.type;
    if (currentType && currentType !== 'empty' && currentType !== 'wall') {
      const category = ROOM_CATEGORIES.find(c => c.types.includes(currentType));
      if (category) {
        selectedCategory.value = category;
        if (['monster', 'miniboss', 'boss', 'loot', 'stairs-up', 'stairs-down', 'pit', 'void', 'teleport'].includes(currentType)) {
          modalStep.value = 3;
        } else {
          modalStep.value = 2;
        }
      } else {
        modalStep.value = 1;
      }
    } else {
      modalStep.value = 1;
      selectedCategory.value = null;
    }
    showTypeModal.value = true;
  };

  const goToTypes = (category: { name: string; icon: string; types: string[] }) => {
    selectedCategory.value = category;
    modalStep.value = 2;
  };

  const selectType = async (type: string) => {
    // Security Check: Entrances only on the designated Entrance Floor
    if (type === 'entrance') {
      const validEntranceFloor = getEntranceFloor(floors.value);
      
      if (store.currentLevelId !== validEntranceFloor) {
        const toast = await toastController.create({
          message: `Entrances can only be placed on the lowest surface floor (${validEntranceFloor}).`,
          duration: 2000,
          position: 'bottom'
        });
        toast.present();
        return;
      }
    }

    if (!roomData.value) return;

    roomData.value.type = type;
    
    // Monster rooms go to config selector first (step 2.5) - choose M001-M009
    if (type === 'monster') {
      pendingMonsterType.value = type;
      if (!roomData.value.content) roomData.value.content = {} as RoomContent;
      modalStep.value = 2.5;
      return;
    }
    
    // Miniboss rooms go to config selector (step 2.5) - choose MINI/MIN1-MIN3
    if (type === 'miniboss') {
      pendingMonsterType.value = type;
      if (!roomData.value.content) roomData.value.content = {} as RoomContent;
      modalStep.value = 2.5;
      return;
    }
    
    // Boss rooms go directly to config (typically one BOSS per dungeon)
    if (type === 'boss') {
      if (!roomData.value.content) roomData.value.content = {} as RoomContent;
      // Assign BOSS token directly
      const allMaze = store.templeMaze;
      const isArrayMaze = Array.isArray(allMaze);
      const r = rowIdx.value;
      const c = colIdx.value;
      
      if (isArrayMaze) {
        (allMaze as string[][])[r][c] = 'BOSS';
      } else {
        (allMaze as Record<string, string[][]>)[store.currentLevelId][r][c] = 'BOSS';
      }
      
      if (!store.roomsData['BOSS']) {
        store.roomsData['BOSS'] = { type: 'boss', content: { lockOnEnter: true } as RoomContent };
      }
      roomData.value = JSON.parse(JSON.stringify(store.roomsData['BOSS']));
      modalStep.value = 3;
      return;
    }
    
    // Other types with configuration move to step 3
    if (['loot', 'shop', 'stairs-up', 'stairs-down', 'pit', 'void', 'teleport'].includes(type)) {
      if (!roomData.value.content) roomData.value.content = {} as RoomContent;
      if (['stairs-up', 'stairs-down', 'pit', 'void', 'teleport'].includes(type)) {
        if (!roomData.value.content.targetLevel) roomData.value.content.targetLevel = store.currentLevelId;
        if (!roomData.value.content.targetCoords) roomData.value.content.targetCoords = { x: 0, y: 0 };
      }
      modalStep.value = 3;
    } else {
      closeTypeModal();
    }
  };

  // Handle monster config selection (M001, M002, etc. or NEW for unique)
  const selectMonsterConfig = (token: string) => {
    if (!roomData.value) return;
    
    const allMaze = store.templeMaze;
    const isArrayMaze = Array.isArray(allMaze);
    const r = rowIdx.value;
    const c = colIdx.value;
    
    if (token === 'NEW') {
      // Generate a unique symbol for this room
      const newSymbol = store.generateUniqueSymbol();
      
      // Update the maze grid
      if (isArrayMaze) {
        (allMaze as string[][])[r][c] = newSymbol;
      } else {
        (allMaze as Record<string, string[][]>)[store.currentLevelId][r][c] = newSymbol;
      }
      
      // Initialize room data with the pending type
      store.roomsData[newSymbol] = {
        type: pendingMonsterType.value || 'monster',
        content: {} as RoomContent
      };
      roomData.value = JSON.parse(JSON.stringify(store.roomsData[newSymbol]));
    } else {
      // Use the selected M-token (shared config)
      if (isArrayMaze) {
        (allMaze as string[][])[r][c] = token;
      } else {
        (allMaze as Record<string, string[][]>)[store.currentLevelId][r][c] = token;
      }
      
      // Initialize or get existing room data for this token
      if (!store.roomsData[token]) {
        store.roomsData[token] = {
          type: pendingMonsterType.value || 'monster',
          content: {} as RoomContent
        };
      } else {
        // Update the type if different (e.g., switching from monster to boss)
        store.roomsData[token].type = pendingMonsterType.value || 'monster';
      }
      roomData.value = JSON.parse(JSON.stringify(store.roomsData[token]));
    }
    
    pendingMonsterType.value = null;
    modalStep.value = 3; // Move to config step
  };

  const backModalStep = () => {
    if (modalStep.value > 1) {
      // Handle step 2.5 (monster config) - go back to step 2
      if (modalStep.value === 2.5) {
        modalStep.value = 2;
        pendingMonsterType.value = null;
        return;
      }
      // Handle step 3 - if it was a monster room, go back to 2.5
      if (modalStep.value === 3 && ['monster', 'miniboss', 'boss'].includes(roomData.value?.type || '')) {
        modalStep.value = 2.5;
        pendingMonsterType.value = roomData.value?.type || 'monster';
        return;
      }
      modalStep.value--;
      if (modalStep.value === 1) {
        selectedCategory.value = null;
      }
    }
  };

  const closeTypeModal = () => {
    showTypeModal.value = false;
  };

  const confirmConfig = () => {
    saveToStore();
    closeTypeModal();
  };

  const getCategoryColorClass = (categoryName: string) => {
    switch (categoryName) {
      case 'Combat': return 'category-combat';
      case 'Resources': return 'category-resources';
      case 'Recovery': return 'category-recovery';
      case 'Navigation': return 'category-navigation';
      case 'Structure': return 'category-structure';
      default: return '';
    }
  };

  // Room Type Specific Methods
  const toggleAutoLock = () => {
    if (!roomData.value) return;
    if (!roomData.value.content) roomData.value.content = {} as RoomContent;
    roomData.value.content.lockOnEnter = !roomData.value.content.lockOnEnter;
  };

  const toggleMimic = (event: CustomEvent) => {
    if (!roomData.value) return;
    if (!roomData.value.content) roomData.value.content = {} as RoomContent;
    roomData.value.content.isMimic = event.detail.checked;
  };

  const toggleMimicHeader = () => {
    if (!roomData.value) return;
    if (!roomData.value.content) roomData.value.content = {} as RoomContent;
    roomData.value.content.isMimic = !roomData.value.content.isMimic;
    if (roomData.value.content.isMimic && !roomData.value.content.mimicType) {
      roomData.value.content.mimicType = 'random';
    }
  };

  const selectMimicType = (type: string) => {
    if (!roomData.value) return;
    if (!roomData.value.content) roomData.value.content = {} as RoomContent;
    roomData.value.content.mimicType = type;
  };

  const selectChestType = (typeId: string) => {
    if (!roomData.value) return;
    if (!roomData.value.content) roomData.value.content = {} as RoomContent;
    roomData.value.content.chest = typeId;
    // Initialize content based on type
    if (typeId === 'dungeon') {
      const currentDungeonItem = roomData.value.content.dungeon;
      // Reset if current item is not in the strict dungeon list
      const isValidDungeonItem = DUNGEON_ITEMS.some(i => i.id === currentDungeonItem);
      if (!currentDungeonItem || !isValidDungeonItem) {
        roomData.value.content.dungeon = 'small-key';
      }
    } else if (typeId === 'key-item') {
       // Initialize with first key item if not set or invalid
       const currentKeyItem = roomData.value.content.dungeon; // processing as same field 'dungeon' for ID
       const isValidKeyItem = KEY_ITEMS.some(i => i.id === currentKeyItem);
       if (!currentKeyItem || !isValidKeyItem) {
         roomData.value.content.dungeon = KEY_ITEMS[0]?.id;
       }
    } else if (typeId === 'gold') {
      roomData.value.content.gold = roomData.value.content.gold || 50;
    } else if (typeId === 'consumable') {
      roomData.value.content.items = roomData.value.content.items || ['potion'];
    }
  };

  const selectDungeonItem = (itemId: string) => {
    if (!roomData.value) return;
    if (!roomData.value.content) roomData.value.content = {} as RoomContent;
    roomData.value.content.dungeon = itemId;
  };

  const selectConsumableItem = (itemId: string) => {
    if (!roomData.value) return;
    if (!roomData.value.content) roomData.value.content = {} as RoomContent;
    // Toggle item in the array
    if (!roomData.value.content.items) {
      roomData.value.content.items = [itemId];
    } else if (roomData.value.content.items.includes(itemId)) {
      roomData.value.content.items = roomData.value.content.items.filter((i: string) => i !== itemId);
      if (roomData.value.content.items.length === 0) {
        roomData.value.content.items = [itemId]; // Keep at least one
      }
    } else {
      roomData.value.content.items.push(itemId);
    }
  };

  const updateAmount = (event: CustomEvent) => {
    if (!roomData.value) return;
    if (!roomData.value.content) roomData.value.content = {} as RoomContent;
    roomData.value.content.gold = event.detail.value;
  };

  const setTargetCoord = (axis: 'x' | 'y', val: unknown) => {
    if (!roomData.value) return;
    if (!roomData.value.content) roomData.value.content = {} as RoomContent;
    if (!roomData.value.content.targetCoords) roomData.value.content.targetCoords = { x: 0, y: 0 };
    roomData.value.content.targetCoords[axis] = parseInt(String(val)) || 0;
  };

  const setTargetLevel = (val: string) => {
    if (!roomData.value) return;
    if (!roomData.value.content) roomData.value.content = {} as RoomContent;
    roomData.value.content.targetLevel = val;
  };

  const openBeastSelector = () => {
    saveToStore();
    isReturningFromSelection.value = true;
    closeTypeModal();
    const beasts = roomData.value?.content?.beasts || [];
    selectionStore.startSelection(
      beasts,
      'room-editor-page',
      (ids) => {
        if (roomData.value) {
          if (!roomData.value.content) roomData.value.content = {} as RoomContent;
          roomData.value.content.beasts = ids;
          saveToStore();
        }
      }
    );
    ionRouter.push({ name: 'xp-bestiary-select' });
  };

  const openMimicBeastSelector = () => {
    saveToStore();
    isReturningFromSelection.value = true;
    closeTypeModal();
    const beastId = roomData.value?.content?.mimicBeastId;
    selectionStore.startSelection(
      beastId ? [beastId] : [],
      'mimic-beast-selector',
      (ids) => {
        if (roomData.value) {
          if (!roomData.value.content) roomData.value.content = {} as RoomContent;
          roomData.value.content.mimicBeastId = ids[0] || null;
          saveToStore();
        }
      }
    );
    ionRouter.push({ name: 'xp-bestiary-select' });
  };

  const removeBeast = (id: string) => {
    if (roomData.value && roomData.value.content?.beasts) {
      roomData.value.content.beasts = roomData.value.content.beasts.filter((bid: string) => bid !== id);
      saveToStore();
    }
  };

  // Watch for beast selection changes
  watch(() => selectionStore.selectedBeastIds, (newIds) => {
    if (!roomData.value) return;
    
    if (selectionStore.lastSource === 'room-editor-page') {
      if (roomData.value?.content) {
        roomData.value.content.beasts = [...newIds];
      }
    } else if (selectionStore.lastSource === 'mimic-beast-selector') {
      if (roomData.value?.content) {
        roomData.value.content.mimicBeastId = newIds[0] || null;
      }
    }
  });

  // Watch route params for changes (in-page navigation)
  watch(
    () => route.params,
    () => {
      loadRoomData();
    },
    { deep: true }
  );

  const dynamicRoomIcons = computed(() => {
    const icons = { ...ROOM_ICONS };
    // Use getTempleIconClass which returns icon from TEMPLE_METADATA (e.g., "fa-wind")
    icons.wall = getTempleIconClass(props.templeId);
    return icons;
  });

  return {
    dynamicRoomIcons,
    maze,
    
    // State
    roomData,
    store,
    showTypeModal,
    modalStep,
    selectedCategory,
    isReturningFromSelection,
    hasChanges,
    pendingMonsterType,
    
    // Monster Config
    availableMonsterConfigs,
    monsterConfigTokens: MONSTER_CONFIG_TOKENS,
    
    // Bestiary
    allBeasts,
    selectedBeastsData,
    mimicBeastData,
    
    // Computed
    rowIdx,
    colIdx,
    capitalizedType,
    isMonsterRoom,
    isBossRoom,
    isLootRoom,
    isTravelRoom,
    isShopRoom,
    isEggRoom,
    floors,
    modalTitle,
    
    // Constants
    roomCategories: ROOM_CATEGORIES,
    chestTypes: CHEST_TYPES,
    consumableItems: CONSUMABLE_ITEMS,
    dungeonItems: DUNGEON_ITEMS,
    keyItems: KEY_ITEMS,
    
    // Methods
    loadRoomData,
    loadBestiary,
    loadShops,
    saveToStore,
    openTypeModal,
    closeTypeModal,
    goToTypes,
    selectType,
    selectMonsterConfig,
    backModalStep,
    confirmConfig,
    getCategoryColorClass,
    
    // Room Type Specific Methods
    toggleAutoLock,
    toggleMimic,
    toggleMimicHeader,
    selectMimicType,
    selectChestType,
    selectDungeonItem,
    selectConsumableItem,
    updateAmount,
    setTargetCoord,
    setTargetLevel,
    openBeastSelector,
    openMimicBeastSelector,
    removeBeast,
    resetRoom,
    
    // Shop Methods
    allShops,
    selectShop,
    selectEggPegasus
  };
}
