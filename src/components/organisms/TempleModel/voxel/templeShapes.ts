import type { Box, MeshData } from "@/components/organisms/HeroModel/voxel/mesh";
import { buildMeshData } from "@/components/organisms/HeroModel/voxel/mesh";

export type TempleId =
  | "wind-temple"
  | "earth-temple"
  | "water-temple"
  | "fire-temple"
  | "ice-temple"
  | "light-temple"
  | "shadow-temple"
  | "storm-temple"
  | "moon-temple";

const b = (x: number, y: number, z: number, w: number, h: number, d: number, color: string): Box => ({
  x,
  y,
  z,
  w,
  h,
  d,
  color,
});

/** Wind Temple: Slender pagoda/minaret with cloud-white and sky-blue tiers and gold apex */
const windTempleBoxes = (): Box[] => [
  b(-5, 0, -5, 10, 1.5, 10, "#d8e6ed"),
  b(-4, 1.5, -4, 8, 1, 8, "#b9d3e3"),
  b(-3.5, 2.5, -3.5, 1, 4, 1, "#7eb2d6"),
  b(2.5, 2.5, -3.5, 1, 4, 1, "#7eb2d6"),
  b(-3.5, 2.5, 2.5, 1, 4, 1, "#7eb2d6"),
  b(2.5, 2.5, 2.5, 1, 4, 1, "#7eb2d6"),
  b(-2, 2.5, -2, 4, 4, 4, "#eaf4fb"),
  b(-3.5, 6.5, -3.5, 7, 1, 7, "#3577a8"),
  b(-2.5, 7.5, -2.5, 5, 3.5, 5, "#eaf4fb"),
  b(-3, 11, -3, 6, 1, 6, "#3577a8"),
  b(-1.5, 12, -1.5, 3, 3, 3, "#f4faff"),
  b(-2, 15, -2, 4, 0.8, 4, "#d9a738"),
  b(-0.5, 15.8, -0.5, 1, 3.5, 1, "#f7d057"),
];

/** Earth Temple: Ancient stone ziggurat wrapped in moss with overgrown heavy lintels */
const earthTempleBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 2, 12, "#3d4b3f"),
  b(-5, 2, -5, 10, 2, 10, "#4f6352"),
  b(-4, 4, -4, 8, 2, 8, "#657d69"),
  b(-3.5, 6, -3.5, 1.5, 4, 1.5, "#3b4d3e"),
  b(2, 6, -3.5, 1.5, 4, 1.5, "#3b4d3e"),
  b(-3.5, 6, 2, 1.5, 4, 1.5, "#3b4d3e"),
  b(2, 6, 2, 1.5, 4, 1.5, "#3b4d3e"),
  b(-2, 6, -2, 4, 4, 4, "#2d3c30"),
  b(-4, 10, -4, 8, 1.5, 8, "#7a947f"),
  b(-2.5, 11.5, -2.5, 5, 2, 5, "#3e5241"),
  b(-1.5, 13.5, -1.5, 3, 2, 3, "#8fae95"),
  b(-0.8, 15.5, -0.8, 1.6, 1.8, 1.6, "#5b775f"),
];

/** Water Temple: Sunken aquamarine terrace with turquoise columns and sapphire crystal dome */
const waterTempleBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1.5, 12, "#1b445d"),
  b(-5, 1.5, -5, 10, 1.5, 10, "#2b698f"),
  b(-4.5, 3, -4.5, 1.2, 4.5, 1.2, "#40a5cc"),
  b(3.3, 3, -4.5, 1.2, 4.5, 1.2, "#40a5cc"),
  b(-4.5, 3, 3.3, 1.2, 4.5, 1.2, "#40a5cc"),
  b(3.3, 3, 3.3, 1.2, 4.5, 1.2, "#40a5cc"),
  b(-2.5, 3, -2.5, 5, 4.5, 5, "#6cd4f0"),
  b(-4.5, 7.5, -4.5, 9, 1.2, 9, "#1d587a"),
  b(-3.5, 8.7, -3.5, 7, 2.5, 7, "#3ba2c7"),
  b(-2.5, 11.2, -2.5, 5, 2, 5, "#7ee4fb"),
  b(-1.5, 13.2, -1.5, 3, 2, 3, "#b4f4ff"),
  b(-0.6, 15.2, -0.6, 1.2, 2.2, 1.2, "#00c8ff"),
];

