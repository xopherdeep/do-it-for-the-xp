/**
 * Device reminders for quests coming due, through Capacitor's LocalNotifications plugin when the app runs
 * on a phone. The plugin is loaded through the alert bridge (alertBridge.ts), so on the web (and on a device
 * where it cannot be loaded) nothing is scheduled and the result says why. Nothing here throws.
 */
import debug from "@/lib/utils/debug";
import { isNativeApp, loadLocalNotifications } from "./alertBridge";
import { ensureAlertChannels } from "./alertChannels";
import { choreRemindersChoice } from "./reminderChoice";

export interface DueReminder {
  /** The quest the reminder is about; the same quest keeps the same device notification id */
  questId: string;
  title: string;
  body: string;
  /** When the quest is due */
  deadline: Date;
}

export interface ReminderResult {
  scheduled: number;
  reason?: "web" | "plugin-missing" | "denied" | "nothing-due" | "off" | "failed";
}

/** How long before the deadline the device buzzes. */
export const REMINDER_LEAD_MS = 30 * 60 * 1000;

/** A stable 31-bit id for a quest id (the plugin wants a number). */
export const reminderIdOf = (questId: string): number => {
  let hash = 0;
  for (let i = 0; i < questId.length; i++) hash = (hash * 31 + questId.charCodeAt(i)) | 0;
  return Math.abs(hash) % 2147483647 || 1;
};

/** The moment a reminder fires: the lead time before the deadline, or null when that has already passed. */
export const reminderTimeOf = (deadline: Date, now: Date, leadMs = REMINDER_LEAD_MS): Date | null => {
  const at = new Date(deadline.getTime() - leadMs);
  return at > now ? at : null;
};

/** How soon a reminder fires for a quest already inside its lead time (once per quest and deadline, whether booked ahead or rung soon). */
export const IMMINENT_DELAY_MS = 3000;
const REMINDED_KEY = "xp.remindedQuests";
const REMINDED_KEEP = 50;

const remindedKeyOf = (reminder: DueReminder): string => `${reminder.questId}@${reminder.deadline.getTime()}`;

const readReminded = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(REMINDED_KEY) ?? "[]");
    const isList = Array.isArray(parsed);
    return isList ? parsed.map(String) : [];
  } catch (error) {
    debug.warn("[deviceReminders] could not read the reminded quests", error);
    return [];
  }
};

const rememberReminded = (keys: string[]): void => {
  try {
    localStorage.setItem(REMINDED_KEY, JSON.stringify([...readReminded(), ...keys].slice(-REMINDED_KEEP)));
  } catch (error) {
    // private mode: the reminder may repeat, which beats losing it
    debug.warn("[deviceReminders] could not keep the reminded quests", error);
  }
};

/** Take back booked chore reminders whose quest is no longer ahead (done, deleted or moved), so none buzzes for a finished chore. */
const cancelStaleReminders = async (plugin: any, keepIds: Set<number>): Promise<void> => {
  try {
    const booked = (await plugin.getPending?.())?.notifications ?? [];
    const isStale = (entry: any) => {
      const isChoreReminder = Boolean(entry?.extra?.questId);
      return isChoreReminder && !keepIds.has(entry.id);
    };
    const stale = booked.filter(isStale);
    const hasStale = stale.length > 0;
    if (hasStale) await plugin.cancel({ notifications: stale.map((entry: any) => ({ id: entry.id })) });
  } catch (error) {
    // best effort: a stale reminder is better than none
    debug.warn("[deviceReminders] could not take back stale reminders", error);
  }
};

interface PendingReminder {
  reminder: DueReminder;
  at: Date;
}

/**
 * What to book: the lead-time reminder for each quest still ahead of its lead, and one soon reminder for a
 * quest that first shows up already inside its lead time. `keys` are the quests to remember as reminded.
 */
const pendingRemindersOf = (reminders: readonly DueReminder[], now: Date): { pending: PendingReminder[]; keys: string[] } => {
  const reminded = new Set(readReminded());
  const pending: PendingReminder[] = [];
  const keys: string[] = [];
  for (const reminder of reminders) {
    const key = remindedKeyOf(reminder);
    const lead = reminderTimeOf(reminder.deadline, now);
    if (lead) {
      pending.push({ reminder, at: lead });
      keys.push(key);
      continue;
    }
    const isAhead = reminder.deadline > now;
    const isImminentAndNew = isAhead && !reminded.has(key);
    if (!isImminentAndNew) continue;
    pending.push({ reminder, at: new Date(now.getTime() + IMMINENT_DELAY_MS) });
    keys.push(key);
  }
  return { pending, keys };
};

/**
 * Schedule a device reminder for every quest still ahead of its lead time. Earlier reminders for the same
 * quests are replaced (same id), so running this every few minutes is safe.
 */
export const scheduleDueReminders = async (
  reminders: readonly DueReminder[],
  now: Date = new Date(),
  deps: { isNative?: () => Promise<boolean>; plugin?: () => Promise<any | null> } = {}
): Promise<ReminderResult> => {
  const { pending, keys } = pendingRemindersOf(reminders, now);
  const isNothingDue = pending.length === 0;
  const idleReason = isNothingDue ? "nothing-due" : undefined;

  const isNative = await (deps.isNative ?? (async () => isNativeApp()))();
  if (!isNative) return { scheduled: 0, reason: idleReason ?? "web" };
  const plugin = await (deps.plugin ?? loadLocalNotifications)();
  if (!plugin) return { scheduled: 0, reason: idleReason ?? "plugin-missing" };

  try {
    // Nothing ahead, or the hero turned reminders off: take back whatever is still booked
    const isTurnedOff = choreRemindersChoice() === "off";
    if (isTurnedOff) {
      await cancelStaleReminders(plugin, new Set());
      return { scheduled: 0, reason: "off" };
    }
    if (isNothingDue) {
      await cancelStaleReminders(plugin, new Set());
      return { scheduled: 0, reason: "nothing-due" };
    }

    let permission = await plugin.checkPermissions();
    const canAskForPermission = permission?.display === "prompt" || permission?.display === "prompt-with-rationale";
    if (canAskForPermission) {
      permission = await plugin.requestPermissions();
    }
    const isGranted = permission?.display === "granted";
    if (!isGranted) return { scheduled: 0, reason: "denied" };

    await ensureAlertChannels(plugin);
    await cancelStaleReminders(plugin, new Set(pending.map(({ reminder }) => reminderIdOf(reminder.questId))));
    await plugin.schedule({
      notifications: pending.map(({ reminder, at }) => ({
        id: reminderIdOf(reminder.questId),
        title: reminder.title,
        body: reminder.body,
        channelId: "chore-reminders",
        schedule: { at, allowWhileIdle: true },
        extra: { questId: reminder.questId },
      })),
    });
    // A booked lead-time reminder counts too, so the quest does not ring again once it is inside the window
    rememberReminded(keys);
    return { scheduled: pending.length };
  } catch (error) {
    debug.warn("[deviceReminders] could not book the reminders", error);
    return { scheduled: 0, reason: "failed" };
  }
};
