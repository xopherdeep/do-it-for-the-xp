import type { Box, MeshData } from "@/components/organisms/HeroModel/voxel/mesh";
import { buildMeshData } from "@/components/organisms/HeroModel/voxel/mesh";

export type DungeonRoomKind =
  | "loot"
  | "empty-chest"
  | "key"
  | "health"
  | "mana"
  | "camp"
  | "puzzle"
  | "teleport"
  | "shop"
  | "save"
  | "master"
  | "secret"
  | "stairs-up"
  | "stairs-down"
  | "entrance"
  | "gate"
  | "trap"
  | "pit"
  | "void"
  | "empty"
  | "cleared";

export interface DungeonRoomShapeOptions {
  isEmpty?: boolean;
  isBoss?: boolean;
  cleared?: boolean;
  /** A cleared combat room whose bones the hero has already searched: the spoils are gone */
  searched?: boolean;
}

const b = (x: number, y: number, z: number, w: number, h: number, d: number, color: string): Box => ({
  x,
  y,
  z,
  w,
  h,
  d,
  color,
});

/** Standard oak treasure chest with iron brackets, curved lid, golden ribs, lock and coins */
export const oakTreasureChestBoxes = (): Box[] => [
  b(-5.5, 0, -5, 11, 0.6, 10, "#3e2723"),
  b(3.2, 0.6, 2.2, 1.4, 0.8, 1.4, "#ffd700"),
  b(4.0, 0.6, 0.8, 1.2, 0.6, 1.2, "#ffc107"),
  b(-4.5, 0.6, 2.5, 1.2, 0.6, 1.2, "#ffd700"),
  b(-3.8, 0.6, 3.2, 1.0, 0.5, 1.0, "#ffea00"),
  b(-4.2, 0.6, -3.8, 8.4, 4.4, 7.6, "#5d4037"),
  b(-4.4, 0.6, -4.0, 1.2, 4.4, 1.2, "#37474f"),
  b(3.2, 0.6, -4.0, 1.2, 4.4, 1.2, "#37474f"),
  b(-4.4, 0.6, 2.8, 1.2, 4.4, 1.2, "#37474f"),
  b(3.2, 0.6, 2.8, 1.2, 4.4, 1.2, "#37474f"),
  b(-0.8, 0.6, -3.9, 1.6, 4.4, 7.8, "#ffd700"),
  b(-4.2, 5.0, -3.8, 8.4, 1.5, 7.6, "#6d4c41"),
  b(-3.6, 6.5, -3.4, 7.2, 1.3, 6.8, "#6d4c41"),
  b(-2.8, 7.8, -2.6, 5.6, 0.9, 5.2, "#795548"),
  b(-0.8, 5.0, -3.9, 1.6, 3.8, 7.8, "#ffd700"),
  b(-1.1, 3.4, 3.82, 2.2, 2.4, 0.7, "#ffd700"),
  b(-0.7, 5.6, 3.82, 1.4, 1.2, 0.5, "#fbc02d"),
  b(-0.3, 4.0, 4.54, 0.6, 1.0, 0.1, "#212121"),
];

/** Boss / Master treasure chest with crimson trunk, gold trim, and inset ruby */
export const bossTreasureChestBoxes = (): Box[] => [
  b(-5.5, 0, -5, 11, 0.6, 10, "#3e2723"),
  b(3.2, 0.6, 2.2, 1.4, 0.8, 1.4, "#ffd700"),
  b(4.0, 0.6, 0.8, 1.2, 0.6, 1.2, "#ffc107"),
  b(-4.5, 0.6, 2.5, 1.2, 0.6, 1.2, "#ffd700"),
  b(-3.8, 0.6, 3.2, 1.0, 0.5, 1.0, "#e53935"),
  b(-4.2, 0.6, -3.8, 8.4, 4.4, 7.6, "#7f0000"),
  b(-4.4, 0.6, -4.0, 1.2, 4.4, 1.2, "#ffb300"),
  b(3.2, 0.6, -4.0, 1.2, 4.4, 1.2, "#ffb300"),
  b(-4.4, 0.6, 2.8, 1.2, 4.4, 1.2, "#ffb300"),
  b(3.2, 0.6, 2.8, 1.2, 4.4, 1.2, "#ffb300"),
  b(-0.8, 0.6, -3.9, 1.6, 4.4, 7.8, "#ffea00"),
  b(-4.2, 5.0, -3.8, 8.4, 1.5, 7.6, "#b71c1c"),
  b(-3.6, 6.5, -3.4, 7.2, 1.3, 6.8, "#c62828"),
  b(-2.8, 7.8, -2.6, 5.6, 0.9, 5.2, "#d32f2f"),
  b(-0.8, 5.0, -3.9, 1.6, 3.8, 7.8, "#ffea00"),
  b(-1.1, 3.4, 3.82, 2.2, 2.4, 0.7, "#ffd700"),
  b(-0.7, 5.6, 3.82, 1.4, 1.2, 0.5, "#fbc02d"),
  b(-0.3, 4.0, 4.54, 0.6, 1.0, 0.1, "#212121"),
  b(-0.5, 4.8, 4.54, 1.0, 1.0, 0.2, "#ff1744"),
];

