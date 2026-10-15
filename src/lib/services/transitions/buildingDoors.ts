// Building doors: which kind of door the hero walks through for each building, so the shop, the hospital and the
// Hermit's Tent each open their own way. Pure data, no Vue: the doors effect
// (src/components/organisms/SceneTransition/effects/DoorsEffect.vue) draws and animates one door per type.

/**
 * - plank:   double plank doors on iron bands, swinging away (homes, hotels)
 * - shop:    one shop door on a hinge with a bell over it that jingles (shops and stalls)
 * - sliding: glass doors that glide apart (the hospital)
 * - vault:   a round steel vault door that spins its wheel and rolls aside (the bank)
 * - stone:   heavy stone slabs that grind open toward the hero (the town hall)
 * - gate:    an iron portcullis that clanks up on its chains (a city or citadel)
 * - tent:    two cloth flaps drawn back to the corners (tents and market canopies)
 * - portal:  no door at all, a swirl that pulls the hero through (caves and magic places)
 */
export type DoorType = "plank" | "shop" | "sliding" | "vault" | "stone" | "gate" | "tent" | "portal";

export const DOOR_TYPES: DoorType[] = ["plank", "shop", "sliding", "vault", "stone", "gate", "tent", "portal"];

/** The door of each building, by building or merchant id (the ids XpBuildingModel and the shop route use). */
export const DOOR_BY_BUILDING: Record<string, DoorType> = {
  // Home Town
  "my-home": "plank",
  "hero-home": "plank",
  hotel: "plank",
  shop: "shop",
  "hometown-market": "shop",
  hospital: "sliding",
  bank: "vault",
  "town-hall": "stone",
  // Land shops
  "pegasus-ranch": "shop",
  "wrecked-ship": "shop",
  "witchs-hut": "shop",
  "snow-shack": "shop",
  "traveling-merchant": "shop",
  "hermits-tent": "tent",
  "pond-of-life": "tent",
  "cloud-market": "tent",
  "crystal-caverns": "portal",
  "theia-city": "gate",
};

/** The door for a building; plank doors for anything the table does not know. */
export const doorTypeFor = (buildingId?: string): DoorType =>
  (buildingId && DOOR_BY_BUILDING[buildingId]) || "plank";
