import { box, lighten, PALETTE, shade } from "./shape";
import type { Box } from "./shape";

/**
 * The equipment catalogue in the hand: one model per item of the Equipment screen, drawn after the icon the hero
 * picks it by (a winged boot for Pegasus Boots, a blue spellbook for the Book Of Spells). Boxes are in HAND space,
 * like held.ts: the origin is the centre of the fist, +Z is the way the item sticks out of it, +X across, +Y its
 * thickness. Each is drawn with its face on +Y; held.ts turns that face to the camera.
 */

const STEEL = PALETTE.steel;
const STEEL_D = shade(PALETTE.steel, 0.72);
const GOLD = PALETTE.gold;
const GOLD_D = shade(PALETTE.gold, 0.75);
const WOOD = "#7a4a25";
const WOOD_L = "#9a6a3a";
const WHITE = PALETTE.white;
const INK = "#23202a";

/** A round-ish slab: a wide middle plus a narrower cross, so the corners read cut off at voxel scale */
const disc = (cx: number, cz: number, half: number, y0: number, y1: number, color: string): Box[] => {
  const cut = Math.max(0.3, half * 0.3);
  return [
    box(cx - half + cut, y0, cz - half, cx + half - cut, y1, cz + half, color),
    box(cx - half, y0, cz - half + cut, cx + half, y1, cz + half - cut, color),
  ];
};

/** A grip that disappears into the fist, with a cap at the end so the item does not look stuck on */
const grip = (z0: number, z1: number, color = WOOD, half = 0.4): Box[] => [
  box(-half, -half, z0, half, half, z1, color),
  box(-half - 0.1, -half - 0.1, z0 - 0.4, half + 0.1, half + 0.1, z0, shade(color, 0.8)),
];

/** Pegasus Boots: a brown boot with a gold cuff and a white wing on each side of the shaft */
export const wingedBoots = (): Box[] => {
  const LEATHER = "#a0521e";
  /** One wing on the +X (side 1) or -X (side -1) face of the shaft, rising in three feathers */
  const wing = (side: 1 | -1): Box[] =>
    ([
      [0.9, 1.8, 2.2, 3.3, WHITE],
      [1.8, 2.6, 2.7, 3.9, WHITE],
      [2.6, 3.2, 3.3, 4.4, lighten("#cfe3f5", 0.3)],
    ] as Array<[number, number, number, number, string]>).map(([x0, x1, z0, z1, color]) =>
      box(side * x0, -0.2, z0, side * x1, 0.2, z1, color),
    );
  return [
    // stood upright on the palm: the foot at the bottom, its toe out toward the camera, the shaft rising to a gold cuff
    box(-0.9, -0.9, 0.7, 0.9, 2.2, 1.9, LEATHER),
    box(-0.95, -0.95, 0.6, 0.95, 2.3, 0.9, shade(LEATHER, 0.55)),
    box(-0.9, -0.9, 1.9, 0.9, 0.9, 4.2, LEATHER),
    box(-1.0, -1.0, 4.2, 1.0, 1.0, 4.8, GOLD),
    box(-0.5, 0.9, 2.2, 0.5, 1.0, 3.9, shade(LEATHER, 0.8)),
    ...wing(1),
    ...wing(-1),
  ];
};

/** Wind Whistle: a blue whistle with a mouthpiece, a round chamber and its dark sound hole */
export const whistle = (): Box[] => {
  const BLUE = "#3a72c8";
  return [
    box(-0.5, -0.45, 0.6, 0.5, 0.45, 2.2, BLUE),
    box(-0.55, -0.5, 0.4, 0.55, 0.5, 0.8, GOLD),
    ...disc(0, 2.9, 1.0, -0.7, 0.7, lighten(BLUE, 0.15)),
    box(-0.35, 0.7, 2.6, 0.35, 0.8, 3.2, INK),
    box(-0.25, -0.25, 4.0, 0.25, 0.25, 4.6, GOLD),
  ];
};

