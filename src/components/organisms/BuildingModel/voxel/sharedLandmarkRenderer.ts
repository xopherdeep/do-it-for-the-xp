import * as THREE from "three";
import type { MeshData } from "@/components/organisms/HeroModel/voxel/mesh";

export interface LandmarkOptions {
  getMeshData: () => MeshData;
  interactive?: boolean;
  fov?: number;
  elevation?: number;
  cameraDistance?: number;
  cameraTargetY?: number;
  spinSpeed?: number;
  initialYaw?: number;
  ambientIntensity?: number;
  dirLightIntensity?: number;
}

export interface LandmarkHandle {
  rebuildMesh: (newGetMeshData?: () => MeshData) => void;
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
  getMeshData: () => MeshData;
  interactive: boolean;
  fov: number;
  elevation: number;
  cameraDistance: number;
  cameraTargetY: number;
  spinSpeed: number;
  yaw: number;
  dragging: boolean;
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

const initSharedRenderer = (): THREE.WebGLRenderer | null => {
  if (webGlCheckAttempted) {
    return isWebGlAvailable ? sharedRenderer : null;
  }

  webGlCheckAttempted = true;
  if (typeof document === "undefined") {
    isWebGlAvailable = false;
    return null;
  }

  try {
    sharedCanvas = document.createElement("canvas");
    sharedRenderer = new THREE.WebGLRenderer({
      canvas: sharedCanvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      depth: true,
      stencil: false,
      precision: "mediump",
      preserveDrawingBuffer: true,
    });
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
  if (client.mesh) {
    client.group.remove(client.mesh);
    client.mesh.geometry.dispose();
    if (client.mesh.material instanceof THREE.Material) {
      client.mesh.material.dispose();
    }
    client.mesh = null;
  }

  const data = client.getMeshData();
  const colors = new Float32Array(data.colors.length);
  const color = new THREE.Color();
  for (let i = 0; i < data.colors.length; i += 12) {
    color.setRGB(data.colors[i], data.colors[i + 1], data.colors[i + 2], THREE.SRGBColorSpace);
    for (let k = 0; k < 4; k++) {
      colors[i + k * 3] = color.r;
      colors[i + k * 3 + 1] = color.g;
      colors[i + k * 3 + 2] = color.b;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(data.normals, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  geometry.computeBoundingBox();

  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  client.mesh = new THREE.Mesh(geometry, material);
  client.mesh.position.y = 0;
  client.group.add(client.mesh);
};

const setupClientScene = (client: LandmarkClient, ambientIntensity = 1.05, dirIntensity = 1.3): void => {
  const scene = new THREE.Scene();

  const ambient = new THREE.AmbientLight(0xffffff, ambientIntensity);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, dirIntensity);
  dirLight.position.set(18, 30, 22);
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xb0d8ff, 0.48);
  fillLight.position.set(-18, 12, -18);
  scene.add(fillLight);

  const shadowGeo = new THREE.CircleGeometry(7.5, 16);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.22,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.05;
  scene.add(shadow);

  const group = new THREE.Group();
  scene.add(group);

  client.scene = scene;
  client.group = group;

  buildClientMesh(client);
};

const resizeClient = (client: LandmarkClient): void => {
  const canvas = client.canvas;
  const host = canvas.parentElement ?? canvas;
  const width = Math.max(host.clientWidth, 64);
  const height = Math.max(host.clientHeight, 64);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  client.pixelWidth = pixelWidth;
  client.pixelHeight = pixelHeight;

  client.camera.fov = client.fov;
  client.camera.aspect = width / height;
  const dist = client.cameraDistance;
  client.camera.position.set(
    0,
    client.cameraTargetY + 1 + Math.sin(client.elevation) * dist,
    Math.cos(client.elevation) * dist
  );
  client.camera.lookAt(0, client.cameraTargetY, 0);
  client.camera.updateProjectionMatrix();
};

const renderClient = (client: LandmarkClient, renderer: THREE.WebGLRenderer, nowSec: number): void => {
  const isRenderable = client.onScreen && client.pixelWidth > 0 && client.pixelHeight > 0;
  if (!isRenderable) return;

  const t = nowSec - client.t0;

  if (!client.dragging) {
    client.yaw += client.spinSpeed * 0.018;
  }
  client.group.rotation.y = client.yaw;
  client.group.position.y = Math.sin(t * 1.5) * 0.35;

  if (sharedCanvas && (sharedCanvas.width !== client.pixelWidth || sharedCanvas.height !== client.pixelHeight)) {
    renderer.setSize(client.pixelWidth, client.pixelHeight, false);
  }

  renderer.render(client.scene, client.camera);

  client.ctx.clearRect(0, 0, client.pixelWidth, client.pixelHeight);
  if (sharedCanvas) {
    client.ctx.drawImage(sharedCanvas, 0, 0, client.pixelWidth, client.pixelHeight);
  }
};

const renderLoop = (currentTime = performance.now()): void => {
  if (!isLoopRunning || isContextLost) return;
  rafId = requestAnimationFrame(renderLoop);

  let hasDraggingClient = false;
  let hasVisibleClient = false;

  clients.forEach((client) => {
    if (client.onScreen) {
      hasVisibleClient = true;
      if (client.dragging) {
        hasDraggingClient = true;
      }
    }
  });

  if (!hasVisibleClient) {
    stopLoop();
    return;
  }

  const minInterval = hasDraggingClient ? 16 : 33;
  const elapsed = currentTime - lastRenderTime;
  if (elapsed < minInterval) return;
  lastRenderTime = currentTime - (elapsed % minInterval);

  const renderer = initSharedRenderer();
  if (!renderer) return;

  const nowSec = getNowSeconds();
  clients.forEach((client) => {
    renderClient(client, renderer, nowSec);
  });
};

const shouldRunLoop = (): boolean => {
  if (isContextLost || document.hidden || clients.size === 0) return false;
  let anyVisible = false;
  clients.forEach((client) => {
    if (client.onScreen) anyVisible = true;
  });
  return anyVisible;
};

const syncLoop = (): void => {
  const wantRunning = shouldRunLoop();
  if (wantRunning && !isLoopRunning) {
    isLoopRunning = true;
    lastRenderTime = performance.now();
    rafId = requestAnimationFrame(renderLoop);
  } else if (!wantRunning && isLoopRunning) {
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
  if (!client.interactive) return () => {};

  const onPointerDown = (event: PointerEvent): void => {
    client.dragging = true;
    client.lastPointerX = event.clientX;
    (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
    syncLoop();
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!client.dragging) return;
    const dx = event.clientX - client.lastPointerX;
    client.lastPointerX = event.clientX;
    client.yaw += dx * 0.018;
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!client.dragging) return;
    client.dragging = false;
    (event.target as HTMLElement)?.releasePointerCapture?.(event.pointerId);
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
    getMeshData: options.getMeshData,
    interactive: options.interactive ?? true,
    fov,
    elevation: options.elevation ?? 0.45,
    cameraDistance: options.cameraDistance ?? 40,
    cameraTargetY: options.cameraTargetY ?? 7.5,
    spinSpeed: options.spinSpeed ?? 0,
    yaw: options.initialYaw ?? 0,
    dragging: false,
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
    syncLoop();
  });
  client.resizeObserver.observe(canvas.parentElement ?? canvas);

  client.intersectionObserver = new IntersectionObserver(
    (entries) => {
      const isVisible = entries.some((entry) => entry.isIntersecting);
      client.onScreen = isVisible;
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
      syncLoop();
    },
    dispose: (): void => {
      client.cleanupEvents();
      client.resizeObserver?.disconnect();
      client.intersectionObserver?.disconnect();

      if (client.mesh) {
        client.group.remove(client.mesh);
        client.mesh.geometry.dispose();
        if (client.mesh.material instanceof THREE.Material) {
          client.mesh.material.dispose();
        }
        client.mesh = null;
      }

      client.scene.clear();
      clients.delete(clientId);

      if (clients.size === 0) {
        stopLoop();
      }
    },
  };
};