/** Fire Temple: Basalt fortress with glowing magma conduits and ember battlements */
const fireTempleBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11, 2, 11, "#231818"),
  b(-5, 2, -5, 10, 1, 10, "#e84b23"),
  b(-4.5, 3, -4.5, 9, 3, 9, "#382323"),
  b(-5, 6, -5, 1.8, 4, 1.8, "#522f2f"),
  b(3.2, 6, -5, 1.8, 4, 1.8, "#522f2f"),
  b(-5, 6, 3.2, 1.8, 4, 1.8, "#522f2f"),
  b(3.2, 6, 3.2, 1.8, 4, 1.8, "#522f2f"),
  b(-3, 6, -3, 6, 4, 6, "#ff6b2b"),
  b(-3.5, 10, -3.5, 7, 1.5, 7, "#351e1e"),
  b(-2.5, 11.5, -2.5, 5, 3, 5, "#f35a22"),
  b(-1.5, 14.5, -1.5, 3, 2, 3, "#ff9534"),
  b(-0.8, 16.5, -0.8, 1.6, 1.6, 1.6, "#ffd447"),
];

/** Ice Temple: Frosted crystal citadel with sharp pinnacles and glacial cyan walls */
const iceTempleBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11, 1.8, 11, "#89b9cb"),
  b(-4.5, 1.8, -4.5, 9, 1.5, 9, "#bde3f0"),
  b(-4, 3.3, -4, 8, 4, 8, "#dcf4fc"),
  b(-4.5, 3.3, -4.5, 1.4, 5.5, 1.4, "#6faec4"),
  b(3.1, 3.3, -4.5, 1.4, 5.5, 1.4, "#6faec4"),
  b(-4.5, 3.3, 3.1, 1.4, 5.5, 1.4, "#6faec4"),
  b(3.1, 3.3, 3.1, 1.4, 5.5, 1.4, "#6faec4"),
  b(-3.5, 7.3, -3.5, 7, 1.2, 7, "#589bb3"),
  b(-2.5, 8.5, -2.5, 5, 3.5, 5, "#d5f3fd"),
  b(-3, 12, -3, 6, 1, 6, "#71b8d2"),
  b(-1.5, 13, -1.5, 3, 3, 3, "#f0fbff"),
  b(-0.6, 16, -0.6, 1.2, 3, 1.2, "#ffffff"),
];

/** Light Temple: Sandstone sun cathedral with gilded obelisk dome and golden sun crest */
const lightTempleBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1.8, 12, "#eedcb5"),
  b(-5, 1.8, -5, 10, 1.5, 10, "#e2c99a"),
  b(-4, 3.3, -4, 1.2, 4.5, 1.2, "#cfab69"),
  b(2.8, 3.3, -4, 1.2, 4.5, 1.2, "#cfab69"),
  b(-4, 3.3, 2.8, 1.2, 4.5, 1.2, "#cfab69"),
  b(2.8, 3.3, 2.8, 1.2, 4.5, 1.2, "#cfab69"),
  b(-2.5, 3.3, -2.5, 5, 4.5, 5, "#fff7e3"),
  b(-4.5, 7.8, -4.5, 9, 1.2, 9, "#e0b852"),
  b(-3, 9, -3, 6, 3, 6, "#fff4d4"),
  b(-3.5, 12, -3.5, 7, 1, 7, "#f5c53d"),
  b(-1.8, 13, -1.8, 3.6, 2.5, 3.6, "#ffdf6d"),
  b(-0.8, 15.5, -0.8, 1.6, 3, 1.6, "#ffe987"),
];

