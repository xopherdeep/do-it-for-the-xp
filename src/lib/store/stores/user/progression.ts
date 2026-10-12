import {
  JOB_UNLOCK_REQUIREMENTS,
  getClassStatBonus,
  getLevelFromXp,
  calculateLevelUp,
  getXpForLevel
} from '@/lib/services/stats/PlayerStatsService';
import type { ApGainPayload, ClassLevelUpInfo, LevelUpInfo } from './types';

/** The result of a class XP grant that changed nothing. */
export function newClassLevelUpInfo(jobClassId: string): ClassLevelUpInfo {
  return {
    didLevelUp: false,
    oldLevel: 1,
    newLevel: 1,
    levelsGained: 0,
    jobClassId
  };
}

/** The result of an XP grant that changed nothing (no level up). */
export function newLevelUpInfo(): LevelUpInfo {
  return {
    didLevelUp: false,
    oldLevel: 1,
    newLevel: 1,
    levelsGained: 0,
    hpGained: 0,
    mpGained: 0,
    newMaxHp: 0,
    newMaxMp: 0,
    statsGained: {}
  };
}

/**
 * Add XP to a hero's stats and level them up, filling `result` with the level-up details. Works on whatever
 * `userStats` it is given: the store hands it the live stats to commit, or a clone to preview.
 */
export function applyXpGain(userStats: any, jobClass: string, amount: number, result: LevelUpInfo) {
  const specialStats = userStats.special || {};

  // Initialize xp structure if missing
  if (!userStats.xp) {
    userStats.xp = { now: 0, next_level: 100 };
  }

  // Store old level before adding XP
  const oldLevel = userStats.level || 1;
  result.oldLevel = oldLevel;

  // Add XP
  userStats.xp.now = (userStats.xp.now || 0) + amount;

  // Recalculate level
  const totalXp = userStats.xp.now;
  const newLevel = getLevelFromXp(totalXp);

  // Update stats with new level
  userStats.level = newLevel;

  // Update next level requirement
  // Using cumulative target XP 
  userStats.xp.next_level = getXpForLevel(newLevel + 1);

  // Check for level up
  if (newLevel > oldLevel) {
    result.didLevelUp = true;
    result.newLevel = newLevel;
    result.levelsGained = newLevel - oldLevel;

    // Calculate stats with potential level ups
    // Use updated calculateLevelUp which returns statsGained; the hero's class level counts too
    const classLevel = Number(userStats.classes?.[jobClass]?.level) || 1;
    const levelUpDetails = calculateLevelUp(oldLevel, result.newLevel, jobClass, specialStats, classLevel);

    result.hpGained = levelUpDetails.hpGained;
    result.mpGained = levelUpDetails.mpGained;
    result.newMaxHp = levelUpDetails.newMaxHp;
    result.newMaxMp = levelUpDetails.newMaxMp;
    result.statsGained = levelUpDetails.statsGained;

    // Apply stat gains to user profile
    if (result.statsGained) {
      if (!userStats.special) userStats.special = {};
      Object.entries(result.statsGained).forEach(([stat, val]) => {
        userStats.special[stat] = (userStats.special[stat] || 0) + val;
      });
    }

    // Restore HP/MP to full on level up
    if (!userStats.hp) userStats.hp = { now: 0, max: 0 };
    if (!userStats.mp) userStats.mp = { now: 0, max: 0 };

    userStats.hp.max = result.newMaxHp;
    userStats.mp.max = result.newMaxMp;

    // Only heal if committing? Or keep it consistent
    userStats.hp.now = result.newMaxHp;
    userStats.mp.now = result.newMaxMp;
  } else {
    result.newLevel = oldLevel;
  }
}

/**
 * Grant XP to a specific class on a hero's stats and handle leveling, filling `result`. `heroJobClass` is the
 * hero's own class (their profile's `jobClass`); `checkUnlocks` runs after a level-up so other classes can open.
 */
export function applyClassXp(
  userStats: any,
  heroJobClass: string | undefined,
  jobClassId: string,
  amount: number,
  result: ClassLevelUpInfo,
  checkUnlocks: () => void
) {
  // Initialize classes if missing
  if (!userStats.classes) userStats.classes = {};

  // Initialize specific class if missing (standard default is unlocked)
  if (!userStats.classes[jobClassId]) {
    userStats.classes[jobClassId] = {
      level: 1,
      xp: 0,
      // Base classes are always unlocked, advanced classes need unlocking
      // For safety, if we are adding XP, we assume it's unlocked or being unlocked
      unlocked: true
    };
  }

  const classProgress = userStats.classes[jobClassId];
  const oldLevel = classProgress.level || 1;
  result.oldLevel = oldLevel;

  // Add XP
  classProgress.xp += amount;

  // Recalculate level
  const newLevel = getLevelFromXp(classProgress.xp);

  // Check for level up
  if (newLevel > oldLevel) {
    classProgress.level = newLevel;
    result.didLevelUp = true;
    result.newLevel = newLevel;
    result.levelsGained = newLevel - oldLevel;

    // The hero's own class growing grows their max HP/MP by the class bonus (CLASS_LEVEL_BONUSES)
    if ((heroJobClass || 'default') === jobClassId) {
      const before = getClassStatBonus(jobClassId, oldLevel);
      const after = getClassStatBonus(jobClassId, newLevel);
      const shouldGrowMaxHp = userStats.hp && typeof userStats.hp === 'object' && after.hp > before.hp;
      if (shouldGrowMaxHp) {
        userStats.hp.max = (userStats.hp.max || 0) + (after.hp - before.hp);
        userStats.hp.now = (userStats.hp.now || 0) + (after.hp - before.hp);
      }
      const shouldGrowMaxMp = userStats.mp && typeof userStats.mp === 'object' && after.mp > before.mp;
      if (shouldGrowMaxMp) {
        userStats.mp.max = (userStats.mp.max || 0) + (after.mp - before.mp);
        userStats.mp.now = (userStats.mp.now || 0) + (after.mp - before.mp);
      }
    }

    // Trigger checks for other unlocks
    checkUnlocks();
  } else {
    result.newLevel = oldLevel;
  }
}

