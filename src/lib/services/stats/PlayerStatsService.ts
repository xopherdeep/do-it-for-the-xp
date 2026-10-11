/**
 * Player Stats Service
 * 
 * Handles HP, MP, and stat calculations based on level, job class, and special stats.
 * This provides a unified way to calculate player stats across the application.
 */

import { SpecialStats } from '@/lib/utils/User/stats';
import { JOB_CLASS_OPTIONS } from '@/constants/JOB_CLASS_OPTIONS';

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
  // Tier 2: each stays near its single parent and tilts toward what it does (see JOB_UNLOCK_REQUIREMENTS)
  Knight: {
    hp: 54,       // Warrior 50, a little sturdier
    mp: 11,
    hpGrowth: 8,
    mpGrowth: 2,
    enduranceMultiplier: 3,
    intelligenceMultiplier: 0.5,
    wisdomMultiplier: 0.75,
  },
  Berserker: {
    hp: 56,       // Warrior 50, all muscle and less MP
    mp: 8,
    hpGrowth: 9,
    mpGrowth: 1,
    enduranceMultiplier: 3,
    intelligenceMultiplier: 0.5,
    wisdomMultiplier: 0.5,
  },
  'White Mage': {
    hp: 28,       // Mage 25/40, a healer keeps a little more HP
    mp: 42,
    hpGrowth: 3,
    mpGrowth: 8,
    enduranceMultiplier: 1,
    intelligenceMultiplier: 2.5,
    wisdomMultiplier: 2.5,
  },
  'Black Mage': {
    hp: 24,       // Mage 25/40, glass cannon
    mp: 46,
    hpGrowth: 3,
    mpGrowth: 9,
    enduranceMultiplier: 1,
    intelligenceMultiplier: 3.5,
    wisdomMultiplier: 1.5,
  },
  Assassin: {
    hp: 36,       // Thief 35/20, a touch tougher
    mp: 20,
    hpGrowth: 6,
    mpGrowth: 3,
    enduranceMultiplier: 1.5,
    intelligenceMultiplier: 1,
    wisdomMultiplier: 0.75,
  },
  Ranger: {
    hp: 36,       // Thief 35/20, a touch more MP
    mp: 22,
    hpGrowth: 5,
    mpGrowth: 4,
    enduranceMultiplier: 1.5,
    intelligenceMultiplier: 1,
    wisdomMultiplier: 1.25,
  },
  'Martial Artist': {
    hp: 48,       // Monk 45/25, body first
    mp: 25,
    hpGrowth: 8,
    mpGrowth: 4,
    enduranceMultiplier: 2.75,
    intelligenceMultiplier: 1,
    wisdomMultiplier: 1.25,
  },
  Mystic: {
    hp: 42,       // Monk 45/25, mind first
    mp: 28,
    hpGrowth: 6,
    mpGrowth: 6,
    enduranceMultiplier: 2,
    intelligenceMultiplier: 1,
    wisdomMultiplier: 2,
  },
  // Tier 3: the numbers they have always had (the average of the old Warrior/Monk/Thief/Mage parents), kept so
  // no hero's max HP or MP shifts when the tree grew
  Paladin: {
    hp: 48,       // (Warrior 50 + Monk 45) / 2, rounded
    mp: 18,
    hpGrowth: 8,
    mpGrowth: 4,
    enduranceMultiplier: 2.75,
    intelligenceMultiplier: 0.75,
    wisdomMultiplier: 1,
  },
  Ninja: {
    hp: 43,       // (Thief 35 + Warrior 50) / 2, rounded
    mp: 15,
    hpGrowth: 7,
    mpGrowth: 3,
    enduranceMultiplier: 2.25,
    intelligenceMultiplier: 0.75,
    wisdomMultiplier: 0.75,
  },
  Sage: {
    hp: 35,       // (Mage 25 + Monk 45) / 2
    mp: 33,
    hpGrowth: 5,
    mpGrowth: 7,
    enduranceMultiplier: 1.75,
    intelligenceMultiplier: 2,
    wisdomMultiplier: 1.75,
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
// JOB UNLOCK REQUIREMENTS
// ============================================

/**
 * The class tree: 4 base classes (always open) -> 8 advanced classes, each unlocked when ONE base class is level 10
 * -> 3 crown classes, each unlocked when TWO advanced classes are level 10. Keys are class names exactly as
 * JOB_CLASS_OPTIONS spells them (some have a space); `stats.classes` is keyed the same way.
 */
export const JOB_UNLOCK_REQUIREMENTS: Record<string, Record<string, number>> = {
  // Tier 2: one parent each
  Knight: { Warrior: 10 },
  Berserker: { Warrior: 10 },
  'White Mage': { Mage: 10 },
  'Black Mage': { Mage: 10 },
  Assassin: { Thief: 10 },
  Ranger: { Thief: 10 },
  'Martial Artist': { Monk: 10 },
  Mystic: { Monk: 10 },
  // Tier 3: two tier-2 parents
  Paladin: { Knight: 10, Mystic: 10 },
  Ninja: { Assassin: 10, Berserker: 10 },
  Sage: { 'White Mage': 10, Mystic: 10 },
};

// ============================================
// CLASS LEVEL BONUSES
// ============================================

interface ClassLevelBonus {
  hp: number; // HP per class level
  mp: number; // MP per class level
}

export const CLASS_LEVEL_BONUSES: Record<string, ClassLevelBonus> = {
  Warrior: { hp: 5, mp: 0 },
  Mage: { hp: 1, mp: 5 },
  Thief: { hp: 3, mp: 2 },
  Monk: { hp: 4, mp: 2 },
  // Tier 2: the parent's bonus, leaning the way the class leans
  Knight: { hp: 6, mp: 1 },
  Berserker: { hp: 6, mp: 0 },
  'White Mage': { hp: 2, mp: 5 },
  'Black Mage': { hp: 1, mp: 6 },
  Assassin: { hp: 4, mp: 2 },
  Ranger: { hp: 3, mp: 3 },
  'Martial Artist': { hp: 5, mp: 2 },
  Mystic: { hp: 3, mp: 4 },
  // Tier 3
  Paladin: { hp: 6, mp: 2 },
  Ninja: { hp: 3, mp: 3 },
  Sage: { hp: 2, mp: 6 },
  default: { hp: 2, mp: 2 },
};

export function getClassStatBonus(jobClass: string, classLevel: number): { hp: number; mp: number } {
  const bonus = CLASS_LEVEL_BONUSES[jobClass] || CLASS_LEVEL_BONUSES.default;
  return {
    hp: Math.floor(bonus.hp * classLevel),
    mp: Math.floor(bonus.mp * classLevel),
  };
}

// ============================================
// XP REQUIREMENTS PER LEVEL
// ============================================

/**
 * Calculate XP required to reach a specific level
 * Uses a simple quadratic formula: XP = 100 * level^1.5
 * Used for both User Level and Class Level
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
    if (level > 100) break; // Cap at level 100
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
 * Calculate max HP based on user level, job class, special stats, and optional class level
 */
export function calculateMaxHp(
  userLevel: number,
  jobClass: string,
  specialStats?: Partial<SpecialStats>,
  classLevel: number = 0 // Default to 0 bonus if not provided
): number {
  const baseStats = JOB_CLASS_BASE_STATS[jobClass] || JOB_CLASS_BASE_STATS.default;

  // 1. Base HP at level 1
  let maxHp = baseStats.hp;

  // 2. Add HP growth for each USER level above 1
  if (userLevel > 1) {
    maxHp += baseStats.hpGrowth * (userLevel - 1);
  }

  // 3. Add contribution from endurance stat
  const endurance = specialStats?.endurance || 0;
  maxHp += Math.floor(endurance * baseStats.enduranceMultiplier);

  // 4. Add contribution from guts stat (half a point of HP each)
  const guts = specialStats?.guts || 0;
  maxHp += Math.floor(guts * 0.5);

  // 5. Add contribution from defense stat (one point of HP each, docs/Stats-Contract.md)
  const defense = specialStats?.defense || 0;
  maxHp += Math.floor(defense);

  // 6. Add Class Level Bonus
  if (classLevel > 0) {
    const classBonus = getClassStatBonus(jobClass, classLevel);
    maxHp += classBonus.hp;
  }

  return Math.max(1, Math.floor(maxHp));
}

/**
 * Calculate max MP based on user level, job class, special stats, and optional class level
 */
export function calculateMaxMp(
  userLevel: number,
  jobClass: string,
  specialStats?: Partial<SpecialStats>,
  classLevel: number = 0 // Default to 0 bonus if not provided
): number {
  const baseStats = JOB_CLASS_BASE_STATS[jobClass] || JOB_CLASS_BASE_STATS.default;

  // 1. Base MP at user level 1
  let maxMp = baseStats.mp;

  // 2. Add MP growth for each USER level above 1
  if (userLevel > 1) {
    maxMp += baseStats.mpGrowth * (userLevel - 1);
  }

  // 3. Add contribution from intelligence stat
  const intelligence = specialStats?.intelligence || 0;
  maxMp += Math.floor(intelligence * baseStats.intelligenceMultiplier);

  // 4. Add contribution from wisdom stat
  const wisdom = specialStats?.wisdom || 0;
  maxMp += Math.floor(wisdom * baseStats.wisdomMultiplier);

  // 5. Add Class Level Bonus
  if (classLevel > 0) {
    const classBonus = getClassStatBonus(jobClass, classLevel);
    maxMp += classBonus.mp;
  }

  return Math.max(0, Math.floor(maxMp));
}

/**
 * Calculate both HP and MP stats for a player
 */
export function calculatePlayerStats(
  userLevel: number,
  jobClass: string,
  specialStats?: Partial<SpecialStats>,
  currentHp?: number,
  currentMp?: number,
  classLevel: number = 0
): CalculatedStats {
  const maxHp = calculateMaxHp(userLevel, jobClass, specialStats, classLevel);
  const maxMp = calculateMaxMp(userLevel, jobClass, specialStats, classLevel);

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
  statsGained: Record<string, number>;
}

/**
 * Calculate the result of leveling up. The hero's class level (`classLevel`, the level of their current
 * class on `stats.classes`) counts too: a normal level-up keeps the class bonus (`getClassStatBonus`) the
 * HUD already shows instead of silently dropping it from max HP/MP.
 */
export function calculateLevelUp(
  currentLevel: number,
  targetLevel: number,
  jobClass: string,
  specialStats?: Partial<SpecialStats>,
  classLevel: number = 0
): LevelUpResult {
  const oldMaxHp = calculateMaxHp(currentLevel, jobClass, specialStats, classLevel);
  const oldMaxMp = calculateMaxMp(currentLevel, jobClass, specialStats, classLevel);

  const newMaxHp = calculateMaxHp(targetLevel, jobClass, specialStats, classLevel);
  const newMaxMp = calculateMaxMp(targetLevel, jobClass, specialStats, classLevel);

  // Calculate Stat Boosts based on Class
  const statsGained: Record<string, number> = {};
  const levelsGained = Math.max(0, targetLevel - currentLevel);

  if (levelsGained > 0) {
    const jobClassData = JOB_CLASS_OPTIONS.find(j => j.name === jobClass);

    if (jobClassData?.statBoosts) {
      jobClassData.statBoosts.forEach(boost => {
        // Linear gain based on defined boosts
        const gain = boost.amount * levelsGained;
        if (gain > 0) {
          statsGained[boost.stat] = (statsGained[boost.stat] || 0) + gain;
        }
      });
    }
  }

  return {
    newLevel: targetLevel,
    hpGained: newMaxHp - oldMaxHp,
    mpGained: newMaxMp - oldMaxMp,
    newMaxHp,
    newMaxMp,
    statsGained
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
    Knight: "A Warrior who guards others. Sturdy, braces like a wall, and every win heals a little.",
    Berserker: "A Warrior who goes all in. Big HP, softer hits, and every win heals a chunk.",
    "White Mage": "A Mage who looks after the party. Cheap casts, MP back on wins, and a little HP too.",
    "Black Mage": "A Mage who burns through the list. The deepest MP and the cheapest spells.",
    Assassin: "A Thief who is done before anyone notices. Slips away from almost anything, and pockets extra GP.",
    Ranger: "A Thief with a patient aim. Extra GP from every quest, and a spare minute on the clock.",
    "Martial Artist": "A Monk who lives by practice. Two extra minutes a chore, and AP on every win.",
    Mystic: "A Monk who finds the calm. Double AP on every win, and MP back as you go.",
    Paladin: "A Knight's shield with a Mystic's calm. Sturdy, and every win heals.",
    Ninja: "An Assassin's feet with a Berserker's arm. Quick, rich and hard to catch.",
    Sage: "A White Mage's mind with a Mystic's patience. Deep MP and a spare minute.",
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
