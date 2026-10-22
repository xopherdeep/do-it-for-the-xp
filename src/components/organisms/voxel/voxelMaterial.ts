import * as THREE from "three";
import type { MeshData } from "@/components/organisms/HeroModel/voxel/mesh";

/**
 * How every voxel model is drawn (heroes, buildings, furniture, items, monsters): one Lambert material with a few
 * lines of shader patched in, so three's lights, fog and colour handling all still apply.
 *
 * - Baked ambient occlusion (mesh.ts) darkens the light from the sky in creases and under overhangs, and the sun a
 *   little, so contacts read without real shadows.
 * - Convex edges get a thin bevel highlight, a pixel or two wide whatever the zoom: the blocks read as blocks, like a
 *   painted SNES sprite, instead of flat cut-outs.
 * - Each unit cell is tinted a touch lighter or darker, warmer or cooler, so big faces read as textured blocks.
 * - Side faces seen almost edge on pick up a soft cool rim, so a silhouette separates from a dark background.
 *
 * It costs a few ALU ops per pixel and no extra passes, render targets or textures, so it is safe on a phone. With
 * `simple` (or on a device that only offers low precision) the bevel and rim are compiled out and only the baked
 * occlusion stays.
 */
export interface VoxelMaterialOptions {
  /** Leave out the bevel and rim: occlusion only */
  simple?: boolean;
}

/** How dark full occlusion gets the sky light (1 = as baked) */
const AO_STRENGTH = 1;
/** How much of the occlusion reaches the direct sun: keeps lit faces from going muddy */
const AO_DIRECT = 0.6;
/** Bevel width in world units; small models lift it to ~1.25 pixels for a crisp rim, and BEVEL_MAX_FRACTION caps it on small quads */
const EDGE_WIDTH = 0.09;
/** The bevel never takes more than this fraction of a quad's shorter side, so a half-unit box keeps its colour between the rims */
const BEVEL_MAX_FRACTION = 0.2;
/** How much lighter the bevel is than the face */
const EDGE_LIGHT = 0.22;
/** How far a cell's brightness strays either way, and how far its hue leans warm or cool */
const CELL_LIFT = 0.06;
const CELL_WARMTH = 0.035;
const RIM_COLOR = new THREE.Color(0xbfd6ff);
const RIM_STRENGTH = 0.15;

const VERTEX_PARS = /* glsl */ `
attribute float voxelAo;
attribute vec4 voxelUv;
attribute vec4 voxelEdges;
varying float vVoxelAo;
varying vec4 vVoxelUv;
varying vec4 vVoxelEdges;
varying vec3 vVoxelCell;
`;

const FRAGMENT_PARS = /* glsl */ `
varying vec3 vVoxelCell;
varying float vVoxelAo;
varying vec4 vVoxelUv;
varying vec4 vVoxelEdges;
`;

/**
 * Every unit cell of a face gets its own slight lift or dip in brightness and a nudge warmer or cooler, picked by a hash
 * of where the cell is, so a big flat face reads as many hand-placed blocks instead of one slab of paint. The same cell
 * always gets the same tint, so nothing shimmers as the model turns.
 */
const TINT_FRAGMENT = /* glsl */ `
{
  vec3 cell = floor(vVoxelCell + 0.001);
  float lift = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453) - 0.5;
  float warmth = fract(sin(dot(cell, vec3(39.346, 11.135, 83.155))) * 24634.6345) - 0.5;
  diffuseColor.rgb *= 1.0 + lift * ${(CELL_LIFT * 2).toFixed(3)};
  diffuseColor.rgb *= vec3(1.0 + warmth * ${(CELL_WARMTH * 2).toFixed(3)}, 1.0, 1.0 - warmth * ${(CELL_WARMTH * 2).toFixed(3)});
}
`;

const AO_FRAGMENT = /* glsl */ `
{
  float aoShade = mix(1.0, vVoxelAo, ${AO_STRENGTH.toFixed(3)});
  reflectedLight.indirectDiffuse *= aoShade;
  reflectedLight.directDiffuse *= mix(1.0, aoShade, ${AO_DIRECT.toFixed(3)});
}
`;