export const treasureChestBoxes = (isBoss = false): Box[] => {
  if (isBoss) {
    return bossTreasureChestBoxes();
  }
  return oakTreasureChestBoxes();
};

/** Open empty treasure chest: open lid tilted back, empty hollow body */
export const emptyChestBoxes = (): Box[] => [
  b(-5.5, 0, -5, 11, 0.6, 10, "#3e2723"),
  b(-4.2, 0.6, 2.8, 8.4, 4.4, 1.0, "#4e342e"),
  b(-4.2, 0.6, -3.8, 8.4, 4.4, 1.0, "#4e342e"),
  b(-4.2, 0.6, -2.8, 1.0, 4.4, 5.6, "#4e342e"),
  b(3.2, 0.6, -2.8, 1.0, 4.4, 5.6, "#4e342e"),
  b(-3.2, 0.6, -2.8, 6.4, 0.6, 5.6, "#212121"),
  b(-4.4, 0.6, -4.0, 1.2, 4.4, 1.2, "#37474f"),
  b(3.2, 0.6, -4.0, 1.2, 4.4, 1.2, "#37474f"),
  b(-4.4, 0.6, 2.8, 1.2, 4.4, 1.2, "#37474f"),
  b(3.2, 0.6, 2.8, 1.2, 4.4, 1.2, "#37474f"),
  b(-4.2, 4.8, -5.2, 8.4, 4.0, 1.4, "#5d4037"),
  b(-3.6, 8.6, -5.8, 7.2, 2.2, 1.2, "#6d4c41"),
  b(-0.8, 4.8, -5.4, 1.6, 6.0, 1.6, "#9e9e9e"),
];

/** Dungeon Key: stone plinth with floating ornate gold skeleton key */
export const keyBoxes = (): Box[] => [
  b(-4.0, 0, -4.0, 8.0, 1.2, 8.0, "#37474f"),
  b(-3.0, 1.2, -3.0, 6.0, 0.6, 6.0, "#546e7a"),
  b(-2.0, 1.8, -2.0, 4.0, 0.4, 4.0, "#ffd700"),
  b(-0.5, 4.0, -0.5, 1.0, 6.5, 1.0, "#ffd700"),
  b(-2.0, 10.5, -0.5, 4.0, 0.8, 1.0, "#ffd700"),
  b(-2.0, 8.5, -0.5, 0.8, 2.0, 1.0, "#ffd700"),
  b(1.2, 8.5, -0.5, 0.8, 2.0, 1.0, "#ffd700"),
  b(-1.4, 7.8, -0.5, 2.8, 0.8, 1.0, "#ffd700"),
  b(-0.4, 8.8, -0.4, 0.8, 1.2, 0.8, "#ffe082"),
  b(0.5, 4.5, -0.5, 1.8, 0.8, 1.0, "#ffc107"),
  b(0.5, 6.0, -0.5, 1.4, 0.8, 1.0, "#ffc107"),
];

