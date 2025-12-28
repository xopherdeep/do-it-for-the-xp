/**
 * Item Types - TypeScript interfaces for the item system.
 * 
 * Categories:
 * - narrative: Story-unlocked UI access items
 * - pegasus: Liberation rewards from freeing Pegasi
 * - dungeon: Temple-only items (keys, maps, bombs)
 * - consumable: Shop-purchasable items (potions, ethers)
 */

export type ItemCategory = 
  | 'narrative'     // Story-unlocked
  | 'pegasus'       // Liberation rewards
  | 'dungeon'       // Found in temples
  | 'consumable';   // Shop items

export type UnlockEvent = 
  | 'starter'                    // Always available (after narrative unlock)
  | `narrative:${string}`        // Story moment, e.g., 'narrative:backpack'
  | `pegasus:${string}`          // Free pegasus, e.g., 'pegasus:aura'
  | `dungeon:${string}`          // Found in dungeon, e.g., 'dungeon:plains'
  | 'purchase';                  // Bought from shop

export interface ItemMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;                  // FontAwesome class (without fa- prefix)
  category: ItemCategory;
  
  // Unlock trigger
  unlockEvent: UnlockEvent;
  
  // For consumables
  gpCost?: number;
  hpRestore?: number;
  mpRestore?: number;
  mpCost?: number; // Cost to use item (e.g. Farore's Wind)
  stackable?: boolean;
  maxStack?: number;
  
  // What this item enables/unlocks
  unlocks?: {
    uiFeature?: string;          // e.g., 'modern-area-menu', 'inventory-access'
    modal?: string;              // e.g., 'pegasus-modal'
    ability?: string;            // e.g., 'foresee-monsters'
  };
}

/**
 * User's favorite food - uses existing favoriteFood field.
 * Consuming gives flat +50 HP, +25 MP bonus.
 */
export const FAVORITE_FOOD_BONUS = {
  hp: 50,
  mp: 25
} as const;
