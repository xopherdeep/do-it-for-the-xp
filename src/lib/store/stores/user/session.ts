import debug from '@/lib/utils/debug';

// LocalStorage key for persisting current user ID
export const CURRENT_USER_KEY = 'xp_current_user_id';
/**
 * LocalStorage key for the Game Master who started a masquerade (impersonation).
 * Exported so the Game Master guard reads the key this store writes, not a copy of the string.
 */
export const IMPERSONATOR_KEY = 'xp_impersonator_id';
// LocalStorage flag that says a masquerade is running
export const IMPERSONATING_FLAG_KEY = 'xp_is_impersonating';

/**
 * Save current user ID to localStorage
 */
export function saveCurrentUserId(userId: string | null) {
  if (userId) {
    localStorage.setItem(CURRENT_USER_KEY, userId);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

/**
 * Get saved user ID from localStorage
 */
export function getSavedUserId(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY);
}

/** The storage half of ending a masquerade: the flag and the Game Master's id both go. */
export function clearMasqueradeKeys() {
  try {
    localStorage.removeItem(IMPERSONATING_FLAG_KEY);
    localStorage.removeItem(IMPERSONATOR_KEY);
  } catch (error) {
    // storage blocked (private mode): nothing was stored, nothing to clear
    debug.warn('[user] could not clear the masquerade keys', error);
  }
}

/** The profiles on the device, A to Z by nick. */
export function sortByNick(users: Record<string, any>): any[] {
  return Object.values(users).sort((a, b) => {
    const nameA = a.name?.nick || '';
    const nameB = b.name?.nick || '';
    return nameA.localeCompare(nameB);
  });
}

/** Make the `users` record match a freshly loaded list: drop who left, add and refresh the rest. */
export function replaceRoster(users: Record<string, any>, usersList: any[]) {
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
}
