/**
 * useTempleCreator Hook
 *
 * Extracts temple creation logic from XpTempleCreator.vue for better
 * separation of concerns and potential reuse.
 */
import { ref, computed, watch, ComputedRef, Ref } from "vue";
import { useRoute } from "vue-router";
import {
  toastController,
  createAnimation,
  useIonRouter,
  alertController,
} from "@ionic/vue";
import { ROOM_ICONS, ____ } from "@/lib/engine/dungeons/roomTypes";
import {
  TempleDb,
  templeStorage,
  type TempleInterface,
} from "@/lib/databases/TempleDb";
import { ensureBuiltInTemples } from "@/lib/engine/core/dungeons/importAllTemples";
import { useTempleCreatorStore } from "@/lib/store/stores/temple-creator";
import { useBestiarySelectionStore } from "@/lib/store/stores/bestiary-selection";
import { getTempleIcon } from "@/lib/engine/dungeons/templeIcons";
import { getTempleIconClass } from "../../../hooks/useTempleIcon";
import debug from "@/lib/utils/debug";
import { auditTemple, missingNames } from "@/lib/services/temples/templeAudit";
import { bossDoorSides } from "@/lib/services/temples/authoredDoors";

import { getDungeonItems } from "@/lib/engine/core/items/itemRegistry";
import { copyTextToClipboard } from "@/lib/utils/clipboard";
import {
  blankFloorLayer,
  floorSlice,
  floorsAbove,
  floorsBelow,
  getEntranceFloor,
  levelIdAfterLoad,
  measureGridSize,
  nextFloorOptions as nextFloorOptionsFor,
  sortedFloorKeys,
} from "./grid/floorLayers";
import {
  buildTempleCode,
  collectUniqueRooms,
  describeEntrance,
  mazeHasEntrance,
  resolveEntranceCoordinates,
} from "./grid/mazeReadouts";
import { buildInitialMaze, entranceCellOnFloor, resizeMaze } from "./grid/resizeMaze";
import {
  buildRoomRecord,
  chooseRoomSymbol,
  isClearableRoomSymbol,
  isUniqueRoomSymbol,
} from "./grid/roomSymbols";

// Side type information for UI
export const SIDE_TYPE_INFO: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  door: { icon: "fal fa-tombstone-alt", label: "Door", color: "success" },
  wall: { icon: "DYNAMIC_WALL", label: "Wall", color: "medium" },
  locked: { icon: "fas fa-lock", label: "Locked", color: "warning" },
  masterlocked: { icon: "fas fa-skull", label: "Boss Lock", color: "danger" },
  bombable: { icon: "fal fa-bomb", label: "Bombable", color: "secondary" },
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
  aboveFloors: ComputedRef<string[]>;
  belowFloors: ComputedRef<string[]>;
  currentMazeSlice: ComputedRef<string[][]>;

  // Dynamic computeds
  templeIcon: ComputedRef<string>;
  dynamicRoomIcons: ComputedRef<Record<string, string>>;
  entranceDisplay: ComputedRef<string>;
  hasEntrance: ComputedRef<boolean>;
  entranceOnThisFloor: ComputedRef<string>;
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
  getSideConfiguration: (
    cellSymbol: string,
    direction: "north" | "south" | "east" | "west"
  ) => string;
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
  resetTempleToDefault: () => Promise<void>;
  loadTempleLayout: () => Promise<void>;
  copyToClipboard: () => Promise<void>;
  showToast: (message: string) => Promise<void>;

  // Unique rooms for config view
  uniqueRooms: ComputedRef<any[]>;

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

