import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import { loadCreationRows } from "@/lib/services/creations/creationReview";
import { claimsFor, refreshWaitingClaims } from "@/lib/services/quests/waitingClaims";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { cancelAlert, scheduleAlert, showAlert } from "./alertBridge";
import {
  APPROVAL_ALERT_ID,
  APPROVAL_REMINDERS_OFF,
  approvalAlertCopy,
  approvalWaitHours,
  nextReminderAt,
  pendingApprovalReminders,
} from "./approvalReminders";
import { APPROVALS_LINK, claimsWaitingSummary, creationWaitingNotification } from "./Notifications";

/** How often the portal shell looks again, like the quest watch */
const APPROVAL_WATCH_INTERVAL_MS = 5 * 60 * 1000;

export interface ApprovalWatchRun {
  /** Claims the signed-in Game Master may settle */
  waiting: number;
  /** Claims past the wait */
  overdue: number;
  /** Beasts and quests the kids made that wait on a verdict */
  creations: number;
  /** True when a new summary reached the feed (and the device) this run */
  nudged: boolean;
}

/**
 * Each creation waiting on a verdict lands in the Game Master's feed once a day (the feed's dedupe by what the note is
 * about and the day); the count is how many wait, told now or before. A creation list that cannot be read counts 0, so
 * the claims below still get their reminders.
 */
const tellOfWaitingCreations = async (gmId: string, now: Date): Promise<number> => {
  try {
    const rows = await loadCreationRows(["proposed"]);
    const hasNoCreations = rows.length === 0;
    if (hasNoCreations) return 0;
    const notifications = useNotificationsStore();
    await notifications.load(gmId);
    const users = useUserStore().users;
    for (const row of rows) {
      const makerName = users[row.by]?.name?.nick || "A hero";
      notifications.push(creationWaitingNotification(gmId, row, makerName, now), now);
    }
    return rows.length;
  } catch (error) {
    debug.warn("[approvalWatch] could not look at the waiting creations", error);
    return 0;
  }
};

/**
 * One pass for a Game Master: claims past the wait become one summary notification a day per count and one device alert;
 * claims not past it yet get an alert booked for the moment the oldest crosses (the packaged app only; a browser rings
 * on the watch's own tick). A Game Master with no claims waiting takes the booked alert back; a hero's run leaves it be.
 * Creations waiting on a verdict reach the feed too, but the device alert and the summary stay about claims.
 */
export const runApprovalWatch = async (gmId: string, now: Date = new Date()): Promise<ApprovalWatchRun> => {
  const id = String(gmId);
  await refreshWaitingClaims();
  const users = useUserStore().users;
  const isGameMaster = users[id]?.isAdult === true;
  // A hero's run leaves the alert alone: on a shared device it may be booked for a Game Master
  if (!isGameMaster) return { waiting: 0, overdue: 0, creations: 0, nudged: false };
  const claims = claimsFor(id, await getQuestLogDb().getPending(), users);
  const creations = await tellOfWaitingCreations(id, now);
  const hasNoClaims = claims.length === 0;
  if (hasNoClaims) {
    await cancelAlert(APPROVAL_ALERT_ID);
    return { waiting: 0, overdue: 0, creations, nudged: false };
  }

  const waitHours = approvalWaitHours();
  const areRemindersOff = waitHours === APPROVAL_REMINDERS_OFF;
  if (areRemindersOff) {
    await cancelAlert(APPROVAL_ALERT_ID);
    return { waiting: claims.length, overdue: 0, creations, nudged: false };
  }
  const waitMs = waitHours * 60 * 60 * 1000;
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
  if (isNobodyOverdue) return { waiting: claims.length, overdue: 0, creations, nudged: false };

  const notifications = useNotificationsStore();
  await notifications.load(id);
  const pushed = notifications.push(claimsWaitingSummary(id, overdue.length, now), now);
  const nudged = Boolean(pushed);
  if (nudged) await showAlert({ id: APPROVAL_ALERT_ID, channelId: "chore-reminders", ...approvalAlertCopy(overdue) });
  return { waiting: claims.length, overdue: overdue.length, creations, nudged };
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
