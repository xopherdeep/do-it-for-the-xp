/**
 * Player Stats Service
 * 
 * Handles HP, MP, and stat calculations based on level, job class, and special stats.
 * This provides a unified way to calculate player stats across the application.
 */

import { SpecialStats } from '@/lib/utils/User/stats';

// ============================================
// BASE STATS BY JOB CLASS
// ============================================

export interface JobClassBaseStats {
  hp: number;        // Base HP at level 1
  mp: number;        // Base MP at level 1
  hpGrowth: number;  // HP gained per level
  mpGrowth: number;  // MP gained per level
  // Multipliers for special stats contribution
  enduranceMultiplier: number;  // How much endurance affects HP
  intelligenceMultiplier: number; // How much intelligence affects MP
  wisdomMultiplier: number;     // How much wisdom affects MP
}

export const JOB_CLASS_BASE_STATS: Record<string, JobClassBaseStats> = {
  Warrior: {
    hp: 50,
    mp: 10,
    hpGrowth: 8,
    mpGrowth: 2,
    enduranceMultiplier: 3,    // Warriors benefit most from endurance
    intelligenceMultiplier: 0.5,
    wisdomMultiplier: 0.5,
  },
  Mage: {
    hp: 25,
    mp: 40,
    hpGrowth: 3,
    mpGrowth: 8,
    enduranceMultiplier: 1,
    intelligenceMultiplier: 3,  // Mages benefit most from intelligence
    wisdomMultiplier: 2,
  },
  Thief: {
    hp: 35,
    mp: 20,
    hpGrowth: 5,
    mpGrowth: 4,
    enduranceMultiplier: 1.5,
    intelligenceMultiplier: 1,
    wisdomMultiplier: 1,
  },
  Monk: {
    hp: 45,
    mp: 25,
    hpGrowth: 7,
    mpGrowth: 5,
    enduranceMultiplier: 2.5,   // Monks are hardy
    intelligenceMultiplier: 1,
    wisdomMultiplier: 1.5,      // Monks have good wisdom too
  },
  // Default fallback for unknown classes
  default: {
    hp: 30,
    mp: 20,
    hpGrowth: 5,
    mpGrowth: 4,
    enduranceMultiplier: 1.5,
    intelligenceMultiplier: 1.5,
    wisdomMultiplier: 1,
  }
};

// ============================================
// XP REQUIREMENTS PER LEVEL
// ============================================

/**
 * Calculate XP required to reach a specific level
 * Uses a simple quadratic formula: XP = 100 * level^1.5
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level, 1.5));
}

/**
 * Calculate XP needed to reach the next level from current level
 */
export function getXpToNextLevel(currentLevel: number): number {
  return getXpForLevel(currentLevel + 1) - getXpForLevel(currentLevel);
}

/**
 * Get total XP accumulated from level 1 to current level
 */
export function getTotalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXpForLevel(i + 1) - getXpForLevel(i);
  }
  return total;
}

/**
 * Calculate what level a player should be based on total XP
 */
export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  let xpNeeded = 0;
  
  while (xpNeeded <= totalXp) {
    level++;
    xpNeeded = getXpForLevel(level);
    if (level > 99) break; // Cap at level 99
  }
  
  return Math.max(1, level - 1);
}

// ============================================
// HP/MP CALCULATION
// ============================================

export interface CalculatedStats {
  hp: {
    now: number;
    max: number;
    min: number;
  };
  mp: {
    now: number;
    max: number;
    min: number;
  };
}

/**
 * Calculate max HP based on level, job class, and special stats
 */
export function calculateMaxHp(
  level: number,
  jobClass: string,
  specialStats?: Partial<SpecialStats>
): number {
  const baseStats = JOB_CLASS_BASE_STATS[jobClass] || JOB_CLASS_BASE_STATS.default;
  
  // Base HP at level 1
  let maxHp = baseStats.hp;
  
  // Add HP growth for each level above 1
  if (level > 1) {
    maxHp += baseStats.hpGrowth * (level - 1);
  }
  
  // Add contribution from endurance stat
  const endurance = specialStats?.endurance || 0;
  maxHp += Math.floor(endurance * baseStats.enduranceMultiplier);
  
  // Add contribution from guts stat (secondary HP stat)
  const guts = specialStats?.guts || 0;
  maxHp += Math.floor(guts * 0.5);
  
  return Math.max(1, Math.floor(maxHp));
}

/**
 * Calculate max MP based on level, job class, and special stats
 */
