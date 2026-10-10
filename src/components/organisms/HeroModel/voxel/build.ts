import * as THREE from "three";
import type { HeroLook } from "@/lib/hero-look/types";
import { assembleHero } from "./assemble";
import { buildMeshData } from "./mesh";
import type { Box } from "./mesh";
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
 * One merged BufferGeometry (vertex colours, no textures) per named group, one shared material: 8 body draws plus the
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

const toGeometry = (boxes: Box[], pivot: { x: number; y: number; z: number }): THREE.BufferGeometry => {
  const centred = boxes.map((b) => ({ ...b, x: b.x - pivot.x, y: b.y - pivot.y, z: b.z - pivot.z }));
  const data = buildMeshData(centred);
  const colors = new Float32Array(data.colors.length);
  const color = new THREE.Color();
  // Faces share one colour across their four vertices; convert sRGB to the renderer's working space once per face
  for (let i = 0; i < data.colors.length; i += 12) {
    color.setRGB(data.colors[i], data.colors[i + 1], data.colors[i + 2], THREE.SRGBColorSpace);
    for (let k = 0; k < 4; k++) {
      colors[i + k * 3] = color.r;
      colors[i + k * 3 + 1] = color.g;
      colors[i + k * 3 + 2] = color.b;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(data.normals, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

const setRest = (group: THREE.Group, rot: [number, number, number] = [0, 0, 0]): void => {
  const rest: RestPose = { pos: [group.position.x, group.position.y, group.position.z], rot };
  group.userData.rest = rest;
  group.rotation.set(rot[0], rot[1], rot[2]);
};

export const buildHero = (look: HeroLook): THREE.Group => {
  const parts = assembleHero(look);
  const byName = new Map<PartName, Part>(parts.map((p) => [p.name, p]));
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });

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
    const mesh = new THREE.Mesh(toGeometry(part.boxes, part.pivot), material);
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
    new THREE.CircleGeometry(4.8, 12).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
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
