import type * as THREE from "three";
import type { HeroAnimation } from "@/lib/hero-look/types";
import { PART_NAMES } from "./build";
import type { HeroRig, RestPose } from "./build";
import type { PartName } from "./shape";

/**
 * Procedural poses: a pure function of (animation, t). Nothing is remembered between calls, every call starts from
 * the rest pose the builder recorded and layers the motion on top, so switching animations never leaves residue.
 *
 * Axes: the hero faces +Z. Rotation about X with a NEGATIVE angle swings a hanging limb forward, and a positive one
 * leans a standing body forward. About Z, a positive angle lifts the left (+X) arm outward and a negative one lifts
 * the right (-X) arm outward.
 */
const s = Math.sin;

const getRig = (hero: THREE.Object3D): HeroRig | null => {
  const cached = hero.userData.heroRig as HeroRig | undefined;
  if (cached) return cached;
  const rig = hero.getObjectByName("rig") as THREE.Group | undefined;
  const shadow = hero.getObjectByName("shadow") as THREE.Mesh | undefined;
  const isRigMissing = !rig || !shadow;
  if (isRigMissing) return null;
  const parts = {} as Record<PartName, THREE.Group>;
  for (const name of PART_NAMES) {
    const found = hero.getObjectByName(name) as THREE.Group | undefined;
    if (!found) return null;
    parts[name] = found;
  }
  const refs = { rig, shadow, parts };
  hero.userData.heroRig = refs;
  return refs;
};

const reset = (refs: HeroRig): void => {
  const groups: THREE.Object3D[] = [refs.rig, ...PART_NAMES.map((n) => refs.parts[n])];
  for (const g of groups) {
    const rest = g.userData.rest as RestPose | undefined;
    if (rest) {
      g.position.set(...rest.pos);
      g.rotation.set(...rest.rot);
    } else {
      g.position.set(0, 0, 0);
      g.rotation.set(0, 0, 0);
    }
    g.scale.set(1, 1, 1);
  }
  refs.shadow.scale.set(1, 1, 1);
};

const rest = (g: THREE.Object3D): RestPose => (g.userData.rest as RestPose) ?? { pos: [0, 0, 0], rot: [0, 0, 0] };

/** The arm's resting lift (non-zero when it carries something) */
const lift = (arm: THREE.Object3D): number => rest(arm).rot[0];

const idle = (r: HeroRig, t: number): void => {
  const { torso, head, armL, armR, legL, legR, handL, handR } = r.parts;
  const breath = s(t * 2.4);
  torso.scale.y = 1 + 0.03 * breath;
  torso.scale.x = torso.scale.z = 1 - 0.012 * breath;
  // the head and shoulders ride the chest up and down
  head.position.y += 0.15 * breath;
  armL.position.y += 0.12 * breath;
  armR.position.y += 0.12 * breath;
  head.rotation.z = 0.035 * s(t * 0.9);
  head.rotation.y = 0.12 * s(t * 0.6 + 0.8);
  head.rotation.x = 0.03 * s(t * 1.3);
  armL.rotation.x = lift(armL) + 0.07 * s(t * 1.2 + 1);
  armR.rotation.x = lift(armR) + 0.07 * s(t * 1.2 + 2.5);
  armL.rotation.z = 0.05 + 0.035 * breath;
  armR.rotation.z = -0.05 - 0.035 * breath;
  handL.rotation.x = 0.05 * s(t * 1.5);
  handR.rotation.x = 0.05 * s(t * 1.5 + 1);
  legL.rotation.x = 0;
  legR.rotation.x = 0;
};

const wave = (r: HeroRig, t: number): void => {
  idle(r, t);
  const { armR, handR, head, torso } = r.parts;
  // character's right arm (-X) goes up and out, the hand flaps from the wrist
  armR.rotation.x = 0.1;
  armR.rotation.z = -(2.45 + 0.12 * s(t * 3));
  armR.rotation.y = 0.2;
  handR.rotation.z = -0.55 * s(t * 11);
  handR.rotation.x = 0;
  head.rotation.z = -0.1 + 0.04 * s(t * 2);
  torso.rotation.z = 0.04;
};

const walk = (r: HeroRig, t: number): void => {
  const { rig, torso, head, armL, armR, legL, legR } = { ...r.parts, rig: r.rig };
  const w = 8 * t;
  const swing = s(w);
  legL.rotation.x = -0.75 * swing;
  legR.rotation.x = 0.75 * swing;
  armL.rotation.x = lift(armL) + 0.7 * swing;
  armR.rotation.x = lift(armR) - 0.7 * swing;
  armL.rotation.z = 0.08;
  armR.rotation.z = -0.08;
  rig.position.y += 0.35 * Math.abs(s(w));
  rig.rotation.x = 0.07;
  rig.rotation.y = 0.1 * swing;
  torso.rotation.y = -0.12 * swing;
  head.rotation.y = 0.1 * swing;
  head.rotation.x = -0.05;
  head.position.y += 0.08 * s(w * 2 + 1);
};

