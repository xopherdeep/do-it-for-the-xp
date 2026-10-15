import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Ref } from "vue";
import { buildStageMeshData } from "./voxel/stageShapes";
import {
  isLandmarkWebGLSupported,
  registerLandmark,
} from "@/components/organisms/BuildingModel/voxel/sharedLandmarkRenderer";
import type { LandmarkHandle } from "@/components/organisms/BuildingModel/voxel/sharedLandmarkRenderer";

export interface StageSceneOptions {
  interactive?: boolean;
}

export interface StageScene {
  dispose: () => void;
  supported: Ref<boolean>;
}

export function useStageScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  stageId: Ref<string>,
  options: StageSceneOptions = {}
): StageScene {
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
      getMeshData: () => buildStageMeshData(stageId.value),
      interactive: options.interactive ?? true,
      fov: 24,
      elevation: 0.45,
      cameraDistance: 40,
      cameraTargetY: 7.5,
      spinSpeed: 0,
      ambientIntensity: 1.1,
      dirLightIntensity: 1.35,
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

  watch(stageId, () => {
    handle?.rebuildMesh(() => buildStageMeshData(stageId.value));
  });

  return {
    dispose,
    supported,
  };
}
