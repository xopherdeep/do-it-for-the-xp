import * as THREE from "three";
import type { MeshData } from "@/components/organisms/HeroModel/voxel/mesh";
import { isOrganizeMode } from "@/components/organisms/DraggableSpot/spotState";
import { fitCamera, fitPosition, measurePositions } from "@/components/organisms/voxel/fitCamera";
import { createSoftShadowMaterial, createVoxelMaterial, voxelGeometry } from "@/components/organisms/voxel/voxelMaterial";
import type { Bounds, Ring } from "@/components/organisms/voxel/fitCamera";
import {
  landmarkBufferScale,
  landmarkMaterialOptions,
  landmarkRendererOptions,
  noteLandmarkContext,
} from "@/components/organisms/BuildingModel/voxel/landmarkQuality";
import { currentKnobs } from "@/lib/services/graphics/deviceQuality";

export interface LandmarkOptions {
  getMeshData: () => MeshData;
  interactive?: boolean;
  fov?: number;
  elevation?: number;
  /** How far the camera stands at the least: the tuned scale of this viewer. A model that would be cut off there backs away. */
  cameraDistance?: number;
  /** The height the camera looks at until the mesh is measured (the fit centres the model after that) */
  cameraTargetY?: number;
  spinSpeed?: number;
  initialYaw?: number;
  ambientIntensity?: number;
  dirLightIntensity?: number;
}

export interface LandmarkHandle {
  rebuildMesh: (newGetMeshData?: () => MeshData) => void;
  setSpinSpeed?: (speed: number) => void;
  setYaw?: (yaw: number) => void;
  dispose: () => void;
}

interface LandmarkClient {
  id: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  group: THREE.Group;
  mesh: THREE.Mesh | null;
  /** The floor shadow, sized to the model so it never reaches past it */
  shadow: THREE.Mesh | null;
  /** What the mesh measures: null while there is none. The camera is fitted to it (see frameClient). */
  bounds: Bounds | null;
  /** How far the mesh sweeps from the vertical axis at each height when it turns */
  rings: Ring[];
  getMeshData: () => MeshData;
  interactive: boolean;
  fov: number;
  elevation: number;
  cameraDistance: number;
  cameraTargetY: number;
  spinSpeed: number;
  yaw: number;
  dragging: boolean;
  dirty: boolean;
  lastPointerX: number;
  onScreen: boolean;
  t0: number;
  pixelWidth: number;
  pixelHeight: number;
  resizeObserver: ResizeObserver | null;
  intersectionObserver: IntersectionObserver | null;
  cleanupEvents: () => void;
}

let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedCanvas: HTMLCanvasElement | null = null;
let webGlCheckAttempted = false;
let isWebGlAvailable = true;
let isContextLost = false;
const clients = new Map<number, LandmarkClient>();
let nextClientId = 1;
let rafId = 0;
let isLoopRunning = false;
let lastRenderTime = 0;
const getNowSeconds = (): number => performance.now() / 1000;

/** The floor shadow's radius at rest; a smaller model gets a shadow no wider than itself */
const SHADOW_RADIUS = 7.5;
/** The floor shadow sits a hair under the floor, and the camera must see it as well as the model */
const SHADOW_Y = -0.05;

const initSharedRenderer = (): THREE.WebGLRenderer | null => {
  if (webGlCheckAttempted) {
    return isWebGlAvailable ? sharedRenderer : null;
  }

  webGlCheckAttempted = true;
  const hasNoDocument = typeof document === "undefined";
  if (hasNoDocument) {
    isWebGlAvailable = false;
    return null;
  }

  try {
    sharedCanvas = document.createElement("canvas");
    // The tier decides MSAA; Super keeps the old rule (phones at 2x and up are sharp enough without it)
    const { antialias } = landmarkRendererOptions(currentKnobs(), window.devicePixelRatio);
    sharedRenderer = new THREE.WebGLRenderer({
      canvas: sharedCanvas,
      alpha: true,
      antialias,
      powerPreference: "high-performance",
      depth: true,
      stencil: false,
      precision: "mediump",
      preserveDrawingBuffer: true,
    });
    noteLandmarkContext(antialias); // only once the context exists: a throwing constructor must not ask for a restart
    sharedRenderer.setPixelRatio(1);
    sharedRenderer.outputColorSpace = THREE.SRGBColorSpace;
    sharedRenderer.autoClear = true;

    sharedCanvas.addEventListener("webglcontextlost", (event: Event) => {
      event.preventDefault();
      isContextLost = true;
      stopLoop();
    });

    sharedCanvas.addEventListener("webglcontextrestored", () => {
      isContextLost = false;
      clients.forEach((client) => {
        buildClientMesh(client);
        client.dirty = true;
      });
      syncLoop();
    });

    document.addEventListener("visibilitychange", onVisibilityChange);
    isWebGlAvailable = true;
    return sharedRenderer;
  } catch {
    isWebGlAvailable = false;
    sharedRenderer = null;
    return null;
  }
};

