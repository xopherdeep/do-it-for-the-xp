import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Ref } from "vue";
import { buildBuildingMeshData } from "./voxel/buildingShapes";
import {
  isLandmarkWebGLSupported,
  registerLandmark,
} from "./voxel/sharedLandmarkRenderer";
import type { LandmarkHandle } from "./voxel/sharedLandmarkRenderer";

export interface BuildingSceneOptions {
  interactive?: boolean;
}

export interface BuildingScene {
  dispose: () => void;
  supported: Ref<boolean>;
}

export function useBuildingScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  buildingId: Ref<string>,
  options: BuildingSceneOptions = {}
): BuildingScene {
  const supported = ref(true);
  let handle: LandmarkHandle | null = null;

  const init = (): void => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    if (!isLandmarkWebGLSupported()) {
      supported.value = false;
      return;
    }

    handle = registerLandmark(canvas, {
      getMeshData: () => buildBuildingMeshData(buildingId.value),
      interactive: options.interactive ?? true,
      fov: 24,
      elevation: 0.45,
      cameraDistance: 40,
      cameraTargetY: 7.5,
      spinSpeed: 0,
    });

    if (!handle) {
      supported.value = false;
    }
  };

  const dispose = (): void => {
    handle?.dispose();
    handle = null;
  };

  onMounted(() => {
    init();
  });

  onBeforeUnmount(() => {
    dispose();
  });

  watch(buildingId, () => {
    handle?.rebuildMesh(() => buildBuildingMeshData(buildingId.value));
  });

  return {
    dispose,
    supported,
  };
}
