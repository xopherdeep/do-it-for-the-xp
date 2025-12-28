/**
 * Import Wind Temple - A utility to import the wind-temple layout into the TempleDb
 */
import { TempleDb, templeStorage, TempleInterface } from '@/lib/databases/TempleDb';
import windTemple from '@/lib/engine/temples/wind-temple';
import { Room } from './types';
import debug from '@/lib/utils/debug';

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
        entrance: (windTemple as any).entrance,
        maze: (windTemple as any).maze as string[][] | Record<string, string[][]>,
        rooms: (windTemple as any).rooms as Record<string, Room>
      }
    };
    
    // Store the temple in the database
    await templeDb.setTemple(templeData);
    debug.log('Wind Temple imported successfully to TempleDb');
  } catch (error) {
    debug.error('Failed to import Wind Temple to TempleDb:', error);
  }
}