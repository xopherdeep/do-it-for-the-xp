/**
 * Hangs the reminder scheduler (reminderScheduler.ts) on the app shell. App.ts calls startAppReminders once; from then on
 * the scheduler wakes (and every module registered with onAppWake hears it) when
 *
 * - the stores have loaded: "start";
 * - a hero signs in or the profile switches: "login";
 * - the app comes back to the front: "resume".
 *
 * A sign out wakes only the scheduler, which ends the Game Master's approval watch. The real stores, the phone check
 * and the watches are wired here so the scheduler itself stays pure.
 */
import { watch } from "vue";
import { isNativeApp } from "./alertBridge";
import { startApprovalWatch } from "./approvalWatch";
import { listenForResume, onAppWake, runAppWake } from "./appWake";
import { bookHeroReminders } from "./questWatch";
import { createReminderScheduler } from "./reminderScheduler";

/** The part of the user store the wiring reads (the store itself fits). */
export interface AppReminderStore {
  users: Record<string, any>;
  currentUser: { id: string | null; isAuthenticated: boolean };
}

/** Who is signed in, or null. The store starts "authenticated" with nobody's id, so the id decides. */
const signedInIdOf = (store: AppReminderStore): string | null => {
  const { id, isAuthenticated } = store.currentUser;
  const isSignedIn = Boolean(id) && isAuthenticated;
  return isSignedIn ? String(id) : null;
};

/** The signed-in Game Master (an adult profile), or null when nobody is, or a hero is. */
const gameMasterIdOf = (store: AppReminderStore): string | null => {
  const id = signedInIdOf(store);
  const isGameMaster = id !== null && store.users[id]?.isAdult === true;
  return isGameMaster ? id : null;
};

/**
 * Start the app-level reminders. `storesLoaded` settles when the roster of heroes and the signed-in profile are
 * restored (userStore.loadUsers()). Returns the function that ends it all.
 */
export const startAppReminders = (store: AppReminderStore, storesLoaded: Promise<unknown>): (() => void) => {
  const scheduler = createReminderScheduler({
    heroIds: () => Object.keys(store.users),
    gameMasterId: () => gameMasterIdOf(store),
    canBook: isNativeApp,
    bookReminders: bookHeroReminders,
    startApprovalWatch,
  });
  let isStopped = false;

  const stopHook = onAppWake(() => scheduler.wake());
  const stopResume = listenForResume(() => void runAppWake("resume"));
  const stopSignInWatch = watch(
    () => signedInIdOf(store),
    (id) => {
      // A sign out has nobody to tell the hooks about; the scheduler alone lets the approval watch go
      if (id) void runAppWake("login");
      else void scheduler.wake();
    }
  );
  void storesLoaded
    .catch(() => undefined)
    .then(() => (isStopped ? undefined : runAppWake("start")));

  return () => {
    isStopped = true;
    stopHook();
    stopResume();
    stopSignInWatch();
    scheduler.stop();
  };
};
