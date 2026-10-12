import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import Api from "@/lib/api";
import { getGPService } from '@/lib/services/gp/GPService';
import type { GpPurse } from '@/lib/services/gp/wallet';
import { levelUpNotification } from '@/lib/services/notifications/Notifications';
import { notify } from '@/lib/services/notifications/notify';
import debug from '@/lib/utils/debug';
import { createProfilePersister } from './user/persistence';
import { createProfileSetters } from './user/profileFields';
import {
  newLevelUpInfo,
  newClassLevelUpInfo,
  applyXpGain,
  applyClassXp,
  applyApGain,
  apInTimeRange,
  applyPegasusUnlock,
  applyQuickDrawSlotUnlock,
  applyClassUnlock,
  forEachClassUnlockMet
} from './user/progression';
import { applyGpChange, applyWallet, applyHpChange, applyMpChange } from './user/resources';
import {
  IMPERSONATOR_KEY,
  IMPERSONATING_FLAG_KEY,
  saveCurrentUserId,
  getSavedUserId,
  clearMasqueradeKeys,
  replaceRoster,
  sortByNick
} from './user/session';
import type { ApGainPayload, ClassLevelUpInfo, GpPayload, LevelUpInfo } from './user/types';

// The Game Master guard reads the key this store writes, so the key stays importable from here.
export { IMPERSONATOR_KEY };
export type { LevelUpInfo, ClassLevelUpInfo };

