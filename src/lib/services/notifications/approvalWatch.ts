import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import { claimsFor, refreshWaitingClaims } from "@/lib/services/quests/waitingClaims";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { cancelAlert, scheduleAlert, showAlert } from "./alertBridge";
import {
  APPROVAL_ALERT_ID,
  approvalAlertCopy,
  approvalWaitHours,
  nextReminderAt,
  pendingApprovalReminders,
} from "./approvalReminders";
import { APPROVALS_LINK, claimsWaitingSummary } from "./Notifications";

/** How often the portal shell looks again, like the quest watch */
const APPROVAL_WATCH_INTERVAL_MS = 5 * 60 * 1000;

export interface ApprovalWatchRun {
  /** Claims the signed-in Game Master may settle */
  waiting: number;
  /** Claims past the wait */
  overdue: number;
  /** True when a new summary reached the feed (and the device) this run */
  nudged: boolean;
}

/**
 * One pass for a Game Master: claims past the wait become one summary notification a day per count and one device alert;
 * claims not past it yet get an alert booked for the moment the oldest crosses (the packaged app only; a browser rings
 * on the watch's own tick). A Game Master with nothing waiting takes the booked alert back; a hero's run leaves it be.
 */
export const runApprovalWatch = async (gmId: string, now: Date = new Date()): Promise<ApprovalWatchRun> => {
  const id = String(gmId);
  await refreshWaitingClaims();
  const users = useUserStore().users;
  const isGameMaster = users[id]?.isAdult === true;
  // A hero's run leaves the alert alone: on a shared device it may be booked for a Game Master
  if (!isGameMaster) return { waiting: 0, overdue: 0, nudged: false };
  const claims = claimsFor(id, await getQuestLogDb().getPending(), users);
  const hasNoClaims = claims.length === 0;
  if (hasNoClaims) {
    await cancelAlert(APPROVAL_ALERT_ID);
    return { waiting: 0, overdue: 0, nudged: false };
  }

  const waitMs = approvalWaitHours() * 60 * 60 * 1000;
  const overdue = pendingApprovalReminders(claims, now, waitMs);
  const upcoming = nextReminderAt(claims, now, waitMs);
  if (upcoming) {
    const booked = await scheduleAlert({
      id: APPROVAL_ALERT_ID,
      channelId: "chore-reminders",
      title: "Heroes await your word",
      body: "A chore has waited for your word. Tap to check it.",
      link: APPROVALS_LINK,
      at: upcoming,
    });
    const isBookingFailed = !booked.shown && booked.reason === "failed";
    if (isBookingFailed) debug.warn("[approvalWatch] could not book the reminder");
  }
  const isNobodyOverdue = overdue.length === 0;
  if (isNobodyOverdue) return { waiting: claims.length, overdue: 0, nudged: false };

  const notifications = useNotificationsStore();
  await notifications.load(id);
  const pushed = notifications.push(claimsWaitingSummary(id, overdue.length, now), now);
  const nudged = Boolean(pushed);
  if (nudged) await showAlert({ id: APPROVAL_ALERT_ID, channelId: "chore-reminders", ...approvalAlertCopy(overdue) });
  return { waiting: claims.length, overdue: overdue.length, nudged };
};

/** Start the watch for a Game Master: one run now, then every few minutes. Returns the stop function. */
export const startApprovalWatch = (gmId: string): (() => void) => {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      await runApprovalWatch(gmId);
    } catch (error) {
      debug.warn("[approvalWatch] a run failed", error);
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), APPROVAL_WATCH_INTERVAL_MS);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
};
