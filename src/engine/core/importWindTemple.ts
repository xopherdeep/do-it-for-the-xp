/**
 * Import Wind Temple - A utility to import the wind-temple layout into the TempleDb
 */
import { TempleDb, templeStorage, TempleInterface } from '@/databases/TempleDb';
import windTemple from '@/views/Console/MyPortal/HomeTown/TempleGrounds/temples/wind-temple';
import debug from '@/utils/debug';

/**
 * Import the wind-temple layout into the TempleDb
 * This makes it available for editing in the temple creator
 */
export async function importWindTempleToDb(): Promise<void> {
  try {
    // Initialize the storage
    await templeStorage.create();
    
    // Create TempleDb instance
    const templeDb = new TempleDb(templeStorage);
    
    // Convert the wind temple to the TempleInterface format
    const templeData: TempleInterface = {
      id: 'wind-temple',
      customName: 'Wind Temple',
      customDescription: 'The ancient temple of wind, home to powerful air magic and flying creatures.',
      categoryIds: ['dungeon', 'wind'],
      level: 3,
      dungeonLayout: {
        entrance: windTemple.entrance,
        maze: windTemple.maze,
        rooms: windTemple.rooms
      }
    };
    
    // Store the temple in the database
    await templeDb.setTemple(templeData);
    debug.log('Wind Temple imported successfully to TempleDb');
  } catch (error) {
    debug.error('Failed to import Wind Temple to TempleDb:', error);
  }
}