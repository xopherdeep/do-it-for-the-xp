import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Ref } from "vue";
import { buildTempleMeshData } from "./voxel/templeShapes";
import {
  isLandmarkWebGLSupported,
  registerLandmark,
} from "@/components/organisms/BuildingModel/voxel/sharedLandmarkRenderer";
import type { LandmarkHandle } from "@/components/organisms/BuildingModel/voxel/sharedLandmarkRenderer";

export interface TempleSceneOptions {
  interactive?: boolean;
}

export interface TempleScene {
  dispose: () => void;
  supported: Ref<boolean>;
}

export function useTempleScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  templeId: Ref<string>,
  options: TempleSceneOptions = {}
): TempleScene {
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
      getMeshData: () => buildTempleMeshData(templeId.value),
      interactive: options.interactive ?? true,
      fov: 22,
      elevation: 0.42,
      cameraDistance: 42,
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

  watch(templeId, () => {
    handle?.rebuildMesh(() => buildTempleMeshData(templeId.value));
  });

  return {
    dispose,
    supported,
  };
}
