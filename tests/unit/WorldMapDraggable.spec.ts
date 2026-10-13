import { ref } from "vue";
import {
  useWorldMapDraggable,
  DEFAULT_STAGE_POSITIONS,
  getStorageKey,
  loadStoredPositions,
  saveStoredPositions,
  clearStoredPositions,
  MIN_STAGE_X,
  MAX_STAGE_X,
  MIN_STAGE_Y,
  MAX_STAGE_Y,
} from "@/app/Console/WorldMap/hooks/useWorldMapDraggable";

describe("WorldMapDraggable", () => {
  const userId = "hero-123";
  const storageKey = getStorageKey(userId);

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe("storage utilities", () => {
    it("generates user-scoped storage key", () => {
      expect(getStorageKey("abc")).toBe("xp:world-map:positions:abc");
      expect(getStorageKey()).toBe("xp:world-map:positions:default");
    });

    it("saves and loads positions from localStorage", () => {
      const customPositions = {
        "world-islands": { x: 25, y: 30 },
      };
      saveStoredPositions(storageKey, customPositions);
      const loaded = loadStoredPositions(storageKey);
      expect(loaded).toEqual(customPositions);
    });

    it("returns null on missing or invalid data", () => {
      expect(loadStoredPositions("non-existent-key")).toBeNull();
      localStorage.setItem("bad-json", "{ invalid");
      expect(loadStoredPositions("bad-json")).toBeNull();
    });

    it("clears stored positions", () => {
      saveStoredPositions(storageKey, { "world-islands": { x: 25, y: 30 } });
      clearStoredPositions(storageKey);
      expect(loadStoredPositions(storageKey)).toBeNull();
    });
  });

  describe("useWorldMapDraggable composable", () => {
    const createMockPlaza = (width = 500, height = 1000): HTMLElement => {
      const el = document.createElement("div");
      el.getBoundingClientRect = () => ({
        width,
        height,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      return el;
    };

    it("initializes with default positions when storage is empty", () => {
      const userIdRef = ref<string | undefined>(userId);
      const plazaRef = ref<HTMLElement | null>(createMockPlaza());

      const { stageNodes } = useWorldMapDraggable(userIdRef, plazaRef);

      expect(stageNodes.value.length).toBe(9);
      const islands = stageNodes.value.find((n) => n.stageId === "world-islands");
      expect(islands?.x).toBe(DEFAULT_STAGE_POSITIONS["world-islands"].x);
      expect(islands?.y).toBe(DEFAULT_STAGE_POSITIONS["world-islands"].y);
      expect(islands?.isDragging).toBe(false);
    });

    it("loads saved positions from localStorage on mount", () => {
      const savedPositions = {
        ...DEFAULT_STAGE_POSITIONS,
        "world-islands": { x: 42, y: 28 },
      };
      localStorage.setItem(storageKey, JSON.stringify(savedPositions));

      const userIdRef = ref<string | undefined>(userId);
      const plazaRef = ref<HTMLElement | null>(createMockPlaza());

      const { stageNodes } = useWorldMapDraggable(userIdRef, plazaRef);
      const islands = stageNodes.value.find((n) => n.stageId === "world-islands");
      expect(islands?.x).toBe(42);
      expect(islands?.y).toBe(28);
    });

    it("drags a node, updates coordinates, clamps bounds, and persists on pointerup", () => {
      const userIdRef = ref<string | undefined>(userId);
      const plazaRef = ref<HTMLElement | null>(createMockPlaza(500, 1000));

      const { stageNodes, handleDragPointer, isClickSuppressed } = useWorldMapDraggable(
        userIdRef,
        plazaRef
      );

      const targetEl = document.createElement("div");
      targetEl.setPointerCapture = jest.fn();
      targetEl.releasePointerCapture = jest.fn();

      // 1. Pointer Down
      const downEvent = {
        type: "pointerdown",
        button: 0,
        pointerId: 1,
        clientX: 100,
        clientY: 200,
        currentTarget: targetEl,
      } as unknown as PointerEvent;
      handleDragPointer("world-islands", downEvent);

      expect(targetEl.setPointerCapture).toHaveBeenCalledWith(1);
      const islandsBefore = stageNodes.value.find((n) => n.stageId === "world-islands");
      expect(islandsBefore?.isDragging).toBe(true);

      // 2. Pointer Move (move 50px right (+10% on 500w) and 100px down (+10% on 1000h))
      const moveEvent = {
        type: "pointermove",
        pointerId: 1,
        clientX: 150,
        clientY: 300,
      } as unknown as PointerEvent;
      handleDragPointer("world-islands", moveEvent);

      expect(isClickSuppressed.value).toBe(true);
      const islandsMoved = stageNodes.value.find((n) => n.stageId === "world-islands");
      expect(islandsMoved?.x).toBe(DEFAULT_STAGE_POSITIONS["world-islands"].x + 10);
      expect(islandsMoved?.y).toBe(DEFAULT_STAGE_POSITIONS["world-islands"].y + 10);

      // 3. Pointer Up
      const upEvent = {
        type: "pointerup",
        pointerId: 1,
        currentTarget: targetEl,
      } as unknown as PointerEvent;
      handleDragPointer("world-islands", upEvent);

      expect(targetEl.releasePointerCapture).toHaveBeenCalledWith(1);
      const islandsAfter = stageNodes.value.find((n) => n.stageId === "world-islands");
      expect(islandsAfter?.isDragging).toBe(false);

      // Saved in storage
      const stored = loadStoredPositions(storageKey);
      expect(stored?.["world-islands"].x).toBe(islandsMoved?.x);
      expect(stored?.["world-islands"].y).toBe(islandsMoved?.y);
    });

    it("clamps node movement to boundaries", () => {
      const userIdRef = ref<string | undefined>(userId);
      const plazaRef = ref<HTMLElement | null>(createMockPlaza(500, 1000));

      const { stageNodes, handleDragPointer } = useWorldMapDraggable(userIdRef, plazaRef);
      const targetEl = document.createElement("div");

      // Pointer Down
      handleDragPointer("world-islands", {
        type: "pointerdown",
        button: 0,
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        currentTarget: targetEl,
      } as unknown as PointerEvent);

      // Pointer Move far beyond top-left bounds
      handleDragPointer("world-islands", {
        type: "pointermove",
        pointerId: 1,
        clientX: -500,
        clientY: -500,
      } as unknown as PointerEvent);

      const islands = stageNodes.value.find((n) => n.stageId === "world-islands");
      expect(islands?.x).toBe(MIN_STAGE_X);
      expect(islands?.y).toBe(MIN_STAGE_Y);

      // Pointer Move far beyond bottom-right bounds
      handleDragPointer("world-islands", {
        type: "pointermove",
        pointerId: 1,
        clientX: 2000,
        clientY: 2000,
      } as unknown as PointerEvent);

      const islandsMax = stageNodes.value.find((n) => n.stageId === "world-islands");
      expect(islandsMax?.x).toBe(MAX_STAGE_X);
      expect(islandsMax?.y).toBe(MAX_STAGE_Y);
    });

    it("does not suppress clicks or save storage if movement is below drag threshold", () => {
      const userIdRef = ref<string | undefined>(userId);
      const plazaRef = ref<HTMLElement | null>(createMockPlaza());

      const { handleDragPointer, isClickSuppressed } = useWorldMapDraggable(userIdRef, plazaRef);
      const targetEl = document.createElement("div");

      handleDragPointer("world-islands", {
        type: "pointerdown",
        button: 0,
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        currentTarget: targetEl,
      } as unknown as PointerEvent);

      // Moved only 2px (below 6px threshold)
      handleDragPointer("world-islands", {
        type: "pointermove",
        pointerId: 1,
        clientX: 102,
        clientY: 100,
      } as unknown as PointerEvent);

      expect(isClickSuppressed.value).toBe(false);

      handleDragPointer("world-islands", {
        type: "pointerup",
        pointerId: 1,
        currentTarget: targetEl,
      } as unknown as PointerEvent);

      expect(isClickSuppressed.value).toBe(false);
      expect(loadStoredPositions(storageKey)).toBeNull();
    });

    it("resets all positions to default and clears storage", () => {
      saveStoredPositions(storageKey, {
        ...DEFAULT_STAGE_POSITIONS,
        "world-islands": { x: 40, y: 40 },
      });

      const userIdRef = ref<string | undefined>(userId);
      const plazaRef = ref<HTMLElement | null>(createMockPlaza());

      const { stageNodes, resetPositions } = useWorldMapDraggable(userIdRef, plazaRef);
      expect(stageNodes.value.find((n) => n.stageId === "world-islands")?.x).toBe(40);

      resetPositions();

      expect(loadStoredPositions(storageKey)).toBeNull();
      expect(stageNodes.value.find((n) => n.stageId === "world-islands")?.x).toBe(
        DEFAULT_STAGE_POSITIONS["world-islands"].x
      );
    });
  });
});
