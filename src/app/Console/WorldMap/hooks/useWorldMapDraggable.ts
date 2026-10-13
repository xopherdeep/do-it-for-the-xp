import { computed, ref, watch, type Ref } from "vue";
import { play$fx } from "@/assets/fx";
import debug from "@/lib/utils/debug";

export interface StagePosition {
  x: number;
  y: number;
}

export interface StageNode {
  stageId: string;
  x: number;
  y: number;
  isDragging: boolean;
}

export const DEFAULT_STAGE_POSITIONS: Record<string, StagePosition> = {
  "world-islands": { x: 18, y: 15 },
  "world-mountains": { x: 50, y: 15 },
  "world-clouds": { x: 82, y: 15 },
  "world-forest": { x: 18, y: 34 },
  "world-plains": { x: 50, y: 34 },
  "world-ice": { x: 82, y: 34 },
  "world-swamps": { x: 18, y: 53 },
  "world-sands": { x: 50, y: 53 },
  "the-moon": { x: 82, y: 53 },
};

export const MIN_STAGE_X = 12;
export const MAX_STAGE_X = 88;
export const MIN_STAGE_Y = 10;
export const MAX_STAGE_Y = 72;
export const DRAG_DISTANCE_THRESHOLD_PX = 6;

const clampValue = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

export const getStorageKey = (userId?: string): string =>
  `xp:world-map:positions:${userId || "default"}`;

export const loadStoredPositions = (key: string): Record<string, StagePosition> | null => {
  try {
    const rawData = localStorage.getItem(key);
    const hasData = Boolean(rawData);
    if (!hasData) return null;
    const parsed = JSON.parse(rawData as string);
    const isValidObject = Boolean(parsed && typeof parsed === "object");
    if (!isValidObject) return null;
    return parsed as Record<string, StagePosition>;
  } catch (error) {
    debug.warn("[useWorldMapDraggable] Failed to load positions", error);
    return null;
  }
};

export const saveStoredPositions = (
  key: string,
  positions: Record<string, StagePosition>
): void => {
  try {
    localStorage.setItem(key, JSON.stringify(positions));
  } catch (error) {
    debug.warn("[useWorldMapDraggable] Failed to save positions", error);
  }
};

export const clearStoredPositions = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    debug.warn("[useWorldMapDraggable] Failed to clear positions", error);
  }
};

