
export interface TempleMetadata {
  id: string;
  name: string;
  description: string;
  world: string;
  element: string;
  icon: string;
  color: string;
}

export const TEMPLE_METADATA: Record<string, TempleMetadata> = {
  "wind-temple": {
    id: "wind-temple",
    name: "Temple of Zephyr",
    description: "A soaring sanctuary built atop the highest peaks, where the wisest masters harness the power of the ever-changing winds.",
    world: "plains",
    element: "wind",
    icon: "fa-wind",
    color: "primary"
  },
  "earth-temple": {
    id: "earth-temple",
    name: "Gaia Sanctuary",
    description: "Ancient stone halls entwined with colossal roots, protecting the deep secrets of the living earth.",
    world: "forest",
    element: "earth",
    icon: "fa-leaf",
    color: "success"
  },
  "water-temple": {
    id: "water-temple",
    name: "Aqua Haven",
    description: "An ethereal palace submerged in crystal clear depths, where the flow of magic follows the rhythm of the tides.",
    world: "islands",
    element: "water",
    icon: "fa-water",
    color: "tertiary"
  },
  "fire-temple": {
    id: "fire-temple",
    name: "Inferno Citadel",
    description: "A forge of legend carved into the heart of a volcano, where champions are tempered in the eternal flames.",
    world: "mountains",
    element: "fire",
    icon: "fa-flame",
    color: "danger"
  },
  "ice-temple": {
    id: "ice-temple",
    name: "Frost Keep",
    description: "A gleaming fortress of frozen glass, guarding the frozen memories of ages long past.",
    world: "ice",
    element: "ice",
    icon: "fa-snowflake",
    color: "medium"
  },
  "light-temple": {
    id: "light-temple",
    name: "Solar Sanctum",
    description: "A radiant cathedral bathed in perpetual sunbeams, standing as a beacon of hope against the encroaching dark.",
    world: "desert",
    element: "light",
    icon: "fa-sun",
    color: "warning"
  },
  "shadow-temple": {
    id: "shadow-temple",
    name: "Lunar Shrine",
    description: "A mysterious domain veiled in moonlit mist, where the line between reality and dream fades away.",
    world: "moon",
    element: "shadow",
    icon: "fa-moon",
    color: "dark"
  }
};

export const getTempleMetadata = (templeId: string): TempleMetadata => {
  return TEMPLE_METADATA[templeId] || {
    id: templeId,
    name: "Unknown Temple",
    description: "A mysterious location.",
    world: "plains",
    element: "none",
    icon: "fa-dungeon",
    color: "medium"
  };
};
