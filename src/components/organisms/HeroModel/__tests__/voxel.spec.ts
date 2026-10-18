import * as THREE from "three";
import {
  DEFAULT_LOOK,
  FACE_STYLES,
  HAIR_STYLES,
  HAT_STYLES,
  OUTFIT_STYLES,
  SKIN_TONES,
} from "@/lib/hero-look/types";
import type { HeroAnimation, HeroLook } from "@/lib/hero-look/types";
import { animateHero } from "../voxel/animate";
import { buildHero, disposeHero, groupMesh, PART_NAMES } from "../voxel/build";
import { buildMeshData, visibleFaces } from "../voxel/mesh";
import { body, hair, hat, head, held, heldKind } from "../voxel/parts";
import { GEAR_BY_ICON } from "../voxel/held";
import { box } from "../voxel/shape";

/**
 * The voxel hero without WebGL: geometry, scene graph and procedural poses. The renderer hook is only type-checked
 * (jsdom has no WebGL context).
 */

const look = (patch: Partial<HeroLook> = {}): HeroLook => ({ ...DEFAULT_LOOK, ...patch });

const NAMED = ["head", "torso", "armL", "armR", "legL", "legR", "handL", "handR"];

const meshOf = (hero: THREE.Object3D, name: string): THREE.Mesh => {
  const mesh = groupMesh(hero, name);
  if (!mesh) throw new Error(`no mesh in ${name}`);
  return mesh;
};

const expectWellFormed = (hero: THREE.Group): void => {
  for (const name of NAMED) {
    const group = hero.getObjectByName(name);
    expect(group).toBeTruthy();
    const geometry = meshOf(hero, name).geometry;
    const position = geometry.getAttribute("position");
    const color = geometry.getAttribute("color");
    const normal = geometry.getAttribute("normal");
    expect(position.count).toBeGreaterThan(0);
    expect(color.count).toBe(position.count);
    expect(normal.count).toBe(position.count);
    expect(color.itemSize).toBe(3);
    for (let i = 0; i < color.array.length; i++) {
      const c = color.array[i];
      if (!(c >= 0 && c <= 1)) throw new Error(`${name}: colour out of range at ${i}: ${c}`);
    }
    for (let i = 0; i < position.array.length; i++) {
      if (!Number.isFinite(position.array[i])) throw new Error(`${name}: non finite position`);
    }
  }
};

/** Cheap signature of a group's shape, to tell two outfits apart */
const signature = (hero: THREE.Object3D, name: string): string => {
  const geometry = meshOf(hero, name).geometry;
  const p = geometry.getAttribute("position").array as Float32Array;
  let sum = 0;
  for (let i = 0; i < p.length; i++) sum += p[i] * ((i % 7) + 1);
  return `${p.length}:${sum.toFixed(3)}`;
};

const transforms = (hero: THREE.Object3D): number[] => {
  const out: number[] = [];
  for (const name of ["rig", ...NAMED]) {
    const g = hero.getObjectByName(name) as THREE.Object3D;
    out.push(g.position.x, g.position.y, g.position.z, g.rotation.x, g.rotation.y, g.rotation.z, g.scale.x, g.scale.y, g.scale.z);
  }
  return out;
};

