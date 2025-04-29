/**
 * Import All Temples - A utility to import all temple layouts into the TempleDb
 */
import { TempleDb, templeStorage, TempleInterface } from '@/lib/databases/TempleDb';
import temples from '@/views/Console/MyPortal/HomeTown/TempleGrounds/temples';
import debug from '@/lib/utils/debug';

/**
 * Import all temple layouts into the TempleDb
 * This makes them available for editing in the temple creator
 */
export async function importAllTempleLayouts(): Promise<void> {
  try {
    // Initialize the storage
    await templeStorage.create();
    
    // Create TempleDb instance
    const templeDb = new TempleDb(templeStorage);
    
    // Get temple display names
    const templeNames = {
      "wind-temple": "Temple of Zephyr",
      "earth-temple": "Gaia Sanctuary",
      "water-temple": "Aqua Haven",
      "fire-temple": "Inferno Citadel",
      "ice-temple": "Frost Keep",
      "light-temple": "Solar Sanctum",
      "shadow-temple": "Lunar Shrine",
      "storm-temple": "Storm Spire",
      "moon-temple": "Lunar Shrine"
    };

    // Get temple descriptions
    const templeDescriptions = {
      "wind-temple": "Masters of aerial magic and swift techniques",
      "earth-temple": "Guardians of nature and earthen powers",
      "water-temple": "Wielders of healing and fluid combat",
      "fire-temple": "Home to powerful offensive spells",
      "ice-temple": "Specialists in ice magic and defense",
      "light-temple": "Light magic and restoration abilities",
      "shadow-temple": "Dark magic and mysterious arts",
      "storm-temple": "Masters of lightning and thunder",
      "moon-temple": "Mysterious powers of the night sky"
    };
    
    // Import each temple layout
    for (const [templeId, templeData] of Object.entries(temples)) {
      debug.log(`Importing ${templeId} layout to TempleDb...`);
      
      // Convert the temple to the TempleInterface format
      const templeToSave: TempleInterface = {
        id: templeId,
        customName: templeNames[templeId] || templeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        customDescription: templeDescriptions[templeId] || `A mysterious temple of ${templeId.split('-')[0]} magic.`,
        categoryIds: ['dungeon', templeId.split('-')[0]],
        level: getTempleLevel(templeId),
        dungeonLayout: {
          entrance: templeData.entrance,
          maze: templeData.maze,
          rooms: templeData.rooms
        }
      };
      
      // Store the temple in the database
      await templeDb.setTemple(templeToSave);
      debug.log(`${templeId} imported successfully to TempleDb`);
    }
    
    debug.log('All temple layouts imported successfully to TempleDb');
  } catch (error) {
    debug.error('Failed to import temple layouts to TempleDb:', error);
  }
}

/**
 * Get a default level for each temple type
 */
function getTempleLevel(templeId: string): number {
  const levels = {
    "wind-temple": 1,
    "water-temple": 2,
    "earth-temple": 3,
    "moon-temple": 4,
    "fire-temple": 5,
    "light-temple": 6,
    "ice-temple": 7,
    "storm-temple": 8,
    "shadow-temple": 9
  };
  
  return levels[templeId] || Math.floor(Math.random() * 5) + 1; // Default to random level 1-5
}