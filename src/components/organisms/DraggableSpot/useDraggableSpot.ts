import { computed, getCurrentInstance, onUnmounted, ref, watch, type Ref } from "vue";
import { play$fx } from "@/assets/fx";
import debug from "@/lib/utils/debug";
import {
  type SpotPosition,
  type SnapMode,
  MIN_SPOT_SCALE,
  MAX_SPOT_SCALE,
  DRAG_THRESHOLD_PX,
  clampValue,
  snapCoordinate,
  isOrganizeMode,
  activeOrganizeSpotId,
  snapMode,
  enableOrganizeMode,
  disableOrganizeMode,
  toggleOrganizeMode,
  cycleSnapMode,
  getSpotStorageKey,
  loadStoredSpot,
  saveStoredSpot,
  clearStoredSpot,
  triggerSpotsReset,
} from "./spotState";

export {
  type SpotPosition,
  type SnapMode,
  MIN_SPOT_SCALE,
  MAX_SPOT_SCALE,
  DRAG_THRESHOLD_PX,
  clampValue,
  snapCoordinate,
  isOrganizeMode,
  activeOrganizeSpotId,
  snapMode,
  enableOrganizeMode,
  disableOrganizeMode,
  toggleOrganizeMode,
  cycleSnapMode,
  getSpotStorageKey,
  loadStoredSpot,
  saveStoredSpot,
  clearStoredSpot,
  triggerSpotsReset,
};

export interface UseDraggableSpotOptions {
  spotId: string;
  screen: string;
  defaultX: number;
  defaultY: number;
  defaultScale?: number;
  minScale?: number;
  maxScale?: number;
  userIdRef?: Ref<string | undefined>;
  spotRef: Ref<HTMLElement | null>;
}

