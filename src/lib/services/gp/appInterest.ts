/**
 * Pays the Gold Bank's weekly savings interest from the app shell. App.ts calls startAppInterest once, right after
 * startAppReminders; from then on the payout runs on every app wake (the stores have loaded, a hero signed in or the
 * profile switched, the app came back to the front), through onAppWake (notifications/appWake.ts).
 *
 * The rules are savingsInterest.ts: off until the Game Master turns it on in Settings > Rewards, then each hero's savings
 * earn floor(savings x rate) GP once per calendar week. The hero's purse (`stats.gp.interestWeek`) remembers the last week
 * it was paid. The week is marked before anything is awaited, so two wakes at the same moment still pay once.
 */
import { loadFamilySettings, type FamilySettings } from "@/lib/services/family/familySettings";
import { onAppWake } from "@/lib/services/notifications/appWake";
import type { GpPayload } from "@/lib/store/stores/user/types";
import debug from "@/lib/utils/debug";
import { interestDueFor, interestNote } from "./savingsInterest";

/** The part of the user store the payout uses (the store itself fits) */
export interface InterestStore {
  users: Record<string, any>;
  updateUserGP: (payload: GpPayload) => Promise<void> | void;
  persistUser: (userId: string) => void;
}

/** The rules the payout reads from the family settings */
export type InterestRules = Pick<FamilySettings, "savingsInterest" | "weekStartsOn">;

export interface InterestPaid {
  userId: string;
  gp: number;
}

/**
 * Pay this week's interest to every hero who has not had it yet. Returns who was paid and how much. A failed payout
 * gives that hero's week back (the next wake tries again) and never stops the others.
 */
export const payBankInterest = async (store: InterestStore, rules: InterestRules, now: Date = new Date()): Promise<InterestPaid[]> => {
  const paid: InterestPaid[] = [];
  for (const [userId, hero] of Object.entries(store.users)) {
    const purse = hero?.stats?.gp;
    if (!purse || typeof purse !== "object") continue;
    const due = interestDueFor({
      rules: rules.savingsInterest,
      savings: purse.savings,
      paidWeek: purse.interestWeek,
      now,
      weekStartsOn: rules.weekStartsOn,
    });
    if (!due) continue;

    // Claim the week now, before any await, so a second wake in the same moment finds it paid
    const lastPaidWeek = purse.interestWeek;
    purse.interestWeek = due.week;
    const hasInterest = due.gp > 0;
    try {
      if (hasInterest) {
        await store.updateUserGP({ userId, savings: due.gp, kind: "earn", note: interestNote(due.gp) });
        paid.push({ userId, gp: due.gp });
      } else {
        // Nothing to pay on a balance this small, but the week is spent: save the mark
        store.persistUser(userId);
      }
    } catch (error) {
      purse.interestWeek = lastPaidWeek;
      debug.warn(`[bankInterest] could not pay ${userId}'s interest`, error);
    }
  }
  return paid;
};

interface InterestWireDeps {
  /** Where the family rules are read from; the real settings unless a spec says otherwise */
  loadSettings?: () => Promise<InterestRules>;
}

/**
 * Hang the weekly payout on the app wake. A start that already rang is replayed, so calling this after the stores
 * began loading still pays. Returns the function that stops it.
 */
export const startAppInterest = (store: InterestStore, deps: InterestWireDeps = {}): (() => void) => {
  const loadSettings = deps.loadSettings ?? loadFamilySettings;
  return onAppWake(
    async ({ now }) => {
      const rules = await loadSettings();
      await payBankInterest(store, rules, now);
    },
    { catchUp: true }
  );
};
