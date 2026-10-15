import { box, lighten, PALETTE, shade } from "./shape";
import type { Box } from "./shape";

/**
 * Something carried in a fist. Boxes are in HAND space: the origin is the centre of the hand, +Z points along
 * the way the item sticks out of the fist (the arm lifts forward by `raise` so a blade ends up pointing up and
 * forward), +X is across, +Y is the item's thickness.
 */
export interface Held {
  kind: HeldKind;
  boxes: Box[];
  /** Radians the arm lifts forward at rest */
  raise: number;
}

export type HeldKind = "sword" | "shield" | "wand" | "book" | "axe" | "hammer" | "bow" | "potion" | "torch";

const STEEL = PALETTE.steel;
const STEEL_D = shade(PALETTE.steel, 0.72);
const WOOD = "#7a4a25";
const WOOD_L = "#9a6a3a";
const GOLD = PALETTE.gold;

/** Which shape an icon name asks for. Order matters: first match wins. */
const KINDS: Array<[RegExp, HeldKind]> = [
  [/shield|helmet-safety/, "shield"],
  [/wand|staff|magic|sparkle|hat-wizard|star/, "wand"],
  [/book|scroll|journal|bookmark|dice-d20|feather/, "book"],
  [/bow|archery/, "bow"],
  [/flask|potion|vial|bottle|mug|glass|prescription/, "potion"],
  [/torch|fire|flame|lantern|lightbulb|candle/, "torch"],
  [/axe|pickaxe|hatchet|shovel|spade|broom/, "axe"],
  [/hammer|wrench|gavel|screwdriver|tools|mallet|toolbox/, "hammer"],
  [/sword|dagger|knife|cut|swords|crosshairs|skull|bone|bolt|lightning|gun|key|spear|fish|carrot|baseball/, "sword"],
];

export const heldKind = (icon?: string | null): HeldKind | null => {
  const name = (icon ?? "").toLowerCase().trim();
  if (!name) return null;
  for (const [pattern, kind] of KINDS) {
    const isMatch = pattern.test(name);
    if (isMatch) return kind;
  }
  return "hammer"; // an unknown icon is still "a tool"
};

/** A stack of wider-to-narrower slices makes a heater shield; `rim` is the outer plate, `face` the inset */
const shield = (): Box[] => {
  const layers: Array<[number, number, number]> = [
    [0.5, 2.5, 2.0],
    [-0.5, 0.5, 1.75],
    [-1.5, -0.5, 1.25],
    [-2.5, -1.5, 0.55],
  ];
  const out: Box[] = [];
  layers.forEach(([y0, y1, half]) => {
    out.push(box(-half, y0, 1, half, y1, 1.75, STEEL));
    out.push(box(-half + 0.5, y0 + (y0 === -2.5 ? 0.3 : 0), 1.75, half - 0.5, y1 - (y1 === 2.5 ? 0.5 : 0), 2.0, "#2f5fb3"));
  });
  out.push(box(-0.3, -1.3, 2.0, 0.3, 1.8, 2.2, GOLD), box(-1.1, 0.4, 2.0, 1.1, 1.0, 2.2, GOLD));
  out.push(box(-0.5, -0.5, 0.2, 0.5, 0.5, 1, WOOD));
  return out;
};

const sword = (): Box[] => [
  box(-0.4, -0.4, -0.8, 0.4, 0.4, 1.2, WOOD),
  box(-0.5, -0.5, -1.2, 0.5, 0.5, -0.8, GOLD),
  box(-1.6, -0.4, 1.2, 1.6, 0.4, 1.8, GOLD),
  box(-0.55, -0.3, 1.8, 0.55, 0.3, 6.6, STEEL),
  box(-0.12, -0.35, 1.8, 0.12, 0.35, 6.6, lighten(STEEL, 0.55)),
  box(-0.3, -0.25, 6.6, 0.3, 0.25, 7.4, STEEL),
];

const wand = (): Box[] => [
  box(-0.35, -0.35, -0.8, 0.35, 0.35, 4, WOOD),
  box(-0.45, -0.45, 3.4, 0.45, 0.45, 3.8, GOLD),
  box(-0.7, -0.7, 4, 0.7, 0.7, 5.4, "#f2d34a"),
  box(-1.3, -0.3, 4.4, 1.3, 0.3, 5, "#f7e58a"),
  box(-0.3, -1.3, 4.4, 0.3, 1.3, 5, "#f7e58a"),
];

