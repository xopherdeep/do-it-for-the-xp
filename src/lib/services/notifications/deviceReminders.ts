/**
 * Device reminders for quests coming due, through Capacitor's LocalNotifications plugin when the app runs
 * on a phone. The plugin is loaded through the alert bridge (alertBridge.ts), so on the web (and on a device
 * where it cannot be loaded) nothing is scheduled and the result says why. Nothing here throws.
 *
 * Several heroes can share one device, so every booked reminder carries its hero (`extra.heroId`) and a hero's
 * run only books and takes back that hero's own reminders. Removing a hero takes back theirs (watchHeroReminderRemovals).
 */
import debug from "@/lib/utils/debug";
import { onHeroRemoved } from "@/lib/services/multiplayer/gameSignals";
import { isNativeApp, loadLocalNotifications } from "./alertBridge";
import { ensureAlertChannels } from "./alertChannels";
import { choreRemindersChoice } from "./reminderChoice";

export interface DueReminder {
  /** The quest the reminder is about; the same hero and quest keep the same device notification id */
  questId: string;
  title: string;
  body: string;
  /** When the quest is due */
  deadline: Date;
  /** The app page a tap on the reminder opens (the quest's card) */
  link?: string;
}

export interface ReminderResult {
  scheduled: number;
  reason?: "web" | "plugin-missing" | "denied" | "nothing-due" | "off" | "failed";
}

/** How long before the deadline the device buzzes. */
export const REMINDER_LEAD_MS = 30 * 60 * 1000;

/** A stable 31-bit id for a hero's reminder of a quest (the plugin wants a number); a quest shared by two heroes gets two ids. */
export const reminderIdOf = (heroId: string, questId: string): number => {
  const key = `${heroId}:${questId}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
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

const remindedKeyOf = (heroId: string, reminder: DueReminder): string => `${heroId}:${reminder.questId}@${reminder.deadline.getTime()}`;

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

/**
 * Take back booked chore reminders whose quest is no longer ahead (done, deleted or moved), so none buzzes for a
 * finished chore. Only `heroId`'s reminders are looked at (every hero's when it is null); another hero's stay booked.
 * A reminder booked before reminders carried their hero is taken back too: its hero books it again on their next run.
 */
const cancelStaleReminders = async (plugin: any, heroId: string | null, keepIds: Set<number>): Promise<void> => {
  try {
    const booked = (await plugin.getPending?.())?.notifications ?? [];
    const isStale = (entry: any) => {
      const isChoreReminder = Boolean(entry?.extra?.questId);
      if (!isChoreReminder) return false;
      const owner = entry.extra.heroId;
      const isOwnedHere = heroId === null || owner === undefined || String(owner) === heroId;
      return isOwnedHere && !keepIds.has(entry.id);
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
const pendingRemindersOf = (heroId: string, reminders: readonly DueReminder[], now: Date): { pending: PendingReminder[]; keys: string[] } => {
  const reminded = new Set(readReminded());
  const pending: PendingReminder[] = [];
  const keys: string[] = [];
  for (const reminder of reminders) {
    const key = remindedKeyOf(heroId, reminder);
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
 * Schedule a device reminder for every one of the hero's quests still ahead of its lead time. Earlier reminders
 * for the same hero and quests are replaced (same id), so running this every few minutes is safe; other heroes'
 * reminders on the device are left alone.
 */
export const scheduleDueReminders = async (
  heroId: string,
  reminders: readonly DueReminder[],
  now: Date = new Date(),
  deps: { isNative?: () => Promise<boolean>; plugin?: () => Promise<any | null> } = {}
): Promise<ReminderResult> => {
  const hero = String(heroId);
  const { pending, keys } = pendingRemindersOf(hero, reminders, now);
  const isNothingDue = pending.length === 0;
  const idleReason = isNothingDue ? "nothing-due" : undefined;

  const isNative = await (deps.isNative ?? (async () => isNativeApp()))();
  if (!isNative) return { scheduled: 0, reason: idleReason ?? "web" };
  const plugin = await (deps.plugin ?? loadLocalNotifications)();
  if (!plugin) return { scheduled: 0, reason: idleReason ?? "plugin-missing" };

  try {
    // Reminders turned off (one choice for the whole device): take back every hero's
    const isTurnedOff = choreRemindersChoice() === "off";
    if (isTurnedOff) {
      await cancelStaleReminders(plugin, null, new Set());
      return { scheduled: 0, reason: "off" };
    }
    // Nothing ahead for this hero: take back what is still booked for them
    if (isNothingDue) {
      await cancelStaleReminders(plugin, hero, new Set());
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
    await cancelStaleReminders(plugin, hero, new Set(pending.map(({ reminder }) => reminderIdOf(hero, reminder.questId))));
    await plugin.schedule({
      notifications: pending.map(({ reminder, at }) => ({
        id: reminderIdOf(hero, reminder.questId),
        title: reminder.title,
        body: reminder.body,
        channelId: "chore-reminders",
        schedule: { at, allowWhileIdle: true },
        extra: { questId: reminder.questId, heroId: hero, link: reminder.link },
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

/** Take back every reminder booked for a hero (a removed hero's chores must not buzz the device). Never throws. */
export const cancelHeroReminders = async (
  heroId: string,
  deps: { isNative?: () => Promise<boolean>; plugin?: () => Promise<any | null> } = {}
): Promise<void> => {
  try {
    const isNative = await (deps.isNative ?? (async () => isNativeApp()))();
    if (!isNative) return;
    const plugin = await (deps.plugin ?? loadLocalNotifications)();
    if (!plugin) return;
    await cancelStaleReminders(plugin, String(heroId), new Set());
  } catch (error) {
    debug.warn("[deviceReminders] could not take back a removed hero's reminders", error);
  }
};

let stopRemovalHook: (() => void) | null = null;

/** Take back a hero's reminders when the hero is removed. Idempotent: the first call subscribes, later calls do nothing. */
export const watchHeroReminderRemovals = (): void => {
  const isWatching = stopRemovalHook !== null;
  if (isWatching) return;
  stopRemovalHook = onHeroRemoved((heroId) => void cancelHeroReminders(String(heroId)));
};
