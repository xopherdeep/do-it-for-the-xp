/**
 * Device reminders for quests coming due, through Capacitor's LocalNotifications plugin when the app runs
 * on a phone that has it. The plugin is not a dependency of this project: it is loaded with a guarded
 * dynamic import, so on the web (and on a device without the plugin) nothing is scheduled and the result
 * says why. Nothing here throws.
 */

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
  reason?: "web" | "plugin-missing" | "denied" | "nothing-due" | "failed";
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

type Platform = { isNativePlatform(): boolean };

const nativePlatform = async (): Promise<boolean> => {
  try {
    const core = (await import("@capacitor/core")) as { Capacitor?: Platform };
    return Boolean(core.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
};

/**
 * Load the plugin without making it a build dependency: a variable specifier keeps webpack from trying
 * to resolve it, and the failure (web, or a device without the plugin) is the reason returned.
 */
const loadPlugin = async (): Promise<any | null> => {
  const specifier = "@capacitor/local-notifications";
  try {
    const mod = await import(/* webpackIgnore: true */ specifier);
    return mod?.LocalNotifications ?? null;
  } catch {
    return null;
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
  const pending = reminders
    .map((reminder) => ({ reminder, at: reminderTimeOf(reminder.deadline, now) }))
    .filter((entry): entry is { reminder: DueReminder; at: Date } => entry.at !== null);
  if (!pending.length) return { scheduled: 0, reason: "nothing-due" };

  if (!(await (deps.isNative ?? nativePlatform)())) return { scheduled: 0, reason: "web" };
  const plugin = await (deps.plugin ?? loadPlugin)();
  if (!plugin) return { scheduled: 0, reason: "plugin-missing" };

  try {
    let permission = await plugin.checkPermissions();
    if (permission?.display === "prompt" || permission?.display === "prompt-with-rationale") {
      permission = await plugin.requestPermissions();
    }
    if (permission?.display !== "granted") return { scheduled: 0, reason: "denied" };

    await plugin.schedule({
      notifications: pending.map(({ reminder, at }) => ({
        id: reminderIdOf(reminder.questId),
        title: reminder.title,
        body: reminder.body,
        schedule: { at, allowWhileIdle: true },
        extra: { questId: reminder.questId },
      })),
    });
    return { scheduled: pending.length };
  } catch {
    return { scheduled: 0, reason: "failed" };
  }
};