export function useTempleCreator(
  props: UseTempleCreatorProps
): UseTempleCreatorReturn {
  const templeDb = new TempleDb(templeStorage);
  const store = useTempleCreatorStore();
  const selectionStore = useBestiarySelectionStore();
  const ionRouter = useIonRouter();
  const route = useRoute();

  // Local UI state
  const showPreview = ref(false);
  const showAddFloorModal = ref(false);
  const isLoading = ref(false);
  const nextFloorOptions = ref({ surface: "2F", basement: "B1" });

  // State for change detection
  const hasUnsavedChanges = computed(() => {
    // If we have no DB snapshot, we assume no changes OR everything is new.
    // Usually if loaded from DB, snapshot is set.
    if (store.dbStateSnapshot === null) return false;

    const currentState = JSON.stringify({
      maze: store.templeMaze,
      rooms: store.roomsData,
      gridSize: store.gridSize,
      entrance: store.entrancePosition,
    });

    return currentState !== store.dbStateSnapshot;
  });

  // Quick Edit State
  const quickEditState = ref<QuickEditState & { tab: string }>({
    isOpen: false,
    event: null,
    row: 0,
    col: 0,
    cellSymbol: "",
    roomType: "wall",
    tab: "type",
    content: {},
    sides: { north: "door", east: "door", south: "door", west: "door" },
  });

  // Watch for route param changes
  watch(
    () => route.params.floorId,
    (newFloorId) => {
      const shouldSyncFloor =
        newFloorId &&
        typeof newFloorId === "string" &&
        store.currentLevelId !== newFloorId;
      if (shouldSyncFloor) {
        store.currentLevelId = newFloorId;
      }
    }
  );

  watch(
    () => props.templeId,
    (newId) => {
      const shouldSyncTemple = newId && store.templeId !== newId;
      if (shouldSyncTemple) {
        store.templeId = newId;
      }
      const routeFloorId = route.params.floorId;
      const hasFloorInRoute = routeFloorId && typeof routeFloorId === "string";
      if (hasFloorInRoute) {
        if (store.currentLevelId !== routeFloorId) {
          store.currentLevelId = routeFloorId;
        }
      }
    },
    { immediate: true }
  );

  // Proxy store refs for easier template access
  const gridSize = computed({
    get: () => store.gridSize,
    set: (val) => (store.gridSize = val),
  });
  const templeName = computed({
    get: () => store.templeName,
    set: (val) => (store.templeName = val),
  });
  const entrancePosition = computed({
    get: () => store.entrancePosition,
    set: (val) => (store.entrancePosition = val),
  });
  const templeMaze = computed({
    get: () => store.templeMaze,
    set: (val) => (store.templeMaze = val),
  });
  const roomsData = computed({
    get: () => store.roomsData,
    set: (val) => (store.roomsData = val),
  });
  const selectedCell = computed({
    get: () => store.selectedCell,
    set: (val) => (store.selectedCell = val),
  });
  const symbolCounter = computed({
    get: () => store.symbolCounter,
    set: (val) => (store.symbolCounter = val),
  });
  const usedSymbols = computed({
    get: () => store.usedSymbols,
    set: (val) => (store.usedSymbols = val),
  });
  const currentLevelId = computed({
    get: () => store.currentLevelId,
    set: (val) => (store.currentLevelId = val),
  });

  const floors = computed(() => sortedFloorKeys(templeMaze.value));

  const aboveFloors = computed(() =>
    floorsAbove(floors.value, currentLevelId.value)
  );

  const belowFloors = computed(() =>
    floorsBelow(floors.value, currentLevelId.value)
  );

  // Dynamic temple icon - uses store (from DB), falls back to static map
  const templeIcon = computed({
    get: () => store.templeIcon || getTempleIcon(props.templeId),
    set: (val) => (store.templeIcon = val),
  });

  const dynamicRoomIcons = computed(() => {
    const icons = { ...ROOM_ICONS };
    // Use getTempleIconClass which returns icon from TEMPLE_METADATA (e.g., "fa-wind")
    icons.wall = getTempleIconClass(props.templeId);
    return icons;
  });

  const entranceDisplay = computed(() =>
    describeEntrance(entrancePosition.value, templeMaze.value)
  );

  // Check if any entrance token exists in the maze (uses engine helper)
  const hasEntrance = computed(() => mazeHasEntrance(templeMaze.value));

  // The entrance as the grid on show wants it: "row,col" when it is a cell of this floor, "-1,-1" when it is not
  // (a "floor,row,col" entrance is on one floor only)
  const entranceOnThisFloor = computed(() => {
    const cell = entranceCellOnFloor(
      entrancePosition.value,
      templeMaze.value,
      currentLevelId.value
    );
    return cell ? `${cell.row},${cell.col}` : "-1,-1";
  });

  const currentMazeSlice = computed({
    get: () => floorSlice(templeMaze.value, currentLevelId.value),
    set: (newSlice: string[][]) => {
      if (Array.isArray(templeMaze.value)) {
        templeMaze.value = newSlice;
      } else {
        (templeMaze.value as Record<string, string[][]>)[currentLevelId.value] =
          newSlice;
      }
    },
  });

  // --- Floor Management ---
  const calculateNextFloors = () => {
    nextFloorOptions.value = nextFloorOptionsFor(floors.value);
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
      header: "Custom Floor Name",
      inputs: [
        { name: "floorName", type: "text", placeholder: "e.g. Attic, Roof" },
      ],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Create",
          handler: (d) => d.floorName && addFloor(d.floorName),
        },
      ],
    });
    await customAlert.present();
  };

  const addFloor = (levelId: string) => {
    if (Array.isArray(templeMaze.value)) {
      const firstFloor = JSON.parse(JSON.stringify(templeMaze.value));
      templeMaze.value = { "1F": firstFloor };
    }

    if (!(templeMaze.value as Record<string, string[][]>)[levelId]) {
      const newLayer = blankFloorLayer(gridSize.value);
      (templeMaze.value as Record<string, string[][]>)[levelId] = newLayer;
      currentLevelId.value = levelId;
    }
  };

  const removeFloor = (levelId: string) => {
    if (levelId === "1F") return; // Absolute protection
    if (Array.isArray(templeMaze.value)) return;

    const mazeMap = templeMaze.value as Record<string, string[][]>;
    if (Object.keys(mazeMap).length <= 1) return;

    delete mazeMap[levelId];

    // Fallback to the first available floor
    const nextFloor = Object.keys(mazeMap)[0] || "1F";
    setLevel(nextFloor);
  };

  const setLevel = (levelId: string) => {
    ionRouter.replace(
      {
        name: "xp-temple-layout",
        params: {
          templeId: props.templeId,
          floorId: levelId,
        },
      },
      noAnimation
    );
    currentLevelId.value = levelId;
    const isFloorLayerMissing =
      !Array.isArray(templeMaze.value) &&
      !(templeMaze.value as Record<string, string[][]>)[levelId];
    if (isFloorLayerMissing) {
      const newLayer = blankFloorLayer(gridSize.value);
      (templeMaze.value as Record<string, string[][]>)[levelId] = newLayer;
    }
  };

  // --- Grid Management ---
  const initializeGrid = () => {
    templeMaze.value = buildInitialMaze(
      gridSize.value,
      entrancePosition.value,
      templeMaze.value,
      currentLevelId.value
    );
  };

  const generateUniqueSymbol = (): string => {
    let newSymbol = "";
    do {
      symbolCounter.value++;
      newSymbol = `R${symbolCounter.value.toString().padStart(3, "0")}`;
    } while (usedSymbols.value.has(newSymbol));
    usedSymbols.value.add(newSymbol);
    return newSymbol;
  };

  const resizeGrid = () => {
    const [newRows, newCols] = gridSize.value.split("x").map(Number);
    const resized = resizeMaze(
      currentMazeSlice.value,
      newRows,
      newCols,
      entrancePosition.value,
      templeMaze.value,
      currentLevelId.value
    );

    if (resized.entranceOutsideGrid) {
      debug.warn(
        "Entrance position is outside the new grid bounds! Resetting to 0,0"
      );
      entrancePosition.value = resized.entrancePosition;
    }

    currentMazeSlice.value = resized.maze;
  };

  // --- Cell/Room Management ---
  const getCellType = (cellSymbol: string): string => {
    const roomData = roomsData.value[cellSymbol];
    return roomData?.type || "wall";
  };

  const getSideConfiguration = (
    cellSymbol: string,
    direction: "north" | "south" | "east" | "west"
  ): string => {
    const roomData = roomsData.value[cellSymbol];
    return roomData?.sides?.[direction] || "door";
  };

  const isEntrancePosition = (row: number, col: number) =>
    entranceOnThisFloor.value === `${row},${col}`;

  const selectCell = (row: number, col: number) => {
    selectedCell.value = { row, col };
  };

  const applyRoomChanges = (
    roomType: string,
    contentData: any,
    sideData: any
  ) => {
    if (!selectedCell.value) return;

    const { row, col } = selectedCell.value;

    if (roomType === "entrance") {
      const validEntranceFloor = getEntranceFloor(floors.value);
      if (currentLevelId.value !== validEntranceFloor) {
        showToast(
          `Entrances can only be placed on the lowest surface floor (${validEntranceFloor}).`
        );
        return;
      }
    }

    const currentSlice = currentMazeSlice.value;
    const currentSymbol = currentSlice[row][col];
    const currentType = getCellType(currentSymbol);
    const newType = roomType;

    // ALWAYS generate a new symbol when:
    // 1. Converting FROM a wall or entrance to something else
    // 2. Changing room types (even between non-wall types)
    // NEVER modify the `____` or `_00_` roomData - they are global!
    const symbolToUse = chooseRoomSymbol(
      currentSymbol,
      currentType,
      newType,
      () => store.generateUniqueSymbol(row, col, newType)
    );

    // Clean up old symbol from roomsData if we're switching away from a unique room
    const isReplacingUniqueRoom =
      symbolToUse !== currentSymbol && isUniqueRoomSymbol(currentSymbol);
    if (isReplacingUniqueRoom) {
      delete roomsData.value[currentSymbol];
      usedSymbols.value.delete(currentSymbol);
    }

    currentSlice[row][col] = symbolToUse;
    currentMazeSlice.value = currentSlice;

    // A boss room's doors are all locked with the boss key
    const roomData = buildRoomRecord(newType, contentData, sideData);

    if (symbolToUse !== ____) {
      roomsData.value[symbolToUse] = roomData;
    }

    showToast("Room updated");
  };

  const dungeonItems = computed(() => getDungeonItems());

  // --- Quick Edit ---
  const showQuickEditPopover = (event: Event, row: number, col: number) => {
    selectCell(row, col);
    const currentSlice = currentMazeSlice.value;
    const cellSymbol = currentSlice[row]?.[col] || ____;
    const roomData = roomsData.value[cellSymbol] || { type: "wall" };

    quickEditState.value = {
      isOpen: true,
      event,
      row,
      col,
      cellSymbol,
      roomType: roomData.type || "wall",
      tab: "type",
      content: roomData.content ? { ...roomData.content } : {},
      sides: roomData.sides
        ? { ...roomData.sides }
        : { north: "door", east: "door", south: "door", west: "door" },
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
    const defaultSides = {
      north: "door",
      east: "door",
      south: "door",
      west: "door",
    };
    applyRoomChanges(type, {}, defaultSides);
    quickEditState.value.isOpen = false;
  };

  const clearCellFromQuickEdit = () => {
    const s = quickEditState.value;
    const { row, col, cellSymbol } = s;

    const currentSlice = currentMazeSlice.value;
    currentSlice[row][col] = ____;
    currentMazeSlice.value = currentSlice;

    const isRoomSymbol = isClearableRoomSymbol(cellSymbol);
    if (isRoomSymbol) {
      delete roomsData.value[cellSymbol];
      usedSymbols.value.delete(cellSymbol);
    }

    quickEditState.value.isOpen = false;
    showToast("Cell cleared");
  };

  const openBeastSelectorForQuickEdit = () => {
    const beasts = quickEditState.value.content?.beasts || [];
    quickEditState.value.isOpen = false;

    selectionStore.startSelection(
      beasts,
      "temple-creator-quick-edit",
      (ids) => {
        quickEditState.value.content.beasts = ids;
        quickEditState.value.isOpen = true;
      }
    );
    ionRouter.push({ name: "xp-bestiary-select" });
  };

  // --- Navigation ---
  const navigateToRoomEditor = (row: number, col: number) => {
    ionRouter.push(
      {
        name: "xp-temple-room-editor",
        params: {
          templeId: props.templeId,
          row: row.toString(),
          col: col.toString(),
        },
      },
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
      position: "bottom",
    });
    toast.present();
  };

  /** The toast after a save that leaves the temple unfinishable: an RPG toast, a little longer so the list can be read */
  const showUnfinishableToast = async (missing: string[]) => {
    const toast = await toastController.create({
      message: `Saved. Not finishable yet: ${missing.join(", ")}`,
      duration: 3000,
      position: "bottom",
      cssClass: "rpg-toast",
    });
    toast.present();
  };

  const templeCodePreview = computed(() =>
    buildTempleCode(
      props.templeId,
      entrancePosition.value,
      templeMaze.value,
      roomsData.value
    )
  );

  const copyToClipboard = async () => {
    try {
      const copied = await copyTextToClipboard(templeCodePreview.value);
      if (copied) {
        showToast("Code copied to clipboard");
      } else {
        showToast("Failed to copy: Clipboard write not supported");
      }
    } catch (err: unknown) {
      showToast("Failed to copy: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const resetTempleToDefault = async () => {
    const confirm = await alertController.create({
      header: "Reset to Default?",
      message:
        "This will PERMANENTLY overwrite your manual changes with the factory default layout. Are you sure?",
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Reset Everything",
          role: "destructive",
          handler: async () => {
            const success = store.resetToDefault(props.templeId);
            if (success) {
              await saveTemple(); // Persist the reset
              showToast("Temple restored to factory defaults");
              // Force a reload of the current level to update UI
              setLevel(currentLevelId.value);
            } else {
              showToast("Failed to find default data for this temple.");
            }
          },
        },
      ],
    });
    await confirm.present();
  };

  const uniqueRooms = computed(() =>
    collectUniqueRooms(templeMaze.value, roomsData.value)
  );

  const saveTemple = async () => {
    try {
      debug.log("Saving temple to database...", props.templeId);
      const parts = entrancePosition.value.split(",").map(Number);

      // Standardize tokens on save (TXXYY format)
      store.migrateTokens();

      // Every door into a boss room is the Boss door: draw it as the Boss Lock, never as a small lock
      store.roomsData = bossDoorSides(store.templeMaze, store.roomsData);

      // Get current data from store (Layer 1) after migration
      const layoutToSave = {
        entrance: resolveEntranceCoordinates(parts),
        maze: JSON.parse(JSON.stringify(store.templeMaze)), // Deep clone to be safe
        rooms: JSON.parse(JSON.stringify(store.roomsData)),
      };

      const existingTemple = await templeDb.getTempleById(props.templeId);

      const templeToSave: any = existingTemple
        ? {
            ...existingTemple,
            dungeonLayout: layoutToSave,
          }
        : {
            id: props.templeId,
            name: store.templeName || "New Temple",
            customName: store.templeName || "New Temple",
            categoryIds: ["dungeon"],
            dungeonLayout: layoutToSave,
          };

      await templeDb.setTemple(templeToSave);

      // Update the snapshot after successful save
      store.updateDbSnapshot();

      // Sync the loaded state
      store.markAsLoaded(props.templeId);

      // A draft always saves; when it cannot be finished yet, the one toast says what it still needs
      const audit = auditTemple({ dungeonLayout: layoutToSave });
      if (audit.passed) {
        showToast("Temple persists successfully!");
      } else {
        showUnfinishableToast(missingNames(audit));
      }
      debug.log("Temple saved to DB successfully");
    } catch (err: unknown) {
      debug.error("Error saving temple:", err);
      showToast("Error saving temple: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const resetFloor = async () => {
    const isPrimaryFloor = store.currentLevelId === "1F";
    const header = isPrimaryFloor ? "Clear 1F?" : "Trash Floor?";
    const message = isPrimaryFloor
      ? "This will clear all room entries for 1F. This cannot be undone."
      : `This will PERMANENTLY DELETE the entire floor (${store.currentLevelId}). This cannot be undone.`;

    const alert = await alertController.create({
      header,
      message,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: isPrimaryFloor ? "Clear" : "Trash It",
          role: "destructive",
          handler: () => {
            if (isPrimaryFloor) {
              // Just clear the 1F grid
              const [rows, cols] = gridSize.value.split("x").map(Number);
              const newSlice = Array(rows)
                .fill(null)
                .map(() => Array(cols).fill(____));
              if (Array.isArray(store.templeMaze)) {
                store.templeMaze = newSlice;
              } else {
                store.templeMaze["1F"] = newSlice;
              }
              showToast("1F cleared");
            } else {
              // Delete the whole floor and switch back
              const floorToDelete = store.currentLevelId;
              removeFloor(floorToDelete);
              showToast(`Floor ${floorToDelete} trashed`);
            }
          },
        },
      ],
    });
    await alert.present();
  };

  // Copies a stored temple (name, icon, entrance, maze, rooms) into the store
  const adoptStoredLayout = (
    existingTemple: TempleInterface,
    layout: NonNullable<TempleInterface["dungeonLayout"]>
  ) => {
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
      entrancePosition.value = layout.entrance.join(",");
    }

    store.templeId = props.templeId;
    store.markAsLoaded(props.templeId);

    // Load maze
    if (layout.maze) {
      templeMaze.value = JSON.parse(JSON.stringify(layout.maze));

      // Calculate grid size from maze
      const measuredSize = measureGridSize(templeMaze.value);
      if (measuredSize !== null) {
        gridSize.value = measuredSize;
      }
    }

    // Load rooms data
    if (layout.rooms) {
      roomsData.value = JSON.parse(JSON.stringify(layout.rooms));
    }

    // Correct level ID
    currentLevelId.value = levelIdAfterLoad(
      templeMaze.value,
      currentLevelId.value
    );
  };

  /**
   * Loads temple layout from database or store
   */
  const loadTempleLayout = async () => {
    // If already loading, don't start again
    if (isLoading.value) return;

    debug.log(
      "useTempleCreator: Starting loadTempleLayout for",
      props.templeId
    );
    isLoading.value = true;

    try {
      // TWO-LAYERED APPROACH:
      // If this temple is already loaded in the store, don't reload from DB.
      if (store.isLoaded(props.templeId)) {
        debug.log(
          "useTempleCreator: Temple already loaded in store, preserving temp data"
        );
        store.templeId = props.templeId;

        // Snapshot current state for change detection if not already set
        if (!store.dbStateSnapshot) {
          store.updateDbSnapshot();
        }
        isLoading.value = false;
        return;
      }

      debug.log("useTempleCreator: Loading temple from DB:", props.templeId);
      await ensureBuiltInTemples();
      const existingTemple = await templeDb.getTempleById(props.templeId);

      if (existingTemple?.dungeonLayout) {
        adoptStoredLayout(existingTemple, existingTemple.dungeonLayout);
      } else {
        debug.log(
          "useTempleCreator: New temple or no layout found, creating defaults"
        );
        // New temple or no layout - force defaults
        gridSize.value = "10x10";
        entrancePosition.value = "5,5";
        store.reset();
        store.templeId = props.templeId;
        store.markAsLoaded(props.templeId);
      }

      // Snapshot for dirty checking
      store.updateDbSnapshot();
    } catch (err) {
      debug.error("useTempleCreator: Failed to load temple layout:", err);
    } finally {
      isLoading.value = false;
      debug.log("useTempleCreator: Load complete, isLoading set to false");
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
    entrancePosition: entrancePosition as ComputedRef<string> & {
      value: string;
    },
    templeMaze,
    roomsData,
    selectedCell,
    currentLevelId: currentLevelId as ComputedRef<string> & { value: string },
    floors,
    aboveFloors,
    belowFloors,
    currentMazeSlice,

    // Dynamic computeds
    templeIcon,
    dynamicRoomIcons,
    entranceDisplay,
    hasEntrance,
    entranceOnThisFloor,
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
    resetTempleToDefault,
    loadTempleLayout,
    copyToClipboard,
    showToast,

    // Unique rooms for config view
    uniqueRooms,

    // Dungeon items
    dungeonItems,
  };
}