/**
 * Record AP gain on a hero's stats with timestamp for time-based tracking
 */
export function applyApGain(userStats: any, payload: ApGainPayload) {
  const { amount, source, at } = payload;

  // Initialize ap structure if missing
  if (!userStats.ap) {
    userStats.ap = { total: 0, history: [] };
  }

  // Add to total
  userStats.ap.total = (userStats.ap.total || 0) + amount;

  // Add timestamped record
  userStats.ap.history = userStats.ap.history || [];
  userStats.ap.history.push({
    amount,
    timestamp: at && !Number.isNaN(new Date(at).getTime()) ? at : new Date().toISOString(),
    source
  });
}

/**
 * Get AP gained in the last N days
 */
export function apInTimeRange(userStats: any, days: number): { total: number, records: any[] } {
  const history = userStats.ap?.history || [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const filteredRecords = history.filter((r: any) => {
    return new Date(r.timestamp) >= cutoff;
  });

  const total = filteredRecords.reduce((sum: number, r: any) => sum + r.amount, 0);

  return { total, records: filteredRecords };
}

/**
 * Unlock a specific Pegasus on a hero's stats. Storage can hand `stats.pegasi` back as an index-keyed object
 * ({"3": true}) or not at all, so the nine flags are rebuilt as a real array before the write: readers
 * that use `.length` or `.some` are then always safe.
 */
export function applyPegasusUnlock(userStats: any, pegasusIndex: number) {
  // Nine slots for nine worlds, from an array, an object with numeric keys, or nothing
  const slots = userStats.pegasi && typeof userStats.pegasi === "object" ? userStats.pegasi : {};
  const pegasi: boolean[] = Array.from({ length: 9 }, (_, index) => Boolean(slots[index]));

  // Unlock
  const isValidPegasusIndex = Number.isInteger(pegasusIndex) && pegasusIndex >= 0 && pegasusIndex < pegasi.length;
  if (isValidPegasusIndex) {
    pegasi[pegasusIndex] = true;
  }
  userStats.pegasi = pegasi;
}

/**
 * Unlock an additional Quick Draw shortcut slot on a hero's stats
 * Default: 1 slot, First unlock: 2 slots, Second unlock: 3 slots (max)
 */
export function applyQuickDrawSlotUnlock(userStats: any) {
  // Initialize quickDrawSlots if missing (default 1)
  userStats.quickDrawSlots = userStats.quickDrawSlots ?? 1;

  // Max 3 slots
  if (userStats.quickDrawSlots < 3) {
    userStats.quickDrawSlots++;
  }
}

/**
 * Unlock a specific class on a hero's stats
 */
export function applyClassUnlock(userStats: any, jobClassId: string) {
  // Initialize classes if missing
  if (!userStats.classes) userStats.classes = {};

  // Initialize class entry if missing
  if (!userStats.classes[jobClassId]) {
    userStats.classes[jobClassId] = {
      level: 1,
      xp: 0,
      unlocked: false
    };
  }

  // Unlock
  if (!userStats.classes[jobClassId].unlocked) {
    userStats.classes[jobClassId].unlocked = true;
    // Optionally add notification here
  }
}

/**
 * Call `unlock` for every locked class whose requirements are met by the given class levels
 * (checks every job class in the requirements table, in table order).
 */
export function forEachClassUnlockMet(classes: any, unlock: (jobClassId: string) => void) {
  // Iterate over all available job classes in requirements
  Object.entries(JOB_UNLOCK_REQUIREMENTS).forEach(([jobClassId, requirements]) => {
    // If already unlocked, skip
    if (classes[jobClassId]?.unlocked) return;

    // Check if all requirements are met
    let allMet = true;
    for (const [reqClass, reqLevel] of Object.entries(requirements)) {
      const currentClassLevel = classes[reqClass]?.level || 0;
      if (currentClassLevel < reqLevel) {
        allMet = false;
        break;
      }
    }

    // Unlock if met
    if (allMet) {
      unlock(jobClassId);
    }
  });
}