export const isLandmarkWebGLSupported = (): boolean => {
  const renderer = initSharedRenderer();
  return Boolean(renderer && isWebGlAvailable);
};

const buildClientMesh = (client: LandmarkClient): void => {
  const oldMesh = client.mesh;
  if (oldMesh) {
    client.group.remove(oldMesh);
    oldMesh.geometry.dispose();
    const oldMaterial = oldMesh.material;
    const isSingleMaterial = oldMaterial instanceof THREE.Material;
    if (isSingleMaterial) {
      oldMaterial.dispose();
    }
    client.mesh = null;
  }

  const data = client.getMeshData();
  const geometry = voxelGeometry(data);
  const material = createVoxelMaterial(landmarkMaterialOptions(currentKnobs()));
  client.mesh = new THREE.Mesh(geometry, material);
  client.mesh.position.y = 0;
  client.group.add(client.mesh);
  measureClient(client, data.positions);
  frameClient(client);
  client.dirty = true;
};

const reachOf = (rings: Ring[]): number => rings.reduce((reach, ring) => Math.max(reach, ring.radius), 0);

/** What the mesh occupies, and a shadow that stays under it: the camera is fitted to this, not to a guess */
const measureClient = (client: LandmarkClient, positions: ArrayLike<number>): void => {
  const measured = measurePositions(positions);
  if (!measured) {
    client.bounds = null;
    client.rings = [];
    return;
  }
  // The widest the model reaches, floor included: a smaller model gets a shadow no wider than itself
  const shadowRadius = Math.min(SHADOW_RADIUS, reachOf(measured.rings));
  client.shadow?.scale.setScalar(shadowRadius > 0 ? shadowRadius / SHADOW_RADIUS : 1);
  // The shadow lies on the floor under the model: the view must hold it too, or its rim is cut off at the bottom
  client.bounds = {
    min: { ...measured.bounds.min, y: Math.min(measured.bounds.min.y, SHADOW_Y) },
    max: measured.bounds.max,
  };
  client.rings = shadowRadius > 0 ? [{ y: SHADOW_Y, radius: shadowRadius }, ...measured.rings] : measured.rings;
};

/**
 * Stand the camera where the whole model fits its canvas with air all round: the model turns (it spins, and a finger
 * drags it round), so the fit holds in every yaw. Keeps the client's lens and elevation; only distance and target change.
 * Fit first, never enlarge: a model that already fits keeps the scale its viewer was tuned to (the town's buildings, a
 * chest and a key keep their sizes next to each other), and is centred; only one that would be cut off backs away.
 * Runs once the mesh is built and again whenever the canvas changes shape.
 */
const frameClient = (client: LandmarkClient): void => {
  const camera = client.camera;
  let distance = client.cameraDistance;
  let target = { x: 0, y: client.cameraTargetY, z: 0 };
  const bounds = client.bounds;
  if (bounds) {
    const fit = fitCamera({
      bounds,
      aspect: camera.aspect,
      fov: client.fov,
      elevation: client.elevation,
      turns: client.rings,
    });
    distance = Math.max(fit.distance, client.cameraDistance);
    target = fit.target;
  }
  const at = fitPosition({ distance, target }, client.elevation);
  camera.fov = client.fov;
  camera.position.set(at.x, at.y, at.z);
  camera.lookAt(target.x, target.y, target.z);
  camera.far = distance + Math.max(reachOf(client.rings), 10) * 2 + 20;
  camera.updateProjectionMatrix();
};

const setupClientScene = (client: LandmarkClient, ambientIntensity = 1.05, dirIntensity = 1.3): void => {
  const scene = new THREE.Scene();
  // Sky from above, warm bounce from the floor: tops read lighter than undersides even where the sun does not reach
  const ambient = new THREE.HemisphereLight(0xeef4ff, 0x8a7460, ambientIntensity * 1.15);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xfff2e0, dirIntensity * 1.15);
  dirLight.position.set(18, 30, 22);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0xb0d8ff, 0.48);
  fillLight.position.set(-18, 12, -18);
  scene.add(fillLight);
  const shadowGeo = new THREE.CircleGeometry(SHADOW_RADIUS, 24);
  const shadowMat = createSoftShadowMaterial(0.6);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = SHADOW_Y;
  scene.add(shadow);

  const group = new THREE.Group();
  scene.add(group);

  client.scene = scene;
  client.group = group;
  client.shadow = shadow;

  buildClientMesh(client);
};

