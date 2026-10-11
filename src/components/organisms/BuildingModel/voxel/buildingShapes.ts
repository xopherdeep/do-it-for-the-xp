import type { Box, MeshData } from "@/components/organisms/HeroModel/voxel/mesh";
import { buildMeshData } from "@/components/organisms/HeroModel/voxel/mesh";
import { getStageBoxes } from "@/components/organisms/StageModel/voxel/stageShapes";

export type BuildingId =
  // Hometown
  | "hero-home"
  | "hometown-market"
  | "shop"
  | "hospital"
  | "hotel"
  | "bank"
  | "town-hall"
  | "home-town"
  | "hometown"
  | "world-plains"
  | "plains"
  // Home Interior items
  | "home-calendar"
  | "calendar"
  | "home-storage"
  | "storage"
  | "home-workbench"
  | "craft-item"
  | "home-kitchen"
  | "cook-food"
  | "home-bed"
  | "bed"
  | "home-door"
  | "front-door"
  // Travel & Land shops
  | "pegasus"
  | "pegasus-ranch"
  | "wrecked-ship"
  | "hermits-tent"
  | "crystal-caverns"
  | "pond-of-life"
  | "witchs-hut"
  | "snow-shack"
  | "cloud-market"
  | "theia-city";

const b = (x: number, y: number, z: number, w: number, h: number, d: number, color: string): Box => ({
  x,
  y,
  z,
  w,
  h,
  d,
  color,
});

/** Hero's Home: Cozy house with pitched slate roof, red brick chimney, oak door and windows */
const heroHomeBoxes = (): Box[] => [
  b(-5, 0, -5, 10, 1, 10, "#7a7d84"),
  b(-4.5, 1, -4.5, 9, 5, 9, "#f0e6d2"),
  b(-1.5, 1, 4.51, 3, 4, 0.2, "#8b5a2b"),
  b(0.8, 2.5, 4.7, 0.4, 0.4, 0.2, "#f4c430"),
  b(-2, 0.2, 4.6, 4, 0.3, 2, "#4a7c59"),
  b(-4, 2.5, 4.51, 1.8, 2, 0.2, "#87ceeb"),
  b(2.2, 2.5, 4.51, 1.8, 2, 0.2, "#87ceeb"),
  b(-5, 6, -5, 10, 0.8, 10, "#5c3a21"),
  b(-4.5, 6.8, -4.5, 9, 1.2, 9, "#3a6073"),
  b(-3.5, 8, -3.5, 7, 1.2, 7, "#3a6073"),
  b(-2.5, 9.2, -2.5, 5, 1.2, 5, "#3a6073"),
  b(-1.5, 10.4, -1.5, 3, 1, 3, "#2c4856"),
  b(2, 6.5, -2, 1.8, 6, 1.8, "#b23a22"),
  b(1.8, 12.5, -2.2, 2.2, 0.6, 2.2, "#7a2818"),
  b(2.2, 13.5, -1.8, 1.2, 1.2, 1.2, "#e0e0e0"),
];

/** Hometown Market / General Store: Striped awning, large display windows, hanging sign */
const hometownMarketBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11, 1, 11, "#63686e"),
  b(-5, 1, -5, 10, 2, 10, "#b8623b"),
  b(-5, 3, -5, 10, 4, 10, "#d8c49d"),
  b(-4.2, 2, 5.01, 3.2, 3, 0.2, "#64b5f6"),
  b(1, 2, 5.01, 3.2, 3, 0.2, "#64b5f6"),
  b(-0.8, 1, 5.01, 1.6, 4, 0.2, "#5d4037"),
  b(-5.5, 5.5, 4, 11, 0.8, 3, "#d32f2f"),
  b(-4.5, 5.6, 4.2, 2, 0.6, 2.8, "#ffffff"),
  b(-0.5, 5.6, 4.2, 2, 0.6, 2.8, "#ffffff"),
  b(3.5, 5.6, 4.2, 2, 0.6, 2.8, "#ffffff"),
  b(-3, 7, 5.2, 6, 1.2, 0.4, "#ffd54f"),
  b(-5.2, 7, -5.2, 10.4, 1, 10.4, "#3e2723"),
  b(-4, 8, -4, 8, 1.5, 8, "#bf360c"),
  b(-2.5, 9.5, -2.5, 5, 1.5, 5, "#870000"),
  b(4.2, 1, 4.2, 1.4, 2, 1.4, "#795548"),
];

/** Hospital Hub: Clean clinic with medical red cross, glass doors and rooftop emergency beacon */
const hospitalBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11, 1, 11, "#9e9e9e"),
  b(-5, 1, -5, 10, 6.5, 10, "#f5f5f5"),
  b(-2, 1, 5.01, 4, 3.5, 0.2, "#4fc3f7"),
  b(-0.6, 5, 5.02, 1.2, 2.5, 0.2, "#e53935"),
  b(-1.6, 5.65, 5.02, 3.2, 1.2, 0.2, "#e53935"),
  b(-4.5, 3.5, -5.01, 9, 1.2, 0.2, "#81d4fa"),
  b(-4, 7.5, -4, 8, 3, 8, "#e0e0e0"),
  b(-4.2, 10.5, -4.2, 8.4, 0.8, 8.4, "#757575"),
  b(-1, 10.5, -1, 2, 2.5, 2, "#424242"),
  b(-0.6, 13, -0.6, 1.2, 1.2, 1.2, "#ff1744"),
];

