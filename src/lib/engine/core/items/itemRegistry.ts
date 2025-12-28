/**
 * Item Registry - Source of truth for all item configurations.
 * 
 * This file defines the static metadata for each item in the game.
 * Items are organized by category:
 * - Narrative: Story-unlocked UI access
 * - Pegasus: Liberation rewards  
 * - Dungeon: Temple-only items
 * - Consumable: Shop items
 */

import type { ItemMetadata } from './itemTypes';

// =============================================================================
// NARRATIVE ITEMS (Story Unlocks)
// =============================================================================

const NARRATIVE_ITEMS: ItemMetadata[] = [
  {
    id: 'backpack',
    name: 'Backpack',
    description: "Your trusty adventure pack! Don't forget it!",
    icon: 'backpack',
    category: 'narrative',
    unlockEvent: 'narrative:backpack',
    unlocks: {
      uiFeature: 'inventory-access'
    }
  },
  {
    id: 'wallet',
    name: 'Wallet',
    description: 'Your ATM card arrived! Now you can track your Gold Points.',
    icon: 'wallet',
    category: 'narrative',
    unlockEvent: 'narrative:wallet',
    unlocks: {
      uiFeature: 'gp-tracking'
    }
  },
  {
    id: 'book-of-spells',
    name: 'Book of Spells',
    description: 'A magical grimoire containing all your learned abilities.',
    icon: 'book-spells',
    category: 'narrative',
    unlockEvent: 'narrative:spellbook',
    unlocks: {
      uiFeature: 'abilities-access'
    }
  },
  {
    id: 'tododexicon',
    name: 'TodoDexicon',
    description: 'You can foresee the monsters raiding the city! A compendium of all tasks and quests.',
    icon: 'book-dead',
    category: 'narrative',
    unlockEvent: 'narrative:tododexicon',
    unlocks: {
      ability: 'foresee-monsters',
      uiFeature: 'quest-log-access'
    }
  }
];

// =============================================================================
// PEGASUS ITEMS (Liberation Rewards)
// =============================================================================

const PEGASUS_ITEMS: ItemMetadata[] = [
  {
    id: 'pegasus-boots',
    name: 'Pegasus Boots',
    description: 'Magical boots gifted by Aura. Transforms your Area Menu from retro to modern!',
    icon: 'boot',
    category: 'pegasus',
    unlockEvent: 'pegasus:aura',
    unlocks: {
      uiFeature: 'modern-area-menu'
    }
  },
  {
    id: 'wind-whistle',
    name: 'Wind Whistle',
    description: 'A mystical whistle gifted by Ventus. Summon the Pegasi for fast travel!',
    icon: 'whistle',
    category: 'pegasus',
    unlockEvent: 'pegasus:ventus',
    unlocks: {
      modal: 'pegasus-modal'
    }
  }
];

// =============================================================================
// DUNGEON ITEMS (Found in Temples)
// =============================================================================

const DUNGEON_ITEMS: ItemMetadata[] = [
  {
    id: 'bomb',
    name: 'Bomb',
    description: 'Blow through bombable dungeon doors. Handle with care!',
    icon: 'bomb',
    category: 'dungeon',
    unlockEvent: 'dungeon:any',
    stackable: true,
    maxStack: 10
  },
  {
    id: 'small-key',
    name: 'Small Key',
    description: 'Opens one locked door in the current dungeon.',
    icon: 'key',
    category: 'dungeon',
    unlockEvent: 'dungeon:any',
    stackable: true,
    maxStack: 5
  },
  {
    id: 'master-key',
    name: 'Master Key',
    description: 'The ornate key to the boss chamber. One per dungeon.',
    icon: 'key-skeleton',
    category: 'dungeon',
    unlockEvent: 'dungeon:any',
    stackable: false
  },
  {
    id: 'dungeon-map',
    name: 'Dungeon Map',
    description: 'Reveals the full layout of the current floor.',
    icon: 'map',
    category: 'dungeon',
    unlockEvent: 'dungeon:any'
  },
  {
    id: 'compass',
    name: 'Compass',
    description: 'Points to the boss location and shows treasure chests.',
    icon: 'compass',
    category: 'dungeon',
    unlockEvent: 'dungeon:any'
  }
];

// =============================================================================
// CONSUMABLE ITEMS (Shop Purchases)
// =============================================================================

const CONSUMABLE_ITEMS: ItemMetadata[] = [
  {
    id: 'health-potion',
    name: 'Health Potion',
    description: 'A refreshing red elixir that restores 50 HP.',
    icon: 'flask-round-potion',
    category: 'consumable',
    unlockEvent: 'purchase',
    gpCost: 50,
    hpRestore: 50,
    stackable: true,
    maxStack: 99
  },
  {
    id: 'mana-potion',
    name: 'Mana Potion',
    description: 'A shimmering blue potion that restores 30 MP.',
    icon: 'flask-potion',
    category: 'consumable',
    unlockEvent: 'purchase',
    gpCost: 75,
    mpRestore: 30,
    stackable: true,
    maxStack: 99
  },
  {
    id: 'ether',
    name: 'Ether',
    description: 'A concentrated magical essence that restores 50 MP.',
    icon: 'sparkles',
    category: 'consumable',
    unlockEvent: 'purchase',
    gpCost: 100,
    mpRestore: 50,
    stackable: true,
    maxStack: 99
  },
  {
    id: 'elixir',
    name: 'Elixir',
    description: 'A legendary golden brew that fully restores HP and MP.',
    icon: 'flask',
    category: 'consumable',
    unlockEvent: 'purchase',
    gpCost: 200,
    hpRestore: 9999,  // Full restore
    mpRestore: 9999,  // Full restore
    stackable: true,
    maxStack: 10
  },
  {
    id: 'farores-wind',
    name: "Farore's Wind",
    description: 'Warp to any visited room in a dungeon! Open the map and hover over rooms to activate the transporter sequence. Costs 25 MP per warp.',
    icon: 'transporter-3',
    category: 'consumable',
    unlockEvent: 'purchase',
    gpCost: 500,
    mpCost: 25,
    unlocks: {
      ability: 'dungeon-warp'
    }
  }
];

// =============================================================================
// COMBINED REGISTRY
// =============================================================================

export const ITEM_METADATA: Record<string, ItemMetadata> = [
  ...NARRATIVE_ITEMS,
  ...PEGASUS_ITEMS,
  ...DUNGEON_ITEMS,
  ...CONSUMABLE_ITEMS
].reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {} as Record<string, ItemMetadata>);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const getItemMetadata = (itemId: string): ItemMetadata | undefined => {
  return ITEM_METADATA[itemId];
};

export const getAllItems = (): ItemMetadata[] => {
  return Object.values(ITEM_METADATA);
};

export const getItemsByCategory = (category: ItemMetadata['category']): ItemMetadata[] => {
  return Object.values(ITEM_METADATA).filter(item => item.category === category);
};

export const getNarrativeItems = (): ItemMetadata[] => getItemsByCategory('narrative');
export const getPegasusItems = (): ItemMetadata[] => getItemsByCategory('pegasus');
export const getDungeonItems = (): ItemMetadata[] => getItemsByCategory('dungeon');
export const getConsumableItems = (): ItemMetadata[] => getItemsByCategory('consumable');

export const getShopItems = (): ItemMetadata[] => {
  return Object.values(ITEM_METADATA).filter(item => item.gpCost !== undefined);
};
