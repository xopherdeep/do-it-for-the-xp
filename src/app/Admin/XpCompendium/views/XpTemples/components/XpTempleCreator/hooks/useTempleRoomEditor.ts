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
import { ensureBuiltInTemples } from '@/lib/engine/core/dungeons/importAllTemples';
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
import { canonicalRoomType, hasRoomTypeGuide, roomTypeShortLabel } from '../roomTypeGuide';
import { isQuestRoom as holdsQuest } from '@/lib/services/temples/questRooms';
import { floorSlice, getEntranceFloor, sortedFloorKeys, writeMazeCell } from './grid/floorLayers';
import { listMonsterConfigs, type MonsterConfigOption } from './grid/monsterConfigs';
import { syncNeighbourSides } from './grid/neighbourLinks';
import {
  adoptSharedRecord,
  applyChestType,
  ensureContent,
  prepareRoomForEditing,
  retypeRoom,
  seedTravelTargets,
  stepForRoomType,
  toggleConsumableItem
} from './grid/roomContent';
import { promoteToUniqueSymbol } from './grid/roomSymbols';
import { QUEST_ROOM_KEY, pickerTypeOf, releaseQuest } from './grid/roomQuest';
import { useRoomQuests, type UseRoomQuestsReturn } from './useRoomQuests';

export interface RoomCategory {
  name: string;
  icon: string;
  /** The room types the picker's rail lists */
  types: string[];
  /** Room types kept behind the rail's "Classic" disclosure (Combat's beast rooms) */
  classic?: string[];
}