describe("box culling", () => {
  it("drops the faces where two voxels of a part touch", () => {
    const a = box(0, 0, 0, 1, 1, 1, "#ff0000");
    const b = box(1, 0, 0, 2, 1, 1, "#ff0000");
    expect(buildMeshData([a]).faceCount).toBe(6);
    expect(buildMeshData([a, b]).faceCount).toBe(10);
  });

  it("drops faces swallowed by a bigger box but keeps ones that poke out", () => {
    const big = box(0, 0, 0, 4, 4, 4, "#00ff00");
    const inner = box(1, 1, 1, 2, 2, 2, "#ff0000");
    const poking = box(3, 1, 1, 5, 2, 2, "#0000ff");
    expect(buildMeshData([big, inner]).faceCount).toBe(6);
    // the poking box loses its back face inside the big one, and 5 remain
    expect(visibleFaces(poking, [big, poking]).length).toBe(5);
  });

  it("shades a face where a wall meets it and leaves an open face as one bright quad", () => {
    const floor = box(0, 0, 0, 4, 1, 4, "#808080");
    const open = buildMeshData([floor]);
    expect(open.faceCount).toBe(6);
    expect(Array.from(open.ao).every((a) => a === 1)).toBe(true);

    // A wall standing on the floor's top: the top is cut into cells and darkens along the foot of the wall
    const wall = box(0, 1, 0, 1, 3, 4, "#808080");
    const data = buildMeshData([floor, wall]);
    expect(data.ao.length).toBe(data.positions.length / 3);
    let darkestAtWall = 1;
    let darkestAway = 1;
    for (let i = 0; i < data.ao.length; i++) {
      const [x, y] = [data.positions[i * 3], data.positions[i * 3 + 1]];
      const isFloorTop = y === 1 && data.normals[i * 3 + 1] === 1;
      if (!isFloorTop) continue;
      if (x <= 1) darkestAtWall = Math.min(darkestAtWall, data.ao[i]);
      else if (x >= 3) darkestAway = Math.min(darkestAway, data.ao[i]);
    }
    expect(darkestAtWall).toBeLessThan(0.8);
    expect(darkestAway).toBe(1);
  });

  it("marks only the convex edges of a face for the bevel", () => {
    // Two boxes side by side make one flat top: the seam between them is not an edge, the outer rims are
    const data = buildMeshData([box(0, 0, 0, 1, 1, 1, "#808080"), box(1, 0, 0, 2, 1, 1, "#808080")]);
    for (let q = 0; q < data.faceCount; q++) {
      const v = q * 4;
      const isTop = data.normals[v * 3 + 1] === 1;
      if (!isTop) continue;
      const xs = [0, 1, 2, 3].map((k) => data.positions[(v + k) * 3]);
      const isLeftBox = Math.max(...xs) < 1.5;
      // edges: low-u, high-u, low-v, high-v; for a +Y face u is Z and v is X
      const edges = Array.from(data.edges.slice(v * 4, v * 4 + 4));
      expect(edges).toEqual(isLeftBox ? [1, 1, 1, 0] : [1, 1, 0, 1]);
    }
  });

  it("lets a neighbouring part shade the contact without hiding any face", () => {
    const torso = box(-2, 0, -1, 2, 4, 1, "#808080");
    const head = box(-2, 4, -2, 2, 7, 2, "#808080");
    const alone = buildMeshData([torso]);
    const touched = buildMeshData([torso], [head]);
    expect(Math.min(...Array.from(alone.ao))).toBe(1);
    expect(Math.min(...Array.from(touched.ao))).toBeLessThan(1);
  });

  it("produces outward counter-clockwise triangles", () => {
    const data = buildMeshData([box(0, 0, 0, 2, 3, 4, "#808080")]);
    for (let f = 0; f < data.faceCount; f++) {
      const idx = [data.indices[f * 6], data.indices[f * 6 + 1], data.indices[f * 6 + 2]];
      const v = idx.map((i) => new THREE.Vector3(data.positions[i * 3], data.positions[i * 3 + 1], data.positions[i * 3 + 2]));
      const n = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0])).normalize();
      const declared = new THREE.Vector3(data.normals[idx[0] * 3], data.normals[idx[0] * 3 + 1], data.normals[idx[0] * 3 + 2]);
      expect(n.dot(declared)).toBeCloseTo(1, 5);
    }
  });
});

