/**
 * World Registry - Source of truth for all world configurations.
 * This file defines the static metadata for each world area in the game.
 */

export interface WorldMetadata {
  id: string;
  name: string;
  description: string;
  element: string;
  icon: string;      // FontAwesome icon class (without fa- prefix)
  color: string;     // Ionic color name
  bgImage: string;   // Background image filename
  templeId: string;  // Associated temple ID
  shopId: string;    // Associated shop ID
}

export const WORLD_METADATA: Record<string, WorldMetadata> = {
  "plains": {
    id: "plains",
    name: "The Plains",
    description: "Vast rolling grasslands stretching beneath an endless sky, where the wind whispers ancient secrets.",
    element: "wind",
    icon: "tornado",
    color: "primary",
    bgImage: "world-plains.jpg",
    templeId: "wind-temple",
    shopId: "pegasus-ranch"
  },
  "islands": {
    id: "islands",
    name: "The Islands",
    description: "A shimmering archipelago of crystalline waters and hidden coves, home to seafarers and treasure seekers.",
    element: "water",
    icon: "island-tropical",
    color: "tertiary",
    bgImage: "world-islands.jpg",
    templeId: "water-temple",
    shopId: "wrecked-ship"
  },
  "forest": {
    id: "forest",
    name: "The Forest",
    description: "An ancient woodland where massive trees block out the sun, and nature magic flows through every root.",
    element: "earth",
    icon: "trees",
    color: "success",
    bgImage: "world-forest.jpg",
    templeId: "earth-temple",
    shopId: "hermits-tent"
  },
  "mountains": {
    id: "mountains",
    name: "The Mountains",
    description: "Towering volcanic peaks cloaked in ash and fire, where only the bravest dare to climb.",
    element: "fire",
    icon: "mountains",
    color: "danger",
    bgImage: "world-mountains.jpg",
    templeId: "fire-temple",
    shopId: "crystal-caverns"
  },
  "desert": {
    id: "desert",
    name: "The Sands",
    description: "An endless expanse of golden dunes beneath a blazing sun, hiding ancient ruins and oases.",
    element: "light",
    icon: "cactus",
    color: "warning",
    bgImage: "world-desert.jpg",
    templeId: "sun-temple",
    shopId: "pond-of-life"
  },
  "swamps": {
    id: "swamps",
    name: "The Swamps",
    description: "Murky wetlands shrouded in mist and mystery, where dark magic bubbles beneath the surface.",
    element: "moon",
    icon: "skull-crossbones",
    color: "dark",
    bgImage: "world-swamps.jpg",
    templeId: "moon-temple",
    shopId: "witchs-hut"
  },
  "ice": {
    id: "ice",
    name: "The Tundra",
    description: "A frozen wasteland of eternal winter, where glaciers hold secrets of forgotten ages.",
    element: "ice",
    icon: "igloo",
    color: "medium",
    bgImage: "world-ice.jpg",
    templeId: "frozen-fortress",
    shopId: "snow-shack"
  },
  "clouds": {
    id: "clouds",
    name: "The Clouds",
    description: "A realm above the world, where floating islands drift through endless thunderstorms.",
    element: "lightning",
    icon: "bolt",
    color: "secondary",
    bgImage: "world-clouds.jpg",
    templeId: "sky-temple",
    shopId: "cloud-market"
  },
  "moon": {
    id: "moon",
    name: "The Moon",
    description: "A celestial domain of starlit mysteries and cosmic power, the final frontier of legend.",
    element: "shadow",
    icon: "moon",
    color: "dark",
    bgImage: "world-moon.jpg",
    templeId: "moon-temple", // Note: shares with swamps in current config
    shopId: "theia-city"
  },
  "hometown": {
    id: "hometown",
    name: "Hometown",
    description: "Your cozy starting village, a hub of familiar faces and the beginning of every adventure.",
    element: "neutral",
    icon: "archway",
    color: "rpg",
    bgImage: "hometown.jpg",
    templeId: "",
    shopId: "hometown-market"
  }
};

// Convenience helpers

export const getWorldMetadata = (worldId: string): WorldMetadata => {
  return WORLD_METADATA[worldId] || {
    id: worldId,
    name: "Unknown World",
    description: "A mysterious place.",
    element: "none",
    icon: "question",
    color: "medium",
    bgImage: "world-map.jpg",
    templeId: "",
    shopId: ""
  };
};

export const getAllWorlds = (): WorldMetadata[] => {
  return Object.values(WORLD_METADATA);
};

export const getWorldByShopId = (shopId: string): WorldMetadata | undefined => {
  return Object.values(WORLD_METADATA).find(w => w.shopId === shopId);
};