export const useUserStore = defineStore('user', () => {
  // --- State ---
  const currentUser = reactive({
    id: null as string | null,
    isAuthenticated: true, // Defaulting to true as per legacy index.ts
    stats: null as any,
    isImpersonating: false
  });

  const users = reactive<Record<string, any>>({});

  const usersAz = computed(() => sortByNick(users));

  // --- Persistence ---
  // ProfileDb (`__profiles`) is the only thing loadUsers reads back, so every stat mutation
  // below must end with persistUser(); otherwise rewards vanish on the next reload.
  const persistUser = createProfilePersister(users);

  // --- Actions ---

  /**
   * End any masquerade: the in-memory flag first (that alone drops the borrowed Game Master
   * access), then the storage keys, so a stale impersonator id cannot outlive the masquerade.
   */
  function clearMasquerade() {
    currentUser.isImpersonating = false;
    clearMasqueradeKeys();
  }

  /** Copy a profile onto currentUser. Leaves a masquerade in progress alone. */
  function syncCurrentUser(userData: any) {
    Object.assign(currentUser, userData);
    currentUser.isAuthenticated = true;
  }

  /**
   * Sign in as `userData`. Signing in is a profile switch, so it ends any masquerade: the new
   * profile never inherits the Game Master access of the person who was impersonating.
   */
  function loginUser(userData: any) {
    clearMasquerade();
    syncCurrentUser(userData);
    // Persist the login
    saveCurrentUserId(userData.id);
  }

  function logoutUser() {
    clearMasquerade();
    currentUser.isAuthenticated = false;
    currentUser.id = null;
    saveCurrentUserId(null);
  }

  const {
    addInventoryItem,
    spendInventoryItem,
    setItemCooldown,
    setBenchRestAt,
    setQuestEffects,
    unlockItem,
    setEquipment,
    setLook,
    setJobClass
  } = createProfileSetters({ users, currentUser, persistUser, syncCurrentUser });

  async function loadUsers() {
    try {
      const response = await Api.get("users");
      // Handle both raw array and axios-like response { data: [] }
      const usersList = Array.isArray(response) ? response : response.data;

      if (Array.isArray(usersList)) {
        replaceRoster(users, usersList);

        // Restore the previously saved user, if any. Nobody is signed in on a first run: there is
        // no default profile to fall back to.
        const savedUserId = getSavedUserId();
        const hasSavedProfile = savedUserId && users[savedUserId];
        if (hasSavedProfile) {
          // loadUsers runs after every deposit, battle and page entry, so refreshing the profile
          // that is already signed in must not end a masquerade; only a different profile does.
          if (currentUser.id === savedUserId) syncCurrentUser(users[savedUserId]);
          else loginUser(users[savedUserId]);
        }
      }
    } catch (error) {
      debug.error('[user] failed to load users', error);
    }
  }

  function addUser(user: any) {
    users[user.id] = user;
  }

  /**
   * The profile with this id, or undefined when there is none. There is deliberately no fallback
   * to another profile (the Vuex getter used to return profile 1), which showed and charged the
   * wrong hero; callers handle undefined.
   */
  const getUserById = (id: string | number) => users[id];

  /**
   * Update User GP and persist to local storage
   */
  async function updateUserGP(payload: GpPayload) {
    const { userId } = payload;

    if (users[userId]) {
      const userStats = applyGpChange(users[userId].stats, payload);

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }

      // Persist via Service
      await getGPService().syncGP(userId);
      persistUser(userId);
    }
  }

  /**
   * Replace the hero's purse wholesale: what a wallet upgrade from a world shop hands back
   * (new limit, savings and wallet already charged). Persists like every other stat change.
   */
  function setWallet(userId: string, gp: GpPurse) {
    const user = users[userId];
    if (!user) return;
    const stats = applyWallet(user, gp);
    user.stats = stats;
    if (currentUser.id === userId) currentUser.stats = stats;
    persistUser(userId);
  }

  /**
   * Update User HP (for battle damage/healing)
   * Returns true if player is still alive, false if defeated
   */
  function updateUserHP(payload: { userId: string, amount: number }): boolean {
    const { userId, amount } = payload;

    if (users[userId]) {
      const userStats = users[userId].stats || {};

      const isStillAlive = applyHpChange(userStats, amount);

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }

      persistUser(userId);

      // Return whether player is still alive
      return isStillAlive;
    }
    return true; // Default to alive if user not found
  }

  /**
   * Update User MP (spells, springs, camps). Mirrors updateUserHP: negative spends, positive restores,
   * and the result stays between 0 and the maximum.
   * Returns true while the hero still has MP left.
   */
  function updateUserMP(payload: { userId: string, amount: number }): boolean {
    const { userId, amount } = payload;

    if (users[userId]) {
      const userStats = users[userId].stats || {};

      const hasMpLeft = applyMpChange(userStats, amount);

      users[userId].stats = userStats;

      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }

      persistUser(userId);

      return hasMpLeft;
    }
    return true;
  }

  /**
   * Unlock a specific Pegasus for a user. Storage can hand `stats.pegasi` back as an index-keyed object
   * ({"3": true}) or not at all, so the nine flags are rebuilt as a real array before the write: readers
   * that use `.length` or `.some` are then always safe.
   */
  function unlockPegasus(userId: string, pegasusIndex: number) {
    if (users[userId]) {
      const userStats = users[userId].stats || {};

      applyPegasusUnlock(userStats, pegasusIndex);

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }

      persistUser(userId);
    }
  }

  /**
   * Impersonate a user - sets them as the current user and persists to localStorage
   */
  function impersonateUser(userId: string) {
    if (users[userId]) {
      // Remember who is masquerading so stopImpersonating can hand control back to them
      const impersonatorId = currentUser.id;
      const shouldRememberImpersonator = !currentUser.isImpersonating && impersonatorId && impersonatorId !== userId;
      if (shouldRememberImpersonator) {
        localStorage.setItem(IMPERSONATOR_KEY, impersonatorId);
      }
      Object.assign(currentUser, users[userId]);
      currentUser.id = userId;
      currentUser.isAuthenticated = true;
      currentUser.isImpersonating = true;
      // Persist the selection to localStorage
      saveCurrentUserId(userId);
      localStorage.setItem(IMPERSONATING_FLAG_KEY, 'true');
    }
  }

  /** End the masquerade and hand control back to the Game Master who started it, if they still exist. */
  function stopImpersonating() {
    // Read the Game Master before clearMasquerade removes the key
    const returnTo = localStorage.getItem(IMPERSONATOR_KEY);
    clearMasquerade();
    const canReturnToGameMaster = returnTo && users[returnTo];
    if (canReturnToGameMaster) {
      loginUser(users[returnTo]);
    }
  }

  /**
   * Unlock an additional Quick Draw shortcut slot for a user
   * Default: 1 slot, First unlock: 2 slots, Second unlock: 3 slots (max)
   */
  function unlockQuickDrawSlot(userId: string) {
    if (users[userId]) {
      const userStats = users[userId].stats || {};

      applyQuickDrawSlotUnlock(userStats);

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }

      persistUser(userId);
    }
  }

  /**
   * Unlock a specific class for a user
   */
  function unlockClass(userId: string, jobClassId: string) {
    if (users[userId]) {
      const userStats = users[userId].stats || {};

      applyClassUnlock(userStats, jobClassId);

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }

      persistUser(userId);
    }
  }

  /**
   * Check if any locked classes should be unlocked based on current class levels
   */
  function checkClassUnlocks(userId: string) {
    if (!users[userId]) return;

    const userStats = users[userId].stats || {};
    const classes = userStats.classes || {};

    forEachClassUnlockMet(classes, (jobClassId) => unlockClass(userId, jobClassId));
  }

  /**
   * Grant XP to a specific class and handle leveling
   * Returns class level-up information
   */
  function updateClassXp(userId: string, jobClassId: string, amount: number): ClassLevelUpInfo {
    // Default result
    const result = newClassLevelUpInfo(jobClassId);

    if (users[userId]) {
      const userStats = users[userId].stats || {};

      applyClassXp(userStats, users[userId].jobClass, jobClassId, amount, result, () => checkClassUnlocks(userId));

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }

      persistUser(userId);
    }

    return result;
  }

  /**
   * Update User XP and handle level-ups
   * Returns detailed level-up information for battle victory sequences
   */
  function updateUserXP(payload: { userId: string, amount: number, commit?: boolean }): LevelUpInfo {
    const { userId, amount } = payload;
    const commit = payload.commit !== false;

    // Default result (no level up)
    const result = newLevelUpInfo();

    if (users[userId]) {
      const userData = users[userId];
      // Work on a clone if not committing, otherwise reference the reactive store object so mutations stick
      // However, userData.stats IS the reactive object. If we clone it, we are safe. 
      // If we reference it, we mutate the state.
      const userStats = (!commit)
        ? JSON.parse(JSON.stringify(userData.stats || {}))
        : (userData.stats || {});

      // Ensure we have an object to work with
      const shouldAttachStats = !userData.stats && commit;
      if (shouldAttachStats) {
        userData.stats = userStats;
      }

      const jobClass = userData.jobClass || 'default';
      applyXpGain(userStats, jobClass, amount, result);

      // Update state if committing
      if (commit) {
        // userStats is the reactive object if commit is true (except if it was null initially)

        if (!userData.stats) {
          users[userId].stats = userStats;
        } else {
          // We modified userStats in place if commit is true
        }

        // Update current user if matches
        if (currentUser.id === userId) {
          currentUser.stats = userStats;
        }

        persistUser(userId);
        // The hero's feed hears about the level-up (one note per level reached per day)
        if (result.didLevelUp) notify(levelUpNotification(userId, result.newLevel, result.levelsGained));
      }
    }

    return result;
  }

  /**
   * Record AP gain with timestamp for time-based tracking
   */
  function recordAPGain(payload: ApGainPayload) {
    const { userId, amount } = payload;

    const hasAPToRecord = users[userId] && amount > 0;
    if (hasAPToRecord) {
      const userStats = users[userId].stats || {};

      applyApGain(userStats, payload);

      // Update state
      users[userId].stats = userStats;

      // Update current user if matches
      if (currentUser.id === userId) {
        currentUser.stats = userStats;
      }

      persistUser(userId);
    }
  }

  /**
   * Get AP gained in the last N days
   */
  function getAPInTimeRange(userId: string, days: number): { total: number, records: any[] } {
    if (!users[userId]) return { total: 0, records: [] };

    const userStats = users[userId].stats || {};

    return apInTimeRange(userStats, days);
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
    setWallet,
    updateUserHP,
    updateUserMP,
    addInventoryItem,
    spendInventoryItem,
    setItemCooldown,
    setBenchRestAt,
    setQuestEffects,
    unlockItem,
    unlockPegasus,
    unlockQuickDrawSlot,
    unlockClass,
    checkClassUnlocks,
    updateClassXp,
    updateUserXP,
    recordAPGain,
    setEquipment,
    setLook,
    setJobClass,
    persistUser,
    getAPInTimeRange,
    impersonateUser,
    stopImpersonating,
    usersAz
  };
});