describe("parts", () => {
  it("builds every hair, hat, outfit and face as boxes", () => {
    for (const style of HAIR_STYLES) {
      expect(hair(style, "#aa5500").length > 0 || style === "none").toBe(true);
      expect(hair(style, "#aa5500", { covered: true }).every((b) => b.w > 0 && b.h > 0 && b.d > 0)).toBe(true);
    }
    for (const style of HAT_STYLES) expect(hat(style, "#aa0000").length > 0 || style === "none").toBe(true);
    for (const face of FACE_STYLES) expect(head("peach", face, "#222233").length).toBeGreaterThan(3);
    for (const outfit of OUTFIT_STYLES) {
      const { parts } = body("tan", outfit, "#3f7d4e", "#e8d5a8");
      expect(parts.map((p) => p.name).sort()).toEqual([...NAMED].filter((n) => n !== "head").sort());
    }
  });

  it("keeps the head about 40% of the height", () => {
    const heightOf = (boxes: ReturnType<typeof head>) =>
      Math.max(...boxes.map((b) => b.y + b.h)) - Math.min(...boxes.map((b) => b.y));
    const headHeight = heightOf(head("peach", "smile", "#000000"));
    const total = headHeight + 8; // legs 3 + torso 5
    expect(headHeight / total).toBeGreaterThan(0.4);
    expect(headHeight / total).toBeLessThan(0.5);
  });

  it("holds every Equipment screen item as a model of its own", () => {
    const icons = Object.keys(GEAR_BY_ICON);
    const kinds = icons.map((icon) => heldKind(icon));
    expect(new Set(kinds).size).toBe(icons.length);
    expect(heldKind("flashlight")).toBe("lantern");
    expect(heldKind("fa-wand-magic ice")).toBe("iceWand");
    expect(heldKind("bolt")).toBe("lightning");
    for (const icon of icons) {
      const item = held(icon);
      expect(item?.boxes.length).toBeGreaterThan(2);
      expect(item?.raise).toBeGreaterThan(0);
    }
  });

  it("maps icon names to held items, and nothing for an empty hand", () => {
    expect(held(undefined)).toBeNull();
    expect(held("")).toBeNull();
    expect(heldKind("sword")).toBe("sword");
    expect(heldKind("fa-shield-alt")).toBe("shield");
    expect(heldKind("wand-magic-sparkles")).toBe("wand");
    expect(heldKind("book-open")).toBe("book");
    expect(heldKind("hammer")).toBe("hammer");
    expect(heldKind("something-else")).toBe("hammer");
    const sword = held("sword");
    expect(sword?.boxes.length).toBeGreaterThan(2);
    expect(sword?.raise).toBeGreaterThan(0);
  });
});

