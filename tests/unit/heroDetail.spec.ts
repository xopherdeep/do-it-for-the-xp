import * as THREE from "three";
import { buildHero } from "@/components/organisms/HeroModel/voxel/build";
import { DEFAULT_DETAIL, detailOf, materialOptionsOf } from "@/components/organisms/HeroModel/voxel/detail";
import { DEFAULT_LOOK } from "@/lib/hero-look/types";
import { VOXEL_TIERS, knobsFor } from "@/lib/services/graphics/voxelQuality";

/** buildHero's shading variant: the default stays today's material, and the variants share every group and vertex. */

const materialOf = (hero: THREE.Group): THREE.Material => {
  const mesh = hero.getObjectByName("torsoMesh") as THREE.Mesh;
  return mesh.material as THREE.Material;
};

const shapeOf = (hero: THREE.Group): Record<string, number> => {
  const shape: Record<string, number> = {};
  hero.traverse((node) => {
    const geometry = (node as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    const isMeshNode = !!geometry && !!geometry.attributes.position;
    shape[`${node.type}:${node.name}`] = isMeshNode ? geometry.attributes.position.count : 0;
  });
  return shape;
};

describe("buildHero detail", () => {
  it("keeps today's material when no detail is passed", () => {
    expect(materialOf(buildHero(DEFAULT_LOOK)).customProgramCacheKey()).toBe("voxel");
    expect(DEFAULT_DETAIL).toEqual({ material: "full" });
  });

  it("builds the simple and flat variants", () => {
    expect(materialOf(buildHero(DEFAULT_LOOK, { material: "full" })).customProgramCacheKey()).toBe("voxel");
    expect(materialOf(buildHero(DEFAULT_LOOK, { material: "simple" })).customProgramCacheKey()).toBe("voxel-simple");
    expect(materialOf(buildHero(DEFAULT_LOOK, { material: "flat" })).customProgramCacheKey()).toBe("voxel-flat");
  });

  it("maps material names to material options", () => {
    expect(materialOptionsOf({ material: "full" })).toEqual({});
    expect(materialOptionsOf({ material: "simple" })).toEqual({ simple: true });
    expect(materialOptionsOf({ material: "flat" })).toEqual({ flat: true });
  });

  it("reads the material from each tier's knobs", () => {
    expect(VOXEL_TIERS.map((tier) => detailOf(knobsFor(tier)).material)).toEqual(["full", "simple", "flat"]);
  });

  it("keeps group names and vertex counts equal between variants", () => {
    const base = shapeOf(buildHero(DEFAULT_LOOK));
    expect(shapeOf(buildHero(DEFAULT_LOOK, { material: "simple" }))).toEqual(base);
    expect(shapeOf(buildHero(DEFAULT_LOOK, { material: "flat" }))).toEqual(base);
  });
});