// Room types organized by category. Labels and explanations come from ../roomTypeGuide. `master` is the Master Room
// (the Pegasus Egg, after the boss), not a key room; `dragon-egg` is its older name and is never offered.
// Combat leads with the quest room (a guide entry, not an engine type: it opens the quest picker); the beast rooms
// are the same as ever, kept under "Classic" for families who want them.
export const ROOM_CATEGORIES: RoomCategory[] = [
  {
    name: 'Combat',
    icon: 'fa-swords',
    types: [QUEST_ROOM_KEY, 'trap'],
    classic: ['monster', 'miniboss', 'boss']
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

/** The category a room type is listed in, classic beast rooms included; `dragon-egg` counts as `master`. */
export const categoryOfRoomType = (type: string | null | undefined): RoomCategory | undefined => {
  const kind = canonicalRoomType(type);
  return ROOM_CATEGORIES.find(category => category.types.includes(kind) || (category.classic ?? []).includes(kind));
};

// Chest types for loot rooms
export const CHEST_TYPES = [
  { id: 'dungeon', icon: 'fa-treasure-chest', label: 'Dungeon Item' },
  { id: 'key-item', icon: 'fa-star', label: 'Key Item' },
  { id: 'gold', icon: 'fa-coins', label: 'GP' },
  { id: 'consumable', icon: 'fa-flask-potion', label: 'Consumable' }
];

// Consumable items from the system
export const CONSUMABLE_ITEMS = [
  { id: 'potion', icon: 'fa-flask-potion', label: 'Potion' },
  { id: 'ether', icon: 'fa-flask-potion', label: 'Ether' },
  { id: 'elixir', icon: 'fa-flask', label: 'Elixir' },
  { id: 'antidote', icon: 'fa-tint', label: 'Antidote' },
  { id: 'remedy', icon: 'fa-star-of-life', label: 'Remedy' }
];


// Dungeon items for dungeon chest type (Strict 2x2 grid set)
export const DUNGEON_ITEMS = [
  { id: 'small-key', icon: 'fa-key', label: 'Small Key' },
  { id: 'master-key', icon: 'fa-key-skeleton', label: 'Boss Key' }, // opens the boss door; the id stays `master-key`
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

export type { MonsterConfigOption };

/**
 * The room whose config to open again when the Game Master comes back from the Compendium's quest form. The form sits
 * in another tab of the console, so the room page is rebuilt on the way back and the page's own flag is gone: this
 * outlives the page. It lapses after an hour, so a trip that never came back does not open a modal days later.
 */
interface PendingReturn {
  templeId: string;
  row: string;
  col: string;
  at: number;
}

let pendingReturn: PendingReturn | null = null;
const RETURN_LAPSES_AFTER_MS = 60 * 60 * 1000;

/** A shop the room can open, as the shop picker lists it */
interface ShopOption {
  id: string;
  name: string;
  icon?: string;
  items?: unknown[];
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
  selectedCategory: Ref<RoomCategory | null>;
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
  isQuestRoom: ComputedRef<boolean>;
  /** What the type picker calls the room now: `quest` for a quest room, else its type */
  pickerType: ComputedRef<string>;
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
  showRoomTypes: (category: RoomCategory) => void;
  selectType: (type: string) => Promise<void>;
  selectMonsterConfig: (token: string) => void;
  prevModalStep: () => void;
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

  // Quest rooms (useRoomQuests)
  questRooms: UseRoomQuestsReturn;
  /** Open the Compendium's quest form for the room's quest; the editor comes back to the room's config */
  editQuest: (questId: string) => void;
  /** True once on coming back from picking beasts or editing the quest: the page then opens the room's config */
  claimReturnToConfig: () => boolean;
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
  const selectedCategory = ref<RoomCategory | null>(null);
  const pendingMonsterType = ref<string | null>(null); // Tracks monster type awaiting config selection

  // Computed: Get available monster/miniboss configs in the current temple
  const availableMonsterConfigs = computed((): MonsterConfigOption[] => {
    // Determine which tokens to show based on pending type
    const tokenSet = pendingMonsterType.value === 'miniboss'
      ? MINIBOSS_CONFIG_TOKENS
      : MONSTER_CONFIG_TOKENS;

    return listMonsterConfigs(tokenSet, store.templeMaze, store.roomsData);
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
    const hasCachedBestiary = store.cachedBestiary.length > 0;
    if (hasCachedBestiary) {
      allBeasts.value = store.cachedBestiary;
      return;
    }
    const beasts = await bestiary.getBeasts();
    store.cachedBestiary = beasts;
    allBeasts.value = beasts;
  };

  // Shop integration
  const shopsDb = new ShopsDb(shopsStorage);
  const allShops = ref<ShopOption[]>([]);

  const loadShops = async () => {
    const hasCachedShops = store.cachedShops.length > 0;
    if (hasCachedShops) {
      allShops.value = store.cachedShops;
      return;
    }
    const shops = await shopsDb.getShops();
    store.cachedShops = shops;
    allShops.value = shops;
  };

  const selectShop = (shopId: string) => {
    if (!roomData.value) return;
    const content = ensureContent(roomData.value);
    content.shopId = shopId;
  };

  const selectEggPegasus = (pegasusId: string) => {
    if (!roomData.value) return;
    const content = ensureContent(roomData.value);
    content.dungeon = pegasusId;
  };

  const floors = computed(() => sortedFloorKeys(store.templeMaze));

  const maze = computed(() => floorSlice(store.templeMaze, store.currentLevelId));

  // Ensure store is loaded (for page refresh scenarios)
  const ensureStoreLoaded = async () => {
    // If the store has no maze data, load from the database
    const maze = store.templeMaze;
    const isEmpty = Array.isArray(maze) ? maze.length === 0 : Object.keys(maze).length === 0;

    const shouldLoadTempleFromDb = isEmpty && !!props.templeId;
    if (shouldLoadTempleFromDb) {
      debug.log('Store empty on room page, loading temple from DB...');
      const templeDb = new TempleDb(templeStorage);
      try {
        await ensureBuiltInTemples();
        const existingTemple = await templeDb.getTempleById(props.templeId);
        const layout = existingTemple?.dungeonLayout;
        if (layout) {

          // Load rooms data
          const layoutRooms = layout.rooms;
          if (layoutRooms) {
            Object.entries(layoutRooms).forEach(([symbol, data]) => {
              store.roomsData[symbol] = data as Room;
            });
          } else {
            store.roomsData = {
              [____]: { type: 'wall' },
              [_00_]: { type: 'entrance', visited: true }
            };
          }

          // Load maze
          const layoutMaze = layout.maze;
          if (layoutMaze) {
            store.templeMaze = layoutMaze;
          }

          // Load entrance
          const entrance = layout.entrance;
          if (entrance) {
            store.entrancePosition = entrance.join(',');
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

    const maze = floorSlice(store.templeMaze, store.currentLevelId);
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

      prepareRoomForEditing(currentRoom);

      // Clone the room data to work with local state
      roomData.value = JSON.parse(JSON.stringify(currentRoom));
      lastSavedData.value = JSON.stringify(roomData.value);
    }
  };

  const saveToStore = async () => {
    const allMaze = store.templeMaze;
    const maze = floorSlice(allMaze, store.currentLevelId);

    const r = rowIdx.value;
    const c = colIdx.value;
    let symbol = maze[r]?.[c];

    if (!roomData.value) return;
    if (!symbol) return;

    // PROMOTION LOGIC:
    // If the current symbol is a shared token (wall, entrance, or other shared configs),
    // we MUST promote it to a unique coordinate-based ID so this specific cell 
    // can have its own data without affecting others.
    // Saving to the shared wall token '____' would corrupt ALL walls in the temple.
    const promotedSymbol = promoteToUniqueSymbol(
      symbol,
      () => store.generateUniqueSymbol(r, c, roomData.value?.type || 'empty')
    );
    const isPromoted = promotedSymbol !== symbol;
    if (isPromoted) {
      // Update the maze grid so this cell uses the new unique token
      writeMazeCell(allMaze, store.currentLevelId, r, c, promotedSymbol);

      symbol = promotedSymbol;
    }

    // Update the store's roomsData with our local roomData
    // Buffer Layer: We only update the store, NOT the database.
    // The user must click the "Save" button in the temple creator header to persist to DB.
    store.roomsData[symbol] = JSON.parse(JSON.stringify(roomData.value));
    lastSavedData.value = JSON.stringify(roomData.value);

    // BIDIRECTIONAL EDGE SYNC:
    // When saving, ensure adjacent rooms have their connecting edges set to match.
    // This keeps configs consistent: if Room A sets north=locked, Room B's south=locked.
    const sides = roomData.value.sides;
    if (sides) {
      syncNeighbourSides(maze, r, c, sides, store.roomsData);
    }

    debug.log(`Room saved to store at ${r},${c}:`, store.roomsData[symbol]);
  };

  // Quest rooms: the picker's data, the pick itself, and the quest's beast. After a pick the type modal shows the
  // quest room's config (step 3 of the Combat category).
  const questRooms = useRoomQuests({
    templeId: props.templeId,
    store,
    roomData,
    rowIdx,
    colIdx,
    allBeasts,
    saveToStore,
    onPicked: () => {
      selectedCategory.value = categoryOfRoomType(QUEST_ROOM_KEY) ?? null;
      modalStep.value = 3;
      showTypeModal.value = true;
    }
  });

  // Computed properties
  const isQuestRoom = computed(() => (roomData.value ? holdsQuest(roomData.value) : false));
  const pickerType = computed(() => pickerTypeOf(roomData.value));

  const capitalizedType = computed(() => {
    const type = roomData.value?.type || 'empty';
    const name = hasRoomTypeGuide(type) ? roomTypeShortLabel(type) : type.charAt(0).toUpperCase() + type.slice(1);
    return isQuestRoom.value ? `${roomTypeShortLabel(QUEST_ROOM_KEY)} · ${name}` : name;
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

  // The Master Room holds the Pegasus Egg; `dragon-egg` is its older name
  const isEggRoom = computed(() => canonicalRoomType(roomData.value?.type) === 'master');

  const modalTitle = computed(() => {
    const titleOfStep: Record<number, () => string> = {
      1: () => 'Select Category',
      2: () => selectedCategory.value?.name || 'Select Type',
      3: () => roomTypeShortLabel(roomData.value?.type) + ' Config'
    };
    return titleOfStep[modalStep.value]?.() ?? 'Room Editor';
  });

  // Modal Methods
  const openTypeModal = () => {
    const currentType = roomData.value?.type;
    const hasChosenRoomType = !!currentType && currentType !== 'empty' && currentType !== 'wall';
    if (hasChosenRoomType) {
      const category = categoryOfRoomType(pickerType.value);
      if (category) {
        selectedCategory.value = category;
        const hasConfigStep = ['monster', 'miniboss', 'boss', 'loot', 'master', 'dragon-egg', 'stairs-up', 'stairs-down', 'pit', 'void', 'teleport'].includes(currentType);
        if (hasConfigStep) {
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

  const showRoomTypes = (category: RoomCategory) => {
    selectedCategory.value = category;
    modalStep.value = 2;
  };

  const selectType = async (type: string) => {
    // Security Check: Entrances only on the designated Entrance Floor
    const isEntrance = type === 'entrance';
    if (isEntrance) {
      const validEntranceFloor = getEntranceFloor(floors.value);

      const isOffEntranceFloor = store.currentLevelId !== validEntranceFloor;
      if (isOffEntranceFloor) {
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

    // The quest room is not an engine type: confirming it opens the picker, and the pick sets the type from its tier
    const isQuestRoomPick = type === QUEST_ROOM_KEY;
    if (isQuestRoomPick) {
      questRooms.openPicker();
      return;
    }

    // Any other type makes the room a classic one again: a quest left on it would still resolve and win. Its content
    // is rebuilt for the new type too: a seal or a chest left on it would outlive the type that meant it
    releaseQuest(roomData.value);
    retypeRoom(roomData.value, type);

    const step = stepForRoomType(type);

    // Monster rooms go to config selector first (step 2.5) - choose M001-M009
    // Miniboss rooms go to config selector (step 2.5) - choose MINI/MIN1-MIN3
    const needsMonsterConfig = step === 'monster-config';
    if (needsMonsterConfig) {
      pendingMonsterType.value = type;
      ensureContent(roomData.value);
      modalStep.value = 2.5;
      return;
    }

    // Boss rooms go directly to config (typically one BOSS per dungeon)
    const isBossStep = step === 'boss';
    if (isBossStep) {
      ensureContent(roomData.value);
      // Assign BOSS token directly
      writeMazeCell(store.templeMaze, store.currentLevelId, rowIdx.value, colIdx.value, 'BOSS');

      const hasBossRecord = Boolean(store.roomsData['BOSS']);
      if (!hasBossRecord) {
        store.roomsData['BOSS'] = { type: 'boss', content: { lockOnEnter: true } as RoomContent };
      }
      roomData.value = adoptSharedRecord(store.roomsData['BOSS'], roomData.value);
      modalStep.value = 3;
      return;
    }

    // Other types with configuration move to step 3 (the Master Room picks its Pegasus there)
    const hasConfigStep = step === 'config';
    if (hasConfigStep) {
      seedTravelTargets(ensureContent(roomData.value), type, store.currentLevelId);
      modalStep.value = 3;
    } else {
      closeTypeModal();
    }
  };

  // Handle monster config selection (M001, M002, etc. or NEW for unique)
  const selectMonsterConfig = (token: string) => {
    if (!roomData.value) return;

    const r = rowIdx.value;
    const c = colIdx.value;

    const isUniqueConfig = token === 'NEW';
    if (isUniqueConfig) {
      // Generate a unique symbol for this room
      const newSymbol = store.generateUniqueSymbol();

      // Update the maze grid
      writeMazeCell(store.templeMaze, store.currentLevelId, r, c, newSymbol);

      // Initialize room data with the pending type
      store.roomsData[newSymbol] = {
        type: pendingMonsterType.value || 'monster',
        content: {} as RoomContent
      };
      roomData.value = adoptSharedRecord(store.roomsData[newSymbol], roomData.value);
    } else {
      // Use the selected M-token (shared config)
      writeMazeCell(store.templeMaze, store.currentLevelId, r, c, token);

      // Initialize or get existing room data for this token
      const hasSharedRecord = Boolean(store.roomsData[token]);
      if (!hasSharedRecord) {
        store.roomsData[token] = {
          type: pendingMonsterType.value || 'monster',
          content: {} as RoomContent
        };
      } else {
        // Update the type if different (e.g., switching from monster to boss)
        store.roomsData[token].type = pendingMonsterType.value || 'monster';
      }
      roomData.value = adoptSharedRecord(store.roomsData[token], roomData.value);
    }

    pendingMonsterType.value = null;
    modalStep.value = 3; // Move to config step
  };

  const prevModalStep = () => {
    const canStepBack = modalStep.value > 1;
    if (canStepBack) {
      // Handle step 2.5 (monster config) - go back to step 2
      const isOnMonsterConfigPick = modalStep.value === 2.5;
      if (isOnMonsterConfigPick) {
        modalStep.value = 2;
        pendingMonsterType.value = null;
        return;
      }
      // A quest room has no config selector: step 3 goes back to the type step
      const isOnQuestConfigStep = modalStep.value === 3 && isQuestRoom.value;
      if (isOnQuestConfigStep) {
        modalStep.value = 2;
        return;
      }
      // Handle step 3 - if it was a monster room, go back to 2.5
      const isOnMonsterConfigStep = modalStep.value === 3 && ['monster', 'miniboss', 'boss'].includes(roomData.value?.type || '');
      if (isOnMonsterConfigStep) {
        modalStep.value = 2.5;
        pendingMonsterType.value = roomData.value?.type || 'monster';
        return;
      }
      modalStep.value--;
      const isBackAtCategories = modalStep.value === 1;
      if (isBackAtCategories) {
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
    const content = ensureContent(roomData.value);
    content.lockOnEnter = !content.lockOnEnter;
  };

  const toggleMimic = (event: CustomEvent) => {
    if (!roomData.value) return;
    const content = ensureContent(roomData.value);
    content.isMimic = event.detail.checked;
  };

  const toggleMimicHeader = () => {
    if (!roomData.value) return;
    const content = ensureContent(roomData.value);
    content.isMimic = !content.isMimic;
    const shouldDefaultMimicType = content.isMimic && !content.mimicType;
    if (shouldDefaultMimicType) {
      content.mimicType = 'random';
    }
  };

  const selectMimicType = (type: string) => {
    if (!roomData.value) return;
    const content = ensureContent(roomData.value);
    content.mimicType = type;
  };

  const selectChestType = (typeId: string) => {
    if (!roomData.value) return;
    const content = ensureContent(roomData.value);
    // Initialize content based on type
    applyChestType(content, typeId, DUNGEON_ITEMS, KEY_ITEMS);
  };

  const selectDungeonItem = (itemId: string) => {
    if (!roomData.value) return;
    const content = ensureContent(roomData.value);
    content.dungeon = itemId;
  };

  const selectConsumableItem = (itemId: string) => {
    if (!roomData.value) return;
    const content = ensureContent(roomData.value);
    // Toggle item in the array
    toggleConsumableItem(content, itemId);
  };

  const updateAmount = (event: CustomEvent) => {
    if (!roomData.value) return;
    const content = ensureContent(roomData.value);
    content.gold = event.detail.value;
  };

  const setTargetCoord = (axis: 'x' | 'y', val: unknown) => {
    if (!roomData.value) return;
    const content = ensureContent(roomData.value);
    content.targetCoords ??= { x: 0, y: 0 };
    content.targetCoords[axis] = parseInt(String(val)) || 0;
  };

  const setTargetLevel = (val: string) => {
    if (!roomData.value) return;
    const content = ensureContent(roomData.value);
    content.targetLevel = val;
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
          ensureContent(roomData.value).beasts = ids;
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
          ensureContent(roomData.value).mimicBeastId = ids[0] || null;
          saveToStore();
        }
      }
    );
    ionRouter.push({ name: 'xp-bestiary-select' });
  };

  // Same trip as picking beasts: save the room, leave to the Compendium's quest form, and come back to the config
  const editQuest = (questId: string) => {
    saveToStore();
    isReturningFromSelection.value = true;
    pendingReturn = { templeId: props.templeId, row: props.row, col: props.col, at: Date.now() };
    closeTypeModal();
    ionRouter.push({ name: 'xp-achievement-config-dashboard', params: { id: questId } });
  };

  /** True once when the Game Master has come back to this room from picking beasts or editing its quest. */
  const claimReturnToConfig = (): boolean => {
    const isThisRoom = pendingReturn?.templeId === props.templeId && pendingReturn.row === props.row && pendingReturn.col === props.col;
    const isFresh = Boolean(pendingReturn) && Date.now() - (pendingReturn?.at ?? 0) < RETURN_LAPSES_AFTER_MS;
    const wasReturning = isReturningFromSelection.value || (isThisRoom && isFresh);
    isReturningFromSelection.value = false;
    if (isThisRoom) pendingReturn = null;
    return wasReturning;
  };

  const removeBeast = (id: string) => {
    const content = roomData.value?.content;
    const beasts = content?.beasts;
    const hasBeasts = !!content && !!beasts;
    if (hasBeasts) {
      content.beasts = beasts.filter((bid: string) => bid !== id);
      saveToStore();
    }
  };

  // Watch for beast selection changes
  watch(() => selectionStore.selectedBeastIds, (newIds) => {
    if (!roomData.value) return;

    const content = roomData.value.content;
    const isRoomBeastPick = selectionStore.lastSource === 'room-editor-page';
    const isMimicBeastPick = selectionStore.lastSource === 'mimic-beast-selector';
    if (!content) return;
    if (isRoomBeastPick) {
      content.beasts = [...newIds];
    } else if (isMimicBeastPick) {
      content.mimicBeastId = newIds[0] || null;
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
    isQuestRoom,
    pickerType,
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
    showRoomTypes,
    selectType,
    selectMonsterConfig,
    prevModalStep,
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
    selectEggPegasus,

    // Quest rooms
    questRooms,
    editQuest,
    claimReturnToConfig
  };
}