/** Hotel Hub: Multi-story RPG inn with balconies, warm amber windows, green canopy */
const hotelBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1.2, 12, "#424242"),
  b(-5.5, 1.2, -5.5, 11, 4, 11, "#5d4037"),
  b(-1.8, 1.2, 5.51, 3.6, 3.5, 0.2, "#ffb300"),
  b(-3, 4.5, 4.5, 6, 0.8, 3, "#2e7d32"),
  b(-5, 5.2, -5, 10, 3.5, 10, "#8d6e63"),
  b(-4, 8.7, -4, 8, 3, 8, "#a1887f"),
  b(-4.8, 5.5, 5.01, 3, 1.5, 1.2, "#3e2723"),
  b(1.8, 5.5, 5.01, 3, 1.5, 1.2, "#3e2723"),
  b(-3.5, 2.5, 5.51, 1.5, 1.5, 0.1, "#fff176"),
  b(2, 2.5, 5.51, 1.5, 1.5, 0.1, "#fff176"),
  b(-4.5, 11.7, -4.5, 9, 1.5, 9, "#1b5e20"),
  b(-3, 13.2, -3, 6, 1.2, 6, "#2e7d32"),
  b(-1.5, 14.4, -1.5, 3, 0.8, 3, "#388e3c"),
];

/** Gold Bank: Classical marble bank with columns, golden vault door and pediment emblem */
const bankBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1.5, 12, "#616161"),
  b(-4, 0.3, 5.5, 8, 0.4, 2, "#9e9e9e"),
  b(-3.5, 0.7, 5, 7, 0.4, 1.5, "#bdbdbd"),
  b(-4.5, 1.5, 4, 1.4, 6, 1.4, "#eeeeee"),
  b(-1.7, 1.5, 4, 1.4, 6, 1.4, "#eeeeee"),
  b(0.3, 1.5, 4, 1.4, 6, 1.4, "#eeeeee"),
  b(3.1, 1.5, 4, 1.4, 6, 1.4, "#eeeeee"),
  b(-4.5, 1.5, -4.5, 9, 6, 8.5, "#37474f"),
  b(-1.5, 1.5, 4.01, 3, 4.5, 0.2, "#ffd700"),
  b(-5.5, 7.5, -5.5, 11, 1.2, 11, "#e0e0e0"),
  b(-5, 8.7, -5, 10, 1.2, 10, "#cfd8dc"),
  b(-4, 9.9, -4, 8, 1.2, 8, "#b0bec5"),
  b(-2.5, 11.1, -2.5, 5, 1, 5, "#90a4ae"),
  b(-0.8, 8.8, 5.01, 1.6, 1.6, 0.3, "#ffc107"),
];

/** Town Hall: Stately civic building with 4-faced clock tower, belfry and copper dome */
const townHallBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1.5, 12, "#455a64"),
  b(-3.5, 0.3, 5.5, 7, 0.5, 2, "#78909c"),
  b(-5, 1.5, -5, 10, 5, 10, "#eceff1"),
  b(-1.5, 1.5, 5.01, 3, 3.8, 0.2, "#4e342e"),
  b(-4, 2.5, 5.01, 1.5, 3, 0.2, "#90caf9"),
  b(2.5, 2.5, 5.01, 1.5, 3, 0.2, "#90caf9"),
  b(-5.2, 6.5, -5.2, 10.4, 0.8, 10.4, "#607d8b"),
  b(-2.2, 7.3, -2.2, 4.4, 5, 4.4, "#cfd8dc"),
  b(-1.2, 9, 2.21, 2.4, 2.4, 0.2, "#ffd54f"),
  b(-0.2, 9.8, 2.3, 0.4, 1.2, 0.1, "#263238"),
  b(-1.5, 12.3, -1.5, 3, 2, 3, "#37474f"),
  b(-0.6, 12.5, -0.6, 1.2, 1.2, 1.2, "#ffb300"),
  b(-1.8, 14.3, -1.8, 3.6, 1, 3.6, "#26a69a"),
  b(-0.5, 15.3, -0.5, 1, 2.5, 1, "#80cbc4"),
  b(-0.2, 17.8, -0.2, 0.4, 1.2, 0.4, "#ffd54f"),
];

