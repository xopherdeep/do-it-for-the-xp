
import debug from "@/lib/utils/debug";

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
  },
  "moon-temple": {
    id: "moon-temple",
    name: "Selene's Silent Court",
    description: "A pale court of moonstone where gravity forgets its manners and the silence is so deep you can hear your own heartbeat drift. Step lightly: the floor is borrowed from the sky.",
    world: "moon",
    element: "moon",
    icon: "fa-moon-stars",
    color: "secondary"
  },
  "storm-temple": {
    id: "storm-temple",
    name: "Thunderhead Aerie",
    description: "A fortress nested in a cloud that never breaks, where lightning is the doorbell and every gale carries a dare. Hold fast, and the sky will let you pass.",
    world: "clouds",
    element: "storm",
    icon: "fa-bolt",
    color: "tertiary"
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

// Generated temples (gen-<slug>) live in the TempleDb, not in TEMPLE_METADATA; a resolved one is cached here
const generatedMetadata = new Map<string, TempleMetadata>();

/** Forget a resolved generated temple, so the next metadataForAsync reads its (edited) record again. */
export const forgetGeneratedMetadata = (templeId: string): void => {
  generatedMetadata.delete(templeId);
};

/** Sync lookup: a registry temple, or a generated one already resolved by metadataForAsync. */
export const metadataFor = (templeId: string): TempleMetadata | undefined => {
  return TEMPLE_METADATA[templeId] || generatedMetadata.get(templeId);
};

/** Registry temple, else a custom/generated temple built from its TempleDb record, else the getTempleMetadata fallback. */
export const metadataForAsync = async (templeId: string): Promise<TempleMetadata> => {
  const known = metadataFor(templeId);
  if (known) return known;
  const isUnregistered = !TEMPLE_METADATA[templeId];
  if (isUnregistered) {
    try {
      const { TempleDb, templeStorage } = await import("@/lib/databases/TempleDb");
      const record = await new TempleDb(templeStorage).getTempleById(templeId);
      if (record) {
        const isHouse = record.themeId === "home" || templeId === "moving-house";
        const meta: TempleMetadata = {
          id: templeId,
          name: record.customName || record.name || "Unknown Temple",
          description: record.customDescription || (isHouse ? "The old house, room by room." : "A custom temple."),
          world: record.themeId || "plains",
          element: record.element || "none",
          icon: isHouse ? "fa-home" : "fa-dungeon",
          color: "medium"
        };
        generatedMetadata.set(templeId, meta);
        return meta;
      }
    } catch (error) {
      // No TempleDb (tests, private mode): fall through to the unknown-temple fallback
      debug.warn("[templeRegistry] could not load custom temple metadata", templeId, error);
    }
  }
  return getTempleMetadata(templeId);
};
