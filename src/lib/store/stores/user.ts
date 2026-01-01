import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import Api from "@/lib/api";
import { getGPService } from '@/lib/services/gp/GPService';
import {
  JOB_UNLOCK_REQUIREMENTS,
  getLevelFromXp,
  calculateLevelUp,
  getXpToNextLevel
} from '@/lib/services/stats/PlayerStatsService';

// LocalStorage key for persisting current user ID
const CURRENT_USER_KEY = 'xp_current_user_id';

/**
 * Level-up information returned from updateUserXP
 */
export interface LevelUpInfo {
  didLevelUp: boolean;
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  hpGained: number;
  mpGained: number;
  newMaxHp: number;
  newMaxMp: number;
}

/**
 * Class Level-up information returned from updateClassXp
 */
export interface ClassLevelUpInfo {
  didLevelUp: boolean;
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  jobClassId: string;
}

export const useUserStore = defineStore('user', () => {
  // --- State ---
  const currentUser = reactive({
    id: null as string | null,
    isAuthenticated: true, // Defaulting to true as per legacy index.ts
    stats: null as any,
    isImpersonating: false
  });

  const users = reactive<Record<string, any>>({});

  const usersAz = computed(() => {
    return Object.values(users).sort((a, b) => {
      const nameA = a.name?.nick || '';
      const nameB = b.name?.nick || '';
      return nameA.localeCompare(nameB);
    });
  });

  // --- Helper Functions ---

  /**
   * Save current user ID to localStorage
   */
  function saveCurrentUserId(userId: string | null) {
    if (userId) {
      localStorage.setItem(CURRENT_USER_KEY, userId);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }

  /**
   * Get saved user ID from localStorage
   */
  function getSavedUserId(): string | null {
    return localStorage.getItem(CURRENT_USER_KEY);
  }

  // --- Actions ---

  function loginUser(userData: any) {
    Object.assign(currentUser, userData);
    currentUser.isAuthenticated = true;
    // Persist the login
    saveCurrentUserId(userData.id);
  }

  function logoutUser() {
    currentUser.isAuthenticated = false;
    currentUser.id = null;
    saveCurrentUserId(null);
  }

  async function loadUsers() {
    try {
      const response = await Api.get("users");
      // Handle both raw array and axios-like response { data: [] }
      const usersList = Array.isArray(response) ? response : response.data;

      if (Array.isArray(usersList)) {
        const userIds = usersList.map(u => u.id);

        // Remove users that are no longer in the list
        Object.keys(users).forEach(id => {
          if (!userIds.includes(id)) {
            delete users[id];
          }
        });

        // Update/Add users from the list
        usersList.forEach(user => {
          users[user.id] = user;
        });

        // Check localStorage for a previously saved user ID first
        const savedUserId = getSavedUserId();
        if (savedUserId && users[savedUserId]) {
          loginUser(users[savedUserId]);
        } else if (!currentUser.id && users["1"]) {
          // Fallback to default user
          loginUser(users["1"]);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load users", error);
    }
  }

  function addUser(user: any) {
    users[user.id] = user;
  }

  /**
   * Getter for matching Vuex behavior
   */
  const getUserById = (id: string | number) => {
    const user = users[id];
    return user || users[1]; // Fallback to id 1 as in legacy getters.js
  };

  /**
   * Update User GP and persist to local storage
   */
  async function updateUserGP(payload: { userId: string, wallet?: number, savings?: number, debt?: number }) {
    const { userId, wallet, savings, debt } = payload;

    if (users[userId]) {
      const userStats = users[userId].stats || { gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 } };

      // Initialize stats if missing
      if (!userStats.gp) userStats.gp = { wallet: 0, savings: 0, debt: 0, limit: 1000 };

      if (wallet !== undefined) userStats.gp.wallet = (userStats.gp.wallet || 0) + wallet;
      if (savings !== undefined) userStats.gp.savings = (userStats.gp.savings || 0) + savings;
      if (debt !== undefined) userStats.gp.debt = (userStats.gp.debt || 0) + debt;

      // Wallet overflow protection: excess goes to savings (Earthbound-style ATM)
      const walletLimit = userStats.gp.limit || 1000;
      if (userStats.gp.wallet > walletLimit) {
        const overflow = userStats.gp.wallet - walletLimit;
        userStats.gp.wallet = walletLimit;
        userStats.gp.savings = (userStats.gp.savings || 0) + overflow;
      }

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }

      // Persist via Service
      await getGPService().syncGP(userId);
    }
  }

  /**
   * Update User HP (for battle damage/healing)
   * Returns true if player is still alive, false if defeated
   */
  function updateUserHP(payload: { userId: string, amount: number }): boolean {
    const { userId, amount } = payload;

    if (users[userId]) {
      const userStats = users[userId].stats || {};

      // Initialize/Standardize hp structure if missing or primitive
      if (typeof userStats.hp !== 'object' || userStats.hp === null) {
        const currentHp = typeof userStats.hp === 'number' ? userStats.hp : 100;
        const maxHp = typeof userStats.maxHp === 'number' ? userStats.maxHp : 100;
        userStats.hp = { now: currentHp, max: maxHp };
      }

      // Ensure maxHp is synced if it exists as a top-level property
      if (typeof userStats.maxHp === 'number') {
        userStats.hp.max = userStats.maxHp;
      }

      // Apply damage (negative amount) or healing (positive amount)
      userStats.hp.now = Math.max(0, Math.min(userStats.hp.max, userStats.hp.now + amount));

      // Standardize mp structure while we're here
      if (typeof userStats.mp !== 'object' || userStats.mp === null) {
        const currentMp = typeof userStats.mp === 'number' ? userStats.mp : 100;
        const maxMp = typeof userStats.maxMp === 'number' ? userStats.maxMp : 100;
        userStats.mp = { now: currentMp, max: maxMp };
      }

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }

      // Return whether player is still alive
      return userStats.hp.now > 0;
    }
    return true; // Default to alive if user not found
  }

  /**
   * Unlock a specific Pegasus for a user
   */
  function unlockPegasus(userId: string, pegasusIndex: number) {
    if (users[userId]) {
      const userStats = users[userId].stats || {};

      // Initialize pegasi array if missing (9 slots for 9 worlds)
      if (!userStats.pegasi) userStats.pegasi = Array(9).fill(false);

      // Unlock
      if (pegasusIndex >= 0 && pegasusIndex < userStats.pegasi.length) {
        userStats.pegasi[pegasusIndex] = true;
      }

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }

      // Persist (Implied via existing mechanisms or add specific sync if needed)
      // For now, in-memory/local updates are sufficient for the session
    }
  }

  /**
   * Impersonate a user - sets them as the current user and persists to localStorage
   */
  function impersonateUser(userId: string) {
    if (users[userId]) {
      Object.assign(currentUser, users[userId]);
      currentUser.id = userId;
      currentUser.isAuthenticated = true;
      currentUser.isImpersonating = true;
      // Persist the selection to localStorage
      saveCurrentUserId(userId);
      localStorage.setItem('xp_is_impersonating', 'true');
    }
  }

  function stopImpersonating() {
    currentUser.isImpersonating = false;
    localStorage.removeItem('xp_is_impersonating');
    // Usually we return to the main admin user, which is ID 1
    if (users["1"]) {
      loginUser(users["1"]);
    }
  }

  /**
   * Restore the current user from localStorage if available
   * Call this on app initialization
   */
  function restoreCurrentUser() {
    const savedUserId = getSavedUserId();
    const wasImpersonating = localStorage.getItem('xp_is_impersonating') === 'true';
    if (savedUserId && users[savedUserId]) {
      impersonateUser(savedUserId);
      currentUser.isImpersonating = wasImpersonating;
      return true;
    }
    return false;
  }

  /**
   * Unlock an additional Quick Draw shortcut slot for a user
   * Default: 1 slot, First unlock: 2 slots, Second unlock: 3 slots (max)
   */
  function unlockQuickDrawSlot(userId: string) {
    if (users[userId]) {
      const userStats = users[userId].stats || {};

      // Initialize quickDrawSlots if missing (default 1)
      userStats.quickDrawSlots = userStats.quickDrawSlots ?? 1;

      // Max 3 slots
      if (userStats.quickDrawSlots < 3) {
        userStats.quickDrawSlots++;
      }

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }
    }
  }

  /**
   * Unlock a specific class for a user
   */
  function unlockClass(userId: string, jobClassId: string) {
    if (users[userId]) {
      const userStats = users[userId].stats || {};

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

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }
    }
  }

  /**
   * Check if any locked classes should be unlocked based on current class levels
   */
  function checkClassUnlocks(userId: string) {
    if (!users[userId]) return;

    const userStats = users[userId].stats || {};
    const classes = userStats.classes || {};

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
        unlockClass(userId, jobClassId);
      }
    });
  }

  /**
   * Grant XP to a specific class and handle leveling
   * Returns class level-up information
   */
  function updateClassXp(userId: string, jobClassId: string, amount: number): ClassLevelUpInfo {
    // Default result
    const result: ClassLevelUpInfo = {
      didLevelUp: false,
      oldLevel: 1,
      newLevel: 1,
      levelsGained: 0,
      jobClassId
    };

    if (users[userId]) {
      const userStats = users[userId].stats || {};

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

        // Trigger checks for other unlocks
        checkClassUnlocks(userId);
      } else {
        result.newLevel = oldLevel;
      }

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }
    }

    return result;
  }

  /**
   * Update User XP and handle level-ups
   * Returns detailed level-up information for battle victory sequences
   */
  function updateUserXP(payload: { userId: string, amount: number }): LevelUpInfo {
    const { userId, amount } = payload;

    // Default result (no level up)
    const result: LevelUpInfo = {
      didLevelUp: false,
      oldLevel: 1,
      newLevel: 1,
      levelsGained: 0,
      hpGained: 0,
      mpGained: 0,
      newMaxHp: 0,
      newMaxMp: 0
    };

    if (users[userId]) {
      const userStats = users[userId].stats || {};
      const userData = users[userId];
      const jobClass = userData.jobClass || 'default';
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

      // Check for level up using PlayerStatsService
      const newLevel = getLevelFromXp(userStats.xp.now);

      if (newLevel > oldLevel) {
        userStats.level = newLevel;
        result.didLevelUp = true;
        result.newLevel = newLevel;
        result.levelsGained = newLevel - oldLevel;

        // Calculate stat gains using PlayerStatsService
        const levelUpResult = calculateLevelUp(oldLevel, newLevel, jobClass, specialStats);
        result.hpGained = levelUpResult.hpGained;
        result.mpGained = levelUpResult.mpGained;
        result.newMaxHp = levelUpResult.newMaxHp;
        result.newMaxMp = levelUpResult.newMaxMp;

        // Update HP/MP to new max (full heal on level up, Earthbound style)
        if (!userStats.hp) userStats.hp = { now: 0, max: 0 };
        if (!userStats.mp) userStats.mp = { now: 0, max: 0 };
        userStats.hp.max = levelUpResult.newMaxHp;
        userStats.hp.now = levelUpResult.newMaxHp; // Full HP restore
        userStats.mp.max = levelUpResult.newMaxMp;
        userStats.mp.now = levelUpResult.newMaxMp; // Full MP restore
      } else {
        result.newLevel = oldLevel;
      }

      // Update next_level threshold
      userStats.xp.next_level = getXpToNextLevel(userStats.level || 1);

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }
    }

    return result;
  }

  /**
   * Record AP gain with timestamp for time-based tracking
   */
  function recordAPGain(payload: { userId: string, amount: number, source: string }) {
    const { userId, amount, source } = payload;

    if (users[userId] && amount > 0) {
      const userStats = users[userId].stats || {};

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
        timestamp: new Date().toISOString(),
        source
      });

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }
    }
  }

  /**
   * Get AP gained in the last N days
   */
  function getAPInTimeRange(userId: string, days: number): { total: number, records: any[] } {
    if (!users[userId]) return { total: 0, records: [] };

    const userStats = users[userId].stats || {};
    const history = userStats.ap?.history || [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filteredRecords = history.filter((r: any) => {
      return new Date(r.timestamp) >= cutoff;
    });

    const total = filteredRecords.reduce((sum: number, r: any) => sum + r.amount, 0);

    return { total, records: filteredRecords };
  }

  return {
    currentUser,
    users,
    getUserById,
    loginUser,
    logoutUser,
    loadUsers,
    addUser,
    updateUserGP,
    updateUserHP,
    unlockPegasus,
    unlockQuickDrawSlot,
    unlockClass,
    checkClassUnlocks,
    updateClassXp,
    updateUserXP,
    recordAPGain,
    getAPInTimeRange,
    impersonateUser,
    stopImpersonating,
    restoreCurrentUser,
    usersAz
  };
});
