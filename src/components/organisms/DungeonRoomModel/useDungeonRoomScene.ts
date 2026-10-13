import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Ref } from "vue";
import { buildDungeonRoomMeshData } from "./voxel/dungeonRoomShapes";
import type { DungeonRoomShapeOptions } from "./voxel/dungeonRoomShapes";
import {
  isLandmarkWebGLSupported,
  registerLandmark,
} from "@/components/organisms/BuildingModel/voxel/sharedLandmarkRenderer";
import type { LandmarkHandle } from "@/components/organisms/BuildingModel/voxel/sharedLandmarkRenderer";

export interface DungeonRoomSceneOptions {
  interactive?: boolean;
  elevation?: number;
  cameraDistance?: number;
  cameraTargetY?: number;
  spinSpeed?: number;
  initialYaw?: number;
}

export interface DungeonRoomScene {
  dispose: () => void;
  supported: Ref<boolean>;
  setYaw: (yaw: number) => void;
}

export function useDungeonRoomScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  roomType: Ref<string>,
  shapeOptions: Ref<DungeonRoomShapeOptions>,
  sceneOptions: DungeonRoomSceneOptions = {}
): DungeonRoomScene {
  const supported = ref(true);
  let handle: LandmarkHandle | null = null;

  const getMesh = () => buildDungeonRoomMeshData(roomType.value, shapeOptions.value);

  const init = (): void => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    if (!isLandmarkWebGLSupported()) {
      supported.value = false;
      return;
    }

    const isFloatingItem = roomType.value === "key" || roomType.value === "save";
    const defaultSpinSpeed = isFloatingItem ? 0.4 : 0;
    const initialSpinSpeed = sceneOptions.spinSpeed !== undefined ? sceneOptions.spinSpeed : defaultSpinSpeed;

    handle = registerLandmark(canvas, {
      getMeshData: getMesh,
      interactive: sceneOptions.interactive ?? true,
      fov: 24,
      elevation: sceneOptions.elevation ?? 0.38,
      cameraDistance: sceneOptions.cameraDistance ?? 42,
      cameraTargetY: sceneOptions.cameraTargetY ?? 4.8,
      spinSpeed: initialSpinSpeed,
      initialYaw: sceneOptions.initialYaw ?? 0.4,
      ambientIntensity: 1.3,
      dirLightIntensity: 1.5,
    });

    if (!handle) {
      supported.value = false;
    }
  };

  const dispose = (): void => {
    handle?.dispose();
    handle = null;
  };

  const setYaw = (yaw: number): void => {
    handle?.setYaw?.(yaw);
  };

  onMounted(() => {
    init();
  });

  onBeforeUnmount(() => {
    dispose();
  });

  watch([roomType, shapeOptions], () => {
    handle?.rebuildMesh(getMesh);
  });

  return {
    dispose,
    supported,
    setYaw,
  };
}