/** Healing Spring: carved stone basin with crystal water and floating red heart */
export const healthSpringBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11.0, 1.2, 11.0, "#455a64"),
  b(-5.0, 1.2, -5.0, 10.0, 3.2, 1.2, "#607d8b"),
  b(-5.0, 1.2, 3.8, 10.0, 3.2, 1.2, "#607d8b"),
  b(-5.0, 1.2, -3.8, 1.2, 3.2, 7.6, "#607d8b"),
  b(3.8, 1.2, -3.8, 1.2, 3.2, 7.6, "#607d8b"),
  b(-3.8, 1.2, -3.8, 7.6, 0.6, 7.6, "#263238"),
  b(-3.8, 1.8, -3.8, 7.6, 2.2, 7.6, "#00e5ff"),
  b(-1.2, 1.8, -1.2, 2.4, 3.8, 2.4, "#78909c"),
  b(-1.8, 6.8, -0.5, 3.6, 1.4, 1.0, "#e53935"),
  b(-2.4, 7.8, -0.5, 2.2, 1.8, 1.0, "#e53935"),
  b(0.2, 7.8, -0.5, 2.2, 1.8, 1.0, "#e53935"),
  b(-1.2, 5.8, -0.5, 2.4, 1.0, 1.0, "#c62828"),
  b(-0.6, 5.0, -0.5, 1.2, 0.8, 1.0, "#b71c1c"),
];

/** Mana Spring: obsidian font with glowing violet mana and floating crystal cluster */
export const manaSpringBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11.0, 1.2, 11.0, "#263238"),
  b(-5.0, 1.2, -5.0, 10.0, 3.2, 1.2, "#37474f"),
  b(-5.0, 1.2, 3.8, 10.0, 3.2, 1.2, "#37474f"),
  b(-5.0, 1.2, -3.8, 1.2, 3.2, 7.6, "#37474f"),
  b(3.8, 1.2, -3.8, 1.2, 3.2, 7.6, "#37474f"),
  b(-3.8, 1.8, -3.8, 7.6, 2.2, 7.6, "#7c4dff"),
  b(-1.0, 5.0, -1.0, 2.0, 4.5, 2.0, "#00e5ff"),
  b(-1.8, 5.8, -0.6, 0.9, 2.8, 1.2, "#e040fb"),
  b(0.9, 5.6, -0.6, 0.9, 2.6, 1.2, "#e040fb"),
  b(-0.6, 9.5, -0.6, 1.2, 1.8, 1.2, "#18ffff"),
];

/** Camp: ring of river stones with burning oak logs and bright voxel flames */
export const campBoxes = (): Box[] => [
  b(-4.5, 0, -4.5, 9.0, 0.4, 9.0, "#3e2723"),
  b(-4.8, 0.4, -1.2, 1.8, 1.4, 2.4, "#78909c"),
  b(3.0, 0.4, -1.2, 1.8, 1.4, 2.4, "#78909c"),
  b(-2.4, 0.4, -4.6, 2.4, 1.4, 1.8, "#90a4ae"),
  b(0.4, 0.4, -4.6, 2.4, 1.4, 1.8, "#607d8b"),
  b(-2.4, 0.4, 2.8, 2.4, 1.4, 1.8, "#90a4ae"),
  b(0.4, 0.4, 2.8, 2.4, 1.4, 1.8, "#607d8b"),
  b(-3.2, 0.4, -0.8, 6.4, 1.2, 1.6, "#4e342e"),
  b(-0.8, 1.4, -3.2, 1.6, 1.2, 6.4, "#5d4037"),
  b(-1.8, 2.0, -1.8, 3.6, 2.6, 3.6, "#ff3d00"),
  b(-1.4, 4.4, -1.4, 2.8, 2.6, 2.8, "#ff9100"),
  b(-0.8, 6.8, -0.8, 1.6, 2.2, 1.6, "#ffd600"),
  b(-0.3, 8.8, -0.3, 0.6, 1.4, 0.6, "#ffff00"),
];

/** Puzzle: ancient standing stone stela with carved glowing cyan glyphs */
export const puzzleBoxes = (): Box[] => [
  b(-4.5, 0, -4.0, 9.0, 1.2, 8.0, "#37474f"),
  b(-3.0, 1.2, -2.0, 6.0, 9.5, 4.0, "#455a64"),
  b(-2.0, 2.5, 2.01, 4.0, 0.6, 0.2, "#18ffff"),
  b(-1.5, 4.2, 2.01, 3.0, 0.6, 0.2, "#18ffff"),
  b(-0.5, 5.8, 2.01, 1.0, 2.0, 0.2, "#18ffff"),
  b(-2.0, 8.5, 2.01, 4.0, 0.6, 0.2, "#18ffff"),
  b(-1.2, 6.2, 2.02, 2.4, 1.8, 0.2, "#ffd700"),
];