const victory = (r: HeroRig, t: number): void => {
  const { rig, torso, head, armL, armR, legL, legR, handL, handR } = { ...r.parts, rig: r.rig };
  const period = 0.9;
  const p = (((t % period) + period) % period) / period;
  const air = 4 * p * (1 - p); // 0 on the ground, 1 at the top of the hop
  const crouch = Math.max(0, 1 - p * 5) * (p < 0.2 ? 1 : 0); // a squat right after landing
  rig.position.y += 2.4 * air - 0.9 * crouch;
  torso.scale.y = 1 - 0.1 * crouch + 0.04 * air;
  torso.scale.x = torso.scale.z = 1 + 0.05 * crouch;
  const cheer = 0.22 * s(t * 15);
  armL.rotation.z = 2.55 + cheer;
  armR.rotation.z = -2.55 - cheer;
  armL.rotation.x = 0.05;
  armR.rotation.x = 0.05;
  handL.rotation.z = 0.2 * s(t * 15 + 1);
  handR.rotation.z = -0.2 * s(t * 15 + 1);
  legL.rotation.x = -0.55 * air + 0.35 * crouch;
  legR.rotation.x = -0.35 * air + 0.35 * crouch;
  head.rotation.x = -0.18 * air;
  head.rotation.z = 0.06 * s(t * 7);
  r.shadow.scale.setScalar(1 - 0.3 * air);
};

const hurt = (r: HeroRig, t: number): void => {
  const { rig, torso, head, armL, armR, legL, legR } = { ...r.parts, rig: r.rig };
  const period = 1.4;
  const q = (((t % period) + period) % period);
  const hit = Math.max(0, 1 - q / 0.45); // the shake dies away, the pained pose stays
  rig.position.x += 0.45 * hit * s(t * 60);
  rig.rotation.x = -0.22 - 0.12 * hit;
  rig.position.y -= 0.15;
  rig.rotation.z = 0.05 * s(t * 3);
  head.rotation.x = -0.2;
  head.rotation.z = 0.12 * s(t * 4);
  torso.scale.y = 0.96;
  armL.rotation.z = 0.7 + 0.1 * s(t * 8);
  armR.rotation.z = -0.7 - 0.1 * s(t * 8);
  armL.rotation.x = 0.35;
  armR.rotation.x = 0.35;
  legL.rotation.x = -0.18;
  legR.rotation.x = 0.12;
};

const dance = (r: HeroRig, t: number): void => {
  const { rig, torso, head, armL, armR, legL, legR, handL, handR } = { ...r.parts, rig: r.rig };
  const beat = t * 6.4;
  const sway = s(beat);
  rig.position.y += 0.4 * Math.abs(s(beat));
  rig.position.x += 0.35 * sway;
  rig.rotation.z = 0.1 * sway;
  rig.rotation.y = 0.3 * s(beat / 2);
  torso.rotation.y = -0.2 * s(beat / 2);
  head.rotation.z = -0.14 * sway;
  head.rotation.x = 0.1 * Math.abs(s(beat));
  // arms alternate: one up in the air, the other down by the hip
  armL.rotation.z = 0.8 + 0.8 * sway;
  armR.rotation.z = -0.8 + 0.8 * sway;
  armL.rotation.x = 0.1 * s(beat * 2);
  armR.rotation.x = -0.1 * s(beat * 2);
  handL.rotation.z = 0.3 * s(beat * 2);
  handR.rotation.z = 0.3 * s(beat * 2 + 1);
  legL.rotation.x = -0.55 * Math.max(0, sway);
  legR.rotation.x = -0.55 * Math.max(0, -sway);
};

/** Pose `group` (built by buildHero) for `animation` at `t` seconds. Pure in (animation, t). */
export const animateHero = (group: THREE.Object3D, animation: HeroAnimation, t: number): void => {
  const refs = getRig(group);
  if (!refs) return;
  reset(refs);
  switch (animation) {
    case "wave":
      wave(refs, t);
      break;
    case "walk":
      walk(refs, t);
      break;
    case "victory":
      victory(refs, t);
      break;
    case "hurt":
      hurt(refs, t);
      break;
    case "dance":
      dance(refs, t);
      break;
    case "idle":
    default:
      idle(refs, t);
  }
};
