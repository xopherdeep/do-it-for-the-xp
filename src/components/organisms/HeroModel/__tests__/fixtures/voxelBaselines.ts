import type { HatStyle } from "@/lib/hero-look/types";
import type { PartName } from "../../voxel/shape";

/**
 * The geometry of today's hero, recorded before the mesher's culling is rewritten so the rewrite can prove it did not
 * change the art. Re-record a value only when the art changes on purpose.
 */

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

/** Per bench look (BENCH_LOOKS, in order), each part's `meshSignature`: quad count, then a weighted sum of the positions */
export const BENCH_SIGNATURES: Array<Record<PartName, string>> = [
  {
    torso: "169:2938.383",
    head: "382:31405.729",
    armL: "32:-496.396",
    armR: "32:-496.396",
    legL: "66:-1254.072",
    legR: "66:-1254.072",
    handL: "6:-11.571",
    handR: "6:-11.571",
  },
  {
    torso: "153:4620.538",
    head: "638:66214.053",
    armL: "57:-301.453",
    armR: "57:-732.241",
    legL: "72:-1365.003",
    legR: "72:-1365.003",
    handL: "111:2598.161",
    handR: "56:1880.837",
  },
  {
    torso: "214:2960.711",
    head: "913:77150.349",
    armL: "24:-588.148",
    armR: "24:-803.048",
    legL: "43:-903.009",
    legR: "43:-903.009",
    handL: "6:-11.571",
    handR: "67:3474.889",
  },
  {
    // re-recorded with the half-unit head: the torso is shaded against the head, and the hoodie's hood lies into it
    torso: "175:5331.989",
    head: "640:53919.445",
    armL: "24:-643.198",
    armR: "24:-643.198",
    legL: "49:-1095.536",
    legR: "49:-1095.536",
    handL: "6:-11.571",
    handR: "6:-11.571",
  },
  {
    torso: "153:4620.538",
    head: "903:77181.173",
    armL: "57:-301.453",
    armR: "57:-732.241",
    legL: "72:-1365.003",
    legR: "72:-1365.003",
    handL: "111:2598.161",
    handR: "56:1880.837",
  },
];

/** The box bounds of every hat (as `hat(style, color)` draws it), null for no hat */
export const HAT_BOUNDS: Record<HatStyle, Bounds | null> = {
  none: null,
  cap: { min: [-4.1, 14.4, -4.1], max: [4.1, 17.4, 6.5] },
  crown: { min: [-4.25, 14.5, -4.25], max: [4.25, 17.25, 4.4] },
  wizard: { min: [-6, 14.5, -6], max: [6, 21, 6] },
  helmet: { min: [-4.4, 10.5, -4.35], max: [4.4, 17.9, 4.35] },
  beanie: { min: [-4.25, 14.25, -4.25], max: [4.25, 19, 4.25] },
  headband: { min: [-4.15, 11, -5.2], max: [4.15, 14.75, 4.3] },
  bandana: { min: [-4, 11.5, -5.25], max: [4, 15.45, 4.15] },
  flower: { min: [0.75, 15, 0.5], max: [3.75, 18.5, 1.8] },
};

/** The box bounds of every held item in hand space, by icon: the Equipment screen's items, then the generic shapes */
export const HELD_BOUNDS: Record<string, Bounds> = {
  boot: { min: [-3.2, -2.3, 0.6], max: [3.2, 1, 4.8] },
  whistle: { min: [-1, -0.8, 0.4], max: [1, 0.7, 4.6] },
  "staff quest": { min: [-0.5, -0.5, -1.2], max: [1.9, 0.5, 6.9] },
  "book-spells": { min: [-1.65, -0.7, 0.6], max: [1.6, 0.55, 4.8] },
  backpack: { min: [-1.55, -1.35, 0.4], max: [1.55, 1.2, 4.45] },
  wallet: { min: [-1.45, -0.75, 0.7], max: [1.45, 0.45, 3.5] },
  "bow-arrow": { min: [-0.45, -3.5, -0.6], max: [0.45, 3.5, 5.3] },
  "expand-alt": { min: [-1.1, -0.65, -0.8], max: [1.1, 0.65, 5.4] },
  bomb: { min: [-1.6, -1.65, 0.6], max: [1.6, 1.6, 5.8] },
  "hammer-war": { min: [-2.1, -1.3, -1.5], max: [2.1, 1.3, 6.6] },
  flashlight: { min: [-0.95, -0.95, -1], max: [0.95, 0.95, 4.6] },
  flame: { min: [-1.9, -0.85, -1], max: [1.9, 0.7, 5.8] },
  bolt: { min: [-1.1, -0.5, -0.8], max: [0.6, 0.5, 6.6] },
  "wave-sine": { min: [-1.7, -0.6, 0.4], max: [1.7, 0.35, 4.5] },
  "flux-capacitor": { min: [-1.5, -0.62, -0.2], max: [1.5, 0.45, 4.2] },
  "moon-stars": { min: [-1.9, -0.5, -1.3], max: [0.7, 0.5, 7.9] },
  wind: { min: [-2.5, -0.4, -1.2], max: [2.5, 0.4, 4.6] },
  "hat-wizard": { min: [-2, -2, 0.7], max: [2, 2, 4.5] },
  "wand-magic fire": { min: [-1, -0.75, -1.2], max: [1, 0.75, 6.5] },
  "wand-magic ice": { min: [-0.8, -0.8, -1.2], max: [0.8, 0.8, 7] },
  "flask-potion": { min: [-1.1, -1.18, 0.75], max: [1.1, 1.1, 4.4] },
  "portal-enter": { min: [-1.5, -0.68, -1.2], max: [1.5, 0.45, 5.4] },
  sword: { min: [-1.6, -0.5, -1.2], max: [1.6, 0.5, 7.4] },
  shield: { min: [-2, -2.5, 0.2], max: [2, 2.5, 2.2] },
  wand: { min: [-1.3, -1.3, -0.8], max: [1.3, 1.3, 5.4] },
  book: { min: [-1.65, -0.55, 0.6], max: [1.6, 0.7, 4.8] },
  axe: { min: [-0.7, -2.2, -1.1], max: [0.7, 2.2, 5.6] },
  hammer: { min: [-1.6, -1, -1.1], max: [1.6, 1, 5.8] },
  bow: { min: [-0.4, -3.5, -0.5], max: [0.4, 3.5, 1.9] },
  potion: { min: [-0.9, -0.95, 0.8], max: [0.9, 0.9, 3.9] },
  torch: { min: [-0.7, -0.7, -1], max: [0.7, 0.7, 6.4] },
};