const BEVEL_RIM_FRAGMENT = /* glsl */ `
{
  // Distance to each convex edge of the quad, in world units; fwidth lifts the bevel to a pixel or so on small models, and the quad's size caps it
  vec2 uv = vVoxelUv.xy;
  vec2 size = vVoxelUv.zw;
  vec2 px = max(fwidth(uv), vec2(1e-4));
  vec2 width = max(vec2(${EDGE_WIDTH.toFixed(3)}), px * 1.25);
  width = min(width, vec2(${BEVEL_MAX_FRACTION.toFixed(3)} * min(size.x, size.y)));
  vec4 dist = vec4(uv.x, size.x - uv.x, uv.y, size.y - uv.y);
  vec4 near = (1.0 - smoothstep(width.xxyy - px.xxyy, width.xxyy, dist)) * vVoxelEdges;
  float bevel = max(max(near.x, near.y), max(near.z, near.w));
  outgoingLight *= 1.0 + bevel * ${EDGE_LIGHT.toFixed(3)};

  // A soft cool rim on side faces seen nearly edge on; tops and bottoms (normal up or down in view) keep their colour
  vec3 n = normalize(normal);
  float facing = clamp(dot(n, normalize(vViewPosition)), 0.0, 1.0);
  float rim = smoothstep(0.55, 1.0, 1.0 - facing) * (1.0 - abs(n.y));
  outgoingLight += vec3(${RIM_COLOR.r.toFixed(3)}, ${RIM_COLOR.g.toFixed(3)}, ${RIM_COLOR.b.toFixed(3)}) * rim * ${RIM_STRENGTH.toFixed(3)} * (0.4 + 0.6 * vVoxelAo);
}
`;

export const createVoxelMaterial = (options: VoxelMaterialOptions = {}): THREE.MeshLambertMaterial => {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const simple = !!options.simple;
  material.onBeforeCompile = (shader, renderer) => {
    const lowPrecision = renderer.capabilities.precision === "lowp";
    const withBevel = !simple && !lowPrecision;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_PARS}`)
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvVoxelAo = voxelAo;\nvVoxelUv = voxelUv;\nvVoxelEdges = voxelEdges;\nvVoxelCell = position - normal * 0.5;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${TINT_FRAGMENT}`)
      .replace("#include <aomap_fragment>", `#include <aomap_fragment>\n${AO_FRAGMENT}`);
    if (withBevel) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `${BEVEL_RIM_FRAGMENT}\n#include <opaque_fragment>`,
      );
    }
  };
  // Programs are cached by this key: the simple and full variants must not share one
  material.customProgramCacheKey = () => (simple ? "voxel-simple" : "voxel");
  return material;
};

/**
 * Mesh data -> BufferGeometry with the attributes the voxel material reads. Colours arrive as sRGB and are converted to
 * the renderer's working space once per quad (all four corners share one).
 */
export const voxelGeometry = (data: MeshData): THREE.BufferGeometry => {
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
  const vertices = data.positions.length / 3;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(data.normals, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  // Mesh data from before the shader (or hand made) has none of these: an open, edgeless face draws as it always did
  geometry.setAttribute("voxelAo", new THREE.BufferAttribute(data.ao ?? new Float32Array(vertices).fill(1), 1));
  geometry.setAttribute("voxelUv", new THREE.BufferAttribute(data.faceUv ?? new Float32Array(vertices * 4), 4));
  geometry.setAttribute("voxelEdges", new THREE.BufferAttribute(data.edges ?? new Float32Array(vertices * 4), 4));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

/** A radial falloff, dark core to clear rim, shared by every floor shadow (it is tiny and never freed) */
let shadowFalloff: THREE.DataTexture | null = null;
const SHADOW_TEXELS = 64;
const softShadowTexture = (): THREE.DataTexture => {
  if (shadowFalloff) return shadowFalloff;
  const data = new Uint8Array(SHADOW_TEXELS * SHADOW_TEXELS * 4);
  for (let y = 0; y < SHADOW_TEXELS; y++) {
    for (let x = 0; x < SHADOW_TEXELS; x++) {
      const d = Math.hypot((x + 0.5) / SHADOW_TEXELS - 0.5, (y + 0.5) / SHADOW_TEXELS - 0.5) * 2;
      const t = Math.min(1, Math.max(0, (d - 0.5) / 0.5));
      const a = (1 - t * t * (3 - 2 * t)) * 255; // smoothstep out to the rim
      data.set([a, a, a, 255], (y * SHADOW_TEXELS + x) * 4);
    }
  }
  shadowFalloff = new THREE.DataTexture(data, SHADOW_TEXELS, SHADOW_TEXELS);
  shadowFalloff.magFilter = THREE.LinearFilter;
  shadowFalloff.minFilter = THREE.LinearFilter;
  shadowFalloff.needsUpdate = true;
  return shadowFalloff;
};

/**
 * The floor shadow under a model: a disc that fades out to its rim instead of a hard edged polygon. `opacity` is how
 * dark its core gets.
 */
export const createSoftShadowMaterial = (opacity: number): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity,
    depthWrite: false,
    alphaMap: softShadowTexture(),
  });