/** Pegasus Ranch (Plains): Red barn with white trim, arched gambrel roof and winged weather vane */
const pegasusRanchBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1, 12, "#4a6b32"),
  b(-5, 1, -5, 10, 6, 10, "#c62828"),
  b(-4.5, 1.2, 5.01, 9, 0.4, 0.2, "#ffffff"),
  b(-4.5, 4.5, 5.01, 9, 0.4, 0.2, "#ffffff"),
  b(-2, 1, 5.02, 4, 4.5, 0.2, "#ffffff"),
  b(-1.6, 1.2, 5.03, 3.2, 4, 0.1, "#4e342e"),
  b(-1.2, 5.8, 5.01, 2.4, 2, 0.2, "#ffffff"),
  b(-0.8, 5.9, 4.8, 1.6, 1.2, 1, "#ffd54f"),
  b(-5.2, 7, -5.2, 10.4, 2, 10.4, "#37474f"),
  b(-3.8, 9, -3.8, 7.6, 2, 7.6, "#455a64"),
  b(-2, 11, -2, 4, 1, 4, "#546e7a"),
  b(-0.2, 12, -0.2, 0.4, 2, 0.4, "#ffd700"),
  b(-1, 13.8, -0.2, 2, 0.8, 0.2, "#ffffff"),
  b(-5.8, 1, 3, 0.4, 1.8, 3, "#8d6e63"),
  b(5.4, 1, 3, 0.4, 1.8, 3, "#8d6e63"),
];

/** The Wrecked Ship (Islands): Beached galleon hull, broken mast, crow's nest and treasure chests */
const wreckedShipBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1, 12, "#d4b373"),
  b(-5, 0.5, 3, 4, 0.4, 3, "#4fc3f7"),
  b(-4.5, 1, -5.5, 9, 3.5, 11, "#3e2723"),
  b(-4, 4.5, -5, 8, 2.5, 5, "#4e342e"),
  b(-3.5, 7, -4.5, 7, 2, 3.5, "#5d4037"),
  b(-0.5, 8, -5.2, 1, 1.5, 1, "#ffd54f"),
  b(-0.8, 4.5, 0, 1.6, 8, 1.6, "#8d6e63"),
  b(-2.5, 9, -0.2, 5, 0.6, 0.6, "#a1887f"),
  b(-1.5, 10, -1.5, 3, 1.2, 3, "#4e342e"),
  b(-0.6, 4, 5.5, 1.2, 1.2, 4, "#5d4037"),
  b(-3.5, 4.6, 1, 1.8, 1.2, 1.4, "#ffb300"),
  b(1.5, 4.6, 2, 1.5, 1.5, 1.5, "#8d6e63"),
];

/** Hermit's Tent (Forest): Conical sage-green pavilion, smoke hole, campfire stones and potions */
const hermitsTentBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1, 12, "#2e5a1e"),
  b(-5, 0.8, -5, 10, 0.8, 10, "#4a3319"),
  b(-4.5, 1.6, -4.5, 9, 3, 9, "#436a3e"),
  b(-3.5, 4.6, -3.5, 7, 2.5, 7, "#588157"),
  b(-2.5, 7.1, -2.5, 5, 2.2, 5, "#709775"),
  b(-1.5, 9.3, -1.5, 3, 2, 3, "#84a98c"),
  b(-0.6, 11.3, -0.6, 1.2, 1.2, 1.2, "#588157"),
  b(-1.5, 1.6, 4.4, 3, 3, 0.2, "#2b4028"),
  b(2, 0.8, 3, 2.5, 0.5, 2.5, "#757575"),
  b(2.5, 1.2, 3.5, 1.5, 0.8, 1.5, "#ff6d00"),
  b(-4, 1.5, 4, 0.6, 3, 0.6, "#5d4037"),
  b(-3.8, 3.5, 4.2, 0.6, 0.8, 0.6, "#76ff03"),
];

/** Crystal Caverns (Mountains): Mine entrance with timber supports, glowing geodes and cart rail */
const crystalCavernsBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1.5, 12, "#373737"),
  b(-5.5, 1.5, -4, 3.5, 6, 8, "#424242"),
  b(2, 1.5, -4, 3.5, 6, 8, "#424242"),
  b(-5, 7.5, -4, 10, 3, 8, "#303030"),
  b(-4, 10.5, -3, 8, 2.5, 6, "#212121"),
  b(-2.5, 13, -2, 5, 2, 4, "#1b1b1b"),
  b(-2.5, 1.5, 3.8, 1, 5.5, 1, "#6d4c41"),
  b(1.5, 1.5, 3.8, 1, 5.5, 1, "#6d4c41"),
  b(-2.5, 6.8, 3.8, 5, 0.8, 1, "#5d4037"),
  b(-2, 1.5, -3, 4, 5, 6.5, "#0a0a0a"),
  b(-4.5, 3, 3.5, 1, 3.2, 1, "#ba68c8"),
  b(-4.8, 2, 3.8, 0.8, 1.8, 0.8, "#e1bee7"),
  b(3.5, 2.5, 3.2, 1.2, 2.8, 1.2, "#00e5ff"),
  b(3.8, 1.5, 2.5, 0.8, 2, 0.8, "#80deea"),
  b(0, 7.2, 3.2, 1, 1.4, 0.8, "#ffd700"),
  b(-1.2, 0.8, 2, 0.3, 0.3, 4, "#9e9e9e"),
  b(0.9, 0.8, 2, 0.3, 0.3, 4, "#9e9e9e"),
];

