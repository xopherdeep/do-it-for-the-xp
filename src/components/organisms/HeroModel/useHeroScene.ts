import * as THREE from "three";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Ref } from "vue";
import type { HeroAnimation, HeroLook } from "@/lib/hero-look/types";
import { animateHero } from "./voxel/animate";
import { buildHero, disposeHero } from "./voxel/build";
import { DEFAULT_YAW, FOV, addHeroLights, framingOf, placeCamera, renderHeroSnapshot, stageFrame, stepFrame } from "./heroCamera";
import type { Frame, SnapshotFraming } from "./heroCamera";
import debug from "@/lib/utils/debug";

export type { SnapshotFraming } from "./heroCamera";

export interface HeroSceneOptions {
  /** Drag or touch to turn the hero, with a little inertia */
  interactive?: boolean;
  background?: "transparent";
  /** What the camera frames: the whole hero or a head close-up. A change eases over; it starts on this value. */
  focus?: Ref<SnapshotFraming>;
}

export interface HeroScene {
  /** Render one frame at size x size with a transparent background into a PNG data URL ("" when WebGL is missing) */
  snapshot: (size?: number, framing?: SnapshotFraming) => string;
  /** Spin the hero with a kick that coasts to a stop (radians per second; the default is about one turn) */
  flick: (velocity?: number) => void;
  dispose: () => void;
  /** False when WebGL could not start; the canvas stays blank */
  supported: Ref<boolean>;
}

/** How long the camera takes to move between the whole body and the close-up */
const FOCUS_EASE_SECONDS = 0.3;

