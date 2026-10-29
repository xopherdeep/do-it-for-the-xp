import { ProfileDb } from '@/lib/databases/ProfileDb';
import { profileStorage } from '@/lib/databases/profileStorage';
import debug from '@/lib/utils/debug';
import { trackWrite } from '@/lib/services/sync/recordSignals';
import { queueWidgetSync } from '@/lib/services/widgets/widgetSyncTrigger';

/**
 * The store's persistUser, bound to the store's `users` record. The write queue (profileDb, pendingPersist,
 * persistScheduled) is closed over here, one queue per store.
 */
export function createProfilePersister(users: Record<string, any>): (userId: string) => void {
  // --- Persistence ---
  // ProfileDb (`__profiles`) is the only thing loadUsers reads back, so every stat mutation
  // below must end with persistUser(); otherwise rewards vanish on the next reload.
  let profileDb: ProfileDb | null = null;
  const pendingPersist = new Set<string>();
  let persistScheduled = false;

  async function flushPersist() {
    persistScheduled = false;
    const userIds = Array.from(pendingPersist);
    pendingPersist.clear();
    if (!profileDb) profileDb = new ProfileDb(profileStorage);
    for (const userId of userIds) {
      const isGone = !users[userId];
      if (isGone) continue;
      try {
        await profileDb.setProfile(JSON.parse(JSON.stringify(users[userId])));
      } catch (error) {
        debug.error(`[user] failed to persist profile ${userId}`, error);
      }
    }
    // Debounced: a battle turn pays XP, GP and AP one after another, and the home screen only
    // needs the numbers the hero ends up with.
    queueWidgetSync();
  }

  /**
   * Write a user's in-memory profile back to ProfileDb.
   * Calls made in the same tick (e.g. XP + GP + AP on a battle victory) are coalesced into one write, noted as on its way
   * from now (Family Sync's rest waits for it, so a reward paid a moment ago goes before a hero's turn is given back).
   */
  function persistUser(userId: string) {
    const isUnknownUser = !userId || !users[userId];
    if (isUnknownUser) return;
    pendingPersist.add(userId);
    if (persistScheduled) return;
    persistScheduled = true;
    void trackWrite(new Promise<void>((resolve) => queueMicrotask(() => void flushPersist().then(resolve, resolve))));
  }

  return persistUser;
}