/** Pond of Life Oasis (Desert): Turquoise oasis pool, nomad striped tent, palm tree and urns */
const pondOfLifeBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1, 12, "#d4a359"),
  b(-4, 0.8, -4, 8, 0.4, 8, "#00bcd4"),
  b(-3, 0.7, -3, 6, 0.3, 6, "#0097a7"),
  b(-4, 1, -2, 0.8, 6, 0.8, "#6d4c41"),
  b(3.2, 1, -2, 0.8, 6, 0.8, "#6d4c41"),
  b(-4, 1, 3.2, 0.8, 6, 0.8, "#6d4c41"),
  b(3.2, 1, 3.2, 0.8, 6, 0.8, "#6d4c41"),
  b(-4.5, 7, -2.5, 9, 1, 6.5, "#f57c00"),
  b(-4.5, 7.8, -2.2, 9, 0.4, 1.2, "#fff3e0"),
  b(-2.5, 8, -1.5, 5, 1.5, 4.5, "#d84315"),
  b(-4.2, 1, -4.2, 1, 4, 1, "#8d6e63"),
  b(-3.8, 5, -4.2, 1, 4, 1, "#795548"),
  b(-5.5, 9, -5.5, 4.5, 1, 4.5, "#2e7d32"),
  b(-2.5, 9, -5.5, 4.5, 1, 4.5, "#388e3c"),
  b(1.5, 1, 2, 1.2, 1.8, 1.2, "#bf360c"),
];

/** Witch's Hut (Swamps): Crooked bayou stilt shack, purple peaked hat roof and bubbling cauldron */
const witchsHutBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1, 12, "#2d3725"),
  b(-4, 1, -4, 1.2, 4, 1.2, "#3e2723"),
  b(2.8, 1, -4, 1.2, 4, 1.2, "#3e2723"),
  b(-4, 1, 2.8, 1.2, 4, 1.2, "#3e2723"),
  b(2.8, 1, 2.8, 1.2, 4, 1.2, "#3e2723"),
  b(-5, 4.8, -5, 10, 0.8, 10, "#4e342e"),
  b(-4, 5.6, -4, 8, 4.5, 8, "#2e1c14"),
  b(-1.5, 5.6, 3.8, 2.5, 3.5, 0.2, "#3e2723"),
  b(1.5, 7, 3.8, 1.5, 1.5, 0.2, "#fbc02d"),
  b(-4.8, 10.1, -4.8, 9.6, 1, 9.6, "#4a148c"),
  b(-3.5, 11.1, -3.5, 7, 2, 7, "#6a1b9a"),
  b(-2, 13.1, -2, 4, 2.5, 4, "#7b1fa2"),
  b(-0.5, 15.6, -0.8, 1.2, 2.5, 1.2, "#8e24aa"),
  b(2, 5.6, 2, 2.2, 1.8, 2.2, "#212121"),
  b(2.2, 7.2, 2.2, 1.8, 0.4, 1.8, "#00e676"),
];

/** Snow Shack (Ice): Rounded snow igloo dome, extended entrance tunnel, smoking chimney */
const snowShackBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1.2, 12, "#b0bec5"),
  b(-5.2, 1.2, -5.2, 10.4, 2.5, 10.4, "#e0f7fa"),
  b(-4.5, 3.7, -4.5, 9, 2.2, 9, "#e0f7fa"),
  b(-3.5, 5.9, -3.5, 7, 2, 7, "#b2ebf2"),
  b(-2, 7.9, -2, 4, 1.5, 4, "#80deea"),
  b(-1.8, 1.2, 4.5, 3.6, 3, 3, "#e0f7fa"),
  b(-1.2, 1.2, 7.4, 2.4, 2.4, 0.2, "#006064"),
  b(-0.5, 4.5, 6, 1, 1.2, 1, "#ffb300"),
  b(2.5, 6, -2, 1.6, 4.5, 1.6, "#78909c"),
  b(2.7, 10.8, -1.8, 1.2, 1.2, 1.2, "#eceff1"),
  b(-4.5, 1.2, 2.5, 1.4, 1.4, 2.5, "#5d4037"),
];

