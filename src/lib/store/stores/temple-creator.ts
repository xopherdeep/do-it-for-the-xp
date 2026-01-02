import { defineStore } from "pinia";
import { ref } from "vue";
import { ____, _00_ } from "@/lib/engine/dungeons/roomTypes";
import { Room } from "@/lib/engine/core/dungeons/types";
import defaultTemples from "@/lib/engine/temples";
import debug from "@/lib/utils/debug";

// Visual tokens for JSON readability (5 characters to match X0000 format)
const WALL_TOKEN = "_____";
const ENTRANCE_TOKEN = "_00__";

export const useTempleCreatorStore = defineStore("temple-creator", () => {
  const templeId = ref<string | null>(null);
  const templeName = ref("Temple");
  const templeIcon = ref("fad fa-place-of-worship");
  const gridSize = ref("6x6");
  const entrancePosition = ref("5,2");
  const templeMaze = ref<string[][] | Record<string, string[][]>>([]);
  const currentLevelId = ref("1F");

  const typePrefixes: Record<string, string> = {
    monster: "M",
    boss: "B",
    miniboss: "m",
    loot: "L",
    shop: "S",
    health: "H",
    mana: "A",
    key: "K",
    teleport: "T",
    puzzle: "P",
    trap: "X",
    savepoint: "V",
    stairs_up: "U",
    stairs_down: "D",
    empty: "R",
  };

  const roomsData = ref<Record<string, Room>>({
    [WALL_TOKEN]: { type: "wall" },
    [ENTRANCE_TOKEN]: { type: "entrance", visited: true },
  });

  const selectedCell = ref<{ row: number; col: number } | null>(null);
  const roomEditorOpen = ref(false);

  const symbolCounter = ref(0);
  const usedSymbols = ref<Set<string>>(new Set([WALL_TOKEN, ENTRANCE_TOKEN]));

  const cachedBestiary = ref<any[]>([]);
  const cachedShops = ref<any[]>([]);

  // Two-layered save approach: Track which temple is loaded from DB
  // This prevents reloading from DB when navigating back from room editor
  const loadedTempleId = ref<string | null>(null);
  const pendingScrollId = ref<string | null>(null);

  // Create a persistent snapshot of the database state in the global store
  // This allows change detection to survive across component unmounts (e.g. navigation)
  const dbStateSnapshot = ref<string | null>(null);

  // Check if the current temple is already loaded (don't reload from DB)
  function isLoaded(id: string): boolean {
    return loadedTempleId.value === id;
  }

  // Mark temple as loaded from DB
  function markAsLoaded(id: string) {
    loadedTempleId.value = id;
  }

  // Update the snapshot of what's currently in the DB
  function updateDbSnapshot() {
    dbStateSnapshot.value = JSON.stringify({
      maze: templeMaze.value,
      rooms: roomsData.value,
      gridSize: gridSize.value,
      entrance: entrancePosition.value,
    });
  }

  function reset() {
    templeId.value = null;
    templeName.value = "Temple";
    templeIcon.value = "fad fa-place-of-worship";
    gridSize.value = "6x6";
    entrancePosition.value = "5,2";
    templeMaze.value = [];
    currentLevelId.value = "1F";
    roomsData.value = {
      [WALL_TOKEN]: { type: "wall" },
      [ENTRANCE_TOKEN]: { type: "entrance", visited: true },
    };
    selectedCell.value = null;
    roomEditorOpen.value = false;
    symbolCounter.value = 0;
    usedSymbols.value = new Set([WALL_TOKEN, ENTRANCE_TOKEN]);
    cachedBestiary.value = [];
    cachedShops.value = [];
    loadedTempleId.value = null;
  }

  /**
   * Resets the current temple to its factory default state from engine files.
   * This acts as an emergency data restoration method.
   */
  function resetToDefault(id: string) {
    const defaultData = (defaultTemples as any)[id];
    if (!defaultData) {
      debug.warn(`No default data found for temple ${id}`);
      return false;
    }

    debug.log(`Resetting temple ${id} to factory defaults...`);

    // Clear and reload
    templeName.value = defaultData.name || id;
    templeMaze.value = JSON.parse(JSON.stringify(defaultData.maze));
    roomsData.value = JSON.parse(JSON.stringify(defaultData.rooms));

    // Standardize entrance
    if (defaultData.entrance) {
      entrancePosition.value = defaultData.entrance.join(",");
    }

    // Calculate grid size from first row of first floor
    const firstFloor = Array.isArray(defaultData.maze)
      ? defaultData.maze
      : (Object.values(defaultData.maze)[0] as string[][]);
    if (firstFloor && firstFloor.length > 0) {
      const rows = firstFloor.length;
      const cols = firstFloor[0].length;
      gridSize.value = `${rows}x${cols}`;
    }

    // Reset metadata
    symbolCounter.value = 0; // Will be recalced on next migrate/save if needed
    usedSymbols.value = new Set(Object.keys(roomsData.value));

    // Identify current floor
    if (Array.isArray(defaultData.maze)) {
      currentLevelId.value = "1F";
    } else {
      currentLevelId.value = Object.keys(defaultData.maze)[0] || "1F";
    }

    return true;
  }

  function generateUniqueSymbol(
    row?: number,
    col?: number,
    type: string = "empty"
  ): string {
    if (row !== undefined && col !== undefined) {
      // Use coordinates TXXYY (e.g. M0104 for monster at x1, y4)
      const prefix = typePrefixes[type] || "R";
      const xx = col.toString().padStart(2, "0");
      const yy = row.toString().padStart(2, "0");
      return prefix + xx + yy;
    }

    // Fallback to R000 style if coordinates are not provided (should be rare now)
    let newSymbol = "";
    do {
      symbolCounter.value++;
      newSymbol = `R${symbolCounter.value.toString().padStart(3, "0")}`;
    } while (usedSymbols.value.has(newSymbol));
    usedSymbols.value.add(newSymbol);
    return newSymbol;
  }

  /**
   * Migrates existing R-style tokens to the new TXXYY coordinate format.
   * This is called during save to ensure standardization.
   */
  function migrateTokens() {
    debug.log("Starting token migration to coordinate-based system...");

    const newRoomsData: Record<string, Room> = {
      [WALL_TOKEN]: roomsData.value[WALL_TOKEN] ||
        roomsData.value[____] || { type: "wall" },
      [ENTRANCE_TOKEN]: roomsData.value[ENTRANCE_TOKEN] ||
        roomsData.value[_00_] || { type: "entrance", visited: true },
    };

    const tokenMap = new Map<string, string>();
    tokenMap.set(WALL_TOKEN, WALL_TOKEN);
    tokenMap.set(____, WALL_TOKEN); // Legacy support
    tokenMap.set(ENTRANCE_TOKEN, ENTRANCE_TOKEN);
    tokenMap.set(_00_, ENTRANCE_TOKEN); // Legacy support

    const processedMaze = JSON.parse(JSON.stringify(templeMaze.value));

    const processMazeGrid = (grid: string[][]) => {
      return grid.map((row, rIdx) =>
        row.map((cell, cIdx) => {
          // Normalize legacy tokens to 4-char versions
          if (cell === ____ || cell === WALL_TOKEN) return WALL_TOKEN;
          if (cell === _00_ || cell === ENTRANCE_TOKEN) return ENTRANCE_TOKEN;

          // WALL NORMALIZATION: If this cell's room has type 'wall', replace with WALL_TOKEN
          const existingRoom = roomsData.value[cell];
          if (existingRoom?.type === "wall") {
            // Delete the spurious wall entry from roomsData (we'll use shared WALL_TOKEN)
            delete roomsData.value[cell];
            return WALL_TOKEN;
          }

          // Match both 5-char (TXXYY) and potential future 6-char variants
          const isCoordToken = /^[A-Za-z]\d{4}$/.test(cell);

          let newKey = cell;
          // If it starts with R or is a legacy token, we migrate it to the current coordinate.
          if (!isCoordToken || cell.startsWith("R")) {
            const room = roomsData.value[cell];
            const type = room?.type || "empty";
            newKey = generateUniqueSymbol(rIdx, cIdx, type);

            // Only copy data if we haven't already moved this room definition
            // (Handles cases where multiple maze cells used the same token)
            if (roomsData.value[cell] && !newRoomsData[newKey]) {
              newRoomsData[newKey] = JSON.parse(
                JSON.stringify(roomsData.value[cell])
              );
            }
          } else {
            // It's already a coord token, just ensure it's in the new room data
            if (roomsData.value[cell]) {
              newRoomsData[cell] = JSON.parse(
                JSON.stringify(roomsData.value[cell])
              );
            }
          }

          return newKey;
        })
      );
    };

    if (Array.isArray(processedMaze)) {
      templeMaze.value = processMazeGrid(processedMaze);
    } else {
      const multiFloorMaze: Record<string, string[][]> = {};
      Object.keys(processedMaze).forEach((floorId) => {
        multiFloorMaze[floorId] = processMazeGrid(processedMaze[floorId]);
      });
      templeMaze.value = multiFloorMaze;
    }

    roomsData.value = newRoomsData;

    // Update used symbols
    usedSymbols.value = new Set(Object.keys(newRoomsData));
    debug.log("Token migration complete.");
  }

  return {
    templeId,
    templeName,
    templeIcon,
    gridSize,
    entrancePosition,
    templeMaze,
    roomsData,
    selectedCell,
    roomEditorOpen,
    symbolCounter,
    usedSymbols,
    currentLevelId,
    cachedBestiary,
    cachedShops,
    loadedTempleId,
    pendingScrollId,
    dbStateSnapshot, // Exposure
    reset,
    resetToDefault,
    updateDbSnapshot, // Exposure
    generateUniqueSymbol,
    migrateTokens,
    isLoaded,
    markAsLoaded,
  };
});
