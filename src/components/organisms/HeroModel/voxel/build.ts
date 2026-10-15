import * as THREE from "three";
import type { HeroLook } from "@/lib/hero-look/types";
import { createSoftShadowMaterial, createVoxelMaterial, voxelGeometry } from "@/components/organisms/voxel/voxelMaterial";
import { assembleHero } from "./assemble";
import { buildMeshData } from "./mesh";
import type { Box, MeshData } from "./mesh";
import type { Part, PartName } from "./shape";

/**
 * The scene graph for a look:
 *
 *   hero (root, the scene turns it)
 *   |- shadow            flat dark disc, stays on the floor when the hero hops
 *   `- rig               animation moves/leans this
 *      |- torso, head, legL, legR
 *      |- armL -> handL   hands hang off their arm so they follow it (a held item rides in the hand's geometry)
 *      `- armR -> handR
 *
 * One merged BufferGeometry (vertex colours, no textures) per named group, one shared voxel material (voxelMaterial.ts): 8 body draws plus the
 * shadow = 9 draw calls.
 */
export interface HeroRig {
  rig: THREE.Group;
  shadow: THREE.Mesh;
  parts: Record<PartName, THREE.Group>;
}

export interface RestPose {
  pos: [number, number, number];
  rot: [number, number, number];
}

export const PART_NAMES: PartName[] = ["torso", "head", "armL", "armR", "legL", "legR", "handL", "handR"];

/**
 * The parts whose rest pose touches another's, for the shade where they meet: the head sits on the torso and the torso
 * on the legs. Arms and hands swing and lift too far for a baked contact to hold, so they shade only themselves.
 */
const CONTACTS: Partial<Record<PartName, PartName[]>> = {
  torso: ["head", "legL", "legR"],
  head: ["torso"],
  legL: ["torso"],
  legR: ["torso"],
};

/**
 * Recently meshed parts by what they are made of. Baking the shading is the dear part of a build, and the builder's
 * thumbnails rebuild the same hero dozens of times with one option changed: the other parts come from here.
 */
const meshCache = new Map<string, MeshData>();
const MESH_CACHE_SIZE = 96;

const meshPart = (boxes: Box[], occluders: Box[]): MeshData => {
  const key = JSON.stringify([boxes, occluders]);
  const cached = meshCache.get(key);
  if (cached) {
    // most recently used last, so the oldest is first out
    meshCache.delete(key);
    meshCache.set(key, cached);
    return cached;
  }
  const data = buildMeshData(boxes, occluders);
  meshCache.set(key, data);
  const isOverCache = meshCache.size > MESH_CACHE_SIZE;
  if (isOverCache) meshCache.delete(meshCache.keys().next().value as string);
  return data;
};

const toGeometry = (part: Part, byName: Map<PartName, Part>): THREE.BufferGeometry => {
  const { pivot } = part;
  const centre = (boxes: Box[]): Box[] => boxes.map((b) => ({ ...b, x: b.x - pivot.x, y: b.y - pivot.y, z: b.z - pivot.z }));
  const occluders = (CONTACTS[part.name] ?? []).flatMap((name) => byName.get(name)?.boxes ?? []);
  // The mesh data is shared between cached builds: geometries only read it
  return voxelGeometry(meshPart(centre(part.boxes), centre(occluders)));
};

const setRest = (group: THREE.Group, rot: [number, number, number] = [0, 0, 0]): void => {
  const rest: RestPose = { pos: [group.position.x, group.position.y, group.position.z], rot };
  group.userData.rest = rest;
  group.rotation.set(rot[0], rot[1], rot[2]);
};

export const buildHero = (look: HeroLook): THREE.Group => {
  const parts = assembleHero(look);
  const byName = new Map<PartName, Part>(parts.map((p) => [p.name, p]));
  const material = createVoxelMaterial();

  const root = new THREE.Group();
  root.name = "hero";
  const rig = new THREE.Group();
  rig.name = "rig";
  setRest(rig);
  root.add(rig);

  const groups = {} as Record<PartName, THREE.Group>;
  for (const name of PART_NAMES) {
    const part = byName.get(name);
    if (!part) throw new Error(`hero part missing: ${name}`);
    const group = new THREE.Group();
    group.name = name;
    const mesh = new THREE.Mesh(toGeometry(part, byName), material);
    mesh.name = `${name}Mesh`;
    group.add(mesh);
    const parent = part.parent ? byName.get(part.parent) : undefined;
    group.position.set(part.pivot.x - (parent?.pivot.x ?? 0), part.pivot.y - (parent?.pivot.y ?? 0), part.pivot.z - (parent?.pivot.z ?? 0));
    // An arm carrying something rests lifted forward so the item points up and out
    setRest(group, [-(part.raise ?? 0), 0, 0]);
    groups[name] = group;
  }
  for (const name of PART_NAMES) {
    const parentName = byName.get(name)?.parent;
    (parentName ? groups[parentName] : rig).add(groups[name]);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 24).rotateX(-Math.PI / 2),
    createSoftShadowMaterial(0.5),
  );
  shadow.name = "shadow";
  shadow.position.y = 0.03;
  root.add(shadow);

  const refs: HeroRig = { rig, shadow, parts: groups };
  root.userData.heroRig = refs;
  return root;
};

/** Frees every geometry and material the hero owns. Safe to call twice. */
export const disposeHero = (hero: THREE.Object3D): void => {
  const materials = new Set<THREE.Material>();
  hero.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((m) => materials.add(m));
    else if (material) materials.add(material);
  });
  materials.forEach((m) => m.dispose());
  hero.removeFromParent();
};

/** The mesh inside a named group, mostly for tests and tooling */
export const groupMesh = (hero: THREE.Object3D, name: string): THREE.Mesh | undefined =>
  hero.getObjectByName(name)?.children.find((c): c is THREE.Mesh => (c as THREE.Mesh).isMesh);