/** Cloud Market (Clouds): Celestial sky pavilion resting on cloud vapor, brass spires and zeppelin spire */
const cloudMarketBoxes = (): Box[] => [
  b(-5.5, 0, -5.5, 11, 2, 11, "#eceff1"),
  b(-6.5, 0.5, -2, 2, 1.8, 4, "#cfd8dc"),
  b(4.5, 0.5, -2, 2, 1.8, 4, "#cfd8dc"),
  b(-5, 2, -5, 10, 0.8, 10, "#ffd54f"),
  b(-4.2, 2.8, -4.2, 1, 6, 1, "#ffb300"),
  b(3.2, 2.8, -4.2, 1, 6, 1, "#ffb300"),
  b(-4.2, 2.8, 3.2, 1, 6, 1, "#ffb300"),
  b(3.2, 2.8, 3.2, 1, 6, 1, "#ffb300"),
  b(-5, 8.8, -5, 10, 1.2, 10, "#0288d1"),
  b(-3.8, 10, -3.8, 7.6, 1.5, 7.6, "#29b6f6"),
  b(-2.2, 11.5, -2.2, 4.4, 1.2, 4.4, "#4fc3f7"),
  b(-0.4, 12.7, -0.4, 0.8, 4.5, 0.8, "#ffd700"),
  b(-0.6, 17.2, -0.6, 1.2, 1.2, 1.2, "#ffff00"),
  b(-2.5, 2.8, -1, 5, 2, 2, "#0277bd"),
];

/** Theia City Emporium (Moon): Geodesic lunar biodome, neon purple arches, airlock portal and satellite array */
const theiaCityBoxes = (): Box[] => [
  b(-6, 0, -6, 12, 1.2, 12, "#37474f"),
  b(-5.5, 1.2, -5.5, 11, 0.8, 11, "#455a64"),
  b(-5, 1.8, -5, 10, 1.5, 10, "#263238"),
  b(-4.5, 3.3, -4.5, 9, 2.5, 9, "#7c4dff"),
  b(-3.8, 5.8, -3.8, 7.6, 2.2, 7.6, "#651fff"),
  b(-2.8, 8, -2.8, 5.6, 2, 5.6, "#00e5ff"),
  b(-1.5, 10, -1.5, 3, 1.2, 3, "#18ffff"),
  b(-1.8, 1.8, 4.8, 3.6, 3.2, 1.5, "#eceff1"),
  b(-1.2, 2.2, 6.21, 2.4, 2.4, 0.2, "#00e5ff"),
  b(2.8, 10, -2, 2.5, 0.4, 2.5, "#ffd54f"),
  b(0, 11.2, 0, 0.6, 3.5, 0.6, "#ff4081"),
  b(-0.4, 14.7, -0.4, 0.8, 0.8, 0.8, "#00e5ff"),
];

/** Hometown Gate Archway: Grand stone portal archway with towers, wooden gates, lanterns and banner */
const hometownGateBoxes = (): Box[] => [
  b(-5.5, 0, -4, 11, 0.8, 8, "#546e7a"),
  b(-2, 0.81, -4, 4, 0.1, 8, "#cfd8dc"),
  b(-4.5, 0.8, -1.8, 2.5, 8.5, 3.6, "#78909c"),
  b(-4.8, 9.3, -2.1, 3.1, 1.2, 4.2, "#455a64"),
  b(-4.8, 10.5, -2.1, 1.2, 1, 1.2, "#37474f"),
  b(-4.8, 10.5, 0.9, 1.2, 1, 1.2, "#37474f"),
  b(2, 0.8, -1.8, 2.5, 8.5, 3.6, "#78909c"),
  b(1.7, 9.3, -2.1, 3.1, 1.2, 4.2, "#455a64"),
  b(3.6, 10.5, -2.1, 1.2, 1, 1.2, "#37474f"),
  b(3.6, 10.5, 0.9, 1.2, 1, 1.2, "#37474f"),
  b(-2, 7.2, -1.5, 4, 2.2, 3, "#546e7a"),
  b(-1.2, 9.4, -1.2, 2.4, 2, 2.4, "#fbc02d"),
  b(-0.6, 10, 1.21, 1.2, 1.2, 0.3, "#fff59d"),
  b(-2.4, 0.8, -1.2, 0.6, 6.2, 2.2, "#6d4c41"),
  b(1.8, 0.8, -1.2, 0.6, 6.2, 2.2, "#6d4c41"),
  b(-2.0, 5, 2.0, 0.4, 0.4, 0.8, "#ffb300"),
  b(-2.3, 3.8, 2.2, 1, 1.4, 1, "#ffe082"),
  b(1.6, 5, 2.0, 0.4, 0.4, 0.8, "#ffb300"),
  b(1.3, 3.8, 2.2, 1, 1.4, 1, "#ffe082"),
  b(-0.8, 4.5, 1.51, 1.6, 2.7, 0.2, "#e53935"),
];