/** Shadow Temple: Dark gothic crypt with obsidian pillars and luminous violet braziers */
const shadowTempleBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11, 2, 11, "#17101f"),
  b(-4.5, 2, -4.5, 9, 1.8, 9, "#251a33"),
  b(-4.2, 3.8, -4.2, 1.5, 5, 1.5, "#3d2257"),
  b(2.7, 3.8, -4.2, 1.5, 5, 1.5, "#3d2257"),
  b(-4.2, 3.8, 2.7, 1.5, 5, 1.5, "#3d2257"),
  b(2.7, 3.8, 2.7, 1.5, 5, 1.5, "#3d2257"),
  b(-2.5, 3.8, -2.5, 5, 5, 5, "#1f152b"),
  b(-4.5, 8.8, -4.5, 9, 1.2, 9, "#592b82"),
  b(-3, 10, -3, 6, 3, 6, "#2c1c3f"),
  b(-2, 13, -2, 4, 2, 4, "#7333ab"),
  b(-1.2, 15, -1.2, 2.4, 2, 2.4, "#a855f7"),
  b(-0.6, 17, -0.6, 1.2, 1.5, 1.2, "#d8b4fe"),
];

/** Storm Temple: Cloud slate citadel with lightning rods and electric gold energy core */
const stormTempleBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11, 2, 11, "#273238"),
  b(-4.5, 2, -4.5, 9, 1.5, 9, "#3b4a52"),
  b(-4, 3.5, -4, 1.4, 4.5, 1.4, "#4f626c"),
  b(2.6, 3.5, -4, 1.4, 4.5, 1.4, "#4f626c"),
  b(-4, 3.5, 2.6, 1.4, 4.5, 1.4, "#4f626c"),
  b(2.6, 3.5, 2.6, 1.4, 4.5, 1.4, "#4f626c"),
  b(-2.5, 3.5, -2.5, 5, 4.5, 5, "#303d44"),
  b(-4.5, 8, -4.5, 9, 1.2, 9, "#21292e"),
  b(-3, 9.2, -3, 6, 3, 6, "#ffcc00"),
  b(-2, 12.2, -2, 4, 2, 4, "#41545e"),
  b(-1.2, 14.2, -1.2, 2.4, 2, 2.4, "#ffe066"),
  b(-0.4, 16.2, -0.4, 0.8, 3.2, 0.8, "#00e5ff"),
];

/** Moon Temple: Pearlescent marble observatory with crescent crown monument */
const moonTempleBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11, 1.8, 11, "#bcc4cb"),
  b(-4.5, 1.8, -4.5, 9, 1.5, 9, "#d6dee4"),
  b(-4, 3.3, -4, 1.2, 4.5, 1.2, "#8f9da8"),
  b(2.8, 3.3, -4, 1.2, 4.5, 1.2, "#8f9da8"),
  b(-4, 3.3, 2.8, 1.2, 4.5, 1.2, "#8f9da8"),
  b(2.8, 3.3, 2.8, 1.2, 4.5, 1.2, "#8f9da8"),
  b(-2.5, 3.3, -2.5, 5, 4.5, 5, "#eef3f7"),
  b(-4.5, 7.8, -4.5, 9, 1.2, 9, "#708291"),
  b(-3, 9, -3, 6, 3, 6, "#d8e1e7"),
  b(-2, 12, -2, 4, 2, 4, "#596875"),
  b(-1.5, 14, -1.5, 3, 2, 3, "#f5f8fa"),
  b(-1, 16, -0.5, 2, 2.5, 1, "#fcd34d"),
];

const TEMPLE_BOX_GENERATORS: Record<string, () => Box[]> = {
  "wind-temple": windTempleBoxes,
  "earth-temple": earthTempleBoxes,
  "water-temple": waterTempleBoxes,
  "fire-temple": fireTempleBoxes,
  "ice-temple": iceTempleBoxes,
  "light-temple": lightTempleBoxes,
  "shadow-temple": shadowTempleBoxes,
  "storm-temple": stormTempleBoxes,
  "lightning-temple": stormTempleBoxes,
  "moon-temple": moonTempleBoxes,
};

export const getTempleBoxes = (templeId: string): Box[] => {
  const generator = TEMPLE_BOX_GENERATORS[templeId] ?? windTempleBoxes;
  return generator();
};

export const buildTempleMeshData = (templeId: string): MeshData => {
  const boxes = getTempleBoxes(templeId);
  return buildMeshData(boxes);
};