/** My Quests: the orange shepherd's crook of the quest icon */
export const crook = (): Box[] => {
  const ORANGE = "#c8691e";
  return [
    ...grip(-0.8, 6.2, ORANGE),
    box(-0.4, -0.4, 6.2, 1.2, 0.4, 6.9, ORANGE),
    box(1.2, -0.4, 5.6, 1.9, 0.4, 6.9, ORANGE),
    box(1.2, -0.4, 4.9, 1.9, 0.4, 5.6, shade(ORANGE, 0.85)),
    box(-0.45, -0.45, 1.6, 0.45, 0.45, 2.0, shade(ORANGE, 0.7)),
  ];
};

/** Book Of Spells: a blue spellbook with a gold star on the cover */
export const spellbook = (): Box[] => {
  const BLUE = "#2f5fb3";
  return [
    box(-1.6, -0.55, 0.6, 1.6, -0.25, 4.8, BLUE),
    box(-1.4, -0.25, 0.8, 1.4, 0.25, 4.6, "#f1e6c8"),
    box(-1.6, 0.25, 0.6, 1.6, 0.55, 4.8, BLUE),
    box(-1.65, -0.55, 0.6, -1.4, 0.55, 4.8, shade(BLUE, 0.75)),
    box(-0.25, 0.55, 1.9, 0.25, 0.7, 3.5, GOLD),
    box(-0.8, 0.55, 2.45, 0.8, 0.7, 2.95, GOLD),
    box(-0.5, 0.55, 2.1, 0.5, 0.7, 3.3, "#f7e58a"),
  ];
};

/** Goods: a red backpack carried by its top loop */
export const backpack = (): Box[] => {
  const RED = "#c0392b";
  return [
    box(-0.35, -0.3, 0.4, 0.35, 0.3, 1.2, INK),
    box(-1.5, -1.0, 1.2, 1.5, 1.0, 4.4, RED),
    box(-1.55, 1.0, 3.2, 1.55, 1.2, 4.45, shade(RED, 0.75)),
    box(-1.0, 1.0, 1.5, 1.0, 1.3, 2.9, lighten(RED, 0.15)),
    box(-0.2, 1.2, 3.2, 0.2, 1.35, 3.6, GOLD),
    box(-1.3, -1.2, 1.4, -0.9, -1.0, 4.2, shade(RED, 0.6)),
    box(0.9, -1.2, 1.4, 1.3, -1.0, 4.2, shade(RED, 0.6)),
  ];
};

/** Wallet: a fat gold-brown wallet with a flap and a clasp, a gold coin peeking out */
export const wallet = (): Box[] => {
  const TAN = "#d8962a";
  return [
    box(-1.4, -0.45, 0.7, 1.4, 0.45, 3.1, TAN),
    box(-1.45, 0.45, 2.0, 1.45, 0.6, 3.15, shade(TAN, 0.75)),
    box(-0.3, 0.6, 2.0, 0.3, 0.75, 2.5, STEEL),
    box(0.3, -0.3, 3.1, 1.1, 0.3, 3.5, GOLD),
  ];
};

/** Silver Arrow: a bow with a silver arrow nocked, its head shining past the grip */
export const silverBow = (): Box[] => [
  box(-0.4, -0.4, -0.5, 0.4, 0.4, 0.9, WOOD_L),
  box(-0.3, 0.4, 0.6, 0.3, 1.6, 1.4, WOOD),
  box(-0.3, 1.6, 1.2, 0.3, 2.8, 1.9, WOOD),
  box(-0.3, 2.8, 0.7, 0.3, 3.5, 1.3, WOOD),
  box(-0.3, -1.6, 0.6, 0.3, -0.4, 1.4, WOOD),
  box(-0.3, -2.8, 1.2, 0.3, -1.6, 1.9, WOOD),
  box(-0.3, -3.5, 0.7, 0.3, -2.8, 1.3, WOOD),
  box(-0.08, -3.5, 0.5, 0.08, 3.5, 0.62, lighten("#e8d5a8", 0.3)),
  // the arrow
  box(-0.15, -0.15, -0.6, 0.15, 0.15, 4.4, lighten(STEEL, 0.3)),
  box(-0.45, -0.15, 4.4, 0.45, 0.15, 4.8, lighten(STEEL, 0.5)),
  box(-0.25, -0.15, 4.8, 0.25, 0.15, 5.3, WHITE),
  box(-0.4, -0.05, -0.6, 0.4, 0.05, 0.2, "#e05050"),
];

