import { addDays, differenceInCalendarDays, format, isSameDay, startOfDay } from "date-fns";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestRewards } from "@/lib/databases/QuestLogDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import type { SentBack } from "./sentBack";
import { effectiveDeadline, isSharedQuest, type HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";

/**
 * The quest log as a plain to-do list. Pure: no storage, no Vue.
 *
 * `questListFor` turns the hero's quest board (system quests and ad-hoc tasks alike) into rows with
 * the assignee's nick, the due time, a status and the rewards, sorted the way a to-do list reads:
 * overdue -> due soon (open, earliest deadline first) -> later (not due yet) -> pending -> done.
 * A shared quest another assignee cleared reads "Done by Mia".
 *
 * `newQuickTask` is the "Add task" shape: a one-off Achievement record assigned to one family member,
 * saved through AchievementDb like any quest the Game Master authors, so the Compendium shows it too.
 * AchievementDb.setTask mints the id when it is left blank.
 */
export type QuestListStatus = "overdue" | "open" | "later" | "pending" | "done";

export interface QuestListRow {
  id: string;
  title: string;
  /** The family member the row is for: the hero when assigned to them, else the first assignee, else null */
  assigneeId: string | null;
  /** The assignee's nick, "Anyone" for an open bounty, "Unassigned" when nobody holds it */
  assigneeName: string;
  /** When the quest is due, after the hero's items; null when it has no due time */
  due: Date | null;
  /** "6:00pm", "Tomorrow 6:00pm", "Wed 14 Oct", "Anytime" */
  dueLabel: string;
  status: QuestListStatus;
  /** STATUS_LABELS, or "Done by Mia" when other assignees cleared a shared quest without the hero */
  statusLabel: string;
  requiresApproval: boolean;
  /** The chore asks for a photo when it is claimed */
  requiresPhoto: boolean;
  rewards: QuestRewards;
  quest: Achievement;
  /** "Too late: this one closed at 6:00pm" when the family locked the chore for being late; absent otherwise */
  lockedNotice?: string;
  /** The Game Master sent the hero's latest claim of this open chore back (sentBack.ts); absent otherwise */
  sentBack?: SentBack;
}

/** A profile as far as the list cares; the user store keeps profiles untyped. */
export interface FamilyMember {
  id?: string | number;
  name?: { nick?: string; first?: string; full?: string };
}

export type FamilyMembers = Record<string, FamilyMember | undefined>;

export const STATUS_LABELS: Record<QuestListStatus, string> = {
  overdue: "Overdue",
  open: "Open",
  later: "Later",
  pending: "Pending the Game Master",
  done: "Tamed",
};

const STATUS_RANK: Record<QuestListStatus, number> = { overdue: 0, open: 1, later: 2, pending: 3, done: 4 };

/** The rewards a quick task carries unless the hero types others (AchievementDb.getDefault's rates). */
export const QUICK_TASK_REWARDS: QuestRewards = { xp: 200, gp: 20, ap: 2 };

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const rewardsOf = (quest: Pick<Achievement, "xp" | "gp" | "ap">): QuestRewards => ({
  xp: toNumber(quest.xp),
  gp: toNumber(quest.gp),
  ap: toNumber(quest.ap),
});

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** The hero's nick, their first name, or their id when the profile has no name. */
export const nickOf = (member: FamilyMember | undefined, fallback = ""): string =>
  member?.name?.nick || member?.name?.first || member?.name?.full || fallback;

/** Who the row is for, from the hero's point of view. */
export const assigneeOf = (
  quest: Pick<Achievement, "type" | "assignee">,
  userId: string,
  users: FamilyMembers
): { assigneeId: string | null; assigneeName: string } => {
  const ids = (quest.assignee || []).map(String);
  const mine = ids.includes(String(userId));
  const isUnassigned = !ids.length;
  if (isUnassigned) return { assigneeId: null, assigneeName: quest.type === "asNeeded" ? "Anyone" : "Unassigned" };
  const assigneeId = mine ? String(userId) : ids[0];
  const name = nickOf(users[assigneeId], assigneeId);
  const others = ids.length - 1;
  return { assigneeId, assigneeName: others > 0 ? `${name} +${others}` : name };
};

const isOnce = (quest: Pick<Achievement, "basicSchedule">) => quest.basicSchedule === "once";

/**
 * When the quest is due as the hero sees it on `date`, or null when it has no due time: the one due-date rule
 * the board and the alerts read (QuestSchedule.effectiveDeadline). A once quest is due on the day it starts, a
 * window that spans several days on its last day, every other quest on `date`.
 */
export const dueFor = (quest: Achievement, effects: HeroQuestEffects | undefined, date: Date): Date | null =>
  effectiveDeadline(quest, effects, date);

/** The day in the hero's words, relative to `date`: "Today", "Tomorrow", "Yesterday" or "Wed 14 Oct". */
export const dayLabelFor = (day: Date, date: Date): string => {
  if (isSameDay(day, date)) return "Today";
  if (isSameDay(day, addDays(date, 1))) return "Tomorrow";
  if (isSameDay(day, addDays(date, -1))) return "Yesterday";
  return format(day, "EEE d MMM");
};

/** The due moment in the hero's words, relative to `date`: today's reads as a bare clock. */
export const dueLabelFor = (due: Date | null, date: Date): string => {
  if (!due) return "Anytime";
  const clock = format(due, "h:mmaaa");
  return isSameDay(due, date) ? clock : `${dayLabelFor(due, date)} ${clock}`;
};

/**
 * The quest card's due line, relative to `date`: today's reads as a bare clock ("6:00PM"); any other day names
 * itself first. The next days read "Tomorrow" or "Yesterday", the rest of the coming week by weekday ("Fri 6:00PM",
 * where the weekday cannot be mistaken), anything further out or further back with its date ("Sat 17 Oct 6:00PM").
 * A weekly or custom quest is due on the last day of its window, so the day matters (QuestSchedule.deadlineDayOf).
 */
export const cardDueLabelFor = (due: Date, date: Date): string => {
  const clock = format(due, "h:mma");
  const daysAhead = differenceInCalendarDays(due, date);
  const isToday = daysAhead === 0;
  const isTomorrow = daysAhead === 1;
  const isYesterday = daysAhead === -1;
  if (isToday) return clock;
  if (isTomorrow) return `Tomorrow ${clock}`;
  if (isYesterday) return `Yesterday ${clock}`;
  const isWithinTheWeek = daysAhead > 1 && daysAhead < 7;
  return `${format(due, isWithinTheWeek ? "EEE" : "EEE d MMM")} ${clock}`;
};

/**
 * "Done by Mia" (or "Done by Mia +1") when the hero's window of a shared quest was filled by other assignees
 * only; null otherwise, so the row keeps its own status label.
 */
export const doneByLabelFor = (item: QuestBoardItem, userId: string, users: FamilyMembers): string | null => {
  const completers = (item.doneBy ?? []).map(String);
  const others = completers.filter((id) => id !== String(userId));
  const isClearedByOthersOnly = isSharedQuest(item.quest) && others.length > 0 && others.length === completers.length;
  if (!isClearedByOthersOnly) return null;
  const name = nickOf(users[others[0]], others[0]);
  return others.length > 1 ? `Done by ${name} +${others.length - 1}` : `Done by ${name}`;
};

const isWorkableStatus = (status: QuestListStatus): boolean => status === "open" || status === "overdue";

const statusOf = (item: QuestBoardItem, due: Date | null, date: Date): QuestListStatus | null => {
  const { quest, status, pending, overdue } = item;
  const isDone = status === "done";
  if (isDone) return pending ? "pending" : "done";
  const isOpen = status === "open";
  if (isOpen) return overdue || (isOnce(quest) && due !== null && date > due) ? "overdue" : "open";
  // Not due today: an upcoming one-off task still belongs on the list; recurring quests wait for their day
  const starts = parseDate(quest.startsOn);
  return isOnce(quest) && starts && startOfDay(starts) > startOfDay(date) ? "later" : null;
};

const compareRows = (a: QuestListRow, b: QuestListRow): number => {
  const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (rank) return rank;
  const dueA = a.due;
  const dueB = b.due;
  const isDueAtDifferentMoments = dueA && dueB && dueA.getTime() !== dueB.getTime();
  if (isDueAtDifferentMoments) return dueA.getTime() - dueB.getTime();
  const isOnlyADated = dueA && !dueB;
  if (isOnlyADated) return -1;
  const isOnlyBDated = !dueA && dueB;
  if (isOnlyBDated) return 1;
  return a.title.localeCompare(b.title);
};

/**
 * The hero's board as a to-do list: every quest due today (open, pending or tamed), every one-off task still
 * ahead, each with its assignee, due time and status, sorted overdue -> due soon -> later -> pending -> done.
 */
export const questListFor = (
  userId: string,
  date: Date,
  board: QuestBoardItem[],
  users: FamilyMembers,
  effects?: HeroQuestEffects,
  /** Quest id -> why the family locked it (lateChores.lockedNoticesFor): such a row cannot be finished */
  locked: Readonly<Record<string, string>> = {},
  /** Quest id -> the Game Master's note on a sent-back claim (sentBack.sentBackFor) */
  sentBack: Readonly<Record<string, SentBack>> = {}
): QuestListRow[] => {
  const rows: QuestListRow[] = [];
  for (const item of board) {
    const { quest } = item;
    const due = dueFor(quest, effects, date);
    const status = statusOf(item, due, date);
    if (!status) continue;
    rows.push({
      id: String(quest.id),
      title: quest.achievementName || "Untitled Quest",
      ...assigneeOf(quest, userId, users),
      due,
      dueLabel: due || status !== "later" ? dueLabelFor(due, date) : dayLabelFor(parseDate(quest.startsOn) || date, date),
      status,
      statusLabel: (status === "done" && doneByLabelFor(item, userId, users)) || STATUS_LABELS[status],
      requiresApproval: Boolean(quest.requiresApproval) || Boolean(quest.requiresPhoto),
      requiresPhoto: Boolean(quest.requiresPhoto),
      rewards: rewardsOf(quest),
      quest,
      ...(isWorkableStatus(status) && locked[String(quest.id)] ? { lockedNotice: locked[String(quest.id)] } : {}),
      ...(isWorkableStatus(status) && sentBack[String(quest.id)] ? { sentBack: sentBack[String(quest.id)] } : {}),
    });
  }
  return rows.sort(compareRows);
};

/** Rows grouped for a quick glance; `openCount` is what still needs doing (overdue and open). */
export const questListCounts = (rows: QuestListRow[]): Record<QuestListStatus, number> =>
  rows.reduce(
    (counts, row) => ({ ...counts, [row.status]: counts[row.status] + 1 }),
    { overdue: 0, open: 0, later: 0, pending: 0, done: 0 } as Record<QuestListStatus, number>
  );

export type QuickTaskDue = "today" | "tomorrow" | Date | string;

export interface QuickTaskInput {
  title: string;
  /** The family member's id (a key of useUserStore().users) */
  assigneeId: string;
  /** "today", "tomorrow", a Date, or a "yyyy-MM-dd" day */
  due?: QuickTaskDue;
  /** "HH:mm"; empty means any time that day */
  dueByTime?: string;
  requiresApproval?: boolean;
  /** Ask for a photo when it is claimed; forces approval on. A hero may ask for one on their own task. */
  requiresPhoto?: boolean;
  /** False when a hero (not a Game Master) posts the task: a hero's own task always waits for a Game Master */
  isGm?: boolean;
  rewards?: Partial<QuestRewards>;
  /** Leave blank and AchievementDb.setTask mints one */
  id?: string;
}

/** The calendar day a quick task is due, at midnight. */
export const quickTaskDay = (due: QuickTaskDue | undefined, now: Date): Date => {
  const isDueToday = due === undefined || due === "today";
  if (isDueToday) return startOfDay(now);
  const isDueTomorrow = due === "tomorrow";
  if (isDueTomorrow) return startOfDay(addDays(now, 1));
  const isDueOnDate = due instanceof Date;
  if (isDueOnDate) {
    if (Number.isNaN(due.getTime())) throw new Error("That day is not on any calendar.");
    return startOfDay(due);
  }
  const day = /^(\d{4})-(\d{2})-(\d{2})/.exec(due);
  const parsed = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(due);
  if (Number.isNaN(parsed.getTime())) throw new Error("That day is not on any calendar.");
  return startOfDay(parsed);
};

const cleanClock = (dueByTime?: string): string => {
  const clock = /^(\d{1,2}):(\d{2})/.exec(dueByTime || "");
  if (!clock) return "";
  const hours = Number(clock[1]);
  const minutes = Number(clock[2]);
  const isValidClock = hours < 24 && minutes < 60;
  if (!isValidClock) return "";
  return `${String(hours).padStart(2, "0")}:${clock[2]}`;
};

/**
 * The Achievement record for a quick task: a one-off quest for one family member, starting on its due day,
 * due by `dueByTime` on that day, with the default rewards unless others are given.
 */
export const newQuickTask = (input: QuickTaskInput, now: Date = new Date()): Achievement => {
  const title = (input.title || "").trim();
  if (!title) throw new Error("A task needs a name before it can be posted.");
  const assigneeId = String(input.assigneeId || "").trim();
  if (!assigneeId) throw new Error("Pick who the task is for.");
  const day = quickTaskDay(input.due, now);
  const rewards = { ...QUICK_TASK_REWARDS, ...input.rewards };
  const isHeroPosting = input.isGm === false;
  const needsApproval = isHeroPosting || Boolean(input.requiresApproval) || Boolean(input.requiresPhoto);
  return {
    id: input.id || "",
    achievementName: title,
    categoryId: "",
    beastId: "",
    subAchievementIds: [],
    bonusAchievement: false,
    requiresApproval: needsApproval,
    ...(input.requiresPhoto ? { requiresPhoto: true } : {}),
    type: "individual",
    assignee: [assigneeId],
    basicSchedule: "once",
    scheduleType: "basic",
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    dueByTime: cleanClock(input.dueByTime),
    startsOn: day.toISOString(),
    endsOn: "",
    repeatOnDays: [],
    showDailyUntilComplete: false,
    difficulty: 1,
    xp: toNumber(rewards.xp),
    gp: toNumber(rewards.gp),
    ap: toNumber(rewards.ap),
    adventureType: "simple",
  };
};
