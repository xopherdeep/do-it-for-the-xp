import type { Box, MeshData } from "@/components/organisms/HeroModel/voxel/mesh";
import { buildMeshData } from "@/components/organisms/HeroModel/voxel/mesh";

export type StageId =
  | "world-plains"
  | "plains"
  | "world-forest"
  | "forest"
  | "world-islands"
  | "islands"
  | "world-swamps"
  | "swamps"
  | "world-mountains"
  | "mountains"
  | "world-sands"
  | "sands"
  | "world-clouds"
  | "clouds"
  | "world-ice"
  | "ice"
  | "the-moon"
  | "moon";

const b = (x: number, y: number, z: number, w: number, h: number, d: number, color: string): Box => ({
  x,
  y,
  z,
  w,
  h,
  d,
  color,
});

/** Plains: Whirling vortex tornado with swirling wind bands and floating prairie debris */
const plainsBoxes = (): Box[] => [
  b(-0.8, 0, -0.8, 1.6, 1.2, 1.6, "#c2b280"),
  b(-1.4, 1.2, -1.4, 2.8, 1.5, 2.8, "#d4e6b5"),
  b(-2.2, 2.7, -2.2, 4.4, 1.8, 4.4, "#a8d5ba"),
  b(-3.2, 4.5, -3.2, 6.4, 2.0, 6.4, "#e0f2fe"),
  b(-4.2, 6.5, -4.2, 8.4, 2.2, 8.4, "#bae6fd"),
  b(-5.2, 8.7, -5.2, 10.4, 2.4, 10.4, "#7dd3fc"),
  b(-4.0, 11.1, -4.0, 8.0, 1.5, 8.0, "#38bdf8"),
  b(-4.8, 4.2, 2.2, 1.2, 1.2, 1.2, "#84cc16"),
  b(3.8, 6.8, -3.2, 1.2, 1.2, 1.2, "#fde047"),
  b(-2.8, 8.8, -4.8, 1.4, 1.2, 1.2, "#f8fafc"),
  b(4.4, 3.2, 1.8, 1.0, 1.0, 1.0, "#a3e635"),
  b(1.2, 10.2, 4.4, 1.4, 1.2, 1.4, "#e0f2fe"),
];

/** Forest: Dense pine and deciduous trees with mossy stone and mushroom accents */
const forestBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1, 12, "#3f6212"),
  // Pine tree
  b(-2.8, 1, -1, 1.8, 4, 1.8, "#5c3d2e"),
  b(-4.8, 4, -3, 5.8, 2.2, 5.8, "#166534"),
  b(-4.2, 6.2, -2.4, 4.6, 2.2, 4.6, "#15803d"),
  b(-3.4, 8.4, -1.6, 3.0, 2.0, 3.0, "#22c55e"),
  b(-2.6, 10.4, -0.8, 1.4, 1.6, 1.4, "#4ade80"),
  // Deciduous tree
  b(2.2, 1, 0.5, 1.6, 4.5, 1.6, "#78350f"),
  b(0.2, 4.5, -1.5, 5.6, 2.8, 5.6, "#14532d"),
  b(0.8, 6.8, -0.9, 4.4, 2.5, 4.4, "#16a34a"),
  b(1.5, 9.0, -0.2, 3.0, 1.8, 3.0, "#86efac"),
  // Forest floor details
  b(3.5, 1, -3.5, 1.2, 1.0, 1.2, "#dc2626"),
  b(3.8, 0.5, -3.2, 0.6, 0.8, 0.6, "#fef2f2"),
  b(-4.5, 1, 3.2, 1.5, 0.8, 1.5, "#64748b"),
];

/** Islands: Tropical atoll with azure ocean, golden sand, and curving coconut palm */
const islandsBoxes = (): Box[] => [
  b(-6.5, 0, -6.5, 13, 0.8, 13, "#0284c7"),
  b(-5.5, 0.8, -5.5, 11, 0.6, 11, "#38bdf8"),
  b(-4.5, 1.4, -4.5, 9, 1.2, 9, "#fde047"),
  b(-3.5, 2.4, -3.5, 7, 0.8, 7, "#65a30d"),
  // Palm trunk
  b(-0.8, 3.2, -0.8, 1.6, 2.2, 1.6, "#78350f"),
  b(-0.2, 5.2, -0.5, 1.5, 2.2, 1.5, "#854d0e"),
  b(0.6, 7.2, -0.2, 1.4, 2.2, 1.4, "#92400e"),
  b(1.2, 9.2, 0.1, 1.5, 1.2, 1.5, "#713f12"),
  // Coconuts
  b(0.8, 8.8, 1.2, 1.0, 1.0, 1.0, "#451a03"),
  b(1.8, 8.8, -0.6, 1.0, 1.0, 1.0, "#451a03"),
  // Fronds
  b(0.6, 9.8, -4.2, 2.4, 0.6, 4.4, "#22c55e"),
  b(0.6, 9.8, 0.8, 2.4, 0.6, 4.4, "#16a34a"),
  b(1.8, 9.8, -0.8, 4.4, 0.6, 2.4, "#15803d"),
  b(-3.6, 9.8, -0.8, 4.4, 0.6, 2.4, "#4ade80"),
  b(0.8, 8.8, -4.8, 2.0, 1.0, 1.2, "#16a34a"),
  b(5.2, 8.8, -0.6, 1.2, 1.0, 2.0, "#15803d"),
];

