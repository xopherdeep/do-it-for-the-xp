/**
 * Hotel Registry - Source of truth for lodging across all game worlds.
 * Defines static metadata for each hotel/inn/lodge where heroes pay to rest up.
 */

export interface HotelMetadata {
  id: string;
  name: string;
  description: string;
  world: string;
  icon: string;
  clerkName: string;
  badgeLabel: string;
}

export const HOTEL_METADATA: Record<string, HotelMetadata> = {
  "hometown-hotel": {
    id: "hometown-hotel",
    name: "Grand Hotel",
    description: "The premier luxury lodging of Hometown, with comfortable suites and warm hearths.",
    world: "hometown",
    icon: "hotel",
    clerkName: "Hotel Concierge",
    badgeLabel: "Hotel",
  },
  "plains-hotel": {
    id: "plains-hotel",
    name: "Windward Inn",
    description: "A breezy rest stop along the great grasslands, famed for soft featherbeds.",
    world: "plains",
    icon: "hotel",
    clerkName: "Innkeeper Zephyr",
    badgeLabel: "Windward Inn",
  },
  "islands-hotel": {
    id: "islands-hotel",
    name: "Coral Cove Resort",
    description: "An oceanfront bungalow resort overlooking azure lagoons and palm groves.",
    world: "islands",
    icon: "hotel",
    clerkName: "Concierge Marina",
    badgeLabel: "Coral Cove",
  },
  "forest-hotel": {
    id: "forest-hotel",
    name: "Canopy Lodge",
    description: "A wooden retreat suspended high in the ancient redwood branches.",
    world: "forest",
    icon: "hotel",
    clerkName: "Lodge Keeper Bramble",
    badgeLabel: "Canopy Lodge",
  },
  "mountains-hotel": {
    id: "mountains-hotel",
    name: "Highland Peak Inn",
    description: "A cozy stone lodge warmed by geothermal hot springs and roaring hearths.",
    world: "mountains",
    icon: "hotel",
    clerkName: "Host Boulder",
    badgeLabel: "Peak Inn",
  },
  "desert-hotel": {
    id: "desert-hotel",
    name: "Mirage Oasis Hotel",
    description: "A palatial desert sanctuary with cool marble halls and shaded courtyards.",
    world: "desert",
    icon: "hotel",
    clerkName: "Hostess Dunestar",
    badgeLabel: "Oasis Hotel",
  },
  "swamps-hotel": {
    id: "swamps-hotel",
    name: "Foggy Bayou Inn",
    description: "A quiet stilt-inn elevated above the murky marsh waters and lantern glow.",
    world: "swamps",
    icon: "hotel",
    clerkName: "Night Porter Moss",
    badgeLabel: "Bayou Inn",
  },
  "ice-hotel": {
    id: "ice-hotel",
    name: "Frostpeak Lodge",
    description: "A thermal haven shielded by thick timber walls and furs amidst eternal snow.",
    world: "ice",
    icon: "hotel",
    clerkName: "Lodge Host Ymir",
    badgeLabel: "Frostpeak Lodge",
  },
  "clouds-hotel": {
    id: "clouds-hotel",
    name: "Stratus Palace Hotel",
    description: "A celestial spire floating on cumulus clouds above the thunderstorm horizon.",
    world: "clouds",
    icon: "hotel",
    clerkName: "Steward Nimbus",
    badgeLabel: "Stratus Hotel",
  },
  "moon-hotel": {
    id: "moon-hotel",
    name: "Lunar Orbital Suites",
    description: "A futuristic orbital pod hotel providing zero-gravity slumber and stellar views.",
    world: "moon",
    icon: "hotel",
    clerkName: "Steward Astra",
    badgeLabel: "Lunar Suites",
  },
};

const DEFAULT_HOTEL = HOTEL_METADATA["hometown-hotel"];

export const getAllHotels = (): HotelMetadata[] => Object.values(HOTEL_METADATA);

export const getHotelByWorld = (worldId: string | null | undefined): HotelMetadata | undefined => {
  if (!worldId) return DEFAULT_HOTEL;
  const normalizedWorld = worldId.toLowerCase();
  return Object.values(HOTEL_METADATA).find(
    (hotel) => hotel.world.toLowerCase() === normalizedWorld
  );
};

export const getHotelMetadata = (hotelIdOrWorld: string | null | undefined): HotelMetadata => {
  if (!hotelIdOrWorld) return DEFAULT_HOTEL;
  const registered = HOTEL_METADATA[hotelIdOrWorld];
  if (registered) return registered;
  const byWorld = getHotelByWorld(hotelIdOrWorld);
  return byWorld || DEFAULT_HOTEL;
};