const book = (): Box[] => [
  box(-1.6, -0.55, 0.6, 1.6, -0.25, 4.8, "#6b3fa0"),
  box(-1.4, -0.25, 0.8, 1.4, 0.25, 4.6, "#f1e6c8"),
  box(-1.6, 0.25, 0.6, 1.6, 0.55, 4.8, "#6b3fa0"),
  box(-1.65, -0.55, 0.6, -1.4, 0.55, 4.8, shade("#6b3fa0", 0.8)),
  box(-0.5, 0.55, 2.0, 0.5, 0.7, 3.4, GOLD),
];

const hammer = (): Box[] => [
  box(-0.4, -0.4, -1, 0.4, 0.4, 4.8, WOOD),
  box(-0.5, -0.5, -1.1, 0.5, 0.5, -0.5, WOOD_L),
  box(-1.6, -1, 4.2, 1.6, 1, 5.8, STEEL),
  box(-1.6, -1, 4.2, 1.6, -0.6, 5.8, STEEL_D),
];

const axe = (): Box[] => [
  box(-0.4, -0.4, -1, 0.4, 0.4, 5.2, WOOD),
  box(-0.5, -0.5, -1.1, 0.5, 0.5, -0.5, WOOD_L),
  box(-0.7, -1.2, 3.8, 0.7, 1.2, 5.4, STEEL_D),
  box(-0.4, 1.2, 4, 0.4, 2.2, 5.6, STEEL),
  box(-0.4, -2.2, 3.8, 0.4, -1.2, 5.4, STEEL),
];

const bow = (): Box[] => [
  box(-0.4, -0.4, -0.5, 0.4, 0.4, 0.9, WOOD_L),
  box(-0.3, 0.4, 0.6, 0.3, 1.6, 1.4, WOOD),
  box(-0.3, 1.6, 1.2, 0.3, 2.8, 1.9, WOOD),
  box(-0.3, 2.8, 0.7, 0.3, 3.5, 1.3, WOOD),
  box(-0.3, -1.6, 0.6, 0.3, -0.4, 1.4, WOOD),
  box(-0.3, -2.8, 1.2, 0.3, -1.6, 1.9, WOOD),
  box(-0.3, -3.5, 0.7, 0.3, -2.8, 1.3, WOOD),
  box(-0.08, -3.5, 0.5, 0.08, 3.5, 0.62, lighten("#e8d5a8", 0.3)),
];

const potion = (): Box[] => [
  box(-0.9, -0.9, 0.8, 0.9, 0.9, 2.6, "#c54a8a"),
  box(-0.9, -0.9, 0.8, 0.9, 0.9, 1.2, lighten("#c54a8a", 0.3)),
  box(-0.45, -0.45, 2.6, 0.45, 0.45, 3.4, "#d9e7ee"),
  box(-0.55, -0.55, 3.4, 0.55, 0.55, 3.9, WOOD_L),
  box(-0.12, -0.95, 1.5, 0.12, -0.9, 2.2, "#ffffff"),
];

const torch = (): Box[] => [
  box(-0.4, -0.4, -1, 0.4, 0.4, 3.8, WOOD),
  box(-0.7, -0.7, 3.8, 0.7, 0.7, 4.4, shade(WOOD, 0.7)),
  box(-0.7, -0.7, 4.4, 0.7, 0.7, 5.6, "#e3732c"),
  box(-0.4, -0.4, 5.6, 0.4, 0.4, 6.4, "#f7d34a"),
];

const BUILDERS: Record<HeldKind, () => Box[]> = { sword, shield, wand, book, hammer, axe, bow, potion, torch };

/** How far the arm lifts to carry each kind (a shield stays near the body, blades point up) */
const RAISE: Record<HeldKind, number> = {
  sword: 0.85,
  shield: 0.35,
  wand: 0.95,
  book: 1.15,
  hammer: 0.95,
  axe: 0.95,
  bow: 0.7,
  potion: 0.8,
  torch: 1.05,
};

/** A small shape for the icon name in the hand, or null when the hand is empty */
export const held = (iconName?: string | null): Held | null => {
  const kind = heldKind(iconName);
  if (!kind) return null;
  return { kind, boxes: BUILDERS[kind](), raise: RAISE[kind] };
};
