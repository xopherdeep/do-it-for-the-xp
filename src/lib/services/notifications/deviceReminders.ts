/**
 * Device reminders for quests coming due, through Capacitor's LocalNotifications plugin when the app runs
 * on a phone. The plugin is loaded through the alert bridge (alertBridge.ts), so on the web (and on a device
 * where it cannot be loaded) nothing is scheduled and the result says why. Nothing here throws.
 */
import { choreRemindersChoice, ensureAlertChannels, isNativeApp, loadLocalNotifications } from "./alertBridge";

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
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const rememberReminded = (keys: string[]): void => {
  try {
    localStorage.setItem(REMINDED_KEY, JSON.stringify([...readReminded(), ...keys].slice(-REMINDED_KEEP)));
  } catch {
    // private mode: the reminder may repeat, which beats losing it
  }
};

/** Take back booked chore reminders whose quest is no longer ahead (done, deleted or moved), so none buzzes for a finished chore. */
const cancelStaleReminders = async (plugin: any, keepIds: Set<number>): Promise<void> => {
  try {
    const booked = (await plugin.getPending?.())?.notifications ?? [];
    const stale = booked.filter((entry: any) => entry?.extra?.questId && !keepIds.has(entry.id));
    if (stale.length) await plugin.cancel({ notifications: stale.map((entry: any) => ({ id: entry.id })) });
  } catch {
    // best effort: a stale reminder is better than none
  }
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
  const reminded = new Set(readReminded());
  const bookedKeys: string[] = [];
  const pending: { reminder: DueReminder; at: Date }[] = [];
  for (const reminder of reminders) {
    const lead = reminderTimeOf(reminder.deadline, now);
    if (lead) {
      pending.push({ reminder, at: lead });
      bookedKeys.push(remindedKeyOf(reminder));
      continue;
    }
    // Already inside the lead time but not yet late: ring once, soon, instead of never
    const key = remindedKeyOf(reminder);
    const isImminentAndNew = reminder.deadline > now && !reminded.has(key);
    if (!isImminentAndNew) continue;
    pending.push({ reminder, at: new Date(now.getTime() + IMMINENT_DELAY_MS) });
    bookedKeys.push(key);
  }

  const isNative = await (deps.isNative ?? (async () => isNativeApp()))();
  if (!isNative) return { scheduled: 0, reason: pending.length ? "web" : "nothing-due" };
  const plugin = await (deps.plugin ?? loadLocalNotifications)();
  if (!plugin) return { scheduled: 0, reason: pending.length ? "plugin-missing" : "nothing-due" };

  try {
    // Nothing ahead, or the hero turned reminders off: take back whatever is still booked
    const isTurnedOff = choreRemindersChoice() === "off";
    if (isTurnedOff || !pending.length) {
      await cancelStaleReminders(plugin, new Set());
      return { scheduled: 0, reason: isTurnedOff ? "off" : "nothing-due" };
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
    rememberReminded(bookedKeys);
    return { scheduled: pending.length };
  } catch {
    return { scheduled: 0, reason: "failed" };
  }
};