/** Swamps: Sunken mossy stone skull totem rising from murky marsh ooze */
const swampsBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 0.8, 12, "#14532d"),
  b(-5, 0.8, -5, 10, 0.5, 10, "#4d7c0f"),
  b(-4, 1.2, -4, 8, 1.4, 8, "#334155"),
  b(-2.4, 2.6, -1.8, 4.8, 1.8, 4.4, "#cbd5e1"),
  b(-1.8, 3.8, 2.3, 1.0, 0.8, 0.4, "#0f172a"),
  b(0.8, 3.8, 2.3, 1.0, 0.8, 0.4, "#0f172a"),
  b(-3.4, 4.4, -2.4, 6.8, 3.2, 5.6, "#e2e8f0"),
  b(-2.4, 5.4, 2.8, 1.8, 1.8, 0.5, "#090d16"),
  b(0.6, 5.4, 2.8, 1.8, 1.8, 0.5, "#090d16"),
  b(-1.8, 5.8, 2.6, 0.8, 0.8, 0.4, "#a855f7"),
  b(1.2, 5.8, 2.6, 0.8, 0.8, 0.4, "#a855f7"),
  b(-0.5, 4.8, 2.8, 1.0, 1.0, 0.5, "#0f172a"),
  b(-3.2, 7.6, -2.2, 6.4, 2.2, 5.2, "#f1f5f9"),
  b(-3.5, 7.0, -1.5, 1.4, 3.0, 1.4, "#65a30d"),
  b(2.6, 6.0, 1.2, 1.2, 3.4, 1.2, "#84cc16"),
  b(-1.2, 9.4, -0.8, 2.4, 1.0, 2.4, "#4ade80"),
];

/** Mountains: Twin snow-capped granite peaks with rocky ridges */
const mountainsBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1.2, 12, "#475569"),
  // Main high peak
  b(-5, 1.2, -4.5, 7.5, 3.0, 7.5, "#64748b"),
  b(-4.2, 4.2, -3.8, 6.0, 2.8, 6.0, "#94a3b8"),
  b(-3.5, 7.0, -3.0, 4.6, 2.5, 4.6, "#cbd5e1"),
  b(-2.8, 9.5, -2.3, 3.2, 2.4, 3.2, "#f8fafc"),
  b(-2.0, 11.9, -1.5, 1.6, 1.8, 1.6, "#ffffff"),
  // Second peak
  b(0.8, 1.2, -1.0, 4.8, 2.5, 4.8, "#475569"),
  b(1.4, 3.7, -0.4, 3.6, 2.2, 3.6, "#64748b"),
  b(2.0, 5.9, 0.2, 2.4, 1.8, 2.4, "#e2e8f0"),
  b(2.5, 7.7, 0.7, 1.4, 1.4, 1.4, "#ffffff"),
  b(0.2, 1.2, 3.0, 1.0, 2.4, 1.0, "#166534"),
];

/** Sands: Desert saguaro cactus rising from golden dunes with desert blossom */
const sandsBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11, 1.2, 11, "#d97706"),
  b(-4, 1.2, -4, 8, 1.0, 8, "#f59e0b"),
  // Main trunk
  b(-1.2, 2.2, -1.2, 2.4, 3.5, 2.4, "#15803d"),
  b(-1.2, 5.7, -1.2, 2.4, 4.0, 2.4, "#16a34a"),
  b(-1.2, 9.7, -1.2, 2.4, 3.0, 2.4, "#22c55e"),
  b(-0.9, 12.7, -0.9, 1.8, 1.0, 1.8, "#4ade80"),
  // Left arm
  b(-3.8, 5.0, -0.8, 2.6, 1.6, 1.6, "#15803d"),
  b(-4.8, 5.0, -0.8, 1.8, 4.2, 1.6, "#16a34a"),
  b(-4.5, 9.2, -0.6, 1.2, 0.8, 1.2, "#22c55e"),
  // Right arm
  b(1.2, 6.8, -0.8, 2.6, 1.6, 1.6, "#16a34a"),
  b(2.8, 6.8, -0.8, 1.8, 3.8, 1.6, "#22c55e"),
  b(3.1, 10.6, -0.6, 1.2, 0.8, 1.2, "#4ade80"),
  // Blossom and rock
  b(-0.6, 13.5, -0.6, 1.2, 1.0, 1.2, "#facc15"),
  b(2.8, 2.2, 2.5, 1.8, 1.2, 1.8, "#b45309"),
];