/** Teleport: concentric arcane rune dais with floating energy beacons */
export const teleportBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11.0, 0.8, 11.0, "#1a237e"),
  b(-4.2, 0.8, -4.2, 8.4, 0.6, 8.4, "#283593"),
  b(-2.8, 1.4, -2.8, 5.6, 0.6, 5.6, "#00e5ff"),
  b(-4.8, 1.4, -4.8, 1.4, 4.5, 1.4, "#3949ab"),
  b(3.4, 1.4, -4.8, 1.4, 4.5, 1.4, "#3949ab"),
  b(-4.8, 1.4, 3.4, 1.4, 4.5, 1.4, "#3949ab"),
  b(3.4, 1.4, 3.4, 1.4, 4.5, 1.4, "#3949ab"),
  b(-4.5, 6.2, -4.5, 0.8, 1.0, 0.8, "#80d8ff"),
  b(3.7, 6.2, -4.5, 0.8, 1.0, 0.8, "#80d8ff"),
  b(-4.5, 6.2, 3.7, 0.8, 1.0, 0.8, "#80d8ff"),
  b(3.7, 6.2, 3.7, 0.8, 1.0, 0.8, "#80d8ff"),
];

/** Shop: traveling merchant stall with striped awning and counter wares */
export const shopBoxes = (): Box[] => [
  b(-4.5, 0, -3.0, 9.0, 4.2, 5.5, "#5d4037"),
  b(-5.0, 4.2, -3.5, 10.0, 0.8, 6.5, "#8d6e63"),
  b(-3.0, 5.0, -1.0, 1.5, 1.5, 1.5, "#ffd700"),
  b(0.0, 5.0, -1.0, 1.2, 2.0, 1.2, "#e91e63"),
  b(2.2, 5.0, -1.0, 1.4, 1.2, 2.0, "#d7ccc8"),
  b(-4.6, 5.0, -3.0, 0.8, 5.5, 0.8, "#4e342e"),
  b(3.8, 5.0, -3.0, 0.8, 5.5, 0.8, "#4e342e"),
  b(-4.6, 5.0, 2.2, 0.8, 5.5, 0.8, "#4e342e"),
  b(3.8, 5.0, 2.2, 0.8, 5.5, 0.8, "#4e342e"),
  b(-5.2, 10.5, -3.5, 2.6, 1.2, 6.8, "#b71c1c"),
  b(-2.6, 10.5, -3.5, 2.6, 1.2, 6.8, "#f5f5f5"),
  b(0.0, 10.5, -3.5, 2.6, 1.2, 6.8, "#b71c1c"),
  b(2.6, 10.5, -3.5, 2.6, 1.2, 6.8, "#f5f5f5"),
];

/** Save: ornate granite plinth with hovering emerald save crystal */
export const saveBoxes = (): Box[] => [
  b(-5.0, 0, -5.0, 10.0, 1.0, 10.0, "#455a64"),
  b(-3.8, 1.0, -3.8, 7.6, 1.0, 7.6, "#546e7a"),
  b(-2.6, 2.0, -2.6, 5.2, 1.2, 5.2, "#78909c"),
  b(-2.8, 2.0, -2.8, 1.0, 1.4, 1.0, "#ffd700"),
  b(1.8, 2.0, -2.8, 1.0, 1.4, 1.0, "#ffd700"),
  b(-2.8, 2.0, 1.8, 1.0, 1.4, 1.0, "#ffd700"),
  b(1.8, 2.0, 1.8, 1.0, 1.4, 1.0, "#ffd700"),
  b(-1.6, 5.0, -1.6, 3.2, 3.2, 3.2, "#00e676"),
  b(-1.0, 4.0, -1.0, 2.0, 1.0, 2.0, "#00c853"),
  b(-1.0, 8.2, -1.0, 2.0, 1.0, 2.0, "#69f0ae"),
  b(-0.5, 9.2, -0.5, 1.0, 0.8, 1.0, "#b9f6ca"),
];

