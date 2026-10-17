import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { effectiveDeadline, isSchedulePaused } from "@/lib/engine/quests/QuestSchedule";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { useUserStore } from "@/lib/store/stores/user";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import debug from "@/lib/utils/debug";
import { byClockCopy, questBoardLink, questDueNotification, questOverdueNotification } from "./Notifications";
import type { NewXpNotification } from "./Notifications";
import { chargeLatePenalties, latePenaltyNotification } from "@/lib/services/quests/lateChores";
import { scheduleDueReminders } from "./deviceReminders";
import type { DueReminder, ReminderResult } from "./deviceReminders";

/**
 * The quest watch: what on the hero's board deserves a nudge right now. The portal shell runs it on
 * mount and every five minutes; the notifications store's dedupe (kind + quest + day) makes the repeat
 * harmless, so each quest gets one "due soon" and one "overdue" a day.
 */

/** A quest counts as "due soon" this far ahead of its deadline. */
export const DUE_SOON_MS = 2 * 60 * 60 * 1000;
/** How often the portal shell re-runs the watch. */
export const QUEST_WATCH_INTERVAL_MS = 5 * 60 * 1000;

export interface QuestAlert {
  notification: NewXpNotification;
  deadline: Date | null;
}

/**
 * The alerts the board warrants at `now`: an overdue note for every open quest past its deadline, a
 * due-soon note for every open quest due within DUE_SOON_MS. The deadline is the board's one due-date rule
 * (effectiveDeadline: a weekly quest is due on its week's last day, not every evening of it). Quests waiting on
 * the Game Master, done quests (a shared one another assignee cleared included) and quests not due today are
 * left alone, and so is everything while Chronos' Clock holds time.
 */
export const pickQuestAlerts = (
  board: readonly QuestBoardItem[],
  effects: HeroQuestEffects | undefined,
  now: Date,
  heroId: string
): QuestAlert[] => {
  if (isSchedulePaused(effects, now)) return [];
  const alerts: QuestAlert[] = [];
  for (const item of board) {
    const isClosedOrAwaitingApproval = item.status !== "open" || item.pending;
    if (isClosedOrAwaitingApproval) continue;
    const deadline = effectiveDeadline(item.quest, effects, now);
    const quest = { id: String(item.quest.id), achievementName: String(item.quest.achievementName ?? "A quest") };
    const isOverdue = item.overdue || (deadline && now > deadline);
    if (isOverdue) {
      alerts.push({ notification: questOverdueNotification(heroId, quest, deadline, now), deadline });
      continue;
    }
    const isDueSoon = deadline && deadline.getTime() - now.getTime() <= DUE_SOON_MS;
    if (isDueSoon) {
      alerts.push({ notification: questDueNotification(heroId, quest, deadline, now), deadline });
    }
  }
  return alerts;
};

/** The device reminders for the open quests that still lie ahead (the watch schedules them each run). */
export const remindersOf = (
  board: readonly QuestBoardItem[],
  effects: HeroQuestEffects | undefined,
  now: Date,
  heroId?: string
): DueReminder[] => {
  if (isSchedulePaused(effects, now)) return [];
  const reminders: DueReminder[] = [];
  for (const item of board) {
    const isSettledOrOverdue = item.status !== "open" || item.pending || item.overdue;
    if (isSettledOrOverdue) continue;
    const deadline = effectiveDeadline(item.quest, effects, now);
    const hasNoDeadlineAhead = !deadline || deadline <= now;
    if (hasNoDeadlineAhead) continue;
    const name = String(item.quest.achievementName ?? "A quest");
    const hasHero = Boolean(heroId);
    const link = hasHero ? questBoardLink(String(heroId), String(item.quest.id)) : undefined;
    reminders.push({
      questId: String(item.quest.id),
      title: name,
      body: `Due ${byClockCopy(deadline)}.`,
      deadline,
      link,
    });
  }
  return reminders;
};

export interface QuestWatchRun {
  pushed: number;
  reminders: ReminderResult;
}

/** One pass of the watch for a hero: read the board, push what is due, schedule device reminders. */
export const runQuestWatch = async (heroId: string, now: Date = new Date()): Promise<QuestWatchRun> => {
  const id = String(heroId);
  const userStore = useUserStore();
  const notifications = useNotificationsStore();
  const effects = userStore.getUserById(id)?.questEffects as HeroQuestEffects | undefined;
  await notifications.load(id);
  const board = await getQuestEngine().getQuestBoardForUser(id, now, undefined, effects);

  let pushed = 0;
  for (const alert of pickQuestAlerts(board, effects, now, id)) {
    const isPushed = notifications.push(alert.notification, now);
    if (isPushed) pushed += 1;
  }
  // Late chores the family penalises: the points go once per chore window, and the hero hears of each
  for (const penalty of await chargeLatePenalties(board, id, now)) {
    const quest = { id: penalty.questId, achievementName: penalty.questName };
    const isPenaltyPushed = notifications.push(latePenaltyNotification(id, quest, penalty.taken, now), now);
    if (isPenaltyPushed) pushed += 1;
  }
  const reminders = await scheduleDueReminders(remindersOf(board, effects, now, id), now);
  return { pushed, reminders };
};

/**
 * Start the watch for a hero: one run now, then every QUEST_WATCH_INTERVAL_MS. Returns the stop function
 * (the portal calls it when it unmounts). Errors in a run are logged, never thrown into the screen.
 */
export const startQuestWatch = (
  heroId: string,
  options: { intervalMs?: number; onRun?: (run: QuestWatchRun) => void } = {}
): (() => void) => {
  const intervalMs = options.intervalMs ?? QUEST_WATCH_INTERVAL_MS;
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const run = await runQuestWatch(heroId);
      options.onRun?.(run);
    } catch (error) {
      debug.warn("[QuestWatch] a run failed", error);
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
};
