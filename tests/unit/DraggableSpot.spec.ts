import { ref } from "vue";
import {
  useDraggableSpot,
  getSpotStorageKey,
  loadStoredSpot,
  saveStoredSpot,
  clearStoredSpot,
  triggerSpotsReset,
  MIN_SPOT_SCALE,
  MAX_SPOT_SCALE,
  isOrganizeMode,
  enableOrganizeMode,
  disableOrganizeMode,
  snapMode,
  cycleSnapMode,
  snapCoordinate,
} from "@/components/organisms/DraggableSpot/useDraggableSpot";

describe("DraggableSpot", () => {
  const screen = "world-plains";
  const spotId = "wind-temple";
  const userId = "hero-456";
  const storageKey = getSpotStorageKey(screen, spotId, userId);

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    disableOrganizeMode();
    snapMode.value = "drop";
  });

  describe("storage utilities & snap calculations", () => {
    it("generates user-scoped storage key", () => {
      expect(getSpotStorageKey("world-plains", "wind-temple", "abc")).toBe(
        "xp:spot:world-plains:abc:wind-temple"
      );
      expect(getSpotStorageKey("world-plains", "wind-temple")).toBe(
        "xp:spot:world-plains:default:wind-temple"
      );
    });

    it("saves and loads spot positions from localStorage", () => {
      const customPos = { x: 35, y: 55, scale: 1.4 };
      saveStoredSpot(storageKey, customPos);
      const loaded = loadStoredSpot(storageKey);
      expect(loaded).toEqual(customPos);
    });

    it("returns null on missing or invalid data", () => {
      expect(loadStoredSpot("non-existent-spot-key")).toBeNull();
      localStorage.setItem("bad-spot-json", "{ invalid");
      expect(loadStoredSpot("bad-spot-json")).toBeNull();
    });

    it("clears stored spot positions", () => {
      saveStoredSpot(storageKey, { x: 35, y: 55, scale: 1.4 });
      clearStoredSpot(storageKey);
      expect(loadStoredSpot(storageKey)).toBeNull();
    });

    it("snaps coordinates to grid steps", () => {
      expect(snapCoordinate(21.3, 2)).toBe(22);
      expect(snapCoordinate(20.8, 2)).toBe(20);
      expect(snapCoordinate(25.5, 5)).toBe(25);
    });

    it("cycles snap mode between drop, drag, and none", () => {
      snapMode.value = "drop";
      cycleSnapMode();
      expect(snapMode.value).toBe("drag");
      cycleSnapMode();
      expect(snapMode.value).toBe("none");
      cycleSnapMode();
      expect(snapMode.value).toBe("drop");
    });
  });

  describe("useDraggableSpot composable", () => {
    const createMockSpotElement = (parentWidth = 500, parentHeight = 1000): HTMLElement => {
      const parent = document.createElement("div");
      parent.getBoundingClientRect = () => ({
        width: parentWidth,
        height: parentHeight,
        top: 0,
        left: 0,
        right: parentWidth,
        bottom: parentHeight,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      const spotEl = document.createElement("div");
      spotEl.setPointerCapture = jest.fn();
      spotEl.releasePointerCapture = jest.fn();
      parent.appendChild(spotEl);
      return spotEl;
    };

    it("initializes with default positions and scale when storage is empty", () => {
      const userIdRef = ref<string | undefined>(userId);
      const spotRef = ref<HTMLElement | null>(createMockSpotElement());

      const { position, isDragging, isScaling } = useDraggableSpot({
        spotId,
        screen,
        defaultX: 50,
        defaultY: 40,
        defaultScale: 1.0,
        userIdRef,
        spotRef,
      });

      expect(position.value.x).toBe(50);
      expect(position.value.y).toBe(40);
      expect(position.value.scale).toBe(1.0);
      expect(isDragging.value).toBe(false);
      expect(isScaling.value).toBe(false);
    });

    it("loads saved spot state from localStorage on mount", () => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ x: 62, y: 78, scale: 1.35 })
      );

      const userIdRef = ref<string | undefined>(userId);
      const spotRef = ref<HTMLElement | null>(createMockSpotElement());

      const { position } = useDraggableSpot({
        spotId,
        screen,
        defaultX: 50,
        defaultY: 40,
        userIdRef,
        spotRef,
      });

      expect(position.value.x).toBe(62);
      expect(position.value.y).toBe(78);
      expect(position.value.scale).toBe(1.35);
    });

    it("does not drag screen position when in placed mode", () => {
      const userIdRef = ref<string | undefined>(userId);
      const spotEl = createMockSpotElement(500, 1000);
      const spotRef = ref<HTMLElement | null>(spotEl);

      const { position, isDragging, handleInteraction } = useDraggableSpot({
        spotId,
        screen,
        defaultX: 20,
        defaultY: 30,
        userIdRef,
        spotRef,
      });

      expect(isOrganizeMode.value).toBe(false);

      // Pointer down
      handleInteraction({
        type: "pointerdown",
        button: 0,
        pointerId: 1,
        clientX: 100,
        clientY: 200,
      } as unknown as PointerEvent);

      // Pointer move before long press activates
      handleInteraction({
        type: "pointermove",
        pointerId: 1,
        clientX: 180,
        clientY: 350,
      } as unknown as PointerEvent);

      // Position should remain unchanged in placed mode
      expect(isDragging.value).toBe(false);
      expect(position.value.x).toBe(20);
      expect(position.value.y).toBe(30);
    });

    it("activates organize mode on 500ms long press", () => {
      jest.useFakeTimers();
      const userIdRef = ref<string | undefined>(userId);
      const spotEl = createMockSpotElement();
      const spotRef = ref<HTMLElement | null>(spotEl);

      const { handleInteraction } = useDraggableSpot({
        spotId,
        screen,
        defaultX: 20,
        defaultY: 30,
        userIdRef,
        spotRef,
      });

      expect(isOrganizeMode.value).toBe(false);

      handleInteraction({
        type: "pointerdown",
        button: 0,
        pointerId: 1,
        clientX: 100,
        clientY: 200,
      } as unknown as PointerEvent);

      jest.advanceTimersByTime(500);

      expect(isOrganizeMode.value).toBe(true);
      jest.useRealTimers();
    });

    it("drags and snaps on drop in organize mode with drop snap", () => {
      enableOrganizeMode(spotId);
      snapMode.value = "drop";

      const userIdRef = ref<string | undefined>(userId);
      const spotEl = createMockSpotElement(500, 1000);
      const spotRef = ref<HTMLElement | null>(spotEl);

      const { position, isDragging, handleInteraction } = useDraggableSpot({
        spotId,
        screen,
        defaultX: 20,
        defaultY: 30,
        userIdRef,
        spotRef,
      });

      // 1. Pointer Down
      handleInteraction({
        type: "pointerdown",
        button: 0,
        pointerId: 10,
        clientX: 100,
        clientY: 200,
      } as unknown as PointerEvent);

      expect(spotEl.setPointerCapture).toHaveBeenCalledWith(10);

      // 2. Pointer Move: move 55px right (+11% on 500w) and 105px down (+10.5% on 1000h)
      handleInteraction({
        type: "pointermove",
        pointerId: 10,
        clientX: 155,
        clientY: 305,
      } as unknown as PointerEvent);

      expect(isDragging.value).toBe(true);
      expect(position.value.x).toBe(31);
      expect(position.value.y).toBe(40.5);

      // 3. Pointer Up: snaps to step = 2 (31 -> 32, 40.5 -> 40)
      handleInteraction({
        type: "pointerup",
        pointerId: 10,
      } as unknown as PointerEvent);

      expect(spotEl.releasePointerCapture).toHaveBeenCalledWith(10);
      expect(isDragging.value).toBe(false);

      expect(position.value.x).toBe(32);
      expect(position.value.y).toBe(40);

      const saved = loadStoredSpot(storageKey);
      expect(saved?.x).toBe(32);
      expect(saved?.y).toBe(40);
    });

    it("snaps in real-time during live drag snap mode", () => {
      enableOrganizeMode(spotId);
      snapMode.value = "drag";

      const userIdRef = ref<string | undefined>(userId);
      const spotEl = createMockSpotElement(500, 1000);
      const spotRef = ref<HTMLElement | null>(spotEl);

      const { position, handleInteraction } = useDraggableSpot({
        spotId,
        screen,
        defaultX: 20,
        defaultY: 30,
        userIdRef,
        spotRef,
      });

      handleInteraction({
        type: "pointerdown",
        button: 0,
        pointerId: 10,
        clientX: 100,
        clientY: 200,
      } as unknown as PointerEvent);

      // Move 55px right (+11% -> live snapped to nearest 2% = 32%)
      handleInteraction({
        type: "pointermove",
        pointerId: 10,
        clientX: 155,
        clientY: 200,
      } as unknown as PointerEvent);

      expect(position.value.x).toBe(32);
    });

    it("handles wheel zoom scaling and boundary clamping", () => {
      const userIdRef = ref<string | undefined>(userId);
      const spotRef = ref<HTMLElement | null>(createMockSpotElement());

      const { position, isScaling, handleInteraction } = useDraggableSpot({
        spotId,
        screen,
        defaultX: 50,
        defaultY: 50,
        defaultScale: 1.0,
        userIdRef,
        spotRef,
      });

      // Wheel zoom in (-deltaY)
      const wheelIn = {
        type: "wheel",
        deltaY: -100,
        preventDefault: jest.fn(),
      } as unknown as WheelEvent;
      handleInteraction(wheelIn);

      expect(wheelIn.preventDefault).toHaveBeenCalled();
      expect(position.value.scale).toBe(1.15);
      expect(isScaling.value).toBe(true);

      // Wheel zoom out beyond min scale
      const bigZoomOut = {
        type: "wheel",
        deltaY: 2000,
        preventDefault: jest.fn(),
      } as unknown as WheelEvent;
      handleInteraction(bigZoomOut);

      expect(position.value.scale).toBe(MIN_SPOT_SCALE);

      // Wheel zoom in beyond max scale
      const bigZoomIn = {
        type: "wheel",
        deltaY: -3000,
        preventDefault: jest.fn(),
      } as unknown as WheelEvent;
      handleInteraction(bigZoomIn);

      expect(position.value.scale).toBe(MAX_SPOT_SCALE);
    });

    it("resets scale to default on double-click", () => {
      const userIdRef = ref<string | undefined>(userId);
      const spotRef = ref<HTMLElement | null>(createMockSpotElement());

      const { position, handleInteraction } = useDraggableSpot({
        spotId,
        screen,
        defaultX: 50,
        defaultY: 50,
        defaultScale: 1.0,
        userIdRef,
        spotRef,
      });

      position.value.scale = 1.8;

      handleInteraction({
        type: "dblclick",
      } as unknown as MouseEvent);

      expect(position.value.scale).toBe(1.0);
    });

    it("handles touch pinch distance ratio scaling", () => {
      const userIdRef = ref<string | undefined>(userId);
      const spotRef = ref<HTMLElement | null>(createMockSpotElement());

      const { position, handleInteraction } = useDraggableSpot({
        spotId,
        screen,
        defaultX: 50,
        defaultY: 50,
        defaultScale: 1.0,
        userIdRef,
        spotRef,
      });

      // Pointer 1 down at (100, 100)
      handleInteraction({
        type: "pointerdown",
        button: 0,
        pointerId: 1,
        clientX: 100,
        clientY: 100,
      } as unknown as PointerEvent);

      // Pointer 2 down at (200, 100) -> initial distance = 100px
      handleInteraction({
        type: "pointerdown",
        button: 0,
        pointerId: 2,
        clientX: 200,
        clientY: 100,
      } as unknown as PointerEvent);

      // Pointer 2 moves to (250, 100) -> new distance = 150px (ratio = 1.5)
      handleInteraction({
        type: "pointermove",
        pointerId: 2,
        clientX: 250,
        clientY: 100,
      } as unknown as PointerEvent);

      expect(position.value.scale).toBe(1.5);
    });

    it("resets position via resetPosition and global event trigger", () => {
      const userIdRef = ref<string | undefined>(userId);
      const spotRef = ref<HTMLElement | null>(createMockSpotElement());

      const { position, resetPosition } = useDraggableSpot({
        spotId,
        screen,
        defaultX: 25,
        defaultY: 35,
        defaultScale: 1.0,
        userIdRef,
        spotRef,
      });

      position.value = { x: 80, y: 90, scale: 1.8 };
      saveStoredSpot(storageKey, position.value);

      resetPosition();

      expect(position.value.x).toBe(25);
      expect(position.value.y).toBe(35);
      expect(position.value.scale).toBe(1.0);
      expect(loadStoredSpot(storageKey)).toBeNull();

      // Test triggerSpotsReset
      position.value = { x: 75, y: 85, scale: 1.6 };
      triggerSpotsReset(screen);

      expect(position.value.x).toBe(25);
      expect(position.value.y).toBe(35);
      expect(position.value.scale).toBe(1.0);
    });
  });
});