/** Hook Shot: a red grip, a steel barrel and the gold claw at its mouth */
export const hookshot = (): Box[] => {
  const RED = "#b8322a";
  return [
    box(-0.45, -0.45, -0.8, 0.45, 0.45, 0.9, RED),
    box(-0.6, -0.6, 0.9, 0.6, 0.6, 3.6, STEEL),
    box(-0.65, -0.65, 1.4, 0.65, 0.65, 1.8, STEEL_D),
    box(-0.65, -0.65, 2.6, 0.65, 0.65, 3.0, STEEL_D),
    box(-0.3, -0.3, 3.6, 0.3, 0.3, 4.0, STEEL_D),
    box(-1.1, -0.35, 4.0, 1.1, 0.35, 4.4, GOLD),
    box(-1.1, -0.35, 4.4, -0.7, 0.35, 5.2, GOLD),
    box(0.7, -0.35, 4.4, 1.1, 0.35, 5.2, GOLD),
    box(-0.25, -0.25, 4.4, 0.25, 0.25, 5.4, GOLD_D),
  ];
};

/** Bombs: a round navy bomb with a grey cap, a fuse and its spark */
export const bomb = (): Box[] => {
  const NAVY = "#25305a";
  return [
    box(-1.0, -1.6, 0.9, 1.0, 1.6, 3.9, NAVY),
    box(-1.6, -1.0, 0.9, 1.6, 1.0, 3.9, NAVY),
    box(-1.2, -1.2, 0.5, 1.2, 1.2, 4.3, NAVY),
    box(-1.4, -1.4, 1.3, 1.4, 1.4, 3.5, NAVY),
    box(-0.8, 1.5, 2.9, -0.2, 1.7, 3.5, lighten(NAVY, 0.5)),
    box(-0.55, -0.55, 4.3, 0.55, 0.55, 4.7, STEEL),
    box(-0.15, -0.15, 4.7, 0.15, 0.15, 5.5, "#c8b07a"),
    box(-0.35, -0.35, 5.5, 0.35, 0.35, 6.0, "#f7a530"),
    box(-0.15, -0.15, 6.0, 0.15, 0.15, 6.3, "#fff07a"),
  ];
};

/** Thor's Hammer: a short wrapped handle and a heavy steel head with a gold band */
export const warhammer = (): Box[] => [
  box(-0.4, -0.4, -0.9, 0.4, 0.4, 4.4, WOOD),
  box(-0.45, -0.45, -0.4, 0.45, 0.45, 0.2, "#5a3a22"),
  box(-0.45, -0.45, 0.6, 0.45, 0.45, 1.2, "#5a3a22"),
  box(-0.3, -0.3, -1.5, 0.3, 0.3, -0.9, GOLD),
  box(-2.0, -1.2, 4.4, 2.0, 1.2, 6.6, STEEL),
  box(-2.1, -1.3, 4.4, 2.1, 1.3, 4.7, STEEL_D),
  box(-2.1, -1.3, 6.3, 2.1, 1.3, 6.6, STEEL_D),
  box(-0.4, -1.3, 4.3, 0.4, 1.3, 6.7, GOLD),
];