export const useWorldMapDraggable = (
  userIdRef: Ref<string | undefined>,
  plazaRef: Ref<HTMLElement | null>
) => {
  const positionsMap = ref<Record<string, StagePosition>>({ ...DEFAULT_STAGE_POSITIONS });
  const activeDragId = ref<string | null>(null);
  const isDragMoved = ref(false);
  const isClickSuppressed = ref(false);

  let pointerStartX = 0;
  let pointerStartY = 0;
  let nodeStartX = 0;
  let nodeStartY = 0;
  let suppressClickTimer: ReturnType<typeof setTimeout> | null = null;

  const currentStorageKey = computed(() => getStorageKey(userIdRef.value));

  const syncFromStorage = () => {
    const loaded = loadStoredPositions(currentStorageKey.value);
    const resolvedPositions: Record<string, StagePosition> = {};
    const stageIds = Object.keys(DEFAULT_STAGE_POSITIONS);

    stageIds.forEach((id) => {
      const storedPos = loaded ? loaded[id] : undefined;
      const defaultPos = DEFAULT_STAGE_POSITIONS[id];
      const hasValidStored = Boolean(
        storedPos &&
        typeof storedPos.x === "number" &&
        typeof storedPos.y === "number"
      );
      const canUseStored = Boolean(hasValidStored && storedPos);
      if (canUseStored) {
        const validPos = storedPos as StagePosition;
        resolvedPositions[id] = { x: validPos.x, y: validPos.y };
      } else {
        resolvedPositions[id] = { x: defaultPos.x, y: defaultPos.y };
      }
    });

    positionsMap.value = resolvedPositions;
  };

  watch(
    () => userIdRef.value,
    () => {
      syncFromStorage();
    },
    { immediate: true }
  );

  const stageNodes = computed<StageNode[]>(() => {
    const stageIds = Object.keys(DEFAULT_STAGE_POSITIONS);
    return stageIds.map((stageId) => {
      const pos = positionsMap.value[stageId] || DEFAULT_STAGE_POSITIONS[stageId];
      const isDraggingNode = activeDragId.value === stageId;
      return {
        stageId,
        x: pos.x,
        y: pos.y,
        isDragging: isDraggingNode,
      };
    });
  });

  const onPointerDown = (stageId: string, event: PointerEvent) => {
    const isPrimaryTouch = event.button === 0;
    if (!isPrimaryTouch) return;

    const targetEl = event.currentTarget as HTMLElement | null;
    targetEl?.setPointerCapture?.(event.pointerId);

    activeDragId.value = stageId;
    isDragMoved.value = false;
    isClickSuppressed.value = false;

    pointerStartX = event.clientX;
    pointerStartY = event.clientY;

    const currentPos = positionsMap.value[stageId] || DEFAULT_STAGE_POSITIONS[stageId];
    nodeStartX = currentPos.x;
    nodeStartY = currentPos.y;
  };

  const onPointerMove = (stageId: string, event: PointerEvent) => {
    const isMismatchedNode = activeDragId.value !== stageId;
    const plazaEl = plazaRef.value;
    const hasNoPlaza = !plazaEl;
    const shouldAbortMove = isMismatchedNode || hasNoPlaza;
    if (shouldAbortMove) return;

    const deltaPixelX = event.clientX - pointerStartX;
    const deltaPixelY = event.clientY - pointerStartY;
    const totalDistance = Math.hypot(deltaPixelX, deltaPixelY);

    const isPastThreshold = totalDistance >= DRAG_DISTANCE_THRESHOLD_PX;
    const isAlreadyMoving = isDragMoved.value;
    const shouldSkipMove = !isPastThreshold && !isAlreadyMoving;
    if (shouldSkipMove) return;

    isDragMoved.value = true;
    isClickSuppressed.value = true;

    const rect = plazaEl.getBoundingClientRect();
    const isInvalidRect = rect.width <= 0 || rect.height <= 0;
    if (isInvalidRect) {
      debug.warn("[useWorldMapDraggable] Invalid plaza bounding rect during move");
      return;
    }

    const deltaPercentX = (deltaPixelX / rect.width) * 100;
    const deltaPercentY = (deltaPixelY / rect.height) * 100;

    const clampedX = clampValue(nodeStartX + deltaPercentX, MIN_STAGE_X, MAX_STAGE_X);
    const clampedY = clampValue(nodeStartY + deltaPercentY, MIN_STAGE_Y, MAX_STAGE_Y);

    positionsMap.value = {
      ...positionsMap.value,
      [stageId]: {
        x: Math.round(clampedX * 10) / 10,
        y: Math.round(clampedY * 10) / 10,
      },
    };
  };

  const onPointerUp = (stageId: string, event: PointerEvent) => {
    const isMismatchedNode = activeDragId.value !== stageId;
    if (isMismatchedNode) return;

    const targetEl = event.currentTarget as HTMLElement | null;
    targetEl?.releasePointerCapture?.(event.pointerId);

    const didPerformDrag = isDragMoved.value;
    if (didPerformDrag) {
      saveStoredPositions(currentStorageKey.value, positionsMap.value);
      try {
        play$fx("equip");
      } catch (error) {
        debug.warn("[useWorldMapDraggable] sound failed", error);
      }

      if (suppressClickTimer) clearTimeout(suppressClickTimer);
      suppressClickTimer = setTimeout(() => {
        isClickSuppressed.value = false;
      }, 150);
    }

    activeDragId.value = null;
    isDragMoved.value = false;
  };

  const handleDragPointer = (stageId: string, event: PointerEvent) => {
    const isDownEvent = event.type === "pointerdown";
    if (isDownEvent) {
      onPointerDown(stageId, event);
      return;
    }
    const isMoveEvent = event.type === "pointermove";
    if (isMoveEvent) {
      onPointerMove(stageId, event);
      return;
    }
    const isEndEvent = event.type === "pointerup" || event.type === "pointercancel";
    if (isEndEvent) {
      onPointerUp(stageId, event);
    }
  };

  const resetPositions = () => {
    clearStoredPositions(currentStorageKey.value);
    positionsMap.value = { ...DEFAULT_STAGE_POSITIONS };
    try {
      play$fx("equip");
    } catch (error) {
      debug.warn("[useWorldMapDraggable] reset sound failed", error);
    }
  };

  return {
    stageNodes,
    isClickSuppressed,
    handleDragPointer,
    resetPositions,
  };
};
