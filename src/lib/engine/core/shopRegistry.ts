/**
 * Shop Registry - Source of truth for all shop configurations.
 * This file defines the static metadata for each shop in the game.
 * 
 * Shops are tied to worlds via the worldRegistry. This registry provides
 * the blueprint/defaults for shops. User-customized data is stored in ShopsDb.
 */



export interface ShopMetadata {
  id: string;
  name: string;
  description: string;
  world: string;       // World ID this shop belongs to
  icon: string;        // FontAwesome icon class (without fa- prefix)
  type: 'permanent' | 'traveling';  // Shop type
  clerkName?: string;  // Default shopkeeper name
}

export const SHOP_METADATA: Record<string, ShopMetadata> = {
  // Hometown (special)
  "hometown-market": {
    id: "hometown-market",
    name: "Hometown Market",
    description: "Your local general store, stocking everything a young hero might need.",
    world: "hometown",
    icon: "store-alt",
    type: "permanent",
    clerkName: "Old Man Morris"
  },
  
  // Plains World
  "pegasus-ranch": {
    id: "pegasus-ranch",
    name: "Pegasus Ranch",
    description: "A sprawling ranch where magical steeds are bred and exotic goods are traded.",
    world: "plains",
    icon: "farm",
    type: "permanent",
    clerkName: "Rancher Gale"
  },
  
  // Islands World
  "wrecked-ship": {
    id: "wrecked-ship",
    name: "The Wrecked Ship",
    description: "A beached galleon turned into a treasure trove of salvaged goods and rare finds.",
    world: "islands",
    icon: "ship",
    type: "permanent",
    clerkName: "Captain Flotsam"
  },
  
  // Forest World
  "hermits-tent": {
    id: "hermits-tent",
    name: "Hermit's Tent",
    description: "A humble tent deep in the woods, run by a wise hermit with rare herbs and potions.",
    world: "forest",
    icon: "campground",
    type: "permanent",
    clerkName: "The Hermit"
  },
  
  // Mountains World
  "crystal-caverns": {
    id: "crystal-caverns",
    name: "Crystal Caverns",
    description: "A glittering underground market where miners sell precious gems and ancient relics.",
    world: "mountains",
    icon: "dungeon",
    type: "permanent",
    clerkName: "Gemcutter Flint"
  },
  
  // Desert World
  "pond-of-life": {
    id: "pond-of-life",
    name: "Pond of Life Oasis",
    description: "A miraculous oasis offering life-giving supplies to weary desert travelers.",
    world: "desert",
    icon: "island-tropical",
    type: "permanent",
    clerkName: "Oasis Guardian Miriam"
  },
  
  // Swamps World
  "witchs-hut": {
    id: "witchs-hut",
    name: "Witch's Hut",
    description: "A crooked shack on chicken legs, filled with bubbling potions and cursed trinkets.",
    world: "swamps",
    icon: "cauldron",
    type: "permanent",
    clerkName: "Granny Hex"
  },
  
  // Ice World
  "snow-shack": {
    id: "snow-shack",
    name: "Snow Shack",
    description: "A cozy igloo trading post offering warm supplies to brave explorers of the tundra.",
    world: "ice",
    icon: "igloo",
    type: "permanent",
    clerkName: "Frostbite Freja"
  },
  
  // Clouds World
  "cloud-market": {
    id: "cloud-market",
    name: "Cloud Market",
    description: "A floating bazaar among the storms, selling lightning-forged goods and sky treasures.",
    world: "clouds",
    icon: "store",
    type: "permanent",
    clerkName: "Skyward Sam"
  },
  
  // Moon World
  "theia-city": {
    id: "theia-city",
    name: "Theia City Emporium",
    description: "A grand lunar marketplace in the heart of Theia, offering cosmic wares from across the stars.",
    world: "moon",
    icon: "chess-rook",
    type: "permanent",
    clerkName: "Lunar Lord Orion"
  },
  
  // Special: Traveling Merchant
  "traveling-merchant": {
    id: "traveling-merchant",
    name: "Traveling Merchant",
    description: "A mysterious wanderer who appears in different worlds on different days, offering rare and exotic items.",
    world: "traveling", // Special case - not tied to one world
    icon: "caravan",
    type: "traveling",
    clerkName: "Nomad Nix"
  }
};

// Convenience helpers

export const getShopMetadata = (shopId: string): ShopMetadata => {
  return SHOP_METADATA[shopId] || {
    id: shopId,
    name: "Unknown Shop",
    description: "A mysterious merchant.",
    world: "unknown",
    icon: "store",
    type: "permanent",
    clerkName: "Shopkeeper"
  };
};

export const getAllShops = (): ShopMetadata[] => {
  return Object.values(SHOP_METADATA);
};

export const getShopsByWorld = (worldId: string): ShopMetadata[] => {
  return Object.values(SHOP_METADATA).filter(s => s.world === worldId);
};

export const getPermanentShops = (): ShopMetadata[] => {
  return Object.values(SHOP_METADATA).filter(s => s.type === 'permanent');
};

export const getTravelingShops = (): ShopMetadata[] => {
  return Object.values(SHOP_METADATA).filter(s => s.type === 'traveling');
};