describe("buildHero", () => {
  it("returns the named groups with merged vertex coloured geometry for every hair and hat", () => {
    for (const hairStyle of HAIR_STYLES) {
      for (const hatStyle of HAT_STYLES) {
        const hero = buildHero(look({ hair: hairStyle, hat: hatStyle }));
        expectWellFormed(hero);
        disposeHero(hero);
      }
    }
  });

  it("returns the named groups for every outfit and face", () => {
    for (const outfit of OUTFIT_STYLES) {
      for (const face of FACE_STYLES) {
        const hero = buildHero(look({ outfit, face }));
        expectWellFormed(hero);
        disposeHero(hero);
      }
    }
  });

  it("builds a hero in every skin tone", () => {
    for (const skin of Object.keys(SKIN_TONES) as Array<keyof typeof SKIN_TONES>) {
      const hero = buildHero(look({ skin }));
      expectWellFormed(hero);
      for (const name of PART_NAMES) expect(hero.getObjectByName(name)).toBeTruthy();
      disposeHero(hero);
    }
    expect(Object.keys(SKIN_TONES)).toHaveLength(18);
  });

  it("covers every skin tone and a hood that gives way to a hat", () => {
    for (const skin of Object.keys(SKIN_TONES) as Array<keyof typeof SKIN_TONES>) {
      expectWellFormed(buildHero(look({ skin, outfit: "hoodie" })));
    }
    const hooded = buildHero(look({ outfit: "hoodie", hat: "none" }));
    const withHat = buildHero(look({ outfit: "hoodie", hat: "beanie" }));
    expect(meshOf(hooded, "head").geometry.getAttribute("position").count).not.toBe(
      meshOf(withHat, "head").geometry.getAttribute("position").count,
    );
  });

  it("nests the hands in their arms and the rest under one rig, with a shadow outside it", () => {
    const hero = buildHero(look());
    expect(hero.getObjectByName("handL")?.parent?.name).toBe("armL");
    expect(hero.getObjectByName("handR")?.parent?.name).toBe("armR");
    for (const name of ["torso", "head", "legL", "legR", "armL", "armR"]) {
      expect(hero.getObjectByName(name)?.parent?.name).toBe("rig");
    }
    expect(hero.getObjectByName("shadow")?.parent).toBe(hero);
    expect(PART_NAMES.sort()).toEqual([...NAMED].sort());
  });

  it("keeps draw calls under ten with one shared material", () => {
    const hero = buildHero(look({ outfit: "armor", hat: "wizard", leftHand: "shield", rightHand: "sword" }));
    const meshes: THREE.Mesh[] = [];
    hero.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) meshes.push(node as THREE.Mesh);
    });
    expect(meshes.length).toBeLessThan(10);
    const bodyMaterials = new Set(meshes.filter((m) => m.name !== "shadow").map((m) => m.material));
    expect(bodyMaterials.size).toBe(1);
    const material = [...bodyMaterials][0] as THREE.MeshLambertMaterial;
    expect(material.vertexColors).toBe(true);
    expect(material.map).toBeNull();
  });

  it("makes the outfits look different from each other", () => {
    const seen = new Set<string>();
    for (const outfit of OUTFIT_STYLES) {
      const hero = buildHero(look({ outfit }));
      seen.add(`${signature(hero, "torso")}|${signature(hero, "legL")}|${signature(hero, "armL")}`);
    }
    expect(seen.size).toBe(OUTFIT_STYLES.length);
  });

  it("has a robe that reaches the floor and a dress that stops at the knee", () => {
    const lowest = (outfit: HeroLook["outfit"]) => {
      const hero = buildHero(look({ outfit }));
      hero.updateMatrixWorld(true);
      return new THREE.Box3().setFromObject(meshOf(hero, "torso")).min.y;
    };
    expect(lowest("robe")).toBeLessThan(1);
    expect(lowest("dress")).toBeGreaterThan(1);
    expect(lowest("tunic")).toBeGreaterThan(2);
  });

  it("puts a held item into the hand's geometry and lifts the arm", () => {
    const empty = buildHero(look());
    const armed = buildHero(look({ rightHand: "sword" }));
    expect(meshOf(armed, "handR").geometry.getAttribute("position").count).toBeGreaterThan(
      meshOf(empty, "handR").geometry.getAttribute("position").count,
    );
    expect(armed.getObjectByName("armR")?.rotation.x).toBeLessThan(0);
    expect(armed.getObjectByName("armL")?.rotation.x).toBeCloseTo(0, 5);
  });

  it("reaches no higher than a wizard hat and fits a 16-unit character", () => {
    const bare = new THREE.Box3().setFromObject(buildHero(look({ hair: "none" })));
    expect(bare.max.y).toBeCloseTo(15, 1);
    const wizard = new THREE.Box3().setFromObject(buildHero(look({ hat: "wizard" })));
    expect(wizard.max.y).toBeLessThan(22);
  });

  it("disposes geometries and materials without throwing, twice", () => {
    const hero = buildHero(look({ rightHand: "sword", hat: "crown" }));
    const geometry = meshOf(hero, "head").geometry;
    const spy = jest.spyOn(geometry, "dispose");
    expect(() => disposeHero(hero)).not.toThrow();
    expect(spy).toHaveBeenCalled();
    expect(() => disposeHero(hero)).not.toThrow();
  });
});

