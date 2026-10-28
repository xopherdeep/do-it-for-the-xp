import { materialOptionsOf } from "@/components/organisms/HeroModel/voxel/detail";
import type { VoxelMaterialOptions } from "@/components/organisms/voxel/voxelMaterial";
import type { VoxelKnobs } from "@/lib/services/graphics/voxelQuality";

/** MSAA for the one shared landmark context. Super keeps today's rule on the raw ratio; the other tiers never pay for it. */
export const landmarkRendererOptions = (knobs: VoxelKnobs, devicePixelRatio: number): { antialias: boolean } => {
  const followsRule = knobs.antialias === "rule";
  return { antialias: followsRule ? (devicePixelRatio || 1) <= 1.5 : false };
};

/** CSS px to buffer px for a landmark canvas. Super is today's min(dpr, 2). */
export const landmarkBufferScale = (knobs: VoxelKnobs, devicePixelRatio: number): number =>
  Math.min(devicePixelRatio || 1, knobs.landmarkScaleCap);

export const landmarkMaterialOptions = (knobs: VoxelKnobs): VoxelMaterialOptions =>
  materialOptionsOf({ material: knobs.material });

// MSAA is fixed when the context is created, so the page asks what the live context got (null: none made yet).
let contextAntialias: boolean | null = null;

export const noteLandmarkContext = (antialias: boolean): void => {
  contextAntialias = antialias;
};

export const landmarkContextAntialias = (): boolean | null => contextAntialias;
