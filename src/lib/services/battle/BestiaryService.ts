import BestiaryDb, { beastStorage } from "@/lib/databases/BestiaryDb";
import { Enemy } from './BattleService';

/**
 * BestiaryService - Service for loading and managing enemies from the bestiary
 * 
 * This service encapsulates the bestiary interaction logic,
 * making it easier to load enemies for battles.
 */
export class BestiaryService {
  private bestiary: BestiaryDb;
  private avatarBasePath: string = '/assets/images/beasts/';

  constructor() {
    this.bestiary = new BestiaryDb(beastStorage);
  }

  /**
   * Get the avatar image URL for a beast
   * @param id The beast avatar ID
   * @returns The URL to the avatar image
   */
  public getAvatar(id: number): string {
    try {
      const pad = id.toString().padStart(3, '0');
      return require(`@/assets/images/beasts/${pad}.png`);
    } catch (error) {
      console.error('Error loading beast avatar:', error);
      return '';
    }
  }

  /**
   * Load a beast by its ID
   * @param beastId The ID of the beast to load
   * @returns The beast converted to an Enemy object, or null if not found
   */
  public async loadBeastById(beastId: string): Promise<Enemy | null> {
    try {
      const beast = await this.bestiary.getBeastById(beastId);
      if (!beast) return null;
      
      return this.convertBeastToEnemy(beast);
    } catch (error) {
      console.error('Error loading beast:', error);
      return null;
    }
  }

  /**
   * Load a random beast from the bestiary
   * @returns A random beast converted to an Enemy object, or null if none available
   */
  public async loadRandomBeast(): Promise<Enemy | null> {
    try {
      const beasts = await this.bestiary.getBeasts();
      if (!beasts || beasts.length === 0) return null;
      
      // Pick a random beast
      const randomIndex = Math.floor(Math.random() * beasts.length);
      const beast = beasts[randomIndex];
      
      return this.convertBeastToEnemy(beast);
    } catch (error) {
      console.error('Error loading random beast:', error);
      return null;
    }
  }

  /**
   * Create a sample enemy for testing/fallback
   * @returns A sample enemy
   */
  public createSampleEnemy(): Enemy {
    return {
      id: 'sample',
      name: 'Training Dummy',
      type: 'beast',
      isBoss: false,
      health: 500,
      maxHealth: 500,
      emoji: '👾' // Fallback emoji if no image available
    };
  }

  /**
   * Convert a beast from the bestiary to an Enemy object
   * @param beast The beast object from the bestiary
   * @returns The beast converted to an Enemy object
   */
  private convertBeastToEnemy(beast: any): Enemy {
    return {
      id: beast.id,
      name: beast.name,
      type: 'beast', // Generic type for custom beasts
      isBoss: false, // Could be determined by beast properties if needed
      health: 500, // Default values or could be based on beast properties
      maxHealth: 500,
      avatar: beast.avatar, // Store the avatar ID for image loading
      imageUrl: beast.avatar ? this.getAvatar(beast.avatar) : undefined,
      emoji: '👾' // Fallback emoji if image fails to load
    };
  }

  /**
   * Get the beast background settings (for battle backgrounds)
   * @param beast The beast object from the bestiary
   * @returns An object with background settings or null if not available
   */
  public getBeastBackgroundSettings(beast: any): { bg1: number, bg2: number, aspectRatio?: number } | null {
    if (!beast || beast.bg1 === undefined || beast.bg2 === undefined) return null;
    
    return {
      bg1: beast.bg1,
      bg2: beast.bg2,
      aspectRatio: beast.aspectRatio || 48
    };
  }
}