describe("animateHero", () => {
  const ANIMATIONS: HeroAnimation[] = ["idle", "wave", "walk", "victory", "hurt", "dance"];
  const T = 0.37;

  it("moves the groups differently for different animations", () => {
    const hero = buildHero(look());
    const poses = ANIMATIONS.map((animation) => {
      animateHero(hero, animation, T);
      return transforms(hero).join(",");
    });
    expect(new Set(poses).size).toBe(ANIMATIONS.length);
  });

  it("is deterministic for the same animation and time, whatever came before", () => {
    const hero = buildHero(look());
    animateHero(hero, "walk", T);
    const first = transforms(hero);
    animateHero(hero, "victory", 5.2);
    animateHero(hero, "hurt", 0.1);
    animateHero(hero, "walk", T);
    expect(transforms(hero)).toEqual(first);
    const other = buildHero(look());
    animateHero(other, "walk", T);
    expect(transforms(other)).toEqual(first);
  });

  it("changes over time", () => {
    const hero = buildHero(look());
    for (const animation of ANIMATIONS) {
      animateHero(hero, animation, 0.11);
      const a = transforms(hero);
      animateHero(hero, animation, 0.43);
      expect(transforms(hero)).not.toEqual(a);
    }
  });

  it("idle breathes the torso and sways the arms", () => {
    const hero = buildHero(look());
    const torso = hero.getObjectByName("torso") as THREE.Object3D;
    animateHero(hero, "idle", 0.1);
    const inhale = torso.scale.y;
    animateHero(hero, "idle", 0.1 + Math.PI / 2.4 + 0.2);
    expect(torso.scale.y).not.toBeCloseTo(inhale, 4);
  });

  it("waves with the right arm up and keeps the left down", () => {
    const hero = buildHero(look());
    animateHero(hero, "wave", 0.2);
    expect((hero.getObjectByName("armR") as THREE.Object3D).rotation.z).toBeLessThan(-2);
    expect(Math.abs((hero.getObjectByName("armL") as THREE.Object3D).rotation.z)).toBeLessThan(0.3);
  });

  it("victory leaves the ground and throws both arms up, keeping the shadow on the floor", () => {
    const hero = buildHero(look());
    const rig = hero.getObjectByName("rig") as THREE.Object3D;
    animateHero(hero, "victory", 0.45); // mid hop
    expect(rig.position.y).toBeGreaterThan(1.5);
    expect((hero.getObjectByName("armL") as THREE.Object3D).rotation.z).toBeGreaterThan(2);
    expect((hero.getObjectByName("armR") as THREE.Object3D).rotation.z).toBeLessThan(-2);
    expect((hero.getObjectByName("shadow") as THREE.Object3D).parent).toBe(hero);
  });

  it("hops up and lands back on the rest pose", () => {
    const hero = buildHero(look());
    const rig = hero.getObjectByName("rig") as THREE.Object3D;
    const restY = (rig.userData.rest as { pos: number[] } | undefined)?.pos[1] ?? 0;
    animateHero(hero, "hop", 0.225); // the top of the hop
    expect(rig.position.y).toBeGreaterThanOrEqual(restY + 1);
    expect(Math.abs((hero.getObjectByName("armL") as THREE.Object3D).rotation.z)).toBeGreaterThan(0.3);
    expect(Math.abs((hero.getObjectByName("armR") as THREE.Object3D).rotation.z)).toBeGreaterThan(0.3);
    animateHero(hero, "hop", 0.6);
    expect(rig.position.y).toBe(restY);
    expect(rig.rotation.x).toBe(0);
  });

  it("walk swings the legs against each other", () => {
    const hero = buildHero(look());
    animateHero(hero, "walk", 0.1);
    const l = (hero.getObjectByName("legL") as THREE.Object3D).rotation.x;
    const r = (hero.getObjectByName("legR") as THREE.Object3D).rotation.x;
    expect(Math.sign(l)).toBe(-Math.sign(r));
    expect(Math.abs(l)).toBeGreaterThan(0.1);
  });

  it("does nothing to an object that is not a hero", () => {
    expect(() => animateHero(new THREE.Group(), "idle", 1)).not.toThrow();
  });
});