/** Travel Pegasus: Majestic winged divine stallion perched on a cloud, flying between worlds */
const pegasusBoxes = (): Box[] => [
  // Cloud pedestal
  b(-5, 0, -4, 10, 1.5, 8, "#e0f2fe"),
  b(-4, 1.5, -3, 8, 1.2, 6, "#bae6fd"),
  b(-5.5, 0.5, -2, 2, 1.5, 4, "#7dd3fc"),
  b(3.5, 0.5, -2, 2, 1.5, 4, "#7dd3fc"),
  // Golden hooves
  b(-2.5, 2.7, -2.2, 1.2, 0.8, 1.2, "#ffd700"),
  b(1.3, 2.7, -2.2, 1.2, 0.8, 1.2, "#ffd700"),
  b(-2.5, 2.7, 1.8, 1.2, 0.8, 1.2, "#ffd700"),
  b(1.3, 2.7, 1.8, 1.2, 0.8, 1.2, "#ffd700"),
  // White legs
  b(-2.3, 3.5, -2.0, 0.8, 3.2, 0.8, "#ffffff"),
  b(1.5, 3.5, -2.0, 0.8, 3.2, 0.8, "#ffffff"),
  b(-2.3, 3.5, 2.0, 0.8, 3.2, 0.8, "#ffffff"),
  b(1.5, 3.5, 2.0, 0.8, 3.2, 0.8, "#ffffff"),
  // Torso & rump
  b(-2.5, 6.5, -3.2, 5, 3.5, 6.8, "#ffffff"),
  b(-2.2, 6.8, -3.5, 4.4, 3, 1, "#f1f5f9"),
  // Celestial tail
  b(-0.6, 4.5, -4.5, 1.2, 3.5, 1.2, "#38bdf8"),
  b(-0.4, 3.0, -5.2, 0.8, 2.5, 1.0, "#0284c7"),
  // Neck & head
  b(-1.5, 8.5, 2.5, 3, 4.5, 2.5, "#ffffff"),
  b(-1.2, 11.5, 2.8, 2.4, 2.5, 2.2, "#ffffff"),
  b(-1.4, 12.5, 4.0, 2.8, 2.4, 3.2, "#ffffff"),
  b(-1.0, 12.5, 7.0, 2.0, 1.6, 1.8, "#fed7aa"),
  // Eyes & golden halter
  b(-1.5, 13.5, 5.2, 0.2, 0.8, 0.8, "#0284c7"),
  b(1.3, 13.5, 5.2, 0.2, 0.8, 0.8, "#0284c7"),
  b(-1.1, 13.0, 4.8, 2.2, 0.4, 2.4, "#ffd700"),
  // Ears & mane
  b(-1.2, 14.8, 3.5, 0.6, 1.5, 0.6, "#ffffff"),
  b(0.6, 14.8, 3.5, 0.6, 1.5, 0.6, "#ffffff"),
  b(-0.6, 9.5, 1.5, 1.2, 5.5, 1.2, "#38bdf8"),
  b(-0.4, 13.0, 2.0, 0.8, 2.2, 1.2, "#0ea5e9"),
  // Golden horn
  b(-0.3, 14.5, 5.5, 0.6, 2.8, 0.6, "#facc15"),
  // Left outspread wing
  b(-4.5, 9.0, -1.0, 2.2, 1.8, 3.5, "#ffffff"),
  b(-7.0, 10.5, -2.0, 2.8, 1.6, 4.5, "#e0f2fe"),
  b(-9.5, 12.0, -2.5, 2.8, 1.4, 5.0, "#38bdf8"),
  b(-11.5, 13.5, -2.0, 2.2, 1.0, 4.0, "#0284c7"),
  // Right outspread wing
  b(2.3, 9.0, -1.0, 2.2, 1.8, 3.5, "#ffffff"),
  b(4.2, 10.5, -2.0, 2.8, 1.6, 4.5, "#e0f2fe"),
  b(6.7, 12.0, -2.5, 2.8, 1.4, 5.0, "#38bdf8"),
  b(9.3, 13.5, -2.0, 2.2, 1.0, 4.0, "#0284c7"),
];

/** Home Calendar: Grandfather clock and schedule desk with pendulum, brass finial, and hourglass */
const homeCalendarBoxes = (): Box[] => [
  b(-4.5, 0, -3.5, 9, 1, 7, "#3e2723"),
  b(-3, 1, -2.5, 6, 7, 5, "#4e342e"),
  b(-2, 2.5, 2.51, 4, 4.5, 0.2, "#80deea"),
  b(-0.4, 3, 1.8, 0.8, 3.2, 0.8, "#ffd700"),
  b(-0.8, 2.2, 1.5, 1.6, 1.2, 1.4, "#ffc107"),
  b(-3.5, 8, -3, 7, 5, 6, "#3e2723"),
  b(-2.5, 9, 3.01, 5, 3.2, 0.2, "#f8fafc"),
  b(-0.2, 9.6, 3.22, 0.4, 1.8, 0.2, "#ffd700"),
  b(0, 9.6, 3.22, 1.4, 0.4, 0.2, "#ffd700"),
  b(-2.8, 13, -2.5, 5.6, 1.5, 5, "#4e342e"),
  b(-0.5, 14.5, -0.5, 1, 2, 1, "#ffd700"),
  b(3.2, 1, -1, 1.8, 2.4, 1.8, "#ffb300"),
];