/** Lantern: a gold lamp with a glowing core, carried by its ring */
export const lantern = (): Box[] => {
  const GLOW = "#ffe27a";
  return [
    box(-0.25, -0.25, 0.4, 0.25, 0.25, 1.0, GOLD_D),
    box(-0.8, -0.8, 1.0, 0.8, 0.8, 1.4, GOLD),
    box(-1.0, -1.0, 1.4, 1.0, 1.0, 1.7, GOLD_D),
    box(-0.8, -0.8, 1.7, 0.8, 0.8, 3.7, GLOW),
    box(-0.4, -0.4, 2.2, 0.4, 0.4, 3.2, lighten(GLOW, 0.6)),
    box(-1.0, -1.0, 1.7, -0.75, -0.75, 3.7, GOLD),
    box(0.75, -1.0, 1.7, 1.0, -0.75, 3.7, GOLD),
    box(-1.0, 0.75, 1.7, -0.75, 1.0, 3.7, GOLD),
    box(0.75, 0.75, 1.7, 1.0, 1.0, 3.7, GOLD),
    box(-1.1, -1.1, 3.7, 1.1, 1.1, 4.1, GOLD_D),
    box(-0.6, -0.6, 4.1, 0.6, 0.6, 4.4, GOLD),
  ];
};

/** Sol's Flare: a gold sceptre topped with a burning sun */
export const sunSceptre = (): Box[] => {
  const SUN = "#e3502c";
  const RAY = "#f7a530";
  return [
    ...grip(-0.6, 2.4, GOLD_D, 0.35),
    box(-0.55, -0.55, 2.4, 0.55, 0.55, 2.8, GOLD),
    ...disc(0, 3.9, 1.1, -0.7, 0.7, SUN),
    box(-0.5, 0.7, 3.4, 0.5, 0.85, 4.4, "#ffd04a"),
    box(-1.9, -0.3, 3.6, -1.1, 0.3, 4.2, RAY),
    box(1.1, -0.3, 3.6, 1.9, 0.3, 4.2, RAY),
    box(-0.3, -0.3, 5.0, 0.3, 0.3, 5.8, RAY),
    box(-1.5, -0.3, 4.7, -0.9, 0.3, 5.3, "#ffd04a"),
    box(0.9, -0.3, 4.7, 1.5, 0.3, 5.3, "#ffd04a"),
  ];
};

/** Tesla's Bolt: a yellow lightning bolt held by a copper coil */
export const lightning = (): Box[] => {
  const BOLT = "#f7d34a";
  const COPPER = "#b86a2c";
  return [
    box(-0.45, -0.45, -0.8, 0.45, 0.45, 0.9, COPPER),
    box(-0.5, -0.5, -0.4, 0.5, 0.5, -0.1, shade(COPPER, 0.7)),
    box(-0.5, -0.5, 0.3, 0.5, 0.5, 0.6, shade(COPPER, 0.7)),
    box(-0.3, -0.3, 0.9, 0.5, 0.3, 2.6, BOLT),
    box(-1.1, -0.3, 2.2, 0.5, 0.3, 2.8, BOLT),
    box(-1.1, -0.3, 2.8, -0.4, 0.3, 4.4, BOLT),
    box(-1.1, -0.3, 4.0, 0.6, 0.3, 4.6, BOLT),
    box(0.0, -0.3, 4.6, 0.6, 0.3, 6.0, BOLT),
    box(0.1, -0.35, 6.0, 0.4, 0.35, 6.6, lighten(BOLT, 0.6)),
    box(-0.1, 0.3, 1.0, 0.2, 0.4, 2.4, lighten(BOLT, 0.6)),
  ];
};

/** Gaia's Quake: a green medallion in a gold rim, the quake's wave across its face */
export const quakeMedallion = (): Box[] => {
  const GREEN = "#3f9a4a";
  const WAVE = "#1f5a2a";
  return [
    box(-0.3, -0.3, 0.4, 0.3, 0.3, 1.2, GOLD_D),
    ...disc(0, 2.8, 1.7, -0.35, 0.35, GOLD),
    ...disc(0, 2.8, 1.25, 0.35, 0.5, GREEN),
    box(-1.0, 0.5, 2.4, -0.5, 0.6, 2.9, WAVE),
    box(-0.5, 0.5, 2.8, 0.0, 0.6, 3.3, WAVE),
    box(0.0, 0.5, 2.4, 0.5, 0.6, 2.9, WAVE),
    box(0.5, 0.5, 2.8, 1.0, 0.6, 3.3, WAVE),
  ];
};

