import { ref } from "vue";
import { play$fx } from "@/assets/fx";
import debug from "@/lib/utils/debug";

export interface SpotPosition {
  x: number;
  y: number;
  scale: number;
}

export type SnapMode = "drop" | "drag" | "none";

export const MIN_SPOT_SCALE = 0.5;
export const MAX_SPOT_SCALE = 2.0;
export const DRAG_THRESHOLD_PX = 6;

export const clampValue = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

export const isOrganizeMode = ref(false);
export const activeOrganizeSpotId = ref<string | null>(null);
export const snapMode = ref<SnapMode>("drop");

const NEXT_SNAP_MODES: Record<SnapMode, SnapMode> = {
  drop: "drag",
  drag: "none",
  none: "drop",
};

export const snapCoordinate = (val: number, step = 2): number =>
  Math.round(val / step) * step;

const handleOutsidePointerDown = (event: PointerEvent): void => {
  const isOrganizing = isOrganizeMode.value;
  if (!isOrganizing) return;
  const target = event.target as HTMLElement | null;
  const isInsideSpot = Boolean(target?.closest?.(".xp-draggable-spot"));
  const isInsideToolbar = Boolean(target?.closest?.(".xp-organize-toolbar"));
  const isOutside = !isInsideSpot && !isInsideToolbar;
  if (isOutside) {
    disableOrganizeMode();
  }
};

export const enableOrganizeMode = (spotId?: string): void => {
  isOrganizeMode.value = true;
  const hasSpotId = Boolean(spotId);
  if (hasSpotId) {
    activeOrganizeSpotId.value = spotId as string;
  }
  const hasWindow = typeof window !== "undefined";
  if (hasWindow) {
    window.addEventListener("pointerdown", handleOutsidePointerDown);
  }
  try {
    play$fx("openTask");
  } catch (error) {
    debug.warn("[spotState] organize sound failed", error);
  }
};

export const disableOrganizeMode = (): void => {
  isOrganizeMode.value = false;
  activeOrganizeSpotId.value = null;
  const hasWindow = typeof window !== "undefined";
  if (hasWindow) {
    window.removeEventListener("pointerdown", handleOutsidePointerDown);
  }
  try {
    play$fx("closeTask");
  } catch (error) {
    debug.warn("[spotState] done sound failed", error);
  }
};

export const toggleOrganizeMode = (spotId?: string): void => {
  const isCurrentlyOrganizing = isOrganizeMode.value;
  if (isCurrentlyOrganizing) {
    disableOrganizeMode();
  } else {
    enableOrganizeMode(spotId);
  }
};

export const cycleSnapMode = (): void => {
  const currentMode = snapMode.value;
  snapMode.value = NEXT_SNAP_MODES[currentMode] ?? "drop";
  try {
    play$fx("select");
  } catch (error) {
    debug.warn("[spotState] cycle snap sound failed", error);
  }
};

export const getSpotStorageKey = (
  screen: string,
  spotId: string,
  userId?: string
): string => `xp:spot:${screen}:${userId || "default"}:${spotId}`;

export const loadStoredSpot = (key: string): SpotPosition | null => {
  try {
    const rawData = localStorage.getItem(key);
    const hasData = Boolean(rawData);
    if (!hasData) return null;
    const parsed = JSON.parse(rawData as string);
    const isValidObject = Boolean(
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.x === "number" &&
      typeof parsed.y === "number"
    );
    if (!isValidObject) return null;
    return {
      x: parsed.x,
      y: parsed.y,
      scale: typeof parsed.scale === "number" ? parsed.scale : 1.0,
    };
  } catch (error) {
    debug.warn("[spotState] Failed to load spot position", error);
    return null;
  }
};

export const saveStoredSpot = (key: string, pos: SpotPosition): void => {
  try {
    localStorage.setItem(key, JSON.stringify(pos));
  } catch (error) {
    debug.warn("[spotState] Failed to save spot position", error);
  }
};

export const clearStoredSpot = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    debug.warn("[spotState] Failed to clear spot position", error);
  }
};

export const triggerSpotsReset = (screen?: string): void => {
  const hasWindow = typeof window !== "undefined";
  if (!hasWindow) return;
  window.dispatchEvent(
    new CustomEvent("xp:reset-spots", { detail: { screen } })
  );
};