/** Master: royal gold altar with velvet cushion holding the sacred Golden Pegasus Egg */
export const masterBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11.0, 1.0, 11.0, "#263238"),
  b(-4.0, 1.0, -4.0, 8.0, 1.5, 8.0, "#ffb300"),
  b(-3.0, 2.5, -3.0, 6.0, 2.5, 6.0, "#ffd700"),
  b(-3.5, 5.0, -3.5, 7.0, 0.8, 7.0, "#ffc107"),
  b(-2.6, 5.8, -2.6, 5.2, 0.8, 5.2, "#4a148c"),
  b(-1.8, 6.6, -1.8, 3.6, 2.4, 3.6, "#ffd700"),
  b(-2.2, 8.0, -2.2, 4.4, 2.8, 4.4, "#ffe082"),
  b(-1.6, 10.4, -1.6, 3.2, 2.2, 3.2, "#fff8e1"),
  b(-0.9, 12.2, -0.9, 1.8, 1.2, 1.8, "#ffffff"),
];

/** Secret: crumbling stone alcove revealing a hidden gilded vault chest */
export const secretBoxes = (): Box[] => [
  b(-5.0, 0, -3.0, 10.0, 0.8, 6.0, "#37474f"),
  b(-4.5, 0.8, -2.5, 2.2, 7.0, 2.5, "#455a64"),
  b(2.3, 0.8, -2.5, 2.2, 7.0, 2.5, "#455a64"),
  b(-4.5, 7.8, -2.5, 9.0, 1.8, 2.5, "#546e7a"),
  b(-2.0, 0.8, -2.0, 4.0, 3.0, 4.0, "#ffb300"),
  b(-1.5, 3.8, -1.8, 3.0, 1.2, 3.6, "#ffd700"),
  b(-0.4, 2.2, 2.01, 0.8, 1.0, 0.2, "#212121"),
];

/** Stairs Up: stone steps ascending with torch sconces */
export const stairsUpBoxes = (): Box[] => [
  b(-4.5, 0, -4.5, 9.0, 1.2, 3.0, "#546e7a"),
  b(-4.5, 1.2, -1.5, 9.0, 1.6, 3.0, "#607d8b"),
  b(-4.5, 2.8, 1.5, 9.0, 2.0, 3.0, "#78909c"),
  b(-4.5, 4.8, 3.0, 9.0, 2.4, 2.0, "#90a4ae"),
  b(-4.8, 0, -4.8, 1.4, 8.5, 1.4, "#37474f"),
  b(3.4, 0, -4.8, 1.4, 8.5, 1.4, "#37474f"),
  b(-4.5, 8.5, -4.5, 0.8, 1.2, 0.8, "#ff9100"),
  b(3.7, 8.5, -4.5, 0.8, 1.2, 0.8, "#ff9100"),
];

/** Stairs Down: dark stone staircase descending into depth */
export const stairsDownBoxes = (): Box[] => [
  b(-5.0, 0, -5.0, 10.0, 1.2, 10.0, "#37474f"),
  b(-3.5, 0.4, -3.5, 7.0, 0.8, 2.4, "#455a64"),
  b(-3.5, 0.2, -1.1, 7.0, 0.6, 2.4, "#263238"),
  b(-3.5, 0.0, 1.3, 7.0, 0.4, 2.4, "#1a1a1a"),
  b(-3.5, -0.4, 2.8, 7.0, 0.4, 1.5, "#000000"),
  b(-4.5, 1.2, -4.5, 1.2, 6.0, 1.2, "#263238"),
  b(3.3, 1.2, -4.5, 1.2, 6.0, 1.2, "#263238"),
];

/** Entrance: massive stone arch with wooden double doors */
export const entranceBoxes = (): Box[] => [
  b(-5.5, 0, -2.5, 11.0, 1.0, 5.0, "#37474f"),
  b(-4.5, 1.0, -2.0, 2.4, 9.0, 4.0, "#546e7a"),
  b(2.1, 1.0, -2.0, 2.4, 9.0, 4.0, "#546e7a"),
  b(-4.5, 10.0, -2.0, 9.0, 2.2, 4.0, "#607d8b"),
  b(-2.1, 1.0, -0.5, 4.2, 8.5, 1.2, "#3e2723"),
  b(-0.2, 1.0, 0.71, 0.4, 8.5, 0.2, "#1b1b1b"),
  b(-1.0, 4.8, 0.72, 0.6, 1.0, 0.3, "#ffd700"),
  b(0.4, 4.8, 0.72, 0.6, 1.0, 0.3, "#ffd700"),
];