export function useHeroScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  look: Ref<HeroLook>,
  animation: Ref<HeroAnimation>,
  options: HeroSceneOptions = {},
): HeroScene {
  const supported = ref(true);
  const interactive = options.interactive ?? false;

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let hero: THREE.Group | null = null;
  /** What the hero on stage was built from (see lookKey); a look that comes out the same builds nothing */
  let builtKey: string | null = null;
  let frame: Frame = { centerY: 8, height: 20 };
  /** The focus the camera is framed on or easing toward; null until the first frame */
  let aimedFocus: SnapshotFraming | null = null;
  /** The animation whose reach the frame was cut for: a victory hop needs more room than standing still */
  let aimedAnimation: HeroAnimation | null = null;
  // The focus tween: the camera eases from tweenFrom to tweenTo, started at tweenStart (null when settled)
  let tweenFrom: Frame | null = null;
  let tweenTo: Frame | null = null;
  let tweenStart = 0;

  let yaw = DEFAULT_YAW;
  let spin = 0; // radians per second left over from a flick
  let dragging = false;
  let lastPointerX = 0;
  let lastPointerTime = 0;

  let raf = 0;
  let running = false;
  let onScreen = true;
  let t0 = 0;
  let lastFrame = 0;
  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;
  let disposed = false;

  const now = (): number => performance.now() / 1000;

  const resize = (): void => {
    const canvas = canvasRef.value;
    const stageRenderer = renderer;
    const stageCamera = camera;
    const isStageMissing = !canvas || !stageRenderer || !stageCamera;
    if (isStageMissing) return;
    const host = canvas.parentElement ?? canvas;
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    stageRenderer.setSize(width, height, false);
    placeCamera(stageCamera, frame, width / height);
  };

  /** What a hero is built from: the look's content, whatever object it arrives in and in whatever key order */
  const lookKey = (value: HeroLook): string => JSON.stringify(value, Object.keys(value).sort());

  /**
   * Point the camera at the hero for the current focus and animation: the frame is cut to what the hero fills while that
   * animation plays, so a raised arm or a hop is not clipped. When the focus or the animation's frame changed, or an ease
   * is already under way (the rebuilt hero may stand a little taller), it eases from wherever the camera is now; the first
   * frame, and a stage that is not ticking (off screen), land at once. Places the camera when it lands but draws nothing.
   */
  const aimCamera = (): void => {
    if (!hero) return;
    if (!camera) return;
    const focus = options.focus?.value ?? "full";
    const framing = framingOf(animation.value);
    const target = stageFrame(hero, focus, framing);
    const hadFrame = aimedFocus !== null;
    const isMoving = tweenTo !== null;
    const hasNewAim = focus !== aimedFocus || framing !== aimedAnimation;
    aimedFocus = focus;
    aimedAnimation = framing;
    const shouldEase = running && hadFrame && (hasNewAim || isMoving);
    if (shouldEase) {
      tweenFrom = frame; // from wherever the camera is now, so a change mid-move turns smoothly
      tweenTo = target;
      tweenStart = now();
      return;
    }
    tweenFrom = tweenTo = null;
    frame = target;
    resize();
  };

  const rebuild = (): void => {
    if (!scene) return;
    // The look prop is replaced by equal copies (a tab switch re-derives it): the same hero is not worth a rebuild,
    // which would also snap the camera and restart the pose
    const key = lookKey(look.value);
    const isSameHero = !!hero && key === builtKey;
    if (isSameHero) return;
    const isFirstHero = !hero;
    if (hero) {
      scene.remove(hero);
      disposeHero(hero);
    }
    hero = buildHero(look.value);
    builtKey = key;
    hero.rotation.y = yaw;
    scene.add(hero);
    aimCamera();
    // A new hero carries on from the pose's clock, so a hop in the air goes on smoothly; only the first one starts it
    if (isFirstHero) t0 = now();
    render();
  };

  /** Move the camera along the focus tween; the last step lands exactly on the target frame */
  const stepCamera = (): void => {
    const from = tweenFrom;
    const to = tweenTo;
    const stageCamera = camera;
    const isNotEasing = !from || !to || !stageCamera;
    if (isNotEasing) return;
    const step = stepFrame(from, to, tweenStart, now(), FOCUS_EASE_SECONDS);
    frame = step.frame;
    placeCamera(stageCamera, frame, stageCamera.aspect);
    const isLanded = step.done;
    if (isLanded) tweenFrom = tweenTo = null;
  };

  const render = (): void => {
    const stageRenderer = renderer;
    const stageScene = scene;
    const stageCamera = camera;
    const stageHero = hero;
    const isStageMissing = !stageRenderer || !stageScene || !stageCamera || !stageHero;
    if (isStageMissing) return;
    animateHero(stageHero, animation.value, now() - t0);
    stageHero.rotation.y = yaw;
    stageRenderer.render(stageScene, stageCamera);
  };

  const tick = (): void => {
    raf = 0;
    const isStopped = !running || disposed;
    if (isStopped) return;
    const time = now();
    const dt = Math.min(0.1, time - lastFrame);
    lastFrame = time;
    const isCoasting = !dragging && Math.abs(spin) > 0.01;
    if (isCoasting) {
      yaw += spin * dt;
      spin *= Math.pow(0.04, dt); // friction
    }
    stepCamera();
    render();
    raf = requestAnimationFrame(tick);
  };

  const shouldRun = (): boolean => !disposed && onScreen && !document.hidden && !!renderer;
  const sync = (): void => {
    const want = shouldRun();
    const shouldStart = want && !running;
    const shouldStop = !want && running;
    if (shouldStart) {
      running = true;
      lastFrame = now();
      raf = requestAnimationFrame(tick);
    } else if (shouldStop) {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const onPointerDown = (event: PointerEvent): void => {
    dragging = true;
    spin = 0;
    lastPointerX = event.clientX;
    lastPointerTime = now();
    try {
      (event.target as Element).setPointerCapture?.(event.pointerId);
    } catch (error) {
      // capture is a nicety: dragging still works without it
      debug.warn("[useHeroScene] pointer capture failed", error);
    }
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging) return;
    const time = now();
    const dx = event.clientX - lastPointerX;
    const dt = Math.max(0.001, time - lastPointerTime);
    yaw += dx * 0.012;
    spin = Math.max(-9, Math.min(9, (dx * 0.012) / dt));
    lastPointerX = event.clientX;
    lastPointerTime = time;
  };
  const onPointerUp = (): void => {
    dragging = false;
    // a pause before letting go means no flick
    const isHeldStill = now() - lastPointerTime > 0.1;
    if (isHeldStill) spin = 0;
  };
  const onVisibility = (): void => sync();

  const init = (): void => {
    const canvas = canvasRef.value;
    const cannotInit = !canvas || renderer !== null || disposed;
    if (cannotInit) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: dpr <= 1.5,
        powerPreference: "low-power",
      });
    } catch {
      supported.value = false;
      return;
    }
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;

    scene = new THREE.Scene();
    addHeroLights(scene);
    camera = new THREE.PerspectiveCamera(FOV, 1, 1, 400);

    if (interactive) {
      canvas.style.touchAction = "pan-y";
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
    }
    document.addEventListener("visibilitychange", onVisibility);

    const hasResizeObserver = typeof ResizeObserver !== "undefined";
    if (hasResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        resize();
        render();
      });
      resizeObserver.observe(canvas.parentElement ?? canvas);
    }
    const hasIntersectionObserver = typeof IntersectionObserver !== "undefined";
    if (hasIntersectionObserver) {
      intersectionObserver = new IntersectionObserver((entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
        sync();
      });
      intersectionObserver.observe(canvas);
    }

    rebuild();
    sync();
  };

  const snapshot = (size = 256, framing: SnapshotFraming = "bust"): string => {
    const stageRenderer = renderer;
    const stageHero = hero;
    const stageScene = scene;
    const isStageMissing = !stageRenderer || !stageHero || !stageScene;
    if (isStageMissing) return "";
    return renderHeroSnapshot(stageRenderer, stageScene, stageHero, size, framing);
  };

  // 20 rad/s with the 0.04^dt friction in tick coasts 20 / -ln(0.04) = about 6.2 rad: one turn
  const flick = (velocity = 20): void => {
    spin = velocity;
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    const canvas = canvasRef.value;
    const hasPointerListeners = !!canvas && interactive;
    if (hasPointerListeners) {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    }
    if (hero) {
      scene?.remove(hero);
      disposeHero(hero);
      hero = null;
    }
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer = null;
    scene = null;
    camera = null;
  };

  watch(look, rebuild, { deep: true });
  watch(animation, () => {
    t0 = now();
    // A pose that reaches higher or wider than the last one (a victory hop, a hurt lean) asks for another frame
    const isNewFraming = !!hero && !!camera && framingOf(animation.value) !== aimedAnimation;
    if (isNewFraming) aimCamera();
    if (!running) render();
  });
  const focusRef = options.focus;
  if (focusRef) {
    watch(focusRef, (focus) => {
      const isUnframed = !hero || !camera;
      if (isUnframed) return; // the first rebuild frames the current focus
      const isAlreadyAimed = focus === aimedFocus;
      if (isAlreadyAimed) return; // a rebuild in the same tick already aimed at it
      aimCamera();
      if (!running) render(); // nothing ticks while off screen
    });
  }
  onMounted(init);
  onBeforeUnmount(dispose);

  return { snapshot, flick, dispose, supported };
}
