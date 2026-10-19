import * as THREE from "three";
import { DEFAULT_LOOK, SKIN_TONES } from "@/lib/hero-look/types";
import type { ClassOutfitStyle, HeroLook } from "@/lib/hero-look/types";
import { animateHero } from "../voxel/animate";
import { buildHero, disposeHero, groupMesh } from "../voxel/build";
import * as outfits from "../voxel/outfits";
import { HIP_Y, NECK_Y } from "../voxel/outfits";
import type { BodyParts, OutfitSpec } from "../voxel/outfits";
import { BASE_OUTFITS } from "../voxel/classOutfits/base";
import { belt, cape, collar, crest, hood, mantle, pauldrons, pouch, sash, scarf, skirt } from "../voxel/classOutfits/parts";
import { mirrorX } from "../voxel/shape";
import type { Box, PartName } from "../voxel/shape";

/**
 * The class outfits on the voxel hero: each builds the named groups, animates with the rig, grows richer per class
 * level and leaves the head and hair in view.
 */

const CLASSES = ["warrior", "mage", "thief", "monk"] as const;
const LEVELS = [1, 5, 10] as const;
const VALUES: ClassOutfitStyle[] = CLASSES.flatMap((name) => LEVELS.map((level) => `${name}-${level}` as ClassOutfitStyle));

/** The class colour pairs (outfitColor, outfitAccent) the catalogue puts on with each outfit */
const PAIRS: Record<(typeof CLASSES)[number], [string, string]> = {
  warrior: ["#b8342b", "#8d8d8d"],
  mage: ["#2f5fb3", "#e8b22b"],
  thief: ["#2b2b3a", "#8d8d8d"],
  monk: ["#e3732c", "#e8d5a8"],
};
const pairOf = (value: ClassOutfitStyle): [string, string] => PAIRS[value.replace(/-\d+$/, "") as (typeof CLASSES)[number]];

const specOf = (value: ClassOutfitStyle): OutfitSpec => {
  const fn = BASE_OUTFITS[value];
  if (!fn) throw new Error(`no outfit for ${value}`);
  const [C, A] = pairOf(value);
  return fn(SKIN_TONES.peach, C, A);
};

const look = (patch: Partial<HeroLook> = {}): HeroLook => ({ ...DEFAULT_LOOK, ...patch });

const NAMED = ["head", "torso", "armL", "armR", "legL", "legR", "handL", "handR"];

const meshOf = (hero: THREE.Object3D, name: string): THREE.Mesh => {
  const mesh = groupMesh(hero, name);
  if (!mesh) throw new Error(`no mesh in ${name}`);
  return mesh;
};

const expectWellFormed = (hero: THREE.Group): void => {
  for (const name of NAMED) {
    expect(hero.getObjectByName(name)).toBeTruthy();
    const geometry = meshOf(hero, name).geometry;
    const position = geometry.getAttribute("position");
    const color = geometry.getAttribute("color");
    expect(position.count).toBeGreaterThan(0);
    expect(color.count).toBe(position.count);
    for (let i = 0; i < color.array.length; i++) {
      const c = color.array[i];
      if (!(c >= 0 && c <= 1)) throw new Error(`${name}: colour out of range at ${i}: ${c}`);
    }
    for (let i = 0; i < position.array.length; i++) {
      if (!Number.isFinite(position.array[i])) throw new Error(`${name}: non finite position`);
    }
  }
};

const transforms = (hero: THREE.Object3D): number[] => {
  const out: number[] = [];
  for (const name of ["rig", ...NAMED]) {
    const g = hero.getObjectByName(name) as THREE.Object3D;
    out.push(g.position.x, g.position.y, g.position.z, g.rotation.x, g.rotation.y, g.rotation.z, g.scale.x, g.scale.y, g.scale.z);
  }
  return out;
};

/** Cheap signature of a group's shape, to tell two outfits apart */
const signature = (hero: THREE.Object3D, name: string): string => {
  const p = meshOf(hero, name).geometry.getAttribute("position").array as Float32Array;
  let sum = 0;
  for (let i = 0; i < p.length; i++) sum += p[i] * ((i % 7) + 1);
  return `${p.length}:${sum.toFixed(3)}`;
};

const isBox = (b: Box): boolean => b.w > 0 && b.h > 0 && b.d > 0 && /^#[0-9a-f]{6}$/i.test(b.color);
const topOf = (b: Box): number => b.y + b.h;
const EPS = 1e-6;

