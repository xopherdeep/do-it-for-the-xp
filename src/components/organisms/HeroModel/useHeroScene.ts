import * as THREE from "three";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Ref } from "vue";
import type { HeroAnimation, HeroLook } from "@/lib/hero-look/types";
import { animateHero } from "./voxel/animate";
import { buildHero, disposeHero } from "./voxel/build";

export interface HeroSceneOptions {
  /** Drag or touch to turn the hero, with a little inertia */
  interactive?: boolean;
  background?: "transparent";
}

export type SnapshotFraming = "bust" | "full";

export interface HeroScene {
  /** Render one frame at size x size with a transparent background into a PNG data URL ("" when WebGL is missing) */
  snapshot: (size?: number, framing?: SnapshotFraming) => string;
  dispose: () => void;
  /** False when WebGL could not start; the canvas stays blank */
  supported: Ref<boolean>;
}

/** The hero stands at a 3/4 turn; the camera is a narrow lens far away so it reads almost orthographic */
const DEFAULT_YAW = 0.5;
const FOV = 18;
const ELEVATION = 0.2;
/** Widest the hero gets with arms out and a sword, plus air */
const FRAME_WIDTH = 15;

interface Frame {
  centerY: number;
  height: number;
}

const placeCamera = (camera: THREE.PerspectiveCamera, frame: Frame, aspect: number): void => {
  const halfH = Math.max(frame.height / 2, FRAME_WIDTH / 2 / Math.max(aspect, 0.01));
  const distance = halfH / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  camera.aspect = aspect;
  camera.fov = FOV;
  camera.position.set(0, frame.centerY + Math.sin(ELEVATION) * distance, Math.cos(ELEVATION) * distance);
  camera.lookAt(0, frame.centerY, 0);
  camera.near = 1;
  camera.far = distance * 2 + 40;
  camera.updateProjectionMatrix();
};

/** Whole body: from the floor shadow to a little above the tallest hat, never tighter than a bare head */
const fullFrame = (hero: THREE.Object3D): Frame => {
  const box = new THREE.Box3().setFromObject(hero);
  const top = Math.max(box.max.y + 0.8, 17.4);
  const bottom = -1.2;
  return { centerY: (top + bottom) / 2, height: top - bottom };
};

/** Head and shoulders: what an avatar circle wants */
const bustFrame = (hero: THREE.Object3D): Frame => {
  const head = hero.getObjectByName("head");
  const headTop = head ? new THREE.Box3().setFromObject(head).max.y : 15;
  const top = Math.min(Math.max(headTop + 0.7, 16.6), 20.5);
  const bottom = 3.6;
  return { centerY: (top + bottom) / 2, height: top - bottom };
};

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
  let frame: Frame = { centerY: 8, height: 20 };

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
    if (!canvas || !renderer || !camera) return;
    const host = canvas.parentElement ?? canvas;
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    placeCamera(camera, frame, width / height);
  };

  const rebuild = (): void => {
    if (!scene) return;
    if (hero) {
      scene.remove(hero);
      disposeHero(hero);
    }
    hero = buildHero(look.value);
    hero.rotation.y = yaw;
    scene.add(hero);
    frame = fullFrame(hero);
    resize();
    t0 = now();
    render();
  };

  const render = (): void => {
    if (!renderer || !scene || !camera || !hero) return;
    animateHero(hero, animation.value, now() - t0);
    hero.rotation.y = yaw;
    renderer.render(scene, camera);
  };

  const tick = (): void => {
    raf = 0;
    if (!running || disposed) return;
    const time = now();
    const dt = Math.min(0.1, time - lastFrame);
    lastFrame = time;
    if (!dragging && Math.abs(spin) > 0.01) {
      yaw += spin * dt;
      spin *= Math.pow(0.04, dt); // friction
    }
    render();
    raf = requestAnimationFrame(tick);
  };

  const shouldRun = (): boolean => !disposed && onScreen && !document.hidden && !!renderer;
  const sync = (): void => {
    const want = shouldRun();
    if (want && !running) {
      running = true;
      lastFrame = now();
      raf = requestAnimationFrame(tick);
    } else if (!want && running) {
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
    } catch {
      /* capture is a nicety */
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
    if (now() - lastPointerTime > 0.1) spin = 0;
  };
  const onVisibility = (): void => sync();

  const init = (): void => {
    const canvas = canvasRef.value;
    if (!canvas || renderer || disposed) return;
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
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(6, 12, 10);
    scene.add(sun);
    camera = new THREE.PerspectiveCamera(FOV, 1, 1, 400);

    if (interactive) {
      canvas.style.touchAction = "pan-y";
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
    }
    document.addEventListener("visibilitychange", onVisibility);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        resize();
        render();
      });
      resizeObserver.observe(canvas.parentElement ?? canvas);
    }
    if (typeof IntersectionObserver !== "undefined") {
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
    if (!renderer || !hero || !scene) return "";
    const target = new THREE.WebGLRenderTarget(size, size, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    const shotCamera = new THREE.PerspectiveCamera(FOV, 1, 1, 400);
    placeCamera(shotCamera, framing === "full" ? fullFrame(hero) : bustFrame(hero), 1);

    // A canonical pose: rest, turned a little, whatever the live animation is doing
    const previousYaw = hero.rotation.y;
    animateHero(hero, "idle", 0);
    hero.rotation.y = DEFAULT_YAW - 0.1;

    const previousTarget = renderer.getRenderTarget();
    const pixels = new Uint8Array(size * size * 4);
    try {
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, shotCamera);
      renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
    } finally {
      renderer.setRenderTarget(previousTarget);
      target.dispose();
      hero.rotation.y = previousYaw;
    }

    // Rows come out bottom-up and anti-aliased edges are premultiplied: flip and un-premultiply
    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const ctx = out.getContext("2d");
    if (!ctx) return "";
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const src = (size - 1 - y) * size * 4;
      const dst = y * size * 4;
      for (let x = 0; x < size; x++) {
        const a = pixels[src + x * 4 + 3];
        const k = a > 0 ? 255 / a : 0;
        image.data[dst + x * 4] = Math.min(255, pixels[src + x * 4] * k);
        image.data[dst + x * 4 + 1] = Math.min(255, pixels[src + x * 4 + 1] * k);
        image.data[dst + x * 4 + 2] = Math.min(255, pixels[src + x * 4 + 2] * k);
        image.data[dst + x * 4 + 3] = a;
      }
    }
    ctx.putImageData(image, 0, 0);
    return out.toDataURL("image/png");
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
    if (canvas && interactive) {
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
    if (!running) render();
  });
  onMounted(init);
  onBeforeUnmount(dispose);

  return { snapshot, dispose, supported };
}