const resizeClient = (client: LandmarkClient): void => {
  const canvas = client.canvas;
  const host = canvas.parentElement ?? canvas;
  const width = Math.max(host.clientWidth, 64);
  const height = Math.max(host.clientHeight, 64);
  const dpr = landmarkBufferScale(currentKnobs(), window.devicePixelRatio);

  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);

  const isCanvasSizeStale = canvas.width !== pixelWidth || canvas.height !== pixelHeight;
  if (isCanvasSizeStale) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  client.pixelWidth = pixelWidth;
  client.pixelHeight = pixelHeight;

  client.camera.aspect = width / height;
  frameClient(client);
  client.dirty = true;
};

const renderClient = (client: LandmarkClient, renderer: THREE.WebGLRenderer): void => {
  const isRenderable = client.onScreen && client.pixelWidth > 0 && client.pixelHeight > 0;
  if (!isRenderable) return;

  const isAutoSpinning = client.spinSpeed !== 0 && !client.dragging;
  if (isAutoSpinning) {
    client.yaw += client.spinSpeed * 0.018;
    client.dirty = true;
  }

  const hasNothingToDraw = !client.dirty && !client.dragging && client.spinSpeed === 0;
  if (hasNothingToDraw) {
    return;
  }

  client.group.rotation.y = client.yaw;
  client.group.position.y = 0;

  const isRendererSizeStale =
    sharedCanvas && (sharedCanvas.width !== client.pixelWidth || sharedCanvas.height !== client.pixelHeight);
  if (isRendererSizeStale) {
    renderer.setSize(client.pixelWidth, client.pixelHeight, false);
  }

  renderer.render(client.scene, client.camera);

  client.ctx.clearRect(0, 0, client.pixelWidth, client.pixelHeight);
  if (sharedCanvas) {
    client.ctx.drawImage(sharedCanvas, 0, 0, client.pixelWidth, client.pixelHeight);
  }

  client.dirty = false;
};

const needsFrames = (client: LandmarkClient): boolean =>
  client.dragging || client.dirty || client.spinSpeed !== 0;

const shouldRunLoop = (): boolean => {
  const cannotRunLoop = isContextLost || document.hidden || clients.size === 0;
  if (cannotRunLoop) return false;
  let anyActive = false;
  clients.forEach((client) => {
    const isActiveOnScreen = client.onScreen && needsFrames(client);
    if (isActiveOnScreen) {
      anyActive = true;
    }
  });
  return anyActive;
};

const renderLoop = (currentTime = performance.now()): void => {
  const isLoopHalted = !isLoopRunning || isContextLost;
  if (isLoopHalted) return;

  let hasDraggingClient = false;
  let hasActiveClient = false;

  clients.forEach((client) => {
    const isOnScreen = client.onScreen;
    if (isOnScreen) {
      if (needsFrames(client)) {
        hasActiveClient = true;
      }
      const isDragging = client.dragging;
      if (isDragging) {
        hasDraggingClient = true;
      }
    }
  });

  if (!hasActiveClient) {
    stopLoop();
    return;
  }

  const minInterval = hasDraggingClient ? 16 : 33;
  const elapsed = currentTime - lastRenderTime;
  const isTooSoon = elapsed < minInterval;
  if (isTooSoon) {
    rafId = requestAnimationFrame(renderLoop);
    return;
  }
  lastRenderTime = currentTime - (elapsed % minInterval);

  const renderer = initSharedRenderer();
  if (!renderer) {
    rafId = requestAnimationFrame(renderLoop);
    return;
  }
  clients.forEach((client) => {
    renderClient(client, renderer);
  });
  if (shouldRunLoop()) {
    rafId = requestAnimationFrame(renderLoop);
  } else {
    stopLoop();
  }
};

const syncLoop = (): void => {
  const wantRunning = shouldRunLoop();
  const shouldStartLoop = wantRunning && !isLoopRunning;
  const shouldStopLoop = !wantRunning && isLoopRunning;
  if (shouldStartLoop) {
    isLoopRunning = true;
    lastRenderTime = performance.now();
    rafId = requestAnimationFrame(renderLoop);
  } else if (shouldStopLoop) {
    stopLoop();
  }
};

const stopLoop = (): void => {
  isLoopRunning = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
};

const onVisibilityChange = (): void => {
  syncLoop();
};