/** Clouds: Billowing storm clouds with downward-striking gold lightning bolt */
const cloudsBoxes = (): Box[] => [
  b(-4.5, 4.0, -2.5, 9.0, 2.8, 5.0, "#cbd5e1"),
  b(-5.2, 6.0, -2.8, 4.5, 3.5, 5.5, "#e2e8f0"),
  b(-2.0, 6.8, -3.2, 5.5, 4.2, 6.2, "#f8fafc"),
  b(2.5, 5.8, -2.5, 3.8, 3.2, 5.0, "#e2e8f0"),
  b(-1.0, 10.5, -2.0, 3.5, 2.0, 4.0, "#ffffff"),
  // Lightning bolt
  b(0.2, 5.0, 1.5, 1.4, 2.5, 0.8, "#facc15"),
  b(-1.0, 3.2, 1.5, 2.2, 1.2, 0.8, "#fde047"),
  b(-1.4, 1.4, 1.5, 1.2, 2.2, 0.8, "#facc15"),
  b(-0.8, 0, 1.5, 0.8, 1.6, 0.8, "#ffffff"),
];

/** Ice: Arctic snow igloo with arched tunnel entrance and ice crystals */
const iceBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1.0, 12, "#38bdf8"),
  b(-5.2, 1.0, -5.2, 10.4, 2.2, 10.4, "#e0f2fe"),
  b(-4.4, 3.2, -4.4, 8.8, 2.4, 8.8, "#f0f9ff"),
  b(-3.2, 5.6, -3.2, 6.4, 2.0, 6.4, "#f8fafc"),
  b(-1.8, 7.6, -1.8, 3.6, 1.5, 3.6, "#ffffff"),
  b(-0.6, 9.1, -0.6, 1.2, 1.2, 1.2, "#0284c7"),
  // Tunnel entrance
  b(-1.8, 1.0, 4.0, 3.6, 2.4, 2.6, "#bae6fd"),
  b(-1.4, 3.4, 4.0, 2.8, 1.0, 2.4, "#e0f2fe"),
  b(-0.9, 1.0, 6.3, 1.8, 2.0, 0.4, "#0369a1"),
  b(3.5, 1.0, 2.5, 1.2, 2.4, 1.2, "#0ea5e9"),
];

/** Moon: Cosmic crescent moon cradling a glowing celestial 5-point star */
const moonBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11, 0.8, 11, "#1e1b4b"),
  b(-4.5, 0.8, -4.5, 9, 0.5, 9, "#312e81"),
  // Crescent moon arc
  b(1.5, 1.8, -1.0, 2.2, 2.5, 2.0, "#fde047"),
  b(2.2, 4.0, -1.0, 2.4, 3.0, 2.0, "#facc15"),
  b(1.8, 6.8, -1.0, 2.6, 3.5, 2.0, "#eab308"),
  b(0.8, 10.0, -1.0, 2.2, 2.8, 2.0, "#facc15"),
  b(-0.8, 12.2, -1.0, 1.8, 2.0, 1.8, "#fef08a"),
  // Celestial Star
  b(-2.4, 5.8, -0.8, 2.4, 2.4, 1.6, "#ffffff"),
  b(-2.0, 8.2, -0.8, 1.6, 2.0, 1.4, "#fef08a"),
  b(-3.8, 4.2, -0.8, 1.6, 1.8, 1.4, "#facc15"),
  b(-1.0, 4.2, -0.8, 1.6, 1.8, 1.4, "#facc15"),
  b(-4.4, 6.2, -0.8, 2.0, 1.6, 1.4, "#fde047"),
  b(0.0, 6.2, -0.8, 2.0, 1.6, 1.4, "#fde047"),
];

export const getStageBoxes = (stageId: string): Box[] => {
  switch (stageId) {
    case "world-plains":
    case "plains":
      return plainsBoxes();
    case "world-forest":
    case "forest":
      return forestBoxes();
    case "world-islands":
    case "islands":
      return islandsBoxes();
    case "world-swamps":
    case "swamps":
      return swampsBoxes();
    case "world-mountains":
    case "mountains":
      return mountainsBoxes();
    case "world-sands":
    case "sands":
      return sandsBoxes();
    case "world-clouds":
    case "clouds":
      return cloudsBoxes();
    case "world-ice":
    case "ice":
      return iceBoxes();
    case "the-moon":
    case "moon":
      return moonBoxes();
    default:
      return plainsBoxes();
  }
};

export const buildStageMeshData = (stageId: string): MeshData => {
  const boxes = getStageBoxes(stageId);
  return buildMeshData(boxes);
};