export const useDraggableSpot = (options: UseDraggableSpotOptions) => {
  const {
    spotId,
    screen,
    defaultX,
    defaultY,
    defaultScale = 1.0,
    minScale = MIN_SPOT_SCALE,
    maxScale = MAX_SPOT_SCALE,
    userIdRef,
    spotRef,
  } = options;

  const initialPosition: SpotPosition = {
    x: defaultX,
    y: defaultY,
    scale: defaultScale,
  };

  const position = ref<SpotPosition>({ ...initialPosition });
  const isDragging = ref(false);
  const isScaling = ref(false);
  const isClickSuppressed = ref(false);

  const activePointers = new Map<number, { x: number; y: number }>();
  let pointerStartX = 0;
  let pointerStartY = 0;
  let nodeStartX = 0;
  let nodeStartY = 0;
  let pinchStartDistance = 0;
  let pinchStartScale = 1.0;
  let suppressClickTimer: ReturnType<typeof setTimeout> | null = null;
  let scaleFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  const storageKey = computed(() =>
    getSpotStorageKey(screen, spotId, userIdRef?.value)
  );

  const syncFromStorage = () => {
    const loaded = loadStoredSpot(storageKey.value);
    const canApplyLoaded = Boolean(loaded);
    if (canApplyLoaded) {
      const validLoaded = loaded as SpotPosition;
      position.value = { ...validLoaded };
    } else {
      position.value = { ...initialPosition };
    }
  };

  const hasUserRef = Boolean(userIdRef);
  if (hasUserRef) {
    const activeUserRef = userIdRef as Ref<string | undefined>;
    watch(
      () => activeUserRef.value,
      () => {
        syncFromStorage();
      },
      { immediate: true }
    );
  } else {
    syncFromStorage();
  }

  const flashScaleFeedback = () => {
    isScaling.value = true;
    if (scaleFeedbackTimer) clearTimeout(scaleFeedbackTimer);
    scaleFeedbackTimer = setTimeout(() => {
      isScaling.value = false;
    }, 1200);
  };

  const handlePointerDown = (event: PointerEvent) => {
    const isPrimaryTouch = event.button === 0;
    if (!isPrimaryTouch) return;

    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const isSinglePointer = activePointers.size === 1;
    if (isSinglePointer) {
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      nodeStartX = position.value.x;
      nodeStartY = position.value.y;
      isDragging.value = false;
      isClickSuppressed.value = false;
      setupWindowListeners();

      const isOrganizing = isOrganizeMode.value;
      if (isOrganizing) {
        isDragging.value = true;
        isClickSuppressed.value = true;
        const el = spotRef.value;
        try {
          el?.setPointerCapture?.(event.pointerId);
        } catch (error) {
          debug.warn("[useDraggableSpot] pointer capture ignored", error);
        }
      } else {
        if (longPressTimer) clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          enableOrganizeMode(spotId);
          const el = spotRef.value;
          try {
            el?.setPointerCapture?.(event.pointerId);
          } catch (error) {
            debug.warn("[useDraggableSpot] timer pointer capture ignored", error);
          }
          isDragging.value = true;
          isClickSuppressed.value = true;
        }, 500);
      }
    }

    const isDoublePointer = activePointers.size === 2;
    if (isDoublePointer) {
      if (longPressTimer) clearTimeout(longPressTimer);
      const [p1, p2] = Array.from(activePointers.values());
      pinchStartDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      pinchStartScale = position.value.scale;
      isDragging.value = false;
      isClickSuppressed.value = true;
      flashScaleFeedback();
    }
  };

  const updatePinch = () => {
    const [p1, p2] = Array.from(activePointers.values());
    const currentDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const isValidDistance = pinchStartDistance > 0 && currentDistance > 0;
    if (!isValidDistance) {
      debug.warn("[useDraggableSpot] Invalid pinch distance detected during move");
      return;
    }

    const scaleRatio = currentDistance / pinchStartDistance;
    const calculatedScale = clampValue(pinchStartScale * scaleRatio, minScale, maxScale);
    position.value = {
      ...position.value,
      scale: Math.round(calculatedScale * 100) / 100,
    };
    isClickSuppressed.value = true;
    flashScaleFeedback();
  };

  const checkPendingLongPress = (distance: number): boolean => {
    const isWaitingLongPress = !isOrganizeMode.value;
    if (!isWaitingLongPress) return false;

    const isMovedPastThreshold = distance >= DRAG_THRESHOLD_PX;
    const hasActiveTimer = Boolean(longPressTimer);
    const shouldClearTimer = isMovedPastThreshold && hasActiveTimer;
    if (shouldClearTimer) {
      clearTimeout(longPressTimer as ReturnType<typeof setTimeout>);
      longPressTimer = null;
    }
    return true;
  };

  const checkCanPerformDrag = (distance: number, hasValidContainer: boolean): boolean => {
    const isPendingPress = checkPendingLongPress(distance);
    if (isPendingPress) return false;

    const isPastThreshold = distance >= DRAG_THRESHOLD_PX;
    const isAlreadyDragging = isDragging.value;
    const canMove = isPastThreshold || isAlreadyDragging;
    if (!canMove) return false;

    return hasValidContainer;
  };

  const updateSingleDrag = (clientX: number, clientY: number) => {
    const deltaX = clientX - pointerStartX;
    const deltaY = clientY - pointerStartY;
    const distance = Math.hypot(deltaX, deltaY);

    const el = spotRef.value;
    const parentRect = el?.parentElement?.getBoundingClientRect();
    const parentWidth = parentRect && parentRect.width > 0 ? parentRect.width : window.innerWidth;
    const parentHeight = parentRect && parentRect.height > 0 ? parentRect.height : window.innerHeight;
    const hasValidContainer = Boolean(parentWidth > 0 && parentHeight > 0);

    const canPerformDrag = checkCanPerformDrag(distance, hasValidContainer);
    if (!canPerformDrag) return;

    isDragging.value = true;
    isClickSuppressed.value = true;

    const deltaPercentX = (deltaX / parentWidth) * 100;
    const deltaPercentY = (deltaY / parentHeight) * 100;

    let nextX = clampValue(nodeStartX + deltaPercentX, 5, 95);
    let nextY = clampValue(nodeStartY + deltaPercentY, 5, 95);

    const isLiveDragSnap = snapMode.value === "drag";
    if (isLiveDragSnap) {
      nextX = clampValue(snapCoordinate(nextX, 2), 5, 95);
      nextY = clampValue(snapCoordinate(nextY, 2), 5, 95);
    }

    position.value = {
      ...position.value,
      x: Math.round(nextX * 10) / 10,
      y: Math.round(nextY * 10) / 10,
    };
  };

  const handlePointerMove = (event: PointerEvent) => {
    const isTracked = activePointers.has(event.pointerId);
    if (!isTracked) return;

    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const isPinching = activePointers.size >= 2;
    if (isPinching) {
      updatePinch();
      return;
    }

    const isSingle = activePointers.size === 1;
    if (isSingle) {
      updateSingleDrag(event.clientX, event.clientY);
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    const isTracked = activePointers.has(event.pointerId);
    if (!isTracked) return;

    activePointers.delete(event.pointerId);

    const el = spotRef.value;
    el?.releasePointerCapture?.(event.pointerId);

    const hasNoPointersRemaining = activePointers.size === 0;
    if (hasNoPointersRemaining) {
      const didMoveOrScale = isDragging.value || isClickSuppressed.value;
      if (didMoveOrScale) {
        const isDropSnap = snapMode.value === "drop" && isDragging.value;
        if (isDropSnap) {
          const snappedX = clampValue(snapCoordinate(position.value.x, 2), 5, 95);
          const snappedY = clampValue(snapCoordinate(position.value.y, 2), 5, 95);
          position.value = {
            ...position.value,
            x: Math.round(snappedX * 10) / 10,
            y: Math.round(snappedY * 10) / 10,
          };
        }

        saveStoredSpot(storageKey.value, position.value);
        try {
          play$fx("click");
        } catch (error) {
          debug.warn("[useDraggableSpot] sound failed", error);
        }

        if (suppressClickTimer) clearTimeout(suppressClickTimer);
        suppressClickTimer = setTimeout(() => {
          isClickSuppressed.value = false;
        }, 150);
      }
      isDragging.value = false;
      cleanupWindowListeners();
    }
  };

  function setupWindowListeners(): void {
    const hasWindow = typeof window !== "undefined";
    if (hasWindow) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    }
  }

  function cleanupWindowListeners(): void {
    const hasWindow = typeof window !== "undefined";
    if (hasWindow) {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    }
  }

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const zoomDelta = -event.deltaY * 0.0015;
    const nextScale = clampValue(position.value.scale + zoomDelta, minScale, maxScale);
    const roundedScale = Math.round(nextScale * 100) / 100;

    position.value = {
      ...position.value,
      scale: roundedScale,
    };
    isClickSuppressed.value = true;
    flashScaleFeedback();
    saveStoredSpot(storageKey.value, position.value);

    if (suppressClickTimer) clearTimeout(suppressClickTimer);
    suppressClickTimer = setTimeout(() => {
      isClickSuppressed.value = false;
    }, 150);
  };

  const handleDoubleClick = () => {
    position.value = {
      ...position.value,
      scale: defaultScale,
    };
    flashScaleFeedback();
    saveStoredSpot(storageKey.value, position.value);
    try {
      play$fx("select");
    } catch (error) {
      debug.warn("[useDraggableSpot] sound failed", error);
    }
  };

  const resetPosition = () => {
    clearStoredSpot(storageKey.value);
    position.value = { ...initialPosition };
    try {
      play$fx("closeTask");
    } catch (error) {
      debug.warn("[useDraggableSpot] reset sound failed", error);
    }
  };

  const handleGlobalReset = (event: Event) => {
    const customEvt = event as CustomEvent<{ screen?: string }>;
    const targetScreen = customEvt.detail?.screen;
    const isMatchingScreen = !targetScreen || targetScreen === screen;
    if (isMatchingScreen) {
      resetPosition();
    }
  };

  const hasWindow = typeof window !== "undefined";
  if (hasWindow) {
    window.addEventListener("xp:reset-spots", handleGlobalReset);
  }

  const currentInstance = getCurrentInstance();
  const hasInstance = Boolean(currentInstance);
  if (hasInstance) {
    onUnmounted(() => {
      cleanupWindowListeners();
      if (hasWindow) {
        window.removeEventListener("xp:reset-spots", handleGlobalReset);
      }
    });
  }

  const handleInteraction = (event: Event) => {
    const isPointerType = event.type.startsWith("pointer");
    if (isPointerType) {
      const pEvent = event as PointerEvent;
      const isDown = pEvent.type === "pointerdown";
      if (isDown) {
        handlePointerDown(pEvent);
        return;
      }
      const isMove = pEvent.type === "pointermove";
      if (isMove) {
        handlePointerMove(pEvent);
        return;
      }
      const isEnd = pEvent.type === "pointerup" || pEvent.type === "pointercancel";
      if (isEnd) {
        handlePointerUp(pEvent);
        return;
      }
    }

    const isWheel = event.type === "wheel";
    if (isWheel) {
      handleWheel(event as WheelEvent);
      return;
    }

    const isDblClick = event.type === "dblclick";
    if (isDblClick) {
      handleDoubleClick();
    }
  };

  return {
    position,
    isDragging,
    isScaling,
    handleInteraction,
    resetPosition,
  };
};