/** Home Storage: Heavy ironbound oak treasure chest with curved lid, golden lock and coin details */
const homeStorageBoxes = (): Box[] => [
  b(-5, 0, -4.5, 10, 0.8, 9, "#616161"),
  b(-4.2, 0.8, -3.8, 8.4, 4.2, 7.6, "#5d4037"),
  b(-4.3, 0.8, -3.9, 1.2, 4.2, 1.2, "#37474f"),
  b(3.1, 0.8, -3.9, 1.2, 4.2, 1.2, "#37474f"),
  b(-4.3, 0.8, 2.7, 1.2, 4.2, 1.2, "#37474f"),
  b(3.1, 0.8, 2.7, 1.2, 4.2, 1.2, "#37474f"),
  b(-0.8, 0.8, -3.9, 1.6, 4.2, 7.8, "#37474f"),
  b(-4.2, 5.0, -3.8, 8.4, 1.5, 7.6, "#6d4c41"),
  b(-3.6, 6.5, -3.2, 7.2, 1.2, 6.4, "#6d4c41"),
  b(-2.8, 7.7, -2.4, 5.6, 0.8, 4.8, "#795548"),
  b(-0.8, 5.0, -3.9, 1.6, 3.6, 7.8, "#37474f"),
  b(-1.0, 3.5, 3.82, 2.0, 2.2, 0.6, "#ffd700"),
  b(-0.6, 5.7, 3.82, 1.2, 1.0, 0.4, "#fbc02d"),
  b(-0.3, 4.2, 4.43, 0.6, 0.8, 0.1, "#212121"),
  b(3.5, 0.8, 1, 1.5, 1.2, 1.5, "#ffea00"),
];

/** Home Workbench: Sturdy carpenter workbench with steel blacksmith anvil, hammer, tongs and tool rack */
const homeWorkbenchBoxes = (): Box[] => [
  b(-5.5, 0, -4.5, 11, 0.8, 9, "#78909c"),
  b(-4.5, 0.8, -3.5, 1.4, 4.2, 1.4, "#4e342e"),
  b(-0.5, 0.8, -3.5, 1.4, 4.2, 1.4, "#4e342e"),
  b(-4.5, 0.8, 2.1, 1.4, 4.2, 1.4, "#4e342e"),
  b(-0.5, 0.8, 2.1, 1.4, 4.2, 1.4, "#4e342e"),
  b(-5.2, 5.0, -4.0, 6.5, 1.5, 8.0, "#8d6e63"),
  b(2.2, 0.8, -1.8, 2.8, 3.0, 3.6, "#5d4037"),
  b(2.0, 3.8, -1.5, 3.2, 1.2, 3.0, "#37474f"),
  b(2.3, 5.0, -1.2, 2.6, 1.8, 2.4, "#455a64"),
  b(1.5, 6.8, -1.5, 4.8, 1.2, 3.0, "#546e7a"),
  b(-3.5, 6.5, -1.0, 0.5, 0.5, 2.5, "#d7ccc8"),
  b(-3.8, 6.5, 1.2, 1.2, 1.0, 1.0, "#263238"),
  b(-1.8, 6.5, -2.5, 1.5, 0.3, 1.8, "#ffb300"),
  b(-5.0, 6.5, -3.8, 6.0, 5.0, 0.6, "#6d4c41"),
  b(-4.0, 7.5, -3.1, 0.4, 3.0, 0.4, "#cfd8dc"),
  b(-2.5, 8.0, -3.1, 0.4, 2.0, 0.4, "#ffd54f"),
];

/** Home Kitchen: Rustic brick cooking hearth with simmering cauldron, glowing firebox and pantry */
const homeKitchenBoxes = (): Box[] => [
  b(-5.5, 0, -4.5, 11, 0.8, 9, "#b71c1c"),
  b(-4.5, 0.8, -3.8, 6.5, 4.5, 7.6, "#455a64"),
  b(-4.0, 5.3, -3.2, 5.5, 0.5, 6.4, "#212121"),
  b(-3.0, 1.8, 3.81, 3.5, 2.2, 0.2, "#ff5722"),
  b(-2.5, 2.0, 3.7, 2.5, 1.5, 0.2, "#ffab00"),
  b(-2.8, 5.8, -1.0, 3.2, 2.4, 3.2, "#1a1a1a"),
  b(-2.5, 7.6, -0.7, 2.6, 0.4, 2.6, "#4caf50"),
  b(2.2, 0.8, -3.5, 3.0, 8.5, 7.0, "#5d4037"),
  b(2.3, 2.5, 3.51, 2.6, 2.8, 0.2, "#8d6e63"),
  b(2.3, 6.0, 3.51, 2.6, 2.8, 0.2, "#8d6e63"),
  b(-3.2, 5.8, -3.5, 2.5, 7.0, 2.0, "#37474f"),
  b(-3.0, 12.8, -3.3, 2.1, 1.5, 1.6, "#cfd8dc"),
  b(0, 5.8, 1.5, 1.8, 0.3, 1.8, "#d7ccc8"),
];