/** Exit Gate: towering arch with heavy iron portcullis */
export const gateBoxes = (): Box[] => [
  b(-5.5, 0, -2.5, 11.0, 1.0, 5.0, "#263238"),
  b(-4.5, 1.0, -2.0, 2.2, 10.0, 4.0, "#37474f"),
  b(2.3, 1.0, -2.0, 2.2, 10.0, 4.0, "#37474f"),
  b(-4.5, 10.5, -2.0, 9.0, 2.0, 4.0, "#455a64"),
  b(-2.3, 1.0, -0.4, 0.6, 9.5, 0.8, "#212121"),
  b(-1.0, 1.0, -0.4, 0.6, 9.5, 0.8, "#212121"),
  b(0.4, 1.0, -0.4, 0.6, 9.5, 0.8, "#212121"),
  b(1.7, 1.0, -0.4, 0.6, 9.5, 0.8, "#212121"),
  b(-2.3, 5.0, -0.5, 4.6, 0.8, 1.0, "#37474f"),
  b(-0.8, 4.2, 0.51, 1.6, 2.0, 0.6, "#ffb300"),
];

/** Spike Trap: iron frame with menacing steel spikes */
export const trapBoxes = (): Box[] => [
  b(-4.5, 0, -4.5, 9.0, 0.8, 9.0, "#37474f"),
  b(-3.5, 0.8, -3.5, 7.0, 0.4, 7.0, "#212121"),
  b(-2.5, 1.2, -2.5, 0.8, 3.5, 0.8, "#cfd8dc"),
  b(1.7, 1.2, -2.5, 0.8, 3.5, 0.8, "#cfd8dc"),
  b(-2.5, 1.2, 1.7, 0.8, 3.5, 0.8, "#cfd8dc"),
  b(1.7, 1.2, 1.7, 0.8, 3.5, 0.8, "#cfd8dc"),
  b(-0.4, 1.2, -0.4, 0.8, 4.5, 0.8, "#eceff1"),
];

/** Void / Pit: jagged rim surrounding bottomless black chasm */
export const pitBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11.0, 0.8, 11.0, "#37474f"),
  b(-4.2, 0.2, -4.2, 8.4, 0.6, 8.4, "#212121"),
  b(-3.0, 0.0, -3.0, 6.0, 0.4, 6.0, "#0a0a0a"),
  b(-1.8, -0.4, -1.8, 3.6, 0.4, 3.6, "#000000"),
];

/** Empty room: stone floor with cracked urn and rubble */
export const emptyRoomBoxes = (): Box[] => [
  b(-4.5, 0, -4.5, 9.0, 0.6, 9.0, "#455a64"),
  b(-1.8, 0.6, -1.8, 3.6, 1.0, 3.6, "#546e7a"),
  b(-1.4, 1.6, -1.4, 2.8, 3.4, 2.8, "#8d6e63"),
  b(-1.0, 5.0, -1.0, 2.0, 1.0, 2.0, "#795548"),
  b(-1.3, 5.8, -1.3, 2.6, 0.6, 2.6, "#6d4c41"),
  b(2.0, 0.6, 1.2, 1.6, 0.8, 1.2, "#78909c"),
  b(2.8, 0.6, -1.5, 1.0, 0.6, 1.0, "#607d8b"),
];

const BONE = "#efe8d8";
const BONE_SHADE = "#d9cfba";
const SOCKET = "#1a1a1a";