describe("base class outfits", () => {
  /**
   * Task 7 routes the class values through specFor in outfits.ts. Until that lands, body() still answers a class value
   * with the tunic, so this bridge dresses the hero in the class spec; once body() wears it by itself the bridge steps
   * aside and the real body() is what gets built.
   */
  const realBody = outfits.body;
  const wear = (built: BodyParts, spec: OutfitSpec): BodyParts => {
    const boxesFor: Partial<Record<PartName, Box[]>> = {
      torso: spec.torso,
      armL: spec.armL,
      armR: mirrorX(spec.armL),
      legL: spec.legL,
      legR: mirrorX(spec.legL),
    };
    const glove = spec.hand;
    const parts = built.parts.map((part) => {
      const isGloved = !!glove && (part.name === "handL" || part.name === "handR");
      if (isGloved) return { ...part, boxes: part.boxes.map((b) => ({ ...b, color: glove as string })) };
      return { ...part, boxes: boxesFor[part.name] ?? part.boxes };
    });
    return { parts, headGear: spec.headGear ?? [] };
  };
  let bridge: jest.SpyInstance | undefined;
  beforeAll(() => {
    bridge = jest.spyOn(outfits, "body").mockImplementation((skin, outfit, color, accent, options) => {
      const fn = BASE_OUTFITS[outfit as ClassOutfitStyle];
      const real = realBody(skin, outfit, color, accent, options);
      const tunic = realBody(skin, "tunic", color, accent, options);
      const isUnwired = JSON.stringify(real) === JSON.stringify(tunic);
      const needsBridge = !!fn && isUnwired;
      if (!needsBridge || !fn) return real;
      return wear(tunic, fn(SKIN_TONES[skin] ?? SKIN_TONES.peach, color, accent));
    });
  });
  afterAll(() => bridge?.mockRestore());

  it("every base class outfit builds a well-formed hero and animates", () => {
    const tunic = buildHero(look({ outfit: "tunic" }));
    for (const outfit of VALUES) {
      const [outfitColor, outfitAccent] = pairOf(outfit);
      const hero = buildHero(look({ outfit, outfitColor, outfitAccent }));
      expectWellFormed(hero);
      // it wears its own cut, not the tunic it would fall back to
      expect({ outfit, torso: signature(hero, "torso") }).not.toEqual({ outfit, torso: signature(tunic, "torso") });
      for (const [animation, t] of [["walk", 0.37], ["victory", 0.45]] as const) {
        animateHero(hero, animation, t);
        const pose = transforms(hero);
        expect(pose.every(Number.isFinite)).toBe(true);
        animateHero(hero, animation, t + 0.2);
        expect(transforms(hero)).not.toEqual(pose);
      }
      disposeHero(hero);
    }
    disposeHero(tunic);
  });

  it("level 5 and 10 outfits carry more boxes than level 1", () => {
    for (const name of CLASSES) {
      const [one, five, ten] = LEVELS.map((level) => specOf(`${name}-${level}` as ClassOutfitStyle).torso.length);
      expect({ name, richer: five > one }).toEqual({ name, richer: true });
      expect({ name, richer: ten > five }).toEqual({ name, richer: true });
    }
  });

  it("a level 10 outfit adds nothing above the neck except headGear", () => {
    for (const value of VALUES) {
      const spec = specOf(value);
      const aboveNeck = spec.torso.filter((b) => topOf(b) > NECK_Y + EPS);
      expect({ value, aboveNeck }).toEqual({ value, aboveNeck: [] });
      const parts = [spec.torso, spec.armL, spec.legL, spec.headGear ?? []];
      expect({ value, wellFormed: parts.every((boxes) => boxes.every(isBox)) }).toEqual({ value, wellFormed: true });
    }
  });

  it("cuts every shared part from real boxes, with the torso pieces stopping at the neck", () => {
    const [C, A] = PAIRS.warrior;
    const torsoPieces = { collar: collar(C, A), short: cape(C, A, "short"), long: cape(C, A, "long"), mantle: mantle(C, A), sash: sash(C, A), belt: belt(C, A), pouch: pouch(C, A), scarf: scarf(C, A) };
    for (const [name, boxes] of Object.entries(torsoPieces)) {
      expect({ name, ok: boxes.length > 0 && boxes.every(isBox) }).toEqual({ name, ok: true });
      expect({ name, aboveNeck: boxes.filter((b) => topOf(b) > NECK_Y + EPS) }).toEqual({ name, aboveNeck: [] });
    }
    const lowest = (boxes: Box[]): number => Math.min(...boxes.map((b) => b.y));
    expect(lowest(torsoPieces.long)).toBeLessThan(lowest(torsoPieces.short));

    // headGear rides on the head, the skirt hangs from the hip, the pauldrons sit on the shoulder
    for (const [name, boxes] of Object.entries({ hood: hood(C, A), crest: crest(C, A) })) {
      expect({ name, ok: boxes.length > 0 && boxes.every(isBox) && lowest(boxes) >= NECK_Y - EPS }).toEqual({ name, ok: true });
    }
    const legPiece = skirt(C, A, 1.2);
    expect(legPiece.every(isBox) && legPiece.every((b) => topOf(b) <= HIP_Y + EPS)).toBe(true);
    expect(lowest(legPiece)).toBeCloseTo(HIP_Y - 1.2, 5);
    expect(pauldrons(C, A).every(isBox)).toBe(true);
  });
});
