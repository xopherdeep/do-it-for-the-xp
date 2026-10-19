/**
 * The app-level reminder scheduler. Two jobs used to wait for a hero's portal to be open: booking the phone's
 * chore reminders (so a kid who has not opened the app today heard nothing about today's chores) and the Game
 * Master's approval watch (so a parent in the Game Master console never heard of claims waiting on their word).
 * Both now hang on the app shell: it wakes this scheduler when the stores have loaded, when a hero signs in or
 * the profile switches, and when the app comes back to the front (appWake.ts), and the scheduler decides:
 *
 * - every hero on the device gets their reminders booked, not only the one signed in (each hero keeps their own
 *   reminder ids and only ever takes back their own, see deviceReminders.ts, so no hero's reminders wipe another's);
 * - the approval watch runs while a Game Master is signed in, wherever they stand in the app, and ends when they sign out.
 *
 * Waking it again and again is harmless: a pass in progress absorbs the wakes that arrive during it (one more pass
 * follows, never two at once), the approval watch starts once per Game Master, and the timer is made once.
 * Pure: the stores and the phone are handed in (appReminders.ts wires the real ones), so a spec drives it with fakes.
 */
import debug from "@/lib/utils/debug";

/** How often the booked reminders are looked at again while the app is up, as the quest watch always did. */
export const REBOOK_EVERY_MS = 5 * 60 * 1000;

export interface ReminderSchedulerDeps {
  /** Every hero (profile) on this device */
  heroIds: () => readonly string[];
  /** The Game Master who is signed in right now, or null (nobody, or a hero) */
  gameMasterId: () => string | null;
  /** True where a reminder can reach the device (the packaged app); in a browser there is nothing to book */
  canBook: () => boolean;
  /** Book one hero's reminders (idempotent: the same hero and quest keep the same device id) */
  bookReminders: (heroId: string, now: Date) => Promise<unknown>;
  /** Start the Game Master's approval watch; returns its stop function */
  startApprovalWatch: (gmId: string) => () => void;
  /** The clock; a spec hands in a fixed one */
  now?: () => Date;
  /** Ring `tick` every `ms` until the returned function is called; defaults to setInterval */
  every?: (ms: number, tick: () => void) => () => void;
}

export interface ReminderScheduler {
  /** Look again: settle the approval watch, then book every hero. Safe to call as often as you like. */
  wake: () => Promise<void>;
  /** End the approval watch and the timer (a later wake starts them again) */
  stop: () => void;
}

/** Each hero id once, as text, blanks dropped. */
export const uniqueHeroIds = (ids: readonly unknown[]): string[] => {
  const seen = new Set<string>();
  for (const id of ids) {
    const text = id === null || id === undefined ? "" : String(id);
    const isBlank = text === "";
    if (!isBlank) seen.add(text);
  }
  return [...seen];
};

const intervalEvery = (ms: number, tick: () => void): (() => void) => {
  const timer = setInterval(tick, ms);
  return () => clearInterval(timer);
};

export const createReminderScheduler = (deps: ReminderSchedulerDeps): ReminderScheduler => {
  const now = deps.now ?? (() => new Date());
  const every = deps.every ?? intervalEvery;

  let watchedGameMaster: string | null = null;
  let stopApprovalWatch: (() => void) | null = null;
  let stopTimer: (() => void) | null = null;
  let inFlight: Promise<void> | null = null;
  let wantsAnotherPass = false;

  /** Make the approval watch match who is signed in: one watch for the Game Master, none for anyone else. */
  const settleApprovalWatch = (): void => {
    const gmId = deps.gameMasterId();
    const isAlreadyWatching = gmId === watchedGameMaster;
    if (isAlreadyWatching) return;
    stopApprovalWatch?.();
    stopApprovalWatch = null;
    watchedGameMaster = null;
    if (!gmId) return;
    try {
      stopApprovalWatch = deps.startApprovalWatch(gmId);
      watchedGameMaster = gmId;
    } catch (error) {
      // not remembered as started, so the next wake tries again
      debug.warn("[reminderScheduler] the approval watch could not start", error);
    }
  };

  const bookEveryHero = async (): Promise<void> => {
    for (const heroId of uniqueHeroIds(deps.heroIds())) {
      try {
        await deps.bookReminders(heroId, now());
      } catch (error) {
        debug.warn(`[reminderScheduler] could not book ${heroId}'s reminders`, error);
      }
    }
  };

  /** One pass at a time; wakes during a pass fold into a single further pass. */
  const bookAfterThePass = (): Promise<void> => {
    if (inFlight) {
      wantsAnotherPass = true;
      return inFlight;
    }
    inFlight = (async () => {
      do {
        wantsAnotherPass = false;
        await bookEveryHero();
      } while (wantsAnotherPass);
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  const startTimer = (): void => {
    const isTimerRunning = stopTimer !== null;
    if (isTimerRunning) return;
    stopTimer = every(REBOOK_EVERY_MS, () => void bookAfterThePass());
  };

  return {
    wake: async () => {
      settleApprovalWatch();
      const isDevice = deps.canBook();
      if (!isDevice) return;
      startTimer();
      await bookAfterThePass();
    },
    stop: () => {
      stopApprovalWatch?.();
      stopApprovalWatch = null;
      watchedGameMaster = null;
      stopTimer?.();
      stopTimer = null;
    },
  };
};
