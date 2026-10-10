
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
    name: "The Howling Spire",
    description: "A tower lashed to the top of the world, where the wind itself is the teacher. Every stair sings, every door slams, and only the steady of heart reach the open sky.",
    world: "plains",
    element: "wind",
    icon: "fa-wind",
    color: "primary"
  },
  "earth-temple": {
    id: "earth-temple",
    name: "Rootvault Hollow",
    description: "Halls of old stone swallowed by older roots. The ground remembers every footstep here, and it has been waiting a very long time for yours.",
    world: "forest",
    element: "earth",
    icon: "fa-leaf",
    color: "success"
  },
  "water-temple": {
    id: "water-temple",
    name: "Tidesong Palace",
    description: "A sunken palace that breathes with the sea. The floors rise and fall with the tide, and the walls hum the song that keeps the deep asleep.",
    world: "islands",
    element: "water",
    icon: "fa-water",
    color: "tertiary"
  },
  "fire-temple": {
    id: "fire-temple",
    name: "Emberforge Citadel",
    description: "A fortress hammered into the heart of a volcano. Heroes are not born here. They are forged, one glowing stair at a time.",
    world: "mountains",
    element: "fire",
    icon: "fa-flame",
    color: "danger"
  },
  "ice-temple": {
    id: "ice-temple",
    name: "Glasswinter Keep",
    description: "A castle of frozen glass where every memory of the old world is kept mid-breath. Walk softly: the ice is listening.",
    world: "ice",
    element: "ice",
    icon: "fa-snowflake",
    color: "medium"
  },
  "light-temple": {
    id: "light-temple",
    name: "Sunspire Sanctum",
    description: "A cathedral that keeps the dawn safe at night. Its lanterns never go out, and whatever hides from light hates this place most of all.",
    world: "desert",
    element: "light",
    icon: "fa-sun",
    color: "warning"
  },
  "shadow-temple": {
    id: "shadow-temple",
    name: "The Moonveil Shrine",
    description: "A shrine wrapped in moonlit mist where dreams wander in and not all of them wander out. Keep your lantern lit and your name in your pocket.",
    world: "swamps",
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
