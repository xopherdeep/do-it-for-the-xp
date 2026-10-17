import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import debug from "@/lib/utils/debug";
import { APPROVALS_LINK } from "./Notifications";

/**
 * When a Game Master is reminded about claims waiting on their word, the pure rules. A claim that has waited longer
 * than the wait (2 hours unless the family sets another) is a reminder; the watch (approvalWatch.ts) turns them into one
 * summary notification and one device alert, and books the next alert for the moment the oldest claim crosses the wait.
 */

/** The one OS alert for "heroes are waiting on you": a fixed id so a newer one replaces the older */
export const APPROVAL_ALERT_ID = 7003;
export const DEFAULT_APPROVAL_WAIT_HOURS = 2;
const HOUR_MS = 60 * 60 * 1000;
const WAIT_KEY = "xp.approvalReminderHours";

/** How long a claim may wait before the Game Master is reminded, in hours (stored per device) */
export const approvalWaitHours = (): number => {
  try {
    const stored = Number(localStorage.getItem(WAIT_KEY));
    const isUsable = Number.isFinite(stored) && stored > 0;
    return isUsable ? stored : DEFAULT_APPROVAL_WAIT_HOURS;
  } catch (error) {
    debug.warn("[approvalReminders] could not read the reminder wait", error);
    return DEFAULT_APPROVAL_WAIT_HOURS;
  }
};

export const setApprovalWaitHours = (hours: number): void => {
  try {
    localStorage.setItem(WAIT_KEY, String(hours));
  } catch (error) {
    // private mode: the default wait stays
    debug.warn("[approvalReminders] could not keep the reminder wait", error);
  }
};

export interface ApprovalReminder {
  entryId: string;
  heroId: string;
  questName: string;
  /** How long the claim has waited */
  waitedMs: number;
}

/** The held claims that have waited longer than `waitMs` at `now`, longest wait first. Settled claims never count. */
export const pendingApprovalReminders = (
  entries: readonly QuestLogEntry[],
  now: Date,
  waitMs: number = DEFAULT_APPROVAL_WAIT_HOURS * HOUR_MS
): ApprovalReminder[] =>
  entries
    .filter((entry) => entry.status === "pending")
    .map((entry) => ({
      entryId: entry.id,
      heroId: entry.userId,
      questName: entry.questName,
      waitedMs: now.getTime() - new Date(entry.completedAt).getTime(),
    }))
    .filter((reminder) => reminder.waitedMs > waitMs)
    .sort((a, b) => b.waitedMs - a.waitedMs);

/** When the oldest claim that has not waited long enough yet will cross the wait; null when none is coming */
export const nextReminderAt = (entries: readonly QuestLogEntry[], now: Date, waitMs: number): Date | null => {
  const crossings = entries
    .filter((entry) => entry.status === "pending")
    .map((entry) => new Date(entry.completedAt).getTime() + waitMs)
    .filter((at) => at > now.getTime());
  return crossings.length ? new Date(Math.min(...crossings)) : null;
};

export interface ApprovalAlertCopy {
  title: string;
  body: string;
  link: string;
}

/** The device alert for the claims that have waited: how many, and the longest wait */
export const approvalAlertCopy = (reminders: readonly ApprovalReminder[]): ApprovalAlertCopy => {
  const count = reminders.length;
  const longestHours = Math.max(1, Math.floor((reminders[0]?.waitedMs ?? 0) / HOUR_MS));
  const title = count === 1 ? "A chore awaits your word" : `${count} chores await your word`;
  return { title, body: `The longest has waited over ${longestHours} h. Tap to check it.`, link: APPROVALS_LINK };
};