/** What is left of a beaten beast: a skull on a pile of bones */
const bonesBoxes = (): Box[] => [
  b(-4.5, 0, -4.5, 9.0, 0.5, 9.0, "#4e342e"),
  // Skull, staring out of the pile
  b(-1.6, 0.5, -1.4, 3.2, 2.8, 2.8, BONE),
  b(-1.3, 3.3, -1.1, 2.6, 0.6, 2.2, BONE_SHADE),
  b(-1.2, 0.5, 1.2, 2.4, 0.7, 0.6, BONE_SHADE),
  b(-1.1, 1.8, 1.35, 0.8, 0.8, 0.2, SOCKET),
  b(0.3, 1.8, 1.35, 0.8, 0.8, 0.2, SOCKET),
  b(-0.2, 1.2, 1.35, 0.4, 0.4, 0.2, SOCKET),
  // A long bone behind, knobbed at both ends
  b(-3.6, 0.5, -3.3, 6.0, 0.6, 0.6, BONE),
  b(-4.2, 0.4, -3.6, 0.9, 0.9, 1.2, BONE_SHADE),
  b(2.2, 0.4, -3.6, 0.9, 0.9, 1.2, BONE_SHADE),
  // Another across it on the right
  b(2.8, 0.5, -1.6, 0.6, 0.6, 4.6, BONE),
  b(2.5, 0.4, -2.1, 1.2, 0.9, 0.9, BONE_SHADE),
  b(2.5, 0.4, 2.8, 1.2, 0.9, 0.9, BONE_SHADE),
  // Ribs on the left
  b(-4.0, 0.5, 0.0, 0.9, 0.4, 3.2, BONE_SHADE),
  b(-3.8, 0.5, 0.2, 0.5, 1.4, 0.5, BONE),
  b(-3.8, 0.5, 1.2, 0.5, 1.6, 0.5, BONE),
  b(-3.8, 0.5, 2.2, 0.5, 1.2, 0.5, BONE),
];

/** The spoils still lying among the bones until the hero searches them: a pouch and spilled coins */
const spoilsBoxes = (): Box[] => [
  b(-3.0, 0.5, -2.2, 1.8, 1.5, 1.6, "#8d6e63"),
  b(-2.6, 2.0, -1.9, 1.0, 0.4, 1.0, "#5d4037"),
  b(-2.5, 2.4, -1.8, 0.8, 0.3, 0.8, "#ffd700"),
  b(0.8, 0.5, 2.6, 0.9, 0.3, 0.9, "#ffd700"),
  b(-0.4, 0.5, 3.1, 0.8, 0.3, 0.8, "#ffc107"),
  b(1.9, 0.5, 1.6, 0.7, 0.3, 0.7, "#ffea00"),
];

/** Cleared combat room: a pile of bones, with the beast's spoils until they are searched */
export const bonePileBoxes = (searched = false): Box[] => (searched ? bonesBoxes() : [...bonesBoxes(), ...spoilsBoxes()]);

const ROOM_FACTORIES: Record<string, (options: DungeonRoomShapeOptions) => Box[]> = {
  loot: (opts) => (opts.isEmpty ? emptyChestBoxes() : treasureChestBoxes(opts.isBoss)),
  "empty-chest": () => emptyChestBoxes(),
  lock: (opts) => treasureChestBoxes(opts.isBoss),
  key: () => keyBoxes(),
  health: () => healthSpringBoxes(),
  mana: () => manaSpringBoxes(),
  camp: () => campBoxes(),
  puzzle: () => puzzleBoxes(),
  teleport: () => teleportBoxes(),
  shop: () => shopBoxes(),
  save: () => saveBoxes(),
  master: () => masterBoxes(),
  secret: () => secretBoxes(),
  "stairs-up": () => stairsUpBoxes(),
  "stairs-down": () => stairsDownBoxes(),
  entrance: () => entranceBoxes(),
  gate: () => gateBoxes(),
  trap: () => trapBoxes(),
  pit: () => pitBoxes(),
  void: () => pitBoxes(),
  empty: () => emptyRoomBoxes(),
  cleared: (opts) => bonePileBoxes(opts.searched),
  monster: (opts) => (opts.cleared ? bonePileBoxes(opts.searched) : emptyRoomBoxes()),
  miniboss: (opts) => (opts.cleared ? bonePileBoxes(opts.searched) : emptyRoomBoxes()),
  boss: (opts) => (opts.cleared ? bonePileBoxes(opts.searched) : emptyRoomBoxes()),
};

export const getDungeonRoomBoxes = (roomType: string, options: DungeonRoomShapeOptions = {}): Box[] => {
  const isClearedCombat = Boolean(options.cleared && ["monster", "miniboss", "boss"].includes(roomType));
  if (isClearedCombat) {
    return bonePileBoxes(options.searched);
  }
  const factory = ROOM_FACTORIES[roomType] || ROOM_FACTORIES.empty;
  return factory(options);
};

export const buildDungeonRoomMeshData = (roomType: string, options: DungeonRoomShapeOptions = {}): MeshData => {
  const boxes = getDungeonRoomBoxes(roomType, options);
  return buildMeshData(boxes);
};
