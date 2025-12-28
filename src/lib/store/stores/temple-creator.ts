import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ____, _00_ } from "@/lib/engine/dungeons/roomTypes";
import { Room } from "@/lib/engine/core/dungeons/types";

export const useTempleCreatorStore = defineStore('temple-creator', () => {
  const templeId = ref<string | null>(null);
  const templeName = ref("Temple");
  const gridSize = ref("6x6");
  const entrancePosition = ref("5,2");
  const templeMaze = ref<string[][] | Record<string, string[][]>>([]);
  const currentLevelId = ref("1F");
  const roomsData = ref<Record<string, Room>>({
    [____]: { type: "wall" },
    [_00_]: { type: "entrance", visited: true }
  });
  
  const selectedCell = ref<{row: number, col: number} | null>(null);
  const roomEditorOpen = ref(false);

  const symbolCounter = ref(0);
  const usedSymbols = ref<Set<string>>(new Set([____, _00_]));

  // Two-layered save approach: Track which temple is loaded from DB
  // This prevents reloading from DB when navigating back from room editor
  const loadedTempleId = ref<string | null>(null);
  const pendingScrollId = ref<string | null>(null);
  
  // Check if the current temple is already loaded (don't reload from DB)
  function isLoaded(id: string): boolean {
    return loadedTempleId.value === id;
  }
  
  // Mark temple as loaded from DB
  function markAsLoaded(id: string) {
    loadedTempleId.value = id;
  }

  function reset() {
    templeId.value = null;
    templeName.value = "Temple";
    gridSize.value = "6x6";
    entrancePosition.value = "5,2";
    templeMaze.value = [];
    currentLevelId.value = "1F";
    roomsData.value = {
      [____]: { type: "wall" },
      [_00_]: { type: "entrance", visited: true }
    };
    selectedCell.value = null;
    roomEditorOpen.value = false;
    symbolCounter.value = 0;
    usedSymbols.value = new Set([____, _00_]);
    loadedTempleId.value = null;
  }

  function generateUniqueSymbol(): string {
    let newSymbol = '';
    do {
      symbolCounter.value++;
      newSymbol = `R${symbolCounter.value.toString().padStart(3, '0')}`;
    } while (usedSymbols.value.has(newSymbol));
    usedSymbols.value.add(newSymbol);
    return newSymbol;
  }

  return {
    templeId,
    templeName,
    gridSize,
    entrancePosition,
    templeMaze,
    roomsData,
    selectedCell,
    roomEditorOpen,
    symbolCounter,
    usedSymbols,
    currentLevelId,
    loadedTempleId,
    pendingScrollId,
    reset,
    generateUniqueSymbol,
    isLoaded,
    markAsLoaded
  };
});