/** Chronos' Clock: a gold pocket watch with its white face, two hands and the crown on top */
export const pocketWatch = (): Box[] => [
  box(-0.12, -0.12, -0.2, 0.12, 0.12, 0.9, GOLD_D),
  box(-0.35, -0.35, 0.9, 0.35, 0.35, 1.3, GOLD),
  ...disc(0, 2.7, 1.5, -0.45, 0.35, GOLD),
  ...disc(0, 2.7, 1.1, 0.35, 0.5, "#f5efe0"),
  box(-0.1, 0.5, 2.6, 0.1, 0.6, 3.5, INK),
  box(-0.1, 0.5, 2.6, 0.7, 0.6, 2.8, INK),
  box(-0.15, 0.5, 2.6, 0.15, 0.62, 2.85, "#c0392b"),
];

/** Night's Light: a dark staff crowned with a silver crescent moon and a star */
export const moonStaff = (): Box[] => {
  const MOON = "#e6ecf5";
  return [
    ...grip(-0.9, 4.0, "#3a3a6a", 0.35),
    box(-0.5, -0.5, 4.0, 0.5, 0.5, 4.4, GOLD),
    // the crescent opens to the right: a back, two arms and their thin tips
    box(-1.9, -0.35, 5.2, -1.2, 0.35, 7.0, MOON),
    box(-1.3, -0.35, 6.9, -0.5, 0.35, 7.6, MOON),
    box(-0.6, -0.35, 7.4, 0.5, 0.35, 7.9, lighten(MOON, 0.4)),
    box(-1.3, -0.35, 4.6, -0.5, 0.35, 5.3, MOON),
    box(-0.6, -0.35, 4.3, 0.5, 0.35, 4.8, lighten(MOON, 0.4)),
    box(-0.1, -0.3, 5.8, 0.7, 0.3, 6.3, GOLD),
    box(0.05, -0.3, 5.6, 0.55, 0.3, 6.5, "#f7e58a"),
  ];
};

/** Gale's Wind: a green folding fan, wider at the top, with a lighter rib every other row */
export const fan = (): Box[] => {
  const MINT = "#4fb88e";
  const rows: Array<[number, number, number]> = [
    [1.0, 1.7, 0.6],
    [1.7, 2.5, 1.2],
    [2.5, 3.3, 1.8],
    [3.3, 4.1, 2.3],
    [4.1, 4.6, 2.5],
  ];
  return [
    ...grip(-0.8, 1.0, WOOD, 0.3),
    ...rows.map(([z0, z1, half], i) => box(-half, -0.15, z0, half, 0.15, z1, i % 2 ? lighten(MINT, 0.25) : MINT)),
    box(-0.1, 0.15, 1.0, 0.1, 0.25, 4.6, shade(MINT, 0.6)),
    box(-1.7, 0.15, 2.8, -1.3, 0.25, 4.6, shade(MINT, 0.6)),
    box(1.3, 0.15, 2.8, 1.7, 0.25, 4.6, shade(MINT, 0.6)),
  ];
};