/** Home Bed: Four-poster carved oak bed with soft mattress, royal duvet and plush pillows */
const homeBedBoxes = (): Box[] => [
  b(-5.5, 0, -5, 11, 0.6, 10, "#880e4f"),
  b(-4.5, 0.6, -4.2, 1.2, 8.5, 1.2, "#3e2723"),
  b(3.3, 0.6, -4.2, 1.2, 8.5, 1.2, "#3e2723"),
  b(-4.5, 0.6, 3.0, 1.2, 5.0, 1.2, "#3e2723"),
  b(3.3, 0.6, 3.0, 1.2, 5.0, 1.2, "#3e2723"),
  b(-3.3, 1.5, -4.0, 6.6, 5.5, 0.8, "#4e342e"),
  b(-3.3, 1.5, 3.0, 6.6, 2.5, 0.8, "#4e342e"),
  b(-3.5, 1.2, -3.2, 7.0, 1.5, 6.2, "#5d4037"),
  b(-3.4, 2.7, -3.2, 6.8, 1.2, 6.2, "#ffffff"),
  b(-3.5, 3.6, -1.0, 7.0, 0.8, 4.2, "#1565c0"),
  b(-3.5, 3.8, 2.0, 7.0, 0.5, 1.2, "#fbc02d"),
  b(-3.0, 3.6, -3.0, 2.8, 1.0, 1.8, "#f5f5f5"),
  b(0.2, 3.6, -3.0, 2.8, 1.0, 1.8, "#f5f5f5"),
  b(-4.5, 8.8, -4.2, 9.0, 0.6, 1.2, "#3e2723"),
  b(-4.5, 8.8, -4.2, 1.2, 0.6, 8.4, "#3e2723"),
  b(3.3, 8.8, -4.2, 1.2, 0.6, 8.4, "#3e2723"),
];

/** Home Door: Welcoming front entrance door with stone frame, brass handle, welcome mat and lantern */
const homeDoorBoxes = (): Box[] => [
  b(-5.0, 0, -3.0, 10, 0.8, 6, "#607d8b"),
  b(-3.0, 0.81, 0.5, 6, 0.2, 2.5, "#d7ccc8"),
  b(-4.5, 0.8, -1.5, 1.8, 9.0, 2.5, "#455a64"),
  b(2.7, 0.8, -1.5, 1.8, 9.0, 2.5, "#455a64"),
  b(-4.5, 9.8, -1.5, 9.0, 2.0, 2.5, "#37474f"),
  b(-2.7, 0.8, -1.0, 5.4, 9.0, 1.0, "#5d4037"),
  b(-2.7, 2.5, 0.01, 2.0, 0.6, 0.2, "#212121"),
  b(-2.7, 7.5, 0.01, 2.0, 0.6, 0.2, "#212121"),
  b(1.5, 4.5, 0.01, 0.6, 1.4, 0.3, "#ffd700"),
  b(1.7, 4.8, 0.32, 0.4, 0.4, 0.4, "#ffea00"),
  b(-2.0, 10.2, 1.01, 4.0, 1.2, 0.2, "#ffca28"),
  b(2.8, 7.0, 1.5, 0.4, 0.4, 1.2, "#37474f"),
  b(2.5, 5.5, 2.2, 1.0, 1.6, 1.0, "#ffb300"),
];

const BUILDINGS: Record<string, () => Box[]> = {
  // Hometown
  "hero-home": heroHomeBoxes,
  "my-home": heroHomeBoxes,
  "hometown-market": hometownMarketBoxes,
  shop: hometownMarketBoxes,
  hospital: hospitalBoxes,
  hotel: hotelBoxes,
  bank: bankBoxes,
  "town-hall": townHallBoxes,
  "home-town": hometownGateBoxes,
  hometown: hometownGateBoxes,
  "world-plains": () => getStageBoxes("world-plains"),
  plains: () => getStageBoxes("world-plains"),

  // Home Interior items
  "home-calendar": homeCalendarBoxes,
  calendar: homeCalendarBoxes,
  "home-storage": homeStorageBoxes,
  storage: homeStorageBoxes,
  "home-workbench": homeWorkbenchBoxes,
  "craft-item": homeWorkbenchBoxes,
  "home-kitchen": homeKitchenBoxes,
  "cook-food": homeKitchenBoxes,
  "home-bed": homeBedBoxes,
  bed: homeBedBoxes,
  "home-door": homeDoorBoxes,
  "front-door": homeDoorBoxes,

  // Travel & Land shops
  pegasus: pegasusBoxes,
  "pegasus-ranch": pegasusRanchBoxes,
  "wrecked-ship": wreckedShipBoxes,
  "hermits-tent": hermitsTentBoxes,
  "crystal-caverns": crystalCavernsBoxes,
  "pond-of-life": pondOfLifeBoxes,
  "witchs-hut": witchsHutBoxes,
  "snow-shack": snowShackBoxes,
  "cloud-market": cloudMarketBoxes,
  "theia-city": theiaCityBoxes,
};

export const getBuildingBoxes = (buildingId: string): Box[] => {
  const factory = BUILDINGS[buildingId] || BUILDINGS["hero-home"];
  return factory();
};

export const buildBuildingMeshData = (buildingId: string): MeshData => {
  const boxes = getBuildingBoxes(buildingId);
  return buildMeshData(boxes);
};