export function calculateMaxMp(
  level: number,
  jobClass: string,
  specialStats?: Partial<SpecialStats>
): number {
  const baseStats = JOB_CLASS_BASE_STATS[jobClass] || JOB_CLASS_BASE_STATS.default;
  
  // Base MP at level 1
  let maxMp = baseStats.mp;
  
  // Add MP growth for each level above 1
  if (level > 1) {
    maxMp += baseStats.mpGrowth * (level - 1);
  }
  
  // Add contribution from intelligence stat
  const intelligence = specialStats?.intelligence || 0;
  maxMp += Math.floor(intelligence * baseStats.intelligenceMultiplier);
  
  // Add contribution from wisdom stat
  const wisdom = specialStats?.wisdom || 0;
  maxMp += Math.floor(wisdom * baseStats.wisdomMultiplier);
  
  return Math.max(0, Math.floor(maxMp));
}

/**
 * Calculate both HP and MP stats for a player
 */
export function calculatePlayerStats(
  level: number,
  jobClass: string,
  specialStats?: Partial<SpecialStats>,
  currentHp?: number,
  currentMp?: number
): CalculatedStats {
  const maxHp = calculateMaxHp(level, jobClass, specialStats);
  const maxMp = calculateMaxMp(level, jobClass, specialStats);
  
  return {
    hp: {
      // If currentHp is provided and valid, use it (capped at max)
      // Otherwise default to full HP
      now: currentHp !== undefined ? Math.min(currentHp, maxHp) : maxHp,
      max: maxHp,
      min: 0,
    },
    mp: {
      // If currentMp is provided and valid, use it (capped at max)
      // Otherwise default to full MP
      now: currentMp !== undefined ? Math.min(currentMp, maxMp) : maxMp,
      max: maxMp,
      min: 0,
    }
  };
}

// ============================================
// LEVEL UP HANDLING
// ============================================

export interface LevelUpResult {
  newLevel: number;
  hpGained: number;
  mpGained: number;
  newMaxHp: number;
  newMaxMp: number;
}

/**
 * Calculate the result of leveling up
 */
export function calculateLevelUp(
  currentLevel: number,
  targetLevel: number,
  jobClass: string,
  specialStats?: Partial<SpecialStats>
): LevelUpResult {
  const oldMaxHp = calculateMaxHp(currentLevel, jobClass, specialStats);
  const oldMaxMp = calculateMaxMp(currentLevel, jobClass, specialStats);
  
  const newMaxHp = calculateMaxHp(targetLevel, jobClass, specialStats);
  const newMaxMp = calculateMaxMp(targetLevel, jobClass, specialStats);
  
  return {
    newLevel: targetLevel,
    hpGained: newMaxHp - oldMaxHp,
    mpGained: newMaxMp - oldMaxMp,
    newMaxHp,
    newMaxMp,
  };
}

/**
 * Check if player can level up based on XP
 */
export function canLevelUp(currentLevel: number, currentXp: number): boolean {
  const xpNeededForNextLevel = getXpForLevel(currentLevel + 1);
  return currentXp >= xpNeededForNextLevel;
}

// ============================================
// STAT PREVIEW (for character creation)
// ============================================

/**
 * Get a preview of stats for a given job class at level 1
 * Useful for character creation screen
 */
export function getJobClassPreview(jobClass: string): {
  hp: number;
  mp: number;
  hpGrowth: number;
  mpGrowth: number;
  description: string;
} {
  const stats = JOB_CLASS_BASE_STATS[jobClass] || JOB_CLASS_BASE_STATS.default;
  
  const descriptions: Record<string, string> = {
    Warrior: "High HP, low MP. Best for physical challenges.",
    Mage: "Low HP, high MP. Masters of abilities and knowledge.",
    Thief: "Balanced stats. Excels at efficiency and resource gathering.",
    Monk: "Good HP and MP. Balanced physical and mental prowess.",
    default: "A balanced adventurer with no specialization.",
  };
  
  return {
    hp: stats.hp,
    mp: stats.mp,
    hpGrowth: stats.hpGrowth,
    mpGrowth: stats.mpGrowth,
    description: descriptions[jobClass] || descriptions.default,
  };
}

// ============================================
// SERVICE SINGLETON
// ============================================

class PlayerStatsService {
  calculateMaxHp = calculateMaxHp;
  calculateMaxMp = calculateMaxMp;
  calculatePlayerStats = calculatePlayerStats;
  calculateLevelUp = calculateLevelUp;
  canLevelUp = canLevelUp;
  getXpForLevel = getXpForLevel;
  getXpToNextLevel = getXpToNextLevel;
  getLevelFromXp = getLevelFromXp;
  getJobClassPreview = getJobClassPreview;
}

let serviceInstance: PlayerStatsService | null = null;

export function getPlayerStatsService(): PlayerStatsService {
  if (!serviceInstance) {
    serviceInstance = new PlayerStatsService();
  }
  return serviceInstance;
}

export default PlayerStatsService;
