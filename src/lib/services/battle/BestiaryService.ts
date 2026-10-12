import BestiaryDb, { beastStorage, type Beast } from "@/lib/databases/BestiaryDb";
import { Enemy } from './BattleService';
import debug from "@/lib/utils/debug";

export const TOTAL_BEAST_AVATARS = 93; // NNN.webp files in src/assets/images/beasts (tools/art/beasts.py draws the newer ones)
export const MAX_BG_INDEX = 325;

const getRandomBeastAvatar = (): number => Math.floor(Math.random() * TOTAL_BEAST_AVATARS) + 1;
const getRandomBgIndex = (): number => Math.floor(Math.random() * (MAX_BG_INDEX + 1));

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
      return require(`@/assets/images/beasts/${pad}.webp`);
    } catch (error) {
      debug.error('Error loading beast avatar:', error);
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
      debug.error('Error loading beast:', error);
      return null;
    }
  }

  /**
   * Every beast in the bestiary, as stored (the temple rooms pick theirs from this list)
   * @returns The beasts, or an empty list when the bestiary is empty or cannot be read
   */
  public async listBeasts(): Promise<Beast[]> {
    try {
      const all = await this.bestiary.getBeasts();
      return all && all.length ? all : [];
    } catch (error) {
      debug.error('Error listing beasts:', error);
      return [];
    }
  }

  /**
   * Load a random beast from the bestiary
   * @param element When given, pick among the beasts tagged with it (all beasts if none are)
   * @returns A random beast converted to an Enemy object, or null if none available
   */
  public async loadRandomBeast(element?: string): Promise<Enemy | null> {
    try {
      const all = await this.bestiary.getBeasts();
      if (!all || all.length === 0) return null;
      const native = element ? all.filter((b: any) => b.element === element) : [];
      const beasts = native.length ? native : all;

      // Pick a random beast
      const randomIndex = Math.floor(Math.random() * beasts.length);
      const beast = beasts[randomIndex];

      return this.convertBeastToEnemy(beast);
    } catch (error) {
      debug.error('Error loading random beast:', error);
      return null;
    }
  }

  /**
   * Creates a sample enemy for demos or when no beasts are available
   */
  public createSampleEnemy(): Enemy {
    const randomAvatar = getRandomBeastAvatar();
    const randomBg1 = getRandomBgIndex();
    const randomBg2 = getRandomBgIndex();

    return {
      id: 'sample',
      name: 'Training Dummy',
      type: 'beast',
      isBoss: false,
      health: 500,
      maxHealth: 500,
      avatar: randomAvatar,
      bg1: randomBg1,
      bg2: randomBg2,
      aspectRatio: 48,
      emoji: '👾',
      attack: 10,
      defense: 5,
      speed: 8,
      tasks: [
        { id: 's1', name: 'Hit it', isCompleted: false },
        { id: 's2', name: 'Bop it', isCompleted: false }
      ]
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
      health: beast.health || 100,
      maxHealth: beast.maxHealth || 100,
      avatar: beast.avatar, // Store the avatar ID for image loading
      imageUrl: beast.imageUrl,
      emoji: beast.emoji || '👹',
      attack: beast.attack || 10,
      defense: beast.defense || 5,
      speed: beast.speed || 8,
      bg1: beast.bg1,
      bg2: beast.bg2,
      aspectRatio: beast.aspectRatio,
      tasks: beast.checklist ? beast.checklist.map((item: any, index: number) => ({
        id: item.id || `task-${index}`, // Use existing ID if available
        name: typeof item === 'string' ? item : (item.label || item.name || 'Unknown Task'),
        isCompleted: item.completed || false
      })) : []
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