const attachPointerEvents = (client: LandmarkClient): (() => void) => {
  const isInteractive = client.interactive;
  if (!isInteractive) return () => {};

  const onPointerDown = (event: PointerEvent): void => {
    const isOrganizing = isOrganizeMode.value;
    if (isOrganizing) return;
    client.dragging = true;
    client.dirty = true;
    client.lastPointerX = event.clientX;
    (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
    syncLoop();
  };

  const onPointerMove = (event: PointerEvent): void => {
    const isOrganizing = isOrganizeMode.value;
    if (isOrganizing) {
      client.dragging = false;
      return;
    }
    const isNotDragging = !client.dragging;
    if (isNotDragging) return;
    const dx = event.clientX - client.lastPointerX;
    client.lastPointerX = event.clientX;
    client.yaw += dx * 0.018;
    client.dirty = true;
    syncLoop();
  };

  const onPointerUp = (event: PointerEvent): void => {
    const isDraggingActive = client.dragging;
    if (!isDraggingActive) return;
    client.dragging = false;
    client.dirty = true;
    (event.target as HTMLElement)?.releasePointerCapture?.(event.pointerId);
    syncLoop();
  };

  client.canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  return () => {
    client.canvas.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  };
};

export const registerLandmark = (
  canvas: HTMLCanvasElement,
  options: LandmarkOptions
): LandmarkHandle | null => {
  const renderer = initSharedRenderer();
  if (!renderer) return null;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;

  const clientId = nextClientId++;
  const fov = options.fov ?? 24;
  const camera = new THREE.PerspectiveCamera(fov, 1, 1, 120);

  const client: LandmarkClient = {
    id: clientId,
    canvas,
    ctx,
    scene: new THREE.Scene(),
    camera,
    group: new THREE.Group(),
    mesh: null,
    shadow: null,
    bounds: null,
    rings: [],
    getMeshData: options.getMeshData,
    interactive: options.interactive ?? true,
    fov,
    elevation: options.elevation ?? 0.45,
    cameraDistance: options.cameraDistance ?? 40,
    cameraTargetY: options.cameraTargetY ?? 7.5,
    spinSpeed: options.spinSpeed ?? 0,
    yaw: options.initialYaw ?? 0,
    dragging: false,
    dirty: true,
    lastPointerX: 0,
    onScreen: true,
    t0: getNowSeconds(),
    pixelWidth: 0,
    pixelHeight: 0,
    resizeObserver: null,
    intersectionObserver: null,
    cleanupEvents: () => {},
  };

  setupClientScene(client, options.ambientIntensity, options.dirLightIntensity);
  resizeClient(client);

  client.cleanupEvents = attachPointerEvents(client);

  client.resizeObserver = new ResizeObserver(() => {
    resizeClient(client);
    client.dirty = true;
    syncLoop();
  });
  client.resizeObserver.observe(canvas.parentElement ?? canvas);
  client.intersectionObserver = new IntersectionObserver(
    (entries) => {
      const isVisible = entries.some((entry) => entry.isIntersecting);
      client.onScreen = isVisible;
      if (isVisible) {
        client.dirty = true;
      }
      syncLoop();
    },
    { threshold: 0.05 }
  );
  client.intersectionObserver.observe(canvas);
  clients.set(clientId, client);
  syncLoop();

  return {
    rebuildMesh: (newGetMeshData?: () => MeshData): void => {
      if (newGetMeshData) {
        client.getMeshData = newGetMeshData;
      }
      buildClientMesh(client);
      client.dirty = true;
      syncLoop();
    },
    setSpinSpeed: (speed: number): void => {
      client.spinSpeed = speed;
      const isSpinningOnScreen = speed !== 0 && client.onScreen;
      if (isSpinningOnScreen) {
        client.dirty = true;
        syncLoop();
      }
    },
    setYaw: (yaw: number): void => {
      client.yaw = yaw;
      client.dirty = true;
      syncLoop();
    },
    dispose: (): void => {
      client.cleanupEvents();
      client.resizeObserver?.disconnect();
      client.intersectionObserver?.disconnect();
      const mesh = client.mesh;
      if (mesh) {
        client.group.remove(mesh);
        mesh.geometry.dispose();
        const material = mesh.material;
        const isSingleMaterial = material instanceof THREE.Material;
        if (isSingleMaterial) {
          material.dispose();
        }
        client.mesh = null;
      }
      client.scene.clear();
      clients.delete(clientId);
      const hasNoClients = clients.size === 0;
      if (hasNoClients) {
        stopLoop();
      }
    },
  };
};
