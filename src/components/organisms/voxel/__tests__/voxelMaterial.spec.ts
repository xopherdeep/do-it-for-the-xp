import * as THREE from "three";
import { createVoxelMaterial, type VoxelMaterialOptions } from "../voxelMaterial";

// The material only patches shader text, so it compiles here without WebGL: a stub shader goes in, patched source comes out
const compile = (options?: VoxelMaterialOptions, precision = "highp") => {
  const material = createVoxelMaterial(options);
  const shader = {
    vertexShader: "#include <common>\n#include <begin_vertex>",
    fragmentShader: "#include <common>\n#include <color_fragment>\n#include <aomap_fragment>\n#include <opaque_fragment>",
  } as THREE.WebGLProgramParametersWithUniforms;
  material.onBeforeCompile!(shader, { capabilities: { precision } } as unknown as THREE.WebGLRenderer);
  return shader;
};

describe("voxelMaterial: the bevel", () => {
  it("caps the bevel at a fifth of the quad's shorter side", () => {
    expect(compile().fragmentShader).toContain("width = min(width, vec2(0.200 * min(size.x, size.y)));");
  });

  it("compiles no bevel at all for the simple variant or on low precision", () => {
    expect(compile({ simple: true }).fragmentShader).not.toContain("min(size.x, size.y)");
    expect(compile(undefined, "lowp").fragmentShader).not.toContain("min(size.x, size.y)");
  });
});

describe("voxelMaterial: the flat variant", () => {
  const TINT_HASH = "fract(sin(dot(cell";
  const cacheKey = (options?: VoxelMaterialOptions) => createVoxelMaterial(options).customProgramCacheKey!();

  it("compiles out the per-cell tint and the bevel but keeps the occlusion", () => {
    const { fragmentShader } = compile({ flat: true });
    expect(fragmentShader).not.toContain(TINT_HASH);
    expect(fragmentShader).not.toContain("min(size.x, size.y)");
    expect(fragmentShader).toContain("float aoShade");
  });

  it("keeps the tint in the default and simple variants", () => {
    expect(compile().fragmentShader).toContain(TINT_HASH);
    expect(compile({ simple: true }).fragmentShader).toContain(TINT_HASH);
    expect(compile(undefined, "lowp").fragmentShader).toContain(TINT_HASH);
  });

  it("gives each variant its own program cache key", () => {
    expect(cacheKey()).toBe("voxel");
    expect(cacheKey({ simple: true })).toBe("voxel-simple");
    expect(cacheKey({ flat: true })).toBe("voxel-flat");
  });
});
