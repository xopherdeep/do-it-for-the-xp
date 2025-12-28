/**
 * EnemySpawner - Schedule-based enemy spawning
 * 
 * Manages when beasts/enemies appear based on their spawn schedules.
 * Ties chore schedules to enemy encounters.
 */

import { reactive, computed } from 'vue';
import type { Beast, SpawnSchedule, SpawnedEnemy } from './types';

// ============================================
// STATE
// ============================================

interface SpawnerState {
  activeEnemies: SpawnedEnemy[];
  defeatedToday: string[];  // Beast IDs defeated today
}

const state = reactive<SpawnerState>({
  activeEnemies: [],
  defeatedToday: [],
});

// ============================================
// SCHEDULE HELPERS
// ============================================

/**
 * Check if a beast should spawn based on its schedule
 */
function shouldSpawn(schedule: SpawnSchedule, now: Date = new Date()): boolean {
  const currentDay = now.getDay(); // 0 = Sunday
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  switch (schedule.frequency) {
    case 'daily':
      // Check if current time matches any spawn time
      if (schedule.times && schedule.times.length > 0) {
        return schedule.times.some(time => isTimeMatch(time, currentTime));
      }
      return true; // Always available if no specific times
      
    case 'weekly':
      // Check day of week
      if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(currentDay)) {
        return false;
      }
      // Check time if specified
      if (schedule.times && schedule.times.length > 0) {
        return schedule.times.some(time => isTimeMatch(time, currentTime));
      }
      return true;
      
    case 'interval':
      // Would need to track last spawn date - simplified for now
      return true;
      
    case 'manual':
      return false; // Only spawns when explicitly triggered
      
    default:
      return false;
  }
}

/**
 * Check if current time matches a spawn time (within 30 min window)
 */
function isTimeMatch(spawnTime: string, currentTime: string): boolean {
  const [spawnHour, spawnMin] = spawnTime.split(':').map(Number);
  const [currentHour, currentMin] = currentTime.split(':').map(Number);
  
  const spawnMinutes = spawnHour * 60 + spawnMin;
  const currentMinutes = currentHour * 60 + currentMin;
  
  // Within 30 minute window after spawn time
  return currentMinutes >= spawnMinutes && currentMinutes < spawnMinutes + 30;
}

/**
 * Check if a spawned enemy is overdue
 */
function isOverdue(spawnedEnemy: SpawnedEnemy): boolean {
  const now = new Date();
  return now > spawnedEnemy.dueAt;
}

// ============================================
// ACTIONS
// ============================================

/**
 * Check beasts and spawn any that are due
 */
function checkAndSpawn(beasts: Beast[]): SpawnedEnemy[] {
  const now = new Date();
  const newlySpawned: SpawnedEnemy[] = [];
  
  for (const beast of beasts) {
    // Skip if already active
    if (state.activeEnemies.some(e => e.beast.id === beast.id)) {
      continue;
    }
    
    // Skip if defeated today
    if (state.defeatedToday.includes(beast.id)) {
      continue;
    }
    
    // Check spawn schedule
    if (beast.spawn && shouldSpawn(beast.spawn, now)) {
      const spawned: SpawnedEnemy = {
        beast,
        spawnedAt: now,
        dueAt: calculateDueTime(now, beast.spawn),
        isOverdue: false,
        hasAttackedPlayer: false,
      };
      
      state.activeEnemies.push(spawned);
      newlySpawned.push(spawned);
    }
  }
  
  return newlySpawned;
}

/**
 * Calculate when the enemy becomes overdue
 */
function calculateDueTime(spawnTime: Date, schedule: SpawnSchedule): Date {
  const due = new Date(spawnTime);
  
  // Default: 2 hours to complete
  due.setHours(due.getHours() + 2);
  
  return due;
}

/**
 * Update overdue status for all active enemies
 */
function updateOverdueStatus(): void {
  for (const enemy of state.activeEnemies) {
    enemy.isOverdue = isOverdue(enemy);
  }
}

/**
 * Mark an enemy as defeated
 */
function defeatEnemy(beastId: string): void {
  const index = state.activeEnemies.findIndex(e => e.beast.id === beastId);
  if (index !== -1) {
    state.activeEnemies.splice(index, 1);
    state.defeatedToday.push(beastId);
  }
}

/**
 * Mark that player fled from an enemy (it will attack next encounter)
 */
function playerFled(beastId: string): void {
  const enemy = state.activeEnemies.find(e => e.beast.id === beastId);
  if (enemy) {
    enemy.hasAttackedPlayer = true;
  }
}

/**
 * Get enemies that will attack immediately (player ignored/fled from them)
 */
function getAngryEnemies(): SpawnedEnemy[] {
  return state.activeEnemies.filter(e => e.hasAttackedPlayer || e.isOverdue);
}

/**
 * Reset daily tracking (call at midnight)
 */
function resetDaily(): void {
  state.defeatedToday = [];
}

/**
 * Clear all active enemies
 */
function clearAll(): void {
  state.activeEnemies = [];
  state.defeatedToday = [];
}

// ============================================
// COMPUTED
// ============================================

const activeEnemyCount = computed(() => state.activeEnemies.length);
const overdueCount = computed(() => state.activeEnemies.filter(e => e.isOverdue).length);
const hasAngryEnemies = computed(() => getAngryEnemies().length > 0);

// ============================================
// EXPORT COMPOSABLE
// ============================================

export function useEnemySpawner() {
  return {
    // State
    state,
    
    // Computed
    activeEnemyCount,
    overdueCount,
    hasAngryEnemies,
    
    // Actions
    checkAndSpawn,
    updateOverdueStatus,
    defeatEnemy,
    playerFled,
    getAngryEnemies,
    resetDaily,
    clearAll,
    
    // Helpers
    shouldSpawn,
    isOverdue,
  };
}

export default useEnemySpawner;
