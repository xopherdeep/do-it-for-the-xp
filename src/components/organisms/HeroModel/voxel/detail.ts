import type { VoxelMaterialOptions } from "@/components/organisms/voxel/voxelMaterial";
import type { VoxelKnobs } from "@/lib/services/graphics/voxelQuality";

/**
 * What a caller may ask of buildHero beyond the look. Today only the shading; the older art extends this same value
 * later. The default is today's hero, so a caller that passes nothing changes nothing.
 */
export interface HeroDetail {
  material: VoxelKnobs["material"];
}

export const DEFAULT_DETAIL: HeroDetail = { material: "full" };

const MATERIAL_OPTIONS: Record<HeroDetail["material"], VoxelMaterialOptions> = {
  full: {},
  simple: { simple: true },
  flat: { flat: true },
};

export const materialOptionsOf = (detail: HeroDetail): VoxelMaterialOptions => MATERIAL_OPTIONS[detail.material];

export const detailOf = (knobs: VoxelKnobs): HeroDetail => ({ material: knobs.material });