/** X's Invisibility: a purple wizard's hat held out by its brim, tip bent over, a gold band and star */
export const wizardHat = (): Box[] => {
  const PURPLE = "#6b3fa0";
  return [
    box(-2.0, -2.0, 0.7, 2.0, 2.0, 1.0, shade(PURPLE, 0.8)),
    box(-1.3, -1.3, 1.0, 1.3, 1.3, 2.1, PURPLE),
    box(-1.35, -1.35, 1.0, 1.35, 1.35, 1.4, GOLD),
    box(-0.9, -0.9, 2.1, 0.9, 0.9, 3.1, PURPLE),
    box(-0.55, -0.55, 3.1, 0.55, 0.55, 4.0, PURPLE),
    box(-0.3, -0.3, 4.0, 0.9, 0.3, 4.5, lighten(PURPLE, 0.15)),
    box(0.5, -0.25, 3.7, 0.95, 0.25, 4.1, lighten(PURPLE, 0.15)),
    box(-0.3, 0.9, 2.3, 0.3, 1.0, 2.9, "#f7e58a"),
  ];
};

/** Fire Wand: a dark rod whose tip burns red to yellow */
export const fireWand = (): Box[] => [
  ...grip(-0.8, 4.0, "#5a2a1e", 0.35),
  box(-0.45, -0.45, 3.4, 0.45, 0.45, 3.8, GOLD),
  box(-0.75, -0.75, 4.0, 0.75, 0.75, 5.0, "#d8402a"),
  box(-0.5, -0.5, 5.0, 0.5, 0.5, 5.8, "#f7a530"),
  box(-0.25, -0.25, 5.8, 0.25, 0.25, 6.5, "#fff07a"),
  box(-1.0, -0.3, 4.4, 1.0, 0.3, 4.8, "#e3732c"),
];

/** Ice Wand: a pale rod with a long ice crystal at the tip */
export const iceWand = (): Box[] => {
  const ICE = "#8fd8f0";
  return [
    ...grip(-0.8, 4.0, "#7a90a8", 0.35),
    box(-0.45, -0.45, 3.4, 0.45, 0.45, 3.8, STEEL),
    box(-0.5, -0.5, 4.0, 0.5, 0.5, 6.4, ICE),
    box(-0.8, -0.3, 4.4, 0.8, 0.3, 5.8, ICE),
    box(-0.3, -0.8, 4.4, 0.3, 0.8, 5.8, lighten(ICE, 0.2)),
    box(-0.2, -0.2, 6.4, 0.2, 0.2, 7.0, lighten(ICE, 0.6)),
    box(-0.15, 0.5, 4.6, 0.15, 0.6, 6.0, WHITE),
  ];
};

/** Bottles: an empty glass bottle, pale blue, with a cork and a shine */
export const bottle = (): Box[] => {
  const GLASS = "#9ed4e6";
  return [
    box(-1.0, -1.0, 0.8, 1.0, 1.0, 3.0, GLASS),
    box(-0.9, -0.9, 0.75, 0.9, 0.9, 1.0, shade(GLASS, 0.8)),
    box(-0.5, -0.5, 3.0, 0.5, 0.5, 3.9, lighten(GLASS, 0.2)),
    box(-0.6, -0.6, 3.9, 0.6, 0.6, 4.5, WOOD_L),
    box(-0.15, 1.0, 1.4, 0.2, 1.08, 2.6, WHITE),
  ];
};

/** Portal Home: a gold hand mirror holding a swirl of blue portal */
export const portalMirror = (): Box[] => {
  const PORTAL = "#3f6fe0";
  return [
    ...grip(-0.8, 1.4, GOLD_D, 0.35),
    box(-0.8, -0.35, 1.4, 0.8, 0.35, 1.9, GOLD),
    box(-1.5, -0.35, 1.9, 1.5, 0.35, 4.9, GOLD),
    box(-0.8, -0.35, 4.9, 0.8, 0.35, 5.4, GOLD),
    box(-1.15, 0.35, 2.2, 1.15, 0.5, 4.6, PORTAL),
    box(-0.6, 0.35, 1.9, 0.6, 0.5, 4.9, PORTAL),
    box(-0.5, 0.5, 2.8, 0.5, 0.6, 4.0, lighten(PORTAL, 0.35)),
    box(-0.15, 0.6, 3.2, 0.15, 0.68, 3.6, WHITE),
  ];
};
